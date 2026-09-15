import { useEffect, useRef, useState } from "react";
import type { Vision } from "./types";
import { DEFAULT_VISION } from "./defaults";
import { VisionSvg } from "./Vision";
import { Editor } from "./Editor";
import { savePng } from "./png";
import { loadCurrent, loadPresets, normalize, saveCurrent, savePresets } from "./storage";

/** プリセット選択欄で「既定値に戻す」を表す値。プリセット名と衝突しないよう括弧付き */
const RESET = "(既定値に戻す)";

export function App() {
  const [v, setV] = useState<Vision>(loadCurrent);
  const [presets, setPresets] = useState(loadPresets);
  const [name, setName] = useState("");
  const [scale, setScale] = useState(2);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    saveCurrent(v);
  }, [v]);

  const writePresets = (next: Record<string, Vision>) => {
    setPresets(next);
    savePresets(next);
  };

  const pick = (key: string) => {
    if (key === RESET) {
      setV(DEFAULT_VISION);
      setName("");
    } else if (presets[key]) {
      setV(normalize(presets[key]));
      setName(key);
    }
  };

  const trimmed = name.trim();
  const out = `${v.style.w * scale}×${v.style.h * scale}`;

  return (
    <div className="app">
      <div className="pane left">
        <Editor v={v} onChange={setV} />
      </div>
      <div className="pane right">
        <div className="toolbar">
          {/* 選ぶたびに読み込みたいので、選択状態は持たず常に空に戻す */}
          <select value="" onChange={(e) => pick(e.target.value)}>
            <option value="">プリセットを読み込む…</option>
            <option value={RESET}>{RESET}</option>
            {Object.keys(presets)
              .sort()
              .map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
          </select>
          <input
            placeholder="プリセット名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={!trimmed}
            onClick={() => writePresets({ ...presets, [trimmed]: v })}
            title="この名前で現在の内容を保存（同名なら上書き）"
          >
            保存
          </button>
          <button
            disabled={!presets[trimmed]}
            onClick={() => {
              const { [trimmed]: _drop, ...rest } = presets;
              writePresets(rest);
            }}
          >
            削除
          </button>
        </div>
        <div className="toolbar">
          <label>
            倍率{" "}
            <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
              {[1, 2, 4, 8].map((k) => (
                <option key={k} value={k}>
                  ×{k}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={busy}
            onClick={async () => {
              if (!svgRef.current) return;
              setBusy(true);
              setErr("");
              setDone("");
              try {
                setDone(await savePng(svgRef.current, scale, v.dest.text));
              } catch (e) {
                setErr(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "書き出し中…" : "PNG保存"}
          </button>
          <span className="size">{out}</span>
          {done && <span className="done">{done} を書き出しました</span>}
          {err && <span className="err">{err}</span>}
        </div>
        <div className="preview">
          <VisionSvg ref={svgRef} v={v} />
        </div>
      </div>
    </div>
  );
}
