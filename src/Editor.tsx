import { useState } from "react";
import type { Station, Style, Vision } from "./types";
import { DEFAULT_STYLE, LAYOUTS, NEXT_LABELS } from "./defaults";
import { normalize } from "./storage";

type Props = { v: Vision; onChange: (v: Vision) => void };

const STYLE_GROUPS: { title: string; keys: (keyof Style)[] }[] = [
  { title: "全体", keys: ["w", "h", "font", "padX"] },
  { title: "ヘッダー", keys: ["headerH", "headerBg", "headerFg"] },
  { title: "種別バッジ", keys: ["typeX", "typeY", "typeW", "typeH", "typeR", "typeSize"] },
  {
    title: "行き先",
    keys: ["destSize", "destSpacing", "suffixSize", "destCodeW", "destCodeH", "destCodeSize", "destGap", "destOffset", "suffixBefore",
      "destBoxInset", "destBoxGap", "destBoxR", "destShrink"],
  },
  { title: "駅名", keys: ["nameGap", "nameBottomGap", "nameSize", "nameAngle", "nameAngleX"] },
  { title: "駅番号", keys: ["codeW", "codeH", "codeGap", "codeSize"] },
  {
    title: "路線帯",
    keys: ["barY", "barH", "barOverhang", "tailOverhang", "lineColor", "passedColor",
      "tipD", "curveD", "segGap", "chevW", "chevGap"],
  },
  { title: "駅の印", keys: ["stopR", "passW", "passH"] },
  { title: "現在位置", keys: ["markerColor", "markerW", "markerH", "markerTipD", "markerGap"] },
  {
    title: "つぎは",
    keys: ["nextLabelX", "nextLabelSize", "nextSize", "nextSpacing", "nextCodeW", "nextCodeH", "nextCodeSize"],
  },
  { title: "乗換表示", keys: ["transferSize", "transferLineH", "transferGap", "transferRuleW"] },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="row">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Editor({ v, onChange }: Props) {
  const [openStyle, setOpenStyle] = useState(false);
  const [openJson, setOpenJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonErr, setJsonErr] = useState("");

  const set = (patch: Partial<Vision>) => onChange({ ...v, ...patch });
  const setStyle = (patch: Partial<Style>) => set({ style: { ...v.style, ...patch } });

  const setStation = (i: number, patch: Partial<Station>) =>
    set({ stations: v.stations.map((st, j) => (j === i ? { ...st, ...patch } : st)) });

  const moveStation = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= v.stations.length) return;
    const next = [...v.stations];
    [next[i], next[j]] = [next[j], next[i]];
    // 現在位置は駅そのものに付いているので、入れ替えに追随させる
    const cur = v.current === i ? j : v.current === j ? i : v.current;
    set({ stations: next, current: cur });
  };

  const removeStation = (i: number) => {
    const next = v.stations.filter((_, j) => j !== i);
    const cur = v.current == null ? null : v.current === i ? null : v.current > i ? v.current - 1 : v.current;
    set({ stations: next, current: cur });
  };

  // 現在位置は「駅 index（停車中）」か「駅と次の駅のちょうど中間（走行中）」のどちらか。
  // 最後の駅の先には駅がないので、そこでは走行中にできない
  const lastStation = v.stations.length - 1;
  const baseStation = v.current == null ? null : Math.floor(v.current);
  const running = v.current != null && v.current % 1 !== 0;
  const setCurrent = (i: number, between: boolean) =>
    set({ current: between && i < lastStation ? i + 0.5 : i });

  const addStation = () =>
    set({
      stations: [...v.stations, { name: "新駅", code: "", stop: false, gap: false, transfers: [] }],
    });

  // 表記は style の組み合わせで決まる。傾いていれば英字表記
  const lang: keyof typeof LAYOUTS = v.style.nameAngle === 0 ? "ja" : "en";
  const setLang = (next: keyof typeof LAYOUTS) => {
    const keepsDefaultLabel =
      v.next !== null && (Object.values(NEXT_LABELS) as string[]).includes(v.next.label);
    set({
      style: { ...v.style, ...LAYOUTS[next] },
      ...(keepsDefaultLabel ? { next: { ...v.next!, label: NEXT_LABELS[next] } } : {}),
    });
  };

  return (
    <div className="editor">
      <fieldset>
        <legend>表記</legend>
        <Row label="駅名の並びと語順">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as keyof typeof LAYOUTS)}
            title="駅名の書き方と接尾語の位置を切り替えます。駅名や行き先の文字は変わりません"
          >
            <option value="ja">日本語（縦積み／○○ ゆき）</option>
            <option value="en">英字（斜め／for ○○）</option>
          </select>
        </Row>
      </fieldset>

      <fieldset>
        <legend>種別</legend>
        <Row label="表示する">
          <input
            type="checkbox"
            checked={v.type !== null}
            onChange={(e) =>
              set({ type: e.target.checked ? { text: "普 通", bg: "#444444", fg: "#ffffff" } : null })
            }
          />
        </Row>
        {v.type && (
          <>
            <Row label="種別名">
              <input
                value={v.type.text}
                onChange={(e) => set({ type: { ...v.type!, text: e.target.value } })}
              />
            </Row>
            <Row label="背景色">
              <input
                type="color"
                value={v.type.bg}
                onChange={(e) => set({ type: { ...v.type!, bg: e.target.value } })}
              />
            </Row>
            <Row label="文字色">
              <input
                type="color"
                value={v.type.fg}
                onChange={(e) => set({ type: { ...v.type!, fg: e.target.value } })}
              />
            </Row>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>行き先</legend>
        <Row label="行き先">
          <input
            value={v.dest.text}
            onChange={(e) => set({ dest: { ...v.dest, text: e.target.value } })}
          />
        </Row>
        <Row label="接尾語">
          <input
            value={v.dest.suffix}
            onChange={(e) => set({ dest: { ...v.dest, suffix: e.target.value } })}
          />
        </Row>
        <Row label="駅番号">
          <input
            value={v.dest.code}
            onChange={(e) => set({ dest: { ...v.dest, code: e.target.value } })}
          />
        </Row>
      </fieldset>

      <fieldset>
        <legend>つぎは（走行中表示）</legend>
        <Row label="表示する">
          <input
            type="checkbox"
            checked={v.next !== null}
            onChange={(e) => {
              if (!e.target.checked) return set({ next: null });
              // 現在位置の次の駅を初期値にする
              const i = Math.floor(v.current ?? 0);
              const nx = v.stations[v.heading === "left" ? i - 1 : i + 1] ?? v.stations[i];
              set({ next: { label: "つぎは", name: nx?.name ?? "", code: nx?.code ?? "" } });
            }}
          />
        </Row>
        {v.next && (
          <>
            <Row label="ラベル">
              <input
                value={v.next.label}
                onChange={(e) => set({ next: { ...v.next!, label: e.target.value } })}
              />
            </Row>
            <Row label="次の駅">
              <input
                value={v.next.name}
                onChange={(e) => set({ next: { ...v.next!, name: e.target.value } })}
              />
            </Row>
            <Row label="駅番号">
              <input
                value={v.next.code}
                onChange={(e) => set({ next: { ...v.next!, code: e.target.value } })}
              />
            </Row>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>進行方向</legend>
        <Row label="進む向き">
          <select
            value={v.heading}
            onChange={(e) => set({ heading: e.target.value as Vision["heading"] })}
          >
            <option value="left">← 左へ進む</option>
            <option value="right">右へ進む →</option>
          </select>
        </Row>
        <Row label="左右反転（ドア方向）">
          <input
            type="checkbox"
            checked={v.reverse}
            onChange={(e) => set({ reverse: e.target.checked })}
          />
        </Row>
        <Row label="後方にも路線が続く">
          <input
            type="checkbox"
            checked={v.tailOpen}
            onChange={(e) => set({ tailOpen: e.target.checked })}
          />
        </Row>
        <Row label="駅間を走行中">
          <input
            type="checkbox"
            disabled={v.current == null || baseStation === lastStation}
            checked={running}
            onChange={(e) => setCurrent(baseStation ?? 0, e.target.checked)}
          />
        </Row>
      </fieldset>

      <fieldset>
        <legend>駅</legend>
        <table className="stations">
          <thead>
            <tr>
              <th>駅名</th>
              <th>番号</th>
              <th title="停車駅">停</th>
              <th title="ひとつ前の駅との間で駅を省略する">省</th>
              <th title="現在位置">現</th>
              <th>乗換（カンマ区切り）</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {v.stations.map((st, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="name"
                    value={st.name}
                    onChange={(e) => setStation(i, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="code"
                    value={st.code}
                    onChange={(e) => setStation(i, { code: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={st.stop}
                    onChange={(e) => setStation(i, { stop: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    disabled={i === 0}
                    checked={st.gap}
                    onChange={(e) => setStation(i, { gap: e.target.checked })}
                  />
                </td>
                <td>
                  <input
                    type="radio"
                    name="current"
                    checked={baseStation === i}
                    onChange={() => setCurrent(i, running)}
                  />
                </td>
                <td>
                  <input
                    className="transfers"
                    value={st.transfers.join(",")}
                    onChange={(e) =>
                      setStation(i, {
                        transfers: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </td>
                <td className="ops">
                  <button onClick={() => moveStation(i, -1)} title="左へ">
                    ◀
                  </button>
                  <button onClick={() => moveStation(i, 1)} title="右へ">
                    ▶
                  </button>
                  <button onClick={() => removeStation(i)} title="削除">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="actions">
          <button onClick={addStation}>＋ 駅を追加</button>
          <button onClick={() => set({ current: null })}>現在位置をなくす</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <button className="toggle" onClick={() => setOpenStyle(!openStyle)}>
            {openStyle ? "▼" : "▶"} 見た目の調整
          </button>
        </legend>
        {openStyle && (
          <>
            {STYLE_GROUPS.map((gr) => (
              <div key={gr.title} className="group">
                <h4>{gr.title}</h4>
                {gr.keys.map((k) => {
                  const val = v.style[k];
                  return (
                    <Row key={k} label={k}>
                      {typeof val === "boolean" ? (
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={(e) => setStyle({ [k]: e.target.checked } as Partial<Style>)}
                        />
                      ) : typeof val === "number" ? (
                        <input
                          type="number"
                          step={k === "destSpacing" || k === "transferRuleW" ? 0.01 : 1}
                          value={val}
                          onChange={(e) => setStyle({ [k]: Number(e.target.value) } as Partial<Style>)}
                        />
                      ) : k.endsWith("Color") || k.endsWith("Bg") || k.endsWith("Fg") ? (
                        <input
                          type="color"
                          value={val}
                          onChange={(e) => setStyle({ [k]: e.target.value } as Partial<Style>)}
                        />
                      ) : (
                        <input
                          value={val}
                          onChange={(e) => setStyle({ [k]: e.target.value } as Partial<Style>)}
                        />
                      )}
                    </Row>
                  );
                })}
              </div>
            ))}
            <div className="actions">
              <button onClick={() => set({ style: DEFAULT_STYLE })}>見た目を既定値に戻す</button>
            </div>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend>
          <button
            className="toggle"
            onClick={() => {
              if (!openJson) setJsonText(JSON.stringify(v, null, 2));
              setOpenJson(!openJson);
            }}
          >
            {openJson ? "▼" : "▶"} JSON で読み書き
          </button>
        </legend>
        {openJson && (
          <>
            <textarea
              className="json"
              spellCheck={false}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <div className="actions">
              <button
                onClick={() => {
                  try {
                    // 足りないキーを既定値で補う。読み込み時と同じ扱いにする
                    onChange(normalize(JSON.parse(jsonText) as Vision));
                    setJsonErr("");
                  } catch (e) {
                    setJsonErr(String(e));
                  }
                }}
              >
                この JSON を反映
              </button>
              <button onClick={() => setJsonText(JSON.stringify(v, null, 2))}>現在値を書き出す</button>
            </div>
            {jsonErr && <p className="err">{jsonErr}</p>}
          </>
        )}
      </fieldset>
    </div>
  );
}
