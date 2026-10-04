// 年の値と、時間軸上の幅。年・世紀・千年紀のどれか。紀元前は負の数

// 世紀・千年紀の部分: 初め／半ば／末（3 等分）、前半／後半（2 等分）
export const PARTS = ["early", "middle", "late", "first-half", "second-half"] as const;
export type Part = (typeof PARTS)[number];
export type Year =
  | { year: number; circa: boolean }
  | { century: number; part: Part | null; circa: boolean }
  | { millennium: number; part: Part | null; circa: boolean };

// いちばん早い位置といちばん遅い位置。年なら幅のない 1 点
export function bounds(value: Year): { from: number; to: number } {
  if ("year" in value) return { from: value.year, to: value.year };
  const [n, size] = "century" in value ? [value.century, 100] : [value.millennium, 1000];
  const from = n < 0 ? n * size : (n - 1) * size;
  const at = (fraction: number) => Math.round(from + size * fraction);
  switch (value.part) {
    case null:
      return { from, to: from + size };
    case "early":
      return { from, to: at(1 / 3) };
    case "middle":
      return { from: at(1 / 3), to: at(2 / 3) };
    case "late":
      return { from: at(2 / 3), to: from + size };
    case "first-half":
      return { from, to: at(1 / 2) };
    case "second-half":
      return { from: at(1 / 2), to: from + size };
  }
}

// 形・数・部分・頃がすべて同じか（期間の開始と終了を 1 つにまとめて出すかの判断に使う）
export function sameYear(a: Year, b: Year): boolean {
  if ("year" in a) return "year" in b && a.year === b.year && a.circa === b.circa;
  if ("century" in a) {
    return "century" in b && a.century === b.century && a.part === b.part && a.circa === b.circa;
  }
  return (
    "millennium" in b && a.millennium === b.millennium && a.part === b.part && a.circa === b.circa
  );
}
