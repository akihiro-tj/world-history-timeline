// 表示（主題／国・地域）に応じて、年表に並べる行と棒の元データを取り出す
import type { Lane, Role, TimelineData, Year } from "../data/timeline";

// 在位は役割（君主／首脳）ごとに別の主題にする
export type Subject = "dynasty" | Role;
// 終わりが null なら現在まで続いている
export type Span = { id: string; name: string; start: Year; end: Year | null };
export type View = { kind: "subject"; subject: Subject } | { kind: "lane"; laneId: string };
export type Row = { id: string; name: string; spans: Span[] };

const SUBJECTS: readonly Subject[] = ["dynasty", "monarch", "leader"];

function lookup<T extends { id: string }>(items: T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`年表データに id ${id} がありません`);
  return item;
}

export function spansForLane(data: TimelineData, lane: Lane, subject: Subject): Span[] {
  if (subject === "dynasty") {
    return lane.dynasties.map((id) => {
      const { name, start, end } = lookup(data.dynasties, id);
      return { id, name, start, end };
    });
  }
  return lane.reigns
    .map((id) => lookup(data.reigns, id))
    .filter((reign) => reign.role === subject)
    .map((reign) => ({
      id: reign.id,
      name: lookup(data.people, reign.personId).name,
      start: reign.start,
      end: reign.end,
    }));
}

// 表示のセレクトの値（"subject:dynasty"・"lane:england" など）と表示の状態の相互変換。
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

// 主題の表示では行＝国・地域、国・地域の表示では行＝主題（王朝・政体、君主、首相・大統領）。
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
