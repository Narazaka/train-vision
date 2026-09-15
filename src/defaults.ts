import type { Style, Vision } from "./types";

export const DEFAULT_STYLE: Style = {
  w: 960,
  h: 720,

  headerH: 240,
  headerBg: "#000000",
  headerFg: "#ffffff",
  font: "'Yu Gothic', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",

  lineColor: "#0b5fbf",
  passedColor: "#9b9b9b",
  markerColor: "#a81c12",

  typeX: 28,
  typeY: 22,
  typeW: 270,
  typeH: 80,
  typeR: 12,
  typeSize: 52,

  destSize: 96,
  destSpacing: 0.12,
  suffixSize: 44,
  destCodeW: 118,
  destCodeH: 64,
  destCodeSize: 48,
  destGap: 14,
  suffixBefore: false,
  destBoxInset: 17,
  destBoxGap: 11,
  destBoxR: 8,
  destShrink: 0.62,

  nextLabelX: 24,
  nextLabelSize: 46,
  nextSize: 92,
  nextSpacing: 0.12,
  nextCodeW: 112,
  nextCodeH: 62,
  nextCodeSize: 46,
  destOffset: 0,

  padX: 45,
  nameGap: 24,
  nameBottomGap: 26,
  nameSize: 50,
  nameAngle: 0,
  nameAngleX: -22,

  barY: 552,
  barH: 44,
  barOverhang: 34,
  tailOverhang: 58,
  tipD: 21,
  curveD: 4,
  segGap: 15,
  chevW: 3,
  chevGap: 2,

  markerW: 44,
  markerH: 52,
  markerTipD: 23,
  markerGap: 3,

  stopR: 13,
  passW: 23,
  passH: 7,

  codeW: 50,
  codeH: 34,
  codeGap: 14,
  codeSize: 24,

  transferSize: 15,
  transferLineH: 18,
  transferGap: 14,
  transferRuleW: 0.84,
};

/** 日本語表記と英字表記で入れ替わる見た目。テキストそのものは切り替えない */
export const LAYOUTS = {
  ja: { nameAngle: 0, suffixBefore: false },
  en: { nameAngle: -60, suffixBefore: true },
} as const;

/** 「つぎは」の既定ラベル。ユーザーが書き換えていなければ表記に合わせて入れ替える */
export const NEXT_LABELS = { ja: "つぎは", en: "Next" } as const;

export const DEFAULT_VISION: Vision = {
  type: { text: "急 行", bg: "#e8730a", fg: "#ffffff" },
  dest: { text: "四日市", suffix: "ゆき", code: "E21" },
  heading: "left",
  current: 7,
  reverse: false,
  tailOpen: false,
  next: null,
  stations: [
    { name: "弥富", code: "E11", stop: true, gap: false, transfers: ["JR線", "地下鉄"] },
    { name: "蟹江", code: "E08", stop: true, gap: true, transfers: [] },
    { name: "伏屋", code: "E06", stop: false, gap: true, transfers: [] },
    { name: "八田", code: "E05", stop: false, gap: false, transfers: [] },
    { name: "烏森", code: "E04", stop: false, gap: false, transfers: [] },
    { name: "黄金", code: "E03", stop: false, gap: false, transfers: [] },
    { name: "米野", code: "E02", stop: false, gap: false, transfers: [] },
    {
      name: "名古屋",
      code: "E01",
      stop: true,
      gap: false,
      transfers: ["JR線", "名鉄線", "地下鉄", "あおなみ線"],
    },
  ],
  style: DEFAULT_STYLE,
};
