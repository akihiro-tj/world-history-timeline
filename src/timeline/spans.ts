// 表示（主題／国・地域）に応じて、年表に並べる行と棒の元データを取り出す
import type { DynastyKind, Lane, Role, TimelineData, Year } from "../data/timeline";

// 王朝は種類（国家・体制／政権）ごとに、在位は役割（君主／首脳）ごとに別の主題にする
export type Subject = DynastyKind | Role;
// 終わりが null なら現在まで続いている。group が同じ棒は同じ人の再登板で、ラベルを 1 つにまとめる
export type Span = {
  id: string;
  name: string;
  start: Year;
  end: Year | null;
  group: string | null;
};
export type View = { kind: "subject"; subject: Subject } | { kind: "lane"; laneId: string };
export type Row = { id: string; name: string; spans: Span[] };

// 主題の並び（セレクトの選択肢と国・地域の表示の行の順）。国家・体制と君主を隣り合わせにし、
// 多くの国・地域で空になる政権を最後に置く
const SUBJECTS: readonly Subject[] = ["regime", "monarch", "leader", "government"];

function lookup<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`年表データに id ${id} がありません`);
  return item;
}

export function spansForLane(data: TimelineData, lane: Lane, subject: Subject): Span[] {
  if (subject === "regime" || subject === "government") {
    return lane.dynasties
      .map((id) => lookup(data.dynasties, id))
      .filter((dynasty) => dynasty.kind === subject)
      .map(({ id, name, start, end }) => ({ id, name, start, end, group: null }));
  }
  return lane.reigns
    .map((id) => lookup(data.reigns, id))
    .filter((reign) => reign.role === subject)
    .map((reign) => {
      const name = reign.name ?? lookup(data.people, reign.personId).name;
      // 同じ人でも表示名や役割が違う在位（第一統領期と皇帝期、宮宰と王など）はまとめない
      return {
        id: reign.id,
        name,
        start: reign.start,
        end: reign.end,
        group: `${reign.role}/${reign.personId}/${name}`,
      };
    });
}

// 表示のセレクトの値（"subject:regime"・"lane:england" など）と表示の状態の相互変換。
// id に ":" は使えない（src/data/timeline.ts の ID_PATTERN）ので、区切りに使える
export function viewToValue(view: View): string {
  return view.kind === "subject" ? `subject:${view.subject}` : `lane:${view.laneId}`;
}

export function valueToView(value: string, laneIds: readonly string[]): View | null {
  const [kind, id, ...rest] = value.split(":");
  if (id === undefined || rest.length > 0) return null;
  if (kind === "subject") {
    const subject = SUBJECTS.find((candidate) => candidate === id);
    return subject ? { kind: "subject", subject } : null;
  }
  if (kind === "lane" && laneIds.includes(id)) return { kind: "lane", laneId: id };
  return null;
}

// 主題の表示では行＝国・地域、国・地域の表示では行＝主題（国家・体制、君主、首相・大統領など、政権）。
// 主題の行の名前は UI 文言なので、呼び出し側から受け取る
export function rowsForView(data: TimelineData, view: View, names: Record<Subject, string>): Row[] {
  if (view.kind === "subject") {
    return data.lanes.map((lane) => ({
      id: lane.id,
      name: lane.name,
      spans: spansForLane(data, lane, view.subject),
    }));
  }
  const lane = lookup(data.lanes, view.laneId);
  return SUBJECTS.map((subject) => ({
    id: subject,
    name: names[subject],
    spans: spansForLane(data, lane, subject),
  }));
}
