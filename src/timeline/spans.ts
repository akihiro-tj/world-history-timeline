// 主題（王朝／王）に応じて、行に並べる棒の元データを取り出す
import type { Lane, TimelineData, Year } from "../data/timeline";

export type Subject = "dynasty" | "reign";
export type Span = { id: string; name: string; start: Year; end: Year };

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
  return lane.reigns.map((id) => {
    const reign = lookup(data.reigns, id);
    return {
      id,
      name: lookup(data.people, reign.personId).name,
      start: reign.start,
      end: reign.end,
    };
  });
}
