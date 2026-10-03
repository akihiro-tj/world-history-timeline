import { describe, expect, it } from "vitest";
import { releaseVelocity, settleSheet, sheetOffset } from "./sheet";

// シートの高さ 1000px。半分の高さのときは 440px 下にずらす
const H = 1000;

describe("sheetOffset", () => {
  it("全画面・半分・閉じるの、下へのずらし量", () => {
    expect(sheetOffset("full", H)).toBe(0);
    expect(sheetOffset("half", H)).toBeCloseTo(440);
    expect(sheetOffset("closed", H)).toBe(H);
  });
});

describe("settleSheet", () => {
  it("ゆっくり離したら、いちばん近い位置に収まる", () => {
    expect(settleSheet(100, 0, H)).toBe("full");
    expect(settleSheet(400, 0, H)).toBe("half");
    expect(settleSheet(800, 0, H)).toBe("closed");
  });

  it("上に弾いたら、今より上の次の位置に進む", () => {
    expect(settleSheet(420, -1, H)).toBe("full");
    expect(settleSheet(700, -1, H)).toBe("half");
  });

  it("下に弾いたら、今より下の次の位置に進む", () => {
    expect(settleSheet(460, 1, H)).toBe("closed");
    expect(settleSheet(200, 1, H)).toBe("half");
  });

  it("端で弾いても、その先がなければ端に収まる", () => {
    expect(settleSheet(0, -1, H)).toBe("full");
    expect(settleSheet(H, 1, H)).toBe("closed");
  });
});

describe("releaseVelocity", () => {
  it("離す直前 100ms の動きから速さを出す（下向きが正）", () => {
    const samples = [
      { y: 500, t: 0 },
      { y: 450, t: 950 },
      { y: 400, t: 1000 },
    ];
    expect(releaseVelocity(samples, 1000)).toBeCloseTo(-1);
  });

  it("止めてから離したら、速さは 0", () => {
    const samples = [
      { y: 500, t: 0 },
      { y: 400, t: 50 },
    ];
    expect(releaseVelocity(samples, 400)).toBe(0);
  });
});
