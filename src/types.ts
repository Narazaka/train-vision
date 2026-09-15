export type Station = {
  name: string;
  code: string;
  /** 停車駅。false なら通過（駅名が灰色、帯の印が横棒になる） */
  stop: boolean;
  /** この駅と配列上ひとつ前の駅の間で駅を省略している（帯に切れ目が入る） */
  gap: boolean;
  transfers: string[];
};

export type TypeBadge = { text: string; bg: string; fg: string };

/** 走行中の「つぎは ○○」表示。null なら行き先だけの1段ヘッダー */
export type NextStop = { label: string; name: string; code: string };

export type Style = {
  w: number;
  h: number;

  /** 黒地の高さ。「つぎは」段があってもこの中に収める */
  headerH: number;
  headerBg: string;
  headerFg: string;
  font: string;

  lineColor: string;
  passedColor: string;
  markerColor: string;

  typeX: number;
  typeY: number;
  typeW: number;
  typeH: number;
  typeR: number;
  typeSize: number;

  destSize: number;
  destSpacing: number;
  suffixSize: number;
  destCodeW: number;
  destCodeH: number;
  destCodeSize: number;
  /** 行き先・ゆき・駅番号の間隔 */
  destGap: number;
  /** 接尾語を本文の前に置く（for Yokkaichi のような語順） */
  suffixBefore: boolean;
  /** 2段のとき行き先を囲む白枠。コンテンツ端からの余白と種別バッジとの間隔 */
  destBoxInset: number;
  destBoxGap: number;
  destBoxR: number;
  /** 2段のとき行き先を縮める倍率 */
  destShrink: number;

  nextLabelX: number;
  nextLabelSize: number;
  nextSize: number;
  nextSpacing: number;
  nextCodeW: number;
  nextCodeH: number;
  nextCodeSize: number;
  /** 行き先ブロック全体の中央からのずれ（＋で右） */
  destOffset: number;

  padX: number;
  /** ヘッダー下端から駅名1文字目の中心まで */
  nameGap: number;
  /** 駅名の最後の文字の中心から駅番号バッジの上端まで */
  nameBottomGap: number;
  nameSize: number;
  /** 駅名の傾き（度）。0 で1文字ずつ縦積み、負の値で右上へ倒した1行書き（英語表記向け） */
  nameAngle: number;
  /** 傾けたときの起点の横ずらし */
  nameAngleX: number;

  barY: number;
  barH: number;
  /** 帯が端の駅より外へ張り出す長さ */
  barOverhang: number;
  /** 後方の末端が端の駅より外へ張り出す長さ（先端より長い） */
  tailOverhang: number;
  /** 帯の先端の尖りと末端の切り欠きの深さ */
  tipD: number;
  /** 継ぎ目のカーブの深さ */
  curveD: number;
  /** 継ぎ目の白い隙間の幅 */
  segGap: number;
  /** 外側シェブロンの水平方向の厚み */
  chevW: number;
  /** 帯の先端とシェブロンの間隔 */
  chevGap: number;

  markerW: number;
  markerH: number;
  /** 赤マーカーの尖りの深さ */
  markerTipD: number;
  /** 赤マーカーと帯の切り口の間に残す白い隙間 */
  markerGap: number;

  stopR: number;
  passW: number;
  passH: number;

  codeW: number;
  codeH: number;
  codeGap: number;
  codeSize: number;

  transferSize: number;
  transferLineH: number;
  transferGap: number;
  transferRuleW: number;
};

export type Vision = {
  /** null なら種別バッジを表示しない（各駅停車など） */
  type: TypeBadge | null;
  dest: { text: string; suffix: string; code: string };
  /** 進行方向。画面のどちら向きに進むか */
  heading: "left" | "right";
  /**
   * 現在位置。stations 上の index で、小数なら駅間の走行中を表す
   * （6.4 なら stations[6] から stations[7] へ 40% 進んだ位置）。null なら赤マーカーなし
   */
  current: number | null;
  /** ドア方向に合わせて路線図全体を左右反転する */
  reverse: boolean;
  /** 現在位置より後方にも路線が続く（後方の帯の末端を尖らせる） */
  tailOpen: boolean;
  next: NextStop | null;
  stations: Station[];
  style: Style;
};
