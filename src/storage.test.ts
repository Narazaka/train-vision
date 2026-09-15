import { describe, expect, it } from "vitest";
import { DEFAULT_STYLE, DEFAULT_VISION } from "./defaults";
import { normalize } from "./storage";
import type { Vision } from "./types";

describe("normalize", () => {
  it("style に後から増えたキーを既定値で埋める", () => {
    // 古いプリセットには tailOverhang のような新しいキーがない
    const { tailOverhang: _drop, ...old } = DEFAULT_STYLE;
    const saved = { ...DEFAULT_VISION, style: old } as unknown as Vision;
    expect(normalize(saved).style.tailOverhang).toBe(DEFAULT_STYLE.tailOverhang);
  });

  it("保存されている値は既定値で上書きしない", () => {
    const saved: Vision = {
      ...DEFAULT_VISION,
      dest: { text: "名古屋", suffix: "ゆき", code: "E01" },
      style: { ...DEFAULT_STYLE, barH: 60 },
    };
    const v = normalize(saved);
    expect(v.dest.text).toBe("名古屋");
    expect(v.style.barH).toBe(60);
  });

  it("style がまるごと無くても落ちない（JSON 貼り付けで省略された場合）", () => {
    const { style: _drop, ...noStyle } = DEFAULT_VISION;
    const v = normalize(noStyle as unknown as Vision);
    expect(v.style.w).toBe(DEFAULT_STYLE.w);
    expect(v.style.barH).toBe(DEFAULT_STYLE.barH);
  });

  it("新しく足したフィールドが欠けていても既定値で補う", () => {
    const { tailOpen: _a, next: _b, ...old } = DEFAULT_VISION;
    const v = normalize(old as unknown as Vision);
    expect(v.tailOpen).toBe(DEFAULT_VISION.tailOpen);
    expect(v.next).toBe(DEFAULT_VISION.next);
  });
});
