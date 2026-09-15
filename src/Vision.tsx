import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import type { Style, Vision } from "./types";
import {
  chevronPath,
  headerHeight,
  isPassed,
  markerPath,
  nameBottom,
  nameSpan,
  nameYs,
  place,
  segmentPath,
  segments,
  spacingFor,
  tailClipped,
  textWidth,
  topHeight,
} from "./geometry";

function Badge({
  x,
  y,
  w,
  h,
  r = 6,
  fill,
  size,
  text,
  stroke,
  strokeWidth,
  fg = "#fff",
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  fill: string;
  size: number;
  text: string;
  stroke?: string;
  strokeWidth?: number;
  fg?: string;
}) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      <text
        x={x + w / 2}
        y={y + h / 2}
        fill={fg}
        fontSize={size}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {text}
      </text>
    </>
  );
}

/**
 * 描画幅を実測して、maxW に収まるまで font-size を落とす text。
 * 字幅はフォントと文字の並びで変わり見積もりでは 1 割近くずれるので、実際に測って決める。
 * 子の tspan は em 指定にしておけば倍率に追随する。
 */
function FitText({
  maxW,
  size,
  children,
  ...rest
}: { maxW: number; size: number } & React.SVGProps<SVGTextElement>) {
  const ref = useRef<SVGTextElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const natural = el.getBBox().width / k; // 等倍に戻した幅
    const next = natural > maxW && natural > 0 ? maxW / natural : 1;
    if (Math.abs(next - k) > 0.002) setK(next);
  });
  return (
    <text ref={ref} fontSize={size * k} {...rest}>
      {children}
    </text>
  );
}

/**
 * [接尾語][本文][駅番号バッジ] の1行。駅番号は右端に固定し、残りの幅で本文を中央に置く。
 * 本文と接尾語は1つの text にまとめて text-anchor="middle" に任せるので、
 * 幅の見積もりがずれても中央からは外れない。見積もりは収まらないときの縮小だけに使う。
 */
function DestLine(props: {
  text: string;
  suffix: string;
  code: string;
  left: number;
  right: number;
  y: number;
  fg: string;
  s: Style;
  size: number;
  spacing: number;
  suffixSize: number;
  codeW: number;
  codeH: number;
  codeSize: number;
  codeStroke?: string;
}) {
  const { text, suffix, code, left, right, y, fg, s } = props;
  const spacing = spacingFor(text, props.spacing);
  const codeX = right - props.codeW;
  const outer = code ? codeX - s.destGap : right;

  const suffixSpan = suffix ? (
    <tspan fontSize={`${props.suffixSize / props.size}em`} letterSpacing={0}>
      {suffix}
    </tspan>
  ) : null;
  const gapEm = `${s.destGap / props.size}em`;

  return (
    <>
      <FitText
        maxW={outer - left}
        size={props.size}
        x={(left + outer) / 2 + s.destOffset}
        y={y}
        fill={fg}
        fontWeight="bold"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing={`${spacing}em`}
      >
        {s.suffixBefore && suffixSpan}
        {s.suffixBefore && suffix ? <tspan dx={gapEm}>{text}</tspan> : text}
        {!s.suffixBefore && suffix && (
          <tspan dx={gapEm} fontSize={`${props.suffixSize / props.size}em`} letterSpacing={0}>
            {suffix}
          </tspan>
        )}
      </FitText>
      {code && (
        <Badge
          x={codeX}
          y={y - props.codeH / 2}
          w={props.codeW}
          h={props.codeH}
          fill={s.lineColor}
          size={props.codeSize}
          text={code}
          stroke={props.codeStroke}
          strokeWidth={props.codeStroke ? 3 : undefined}
        />
      )}
    </>
  );
}

/** 駅名。縦積み（日本語）と、右上へ倒した1行書き（英語）を切り替える */
function StationName({ name, x, v, dim }: { name: string; x: number; v: Vision; dim: boolean }) {
  const s = v.style;
  const fill = dim ? s.passedColor : "#111";
  const chars = [...name];

  if (!s.nameAngle) {
    const ys = nameYs(chars.length, v);
    return (
      <>
        {chars.map((ch, j) => (
          <text
            key={j}
            x={x}
            y={ys[j]}
            fill={fill}
            fontSize={s.nameSize}
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {ch}
          </text>
        ))}
      </>
    );
  }

  // 起点は駅番号バッジのすぐ上。そこから右上へ向けて書く
  const baseY = nameBottom(v);
  const baseX = x + s.nameAngleX;
  return (
    <FitText
      maxW={nameSpan(v)}
      size={s.nameSize}
      x={baseX}
      y={baseY}
      fill={fill}
      fontWeight="bold"
      textAnchor="start"
      transform={`rotate(${s.nameAngle} ${baseX} ${baseY})`}
    >
      {name}
    </FitText>
  );
}

export const VisionSvg = forwardRef<SVGSVGElement, { v: Vision }>(function VisionSvg({ v }, ref) {
  const s = v.style;
  const p = place(v);
  const n = p.stations.length;
  const mid = s.barY + s.barH / 2;
  const headH = headerHeight(v);

  // 「つぎは」段があるときは上段を白枠にし、行き先を小さくしてその中へ入れる。
  // 上段の高さは段数によらず種別バッジで決まる
  const two = v.next !== null;
  const boxH = topHeight(s);
  const boxL = s.typeX + s.typeW + s.destBoxGap;
  const boxR = s.w - s.destBoxInset;
  const k = two ? s.destShrink : 1;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${s.w} ${s.h}`}
      fontFamily={s.font}
    >
      <rect width={s.w} height={s.h} fill="#fff" />
      <rect width={s.w} height={headH} fill={s.headerBg} />

      {v.type && (
        <Badge
          x={s.typeX}
          y={s.typeY}
          w={s.typeW}
          h={s.typeH}
          r={s.typeR}
          fill={v.type.bg}
          fg={v.type.fg}
          size={s.typeSize}
          text={v.type.text}
          stroke="#fff"
          strokeWidth={4}
        />
      )}

      {two && (
        <rect
          x={boxL}
          y={s.typeY}
          width={boxR - boxL}
          height={s.typeH}
          rx={s.destBoxR}
          fill="#fff"
        />
      )}

      <DestLine
        text={v.dest.text}
        suffix={v.dest.suffix}
        code={v.dest.code}
        left={two ? boxL : 0}
        right={two ? boxR - s.destBoxGap : s.w - s.padX}
        y={two ? boxH / 2 : headH * 0.72}
        fg={two ? "#111" : s.headerFg}
        s={s}
        size={s.destSize * k}
        spacing={s.destSpacing}
        suffixSize={s.suffixSize * k}
        codeW={s.destCodeW * k}
        codeH={s.destCodeH * k}
        codeSize={s.destCodeSize * k}
        codeStroke={two ? undefined : "#fff"}
      />

      {v.next && (
        <>
          <text
            x={s.nextLabelX}
            y={(boxH + headH) / 2}
            fill={s.headerFg}
            fontSize={s.nextLabelSize}
            fontWeight="bold"
            dominantBaseline="central"
          >
            {v.next.label}
          </text>
          <DestLine
            text={v.next.name}
            suffix=""
            code={v.next.code}
            left={s.nextLabelX + textWidth(v.next.label, s.nextLabelSize) + s.destGap}
            right={s.w - s.destBoxInset}
            y={(boxH + headH) / 2}
            fg={s.headerFg}
            s={s}
            size={s.nextSize}
            spacing={s.nextSpacing}
            suffixSize={s.suffixSize}
            codeW={s.nextCodeW}
            codeH={s.nextCodeH}
            codeSize={s.nextCodeSize}
          />
        </>
      )}

      <path d={chevronPath(p, s)} fill={s.lineColor} />
      {/* 端の駅に停車中は後方の帯そのものがないので、末端の矢印も出さない */}
      {p.tailOpen && !tailClipped(p) && <path d={chevronPath(p, s, "tail")} fill={s.passedColor} />}
      {segments(p, s).map((seg, i) => (
        <path key={i} d={segmentPath(seg, p, s)} fill={seg.passed ? s.passedColor : s.lineColor} />
      ))}

      {p.stations.map((st, i) => {
        const X = p.cx(i);
        // 通過駅も、すでに通り過ぎた駅も灰色にする
        const dim = isPassed(p, i) || !st.stop;
        const codeTop = s.barY - s.codeGap - s.codeH;
        const ruleY = s.barY + s.barH + s.transferGap;
        return (
          <g key={i}>
            <StationName name={st.name} x={X} v={v} dim={dim} />

            {st.code && (
              <Badge
                x={X - s.codeW / 2}
                y={codeTop}
                w={s.codeW}
                h={s.codeH}
                r={4}
                fill={dim ? s.passedColor : s.lineColor}
                size={s.codeSize}
                text={st.code}
                stroke="#fff"
                strokeWidth={2}
              />
            )}

            {i !== p.current &&
              (st.stop ? (
                <circle cx={X} cy={mid} r={s.stopR} fill="#fff" />
              ) : (
                <rect
                  x={X - s.passW / 2}
                  y={mid - s.passH / 2}
                  width={s.passW}
                  height={s.passH}
                  fill="#fff"
                />
              ))}

            {st.transfers.length > 0 && (
              <>
                <rect
                  x={X - (p.slot * s.transferRuleW) / 2}
                  y={ruleY}
                  width={p.slot * s.transferRuleW}
                  height={2}
                  fill="#666"
                />
                {st.transfers.map((t, j) => (
                  <text
                    key={j}
                    x={X}
                    y={ruleY + 6 + s.transferLineH * j + s.transferSize / 2}
                    fill="#333"
                    fontSize={s.transferSize}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {t}
                  </text>
                ))}
              </>
            )}
          </g>
        );
      })}

      {p.current >= 0 && p.current <= n - 1 && (
        /* 白い隙間は帯側の切り口で作るので、マーカー自体に縁取りは要らない */
        <path d={markerPath(p, s)} fill={s.markerColor} />
      )}
    </svg>
  );
});
