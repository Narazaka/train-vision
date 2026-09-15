import { describe, expect, it } from "vitest";
import { DEFAULT_VISION } from "./defaults";
import {
  barEnds,
  chevronPath,
  cutDepth,
  cutIndices,
  headerHeight,
  isPassed,
  markerBackX,
  markerPath,
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
import type { Vision } from "./types";

const V = DEFAULT_VISION;
const S = V.style;

const rev = (patch: Partial<Vision> = {}): Vision => ({ ...V, reverse: true, ...patch });

/** path の "M x y" 以降に出てくる x 座標をすべて拾う */
const xs = (d: string) =>
  [...d.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[1]));

describe("cutIndices", () => {
  it("gap の付いた駅の手前を境界にする", () => {
    // 蟹江(index 1) と 伏屋(index 2) に gap → 境界は 1 と 2
    expect(cutIndices(V.stations, false)).toEqual([1, 2]);
  });

  it("左右反転しても同じ駅間に切れ目が残る", () => {
    const n = V.stations.length;
    expect(cutIndices(V.stations, true)).toEqual([n - 2, n - 1]);
  });

  it("先頭駅の gap は境界にならない（その手前に駅がないため）", () => {
    const stations = V.stations.map((st, i) => ({ ...st, gap: i === 0 }));
    expect(cutIndices(stations, false)).toEqual([]);
  });
});

describe("ヘッダー", () => {
  const withNext: Vision = { ...V, next: { label: "つぎは", name: "蟹江", code: "E08" } };

  it("黒地の高さは「つぎは」の有無で変わらない", () => {
    expect(headerHeight(V)).toBe(S.headerH);
    expect(headerHeight(withNext)).toBe(S.headerH);
  });

  it("上段はその中に収まり、残りが「つぎは」段になる", () => {
    expect(topHeight(S)).toBe(S.typeY * 2 + S.typeH);
    expect(topHeight(S)).toBeLessThan(S.headerH);
  });

  it("駅名の位置も「つぎは」で動かない", () => {
    expect(nameYs(2, withNext)).toEqual(nameYs(2, V));
  });
});

describe("文字の幅と収まり", () => {
  it("欧文は全角より狭く見積もる", () => {
    expect(textWidth("Yokkaichi", 100)).toBeLessThan(textWidth("四日市市市市市市市", 100));
    expect(textWidth("四日市", 100)).toBe(300);
  });

  it("欧文だけの行では全角用の字間を使わない", () => {
    expect(spacingFor("Yokkaichi", 0.12)).toBe(0);
    expect(spacingFor("四日市", 0.12)).toBe(0.12);
    expect(spacingFor("四日市ゆき", 0.12)).toBe(0.12);
  });

  it("駅名を傾けると書ける長さが伸びる", () => {
    const upright = nameSpan(V);
    const slanted = nameSpan({ ...V, style: { ...S, nameAngle: -60 } });
    expect(slanted).toBeGreaterThan(upright);
    // 60度なら 1/sin(60) ≒ 1.155 倍
    expect(slanted / upright).toBeCloseTo(1.1547, 3);
  });

});

describe("place", () => {
  it("reverse で駅の並び・進行方向・現在位置がすべて反転する", () => {
    const a = place(V);
    const b = place(rev());
    expect(a.stations[0].name).toBe("弥富");
    expect(b.stations[0].name).toBe("名古屋");
    expect(a.left).toBe(true);
    expect(b.left).toBe(false);
    expect(a.stations[a.current].code).toBe("E01");
    expect(b.stations[b.current].code).toBe("E01");
  });

  it("current が null なら -1（マーカーなし）", () => {
    expect(place({ ...V, current: null }).current).toBe(-1);
  });
});

describe("segments", () => {
  it("切れ目の数だけ帯が分割される", () => {
    expect(segments(place(V), S)).toHaveLength(3);
    expect(segments(place({ ...V, stations: V.stations.map((s) => ({ ...s, gap: false })) }), S)).toHaveLength(1);
  });

  it("帯全体は barEnds を占め、区間どうしは segGap だけ空く", () => {
    const p = place({ ...V, current: null });
    const segs = segments(p, S);
    const { l, r } = barEnds(p, S);
    expect(segs[0].x0).toBe(l);
    expect(segs[segs.length - 1].x1).toBe(r);
    for (let i = 0; i + 1 < segs.length; i++) {
      expect(segs[i + 1].x0 - segs[i].x1).toBeCloseTo(S.segGap);
    }
  });

  it("尖る端は進行方向側に1つだけ現れる", () => {
    for (const p of [place({ ...V, current: null }), place(rev({ current: null }))]) {
      const segs = segments(p, S);
      const tips = segs.filter((x) => x.left === "point" || x.right === "point");
      expect(tips).toHaveLength(1);
      // 左進行なら先頭区間の左端、右進行なら末尾区間の右端が尖る
      expect(p.left ? segs[0].left : segs[segs.length - 1].right).toBe("point");
    }
  });

  it("切れ目は S 字で、両側が平行に走る（隙間の幅が一定）", () => {
    const p = place({ ...V, current: null });
    const paths = segments(p, S).map((seg) => segmentPath(seg, p, S));
    // C の制御点 x を [上寄り, 下寄り] の順で拾う。左端は上→下、右端は下→上に辿る
    const ctrl = (d: string) =>
      [...d.matchAll(/C (-?[\d.]+) [\d.]+ (-?[\d.]+) [\d.]+/g)].map((m) => [+m[1], +m[2]]);

    const rightOfFirst = ctrl(paths[0])[0]; // [下寄り, 上寄り]
    const leftOfSecond = ctrl(paths[1])[0]; // [上寄り, 下寄り]
    expect(leftOfSecond[0] - rightOfFirst[1]).toBeCloseTo(S.segGap);
    expect(leftOfSecond[1] - rightOfFirst[0]).toBeCloseTo(S.segGap);
    // 実際の曲線が curveD ぶん振れる＝見た目どおりの S 字になっている
    const x0 = Number(paths[1].match(/^M (-?[\d.]+)/)![1]);
    const bez = (t: number) =>
      3 * (1 - t) ** 2 * t * (leftOfSecond[0] - x0) + 3 * (1 - t) * t ** 2 * (leftOfSecond[1] - x0);
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => bez(i / 100)));
    expect(peak).toBeCloseTo(S.curveD, 1);
  });

  it("切れ目の位置は反転しても画面の鏡像になる", () => {
    const a = segments(place({ ...V, current: null }), S).map((s) => s.x1);
    const b = segments(place(rev({ current: null })), S).map((s) => S.w - s.x0);
    expect(a).toEqual(b.reverse());
  });
});

describe("barEnds", () => {
  it("進行方向側は端の駅より barOverhang だけ張り出す", () => {
    const p = place(V);
    expect(barEnds(p, S).l).toBe(p.cx(0) - S.barOverhang);
    const q = place(rev());
    expect(barEnds(q, S).r).toBe(q.cx(q.stations.length - 1) + S.barOverhang);
  });

  it("現在位置が末端の駅なら帯はその駅で終わる", () => {
    // 名古屋が末端、進行方向は左 → 帯の右端は赤マーカーの後端
    const p = place(V);
    expect(barEnds(p, S).r).toBe(markerBackX(p, S));
    expect(barEnds(p, S).r).toBeLessThan(p.cx(p.stations.length - 1) + S.barOverhang);
  });

  it("現在位置が途中の駅なら帯は端の駅まで伸びる", () => {
    const p = place({ ...V, current: 3 });
    // 起点なので末端は最後の駅の位置で切り落とす
    expect(barEnds(p, S).r).toBe(p.cx(p.stations.length - 1) + S.markerW / 2);
  });

  it("後方に路線が続くなら、先端より長い tailOverhang で張り出す", () => {
    const p = place({ ...V, current: 3, tailOpen: true });
    expect(barEnds(p, S).r).toBe(p.cx(p.stations.length - 1) + S.tailOverhang);
    expect(S.tailOverhang).toBeGreaterThan(S.barOverhang);
  });
});

describe("端の駅に停車中", () => {
  it("青帯は赤マーカーの肩の手前で終わり、通過済み区間は生まれない", () => {
    // 名古屋(index 7)は左進行での末端。最初の静止画そのままの状態
    const p = place(V);
    const segs = segments(p, S);
    expect(segs.some((x) => x.passed)).toBe(false);
    const back = markerBackX(p, S);
    // 切り口の底が赤の先端の markerGap 手前、そこから cutD 戻した位置が口になる
    const tip = back - S.markerW;
    expect(segs[segs.length - 1].x1).toBeCloseTo(tip - S.markerGap + cutDepth(S));
    expect(segs[segs.length - 1].right).toBe("cut");
  });
});

describe("端の駅に停車中は後方が消える", () => {
  it("tailOpen でも末端の矢印を出さない条件になる", () => {
    expect(tailClipped(place(V))).toBe(true);
    expect(tailClipped(place({ ...V, current: 6.4 }))).toBe(false);
    expect(tailClipped(place({ ...V, current: null }))).toBe(false);
    expect(tailClipped(place(rev()))).toBe(true);
  });
});

describe("現在位置の切り口", () => {
  /** 高さ y における、赤マーカーの斜辺と帯の切り口の水平距離 */
  const gapAt = (y: number) => {
    const p = place({ ...V, current: 6.4 });
    const mid = S.barY + S.barH / 2;
    const tip = markerBackX(p, S) - S.markerW;
    const ahead = segments(p, S).filter((x) => !x.passed);
    const mouth = Math.max(...ahead.map((x) => x.x1));
    const depth = cutDepth(S);
    // どちらも中央で最も左に来る V 字。中央からの距離に比例して右へ戻る
    const markerX = tip + (S.markerTipD * Math.abs(y - mid)) / (S.markerH / 2);
    const cutX = mouth - depth + (depth * Math.abs(y - mid)) / (S.barH / 2);
    return markerX - cutX;
  };

  it("赤マーカーの斜辺と平行で、隙間の幅がどこでも一定になる", () => {
    const mid = S.barY + S.barH / 2;
    const atMid = gapAt(mid);
    expect(atMid).toBeCloseTo(S.markerGap);
    // 帯の上端・下端でも同じ隙間
    expect(gapAt(S.barY)).toBeCloseTo(atMid);
    expect(gapAt(S.barY + S.barH)).toBeCloseTo(atMid);
  });

  it("帯の高さで切り取るぶん、赤マーカーの尖りより浅くなる", () => {
    expect(cutDepth(S)).toBeLessThan(S.markerTipD);
    expect(cutDepth(S)).toBeCloseTo((S.markerTipD * S.barH) / S.markerH);
  });
});

describe("走行中（current が小数）", () => {
  const running = place({ ...V, current: 6.4 });

  it("マーカーが駅と駅の間に置かれる", () => {
    const back = markerBackX(running, S);
    const center = back - S.markerW / 2;
    expect(center).toBeGreaterThan(running.cx(6));
    expect(center).toBeLessThan(running.cx(7));
    expect(center).toBeCloseTo(running.cx(6.4));
  });

  it("現在位置より後方の区間だけが灰色になり、境目はマーカーの後端", () => {
    const segs = segments(running, S);
    const cut = markerBackX(running, S);
    expect(segs.some((x) => x.passed)).toBe(true);
    for (const seg of segs) {
      // 左進行なので cut より右が通過済み
      if (seg.passed) expect(seg.x0).toBeGreaterThanOrEqual(cut);
      else expect(seg.x1).toBeLessThanOrEqual(cut);
    }
  });

  it("通過済みの駅は停車駅でも灰色になる", () => {
    // 左進行なので index 7（名古屋・停車駅）は通り過ぎている
    expect(isPassed(running, 7)).toBe(true);
    expect(isPassed(running, 6)).toBe(false);
    expect(isPassed(running, 0)).toBe(false);
  });
});

describe("chevronPath", () => {
  it("帯の三角にほぼ重なり、chevGap + chevW だけ外へはみ出す", () => {
    const p = place(V);
    const barTip = barEnds(p, S).l - S.tipD;
    const tipX = Math.min(...xs(chevronPath(p, S)));
    expect(barTip - tipX).toBeCloseTo(S.chevGap + S.chevW);
  });

  it("画面内に収まる", () => {
    expect(Math.min(...xs(chevronPath(place(V), S)))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs(chevronPath(place(rev()), S)))).toBeLessThanOrEqual(S.w);
  });
});

describe("marker", () => {
  it("駅の印と同じく、現在位置の駅の中心に来る", () => {
    for (const p of [place(V), place(rev()), place({ ...V, current: 3 })]) {
      const back = markerBackX(p, S);
      const tip = back + (p.left ? -1 : 1) * S.markerW;
      expect((back + tip) / 2).toBeCloseTo(p.cx(p.current));
    }
  });

  it("進行方向へ尖る", () => {
    const p = place(V);
    const q = place(rev());
    expect(Math.min(...xs(markerPath(p, S)))).toBeCloseTo(p.cx(p.current) - S.markerW / 2);
    expect(Math.max(...xs(markerPath(q, S)))).toBeCloseTo(q.cx(q.current) + S.markerW / 2);
  });

  it("後端は垂直（同じ x が上下に2点）", () => {
    const p = place(V);
    const back = markerBackX(p, S);
    expect(xs(markerPath(p, S)).filter((x) => x === back)).toHaveLength(2);
  });
});
