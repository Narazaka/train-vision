import type { Station, Style, Vision } from "./types";

/**
 * gap は「その駅と配列上ひとつ前の駅の間」を指す。
 * 境界 b は stations[b-1] と stations[b] の間なので、左右反転すると n-b に移る。
 */
export function cutIndices(stations: Station[], reverse: boolean): number[] {
  const n = stations.length;
  return stations
    .flatMap((st, i) => (i > 0 && st.gap ? [reverse ? n - i : i] : []))
    .sort((a, b) => a - b);
}

/**
 * 行き先を載せる段の高さ。種別バッジとその上下の余白で決まり、
 * 「つぎは」段の有無で変わらない。
 */
export function topHeight(s: Style): number {
  return s.typeY * 2 + s.typeH;
}

/** 黒地の高さ。「つぎは」段の有無で変わらず、その中を上下に分ける */
export function headerHeight(v: Vision): number {
  return v.style.headerH;
}

/**
 * 文字列の幅のおおよその見積もり。全角は font-size ぶん、ASCII は約 0.55 倍として数える。
 * 実際の字幅はこれより1割ほど広くなることがあるので、収まり判定には使わず
 * （そちらは描画後に実測する）、隣に置くものの位置決めにだけ使う。
 */
export function textWidth(text: string, size: number, spacing = 0): number {
  let units = 0;
  for (const ch of text) units += ch.charCodeAt(0) < 0x2e80 ? 0.55 : 1;
  return size * (units + spacing * [...text].length);
}

/** 欧文だけの行に全角用の字間を入れると間延びするので、その場合は字間なしとして扱う */
export function spacingFor(text: string, spacing: number): number {
  return [...text].every((ch) => ch.charCodeAt(0) < 0x2e80) ? 0 : spacing;
}

/** 駅名を置ける長さ。斜めのときは傾けたぶん長く書ける */
export function nameSpan(v: Vision): number {
  const s = v.style;
  const h = nameBottom(v) - (headerHeight(v) + s.nameGap);
  if (!s.nameAngle) return h;
  return h / Math.abs(Math.sin((s.nameAngle * Math.PI) / 180));
}

/** 駅名の下端（＝斜め表示のときの起点）。駅番号バッジの上に置く */
export function nameBottom(v: Vision): number {
  const s = v.style;
  return s.barY - s.codeGap - s.codeH - s.nameBottomGap;
}

/**
 * 縦積みした駅名の各文字の中心y。1文字目を上、最後の文字を下に固定して間を等分する
 * （2文字なら上下に離れ、3文字なら等間隔になる）。
 */
export function nameYs(count: number, v: Vision): number[] {
  const s = v.style;
  const top = headerHeight(v) + s.nameGap + s.nameSize / 2;
  const bottom = nameBottom(v);
  if (count <= 1) return [top];
  return Array.from({ length: count }, (_, i) => top + ((bottom - top) * i) / (count - 1));
}

export type Placed = {
  stations: Station[];
  /** 画面上での進行方向が左か */
  left: boolean;
  /** 表示順での現在位置 index（なければ -1） */
  current: number;
  cuts: number[];
  cx: (i: number) => number;
  slot: number;
  tailOpen: boolean;
};

/** reverse を解決して、画面左→右の並びと各駅の中心xを決める */
export function place(v: Vision): Placed {
  const { stations, reverse, style: s } = v;
  const n = stations.length;
  const slot = (s.w - s.padX * 2) / n;
  return {
    stations: reverse ? [...stations].reverse() : stations,
    left: reverse ? v.heading === "right" : v.heading === "left",
    current: v.current == null ? -1 : reverse ? n - 1 - v.current : v.current,
    cuts: cutIndices(stations, reverse),
    cx: (i) => s.padX + slot * (i + 0.5),
    slot,
    tailOpen: v.tailOpen,
  };
}

/** 駅が現在位置より後方（通過済み）か。駅名・駅番号を灰色にする条件 */
export function isPassed(p: Placed, i: number): boolean {
  if (p.current < 0) return false;
  return p.left ? i > p.current : i < p.current;
}

/**
 * 現在位置の手前で帯を切る V 字の深さ。
 * 赤マーカーの斜辺をそのまま水平にずらした形にしたいので、同じ傾きのまま
 * 帯の高さぶんだけ切り取った深さを使う。こうすると隙間の幅がどこでも一定になる。
 */
export function cutDepth(s: Style): number {
  return (s.markerTipD * s.barH) / s.markerH;
}

/** 進行方向。画面上で左へ進むなら -1 */
function advance(p: Placed): number {
  return p.left ? -1 : 1;
}

/** マーカーの後端。赤マーカーは現在位置の駅の中心に置く */
export function markerBackX(p: Placed, s: Style): number {
  return p.cx(p.current) - (advance(p) * s.markerW) / 2;
}

/** 端の駅に停車中か。このとき後方の帯はその駅で消える */
export function tailClipped(p: Placed): boolean {
  return p.current === (p.left ? p.stations.length - 1 : 0);
}

/**
 * 帯の左右端。進行方向側は端の駅から barOverhang だけ張り出し、
 * 反対側は現在位置が端の駅ならそこで終わる（通過済みの区間は描かない）。
 */
export function barEnds(p: Placed, s: Style): { l: number; r: number } {
  const n = p.stations.length;
  const head = p.left ? p.cx(0) - s.barOverhang : p.cx(n - 1) + s.barOverhang;
  // 後方に路線が続くなら先端より長く張り出し、起点なら最後の駅の位置で切り落とす
  const overhang = p.tailOpen ? s.tailOverhang : s.markerW / 2;
  const tail = tailClipped(p)
    ? markerBackX(p, s)
    : p.left
      ? p.cx(n - 1) + overhang
      : p.cx(0) - overhang;
  return p.left ? { l: head, r: tail } : { l: tail, r: head };
}

/**
 * 帯の縦端の形。
 * - point は進行方向への変位。先頭では外へ尖り、末端では内へ食い込む（同じ式で両方になる）
 * - cut は現在位置の手前で帯を切る浅い V 字
 * - seam は駅を省略した箇所の S 字
 * - flat は垂直に切り落とす
 */
export type Edge = "point" | "cut" | "seam" | "flat";

export type Segment = {
  x0: number;
  x1: number;
  left: Edge;
  right: Edge;
  /** 現在位置より後方の区間。灰色で描く */
  passed: boolean;
};

/** 帯を切れ目と現在位置で分割した各区間 */
export function segments(p: Placed, s: Style): Segment[] {
  const n = p.stations.length;
  const { l, r } = barEnds(p, s);
  const g = s.segGap / 2;
  const bounds = [0, ...p.cuts, n];
  // 進行方向の先頭は外へ尖り、末端は路線が続くなら内へ食い込ませ、起点なら垂直に切る
  const headEdge: Edge = "point";
  const tailEdge: Edge = p.tailOpen ? "point" : "flat";

  const out: Segment[] = [];
  for (let k = 0; k + 1 < bounds.length; k++) {
    const a = bounds[k];
    const b = bounds[k + 1];
    const x0 = a === 0 ? l : (p.cx(a - 1) + p.cx(a)) / 2 + g;
    const x1 = b === n ? r : (p.cx(b - 1) + p.cx(b)) / 2 - g;
    out.push({
      x0,
      x1,
      left: a !== 0 ? "seam" : p.left ? headEdge : tailEdge,
      right: b !== n ? "seam" : p.left ? tailEdge : headEdge,
      passed: false,
    });
  }
  return splitAtMarker(out, p, s);
}

/**
 * 現在位置で区間を前方（青）と後方（灰）に切り分ける。
 * 前方側の切り口は赤マーカーの尖りをなぞる V 字、後方側は垂直。
 * どちらも markerGap だけ退かせるので、間に白い隙間が残る。
 */
function splitAtMarker(segs: Segment[], p: Placed, s: Style): Segment[] {
  if (p.current < 0) return segs;
  const adv = advance(p);
  const back = markerBackX(p, s);
  // V 字の底を赤の先端の markerGap だけ手前に置き、そこから深さぶん戻した位置が口になる
  const tip = back + adv * s.markerW;
  const headCut = tip + adv * (s.markerGap - cutDepth(s));
  const tailCut = back - adv * s.markerGap;

  return segs.flatMap((seg) => {
    const aheadOfMarker = (x: number) => (p.left ? x <= headCut : x >= headCut);
    if (aheadOfMarker(seg.x1) && aheadOfMarker(seg.x0)) return [{ ...seg, passed: false }];
    const behind = p.left ? seg.x0 >= tailCut : seg.x1 <= tailCut;
    if (behind) return [{ ...seg, passed: true }];

    const ahead: Segment = p.left
      ? { ...seg, x1: headCut, right: "cut", passed: false }
      : { ...seg, x0: headCut, left: "cut", passed: false };
    const tail: Segment = p.left
      ? { ...seg, x0: tailCut, left: "flat", passed: true }
      : { ...seg, x1: tailCut, right: "flat", passed: true };
    // 区間の外にはみ出す側は捨てる（現在位置が端にあるとき片方は幅ゼロになる）
    const keep = [p.left ? ahead : tail, p.left ? tail : ahead].filter((x) => x.x1 - x.x0 > 0.5);
    return keep;
  });
}

/** 縦端を上端から下端へ描く断片。out は端の外向き(-1=左, +1=右)、adv は進行方向 */
function edgeDown(x: number, top: number, bot: number, kind: Edge, s: Style, out: number, adv: number): string {
  const m = (top + bot) / 2;
  if (kind === "point") return `L ${x + adv * s.tipD} ${m} L ${x} ${bot}`;
  if (kind === "cut") return `L ${x + adv * cutDepth(s)} ${m} L ${x} ${bot}`;
  if (kind === "flat") return `L ${x} ${bot}`;
  const h = bot - top;
  const k = s.curveD * SWEEP_GAIN * (adv < 0 ? 1 : -1);
  void out;
  return `C ${x + k} ${top + h / 3} ${x - k} ${top + (h * 2) / 3} ${x} ${bot}`;
}

/** 同じ端を下端から上端へ辿る（制御点を逆順にすれば同一の曲線になる） */
function edgeUp(x: number, top: number, bot: number, kind: Edge, s: Style, out: number, adv: number): string {
  const m = (top + bot) / 2;
  if (kind === "point") return `L ${x + adv * s.tipD} ${m} L ${x} ${top}`;
  if (kind === "cut") return `L ${x + adv * cutDepth(s)} ${m} L ${x} ${top}`;
  if (kind === "flat") return `L ${x} ${top}`;
  const h = bot - top;
  const k = s.curveD * SWEEP_GAIN * (adv < 0 ? 1 : -1);
  void out;
  return `C ${x - k} ${top + (h * 2) / 3} ${x + k} ${top + h / 3} ${x} ${top}`;
}

/**
 * S 字の制御点オフセットを、見た目の振れ幅から逆算する係数。
 * C(x, x+k, x-k, x) の曲線が最も振れるのは t≈0.211 で、そこでの変位は k の約 0.289 倍しかない。
 * curveD に実際の振れ幅を書けるよう、制御点はその逆数ぶん遠くへ置く。
 */
const SWEEP_GAIN = 1 / 0.2887;

export function segmentPath(seg: Segment, p: Placed, s: Style): string {
  const top = s.barY;
  const bot = s.barY + s.barH;
  const adv = advance(p);
  return (
    `M ${seg.x0} ${top} ` +
    edgeDown(seg.x0, top, bot, seg.left, s, -1, adv) +
    ` L ${seg.x1} ${bot} ` +
    edgeUp(seg.x1, top, bot, seg.right, s, 1, adv) +
    " Z"
  );
}

/**
 * 帯の端に重ねる「<」形。帯とほぼ同じ形を外へずらしたもので、
 * 内側は帯に覆われ、はみ出した chevW ぶんだけが細い線として見える。
 * 尖る向きは先頭・末端とも進行方向で変わらない。
 */
export function chevronPath(p: Placed, s: Style, side: "head" | "tail" = "head"): string {
  const top = s.barY;
  const bot = s.barY + s.barH;
  const m = (top + bot) / 2;
  const adv = advance(p);
  const ends = barEnds(p, s);
  const atLeft = side === "head" ? p.left : !p.left;
  const base = atLeft ? ends.l : ends.r;
  const outward = atLeft ? -1 : 1;
  const depth = s.tipD;
  const outer = base + outward * (s.chevGap + s.chevW);
  const inner = base + outward * s.chevGap;
  return (
    `M ${outer} ${top} L ${outer + adv * depth} ${m} L ${outer} ${bot} ` +
    `L ${inner} ${bot} L ${inner + adv * depth} ${m} L ${inner} ${top} Z`
  );
}

/** 現在位置の赤マーカー。進行方向へ尖り、後方は垂直に切り落とす */
export function markerPath(p: Placed, s: Style): string {
  const m = s.barY + s.barH / 2;
  const top = m - s.markerH / 2;
  const bot = m + s.markerH / 2;
  const adv = advance(p);
  const back = markerBackX(p, s);
  const tipX = back + adv * s.markerW;
  const shoulder = tipX - adv * s.markerTipD;
  return `M ${back} ${top} L ${shoulder} ${top} L ${tipX} ${m} L ${shoulder} ${bot} L ${back} ${bot} Z`;
}
