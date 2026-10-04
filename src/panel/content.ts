// 出典パネルに出す中身（名前・期間の行・注記・出典のリンク）を作る（spec §5）
import type { Source, TimelineData, Year } from "../data/timeline";
import { bounds } from "../data/year";
import type { Selection } from "./selection";

// 節の見出し: 王朝は「期間」、君主は「在位」、首相・大統領などは「在任」
export type PanelSection = "period" | "monarch" | "leader";
export type PanelLink = { label: string; url: string | null };
export type PanelRow = {
  id: string;
  start: Year;
  end: Year | null;
  title: string | null;
  notes: string[];
};
export type PanelContent = {
  name: string;
  section: PanelSection;
  links: PanelLink[];
  rows: PanelRow[];
};

// 出典を並びの順に集め、同じ URL は 1 つにする。URL のない出典は名前が同じものを 1 つにする
function links(sources: Source[]): PanelLink[] {
  const result: PanelLink[] = [];
  const same = (a: PanelLink, b: Source) =>
    a.url === null ? b.url === null && a.label === b.label : a.url === b.url;
  for (const source of sources) {
    if (!result.some((link) => same(link, source))) result.push(source);
  }
  return result;
}

export function panelContent(data: TimelineData, selection: Selection): PanelContent | null {
  const lane = data.lanes.find((candidate) => candidate.id === selection.laneId);
  if (!lane) return null;

  if (selection.key.startsWith("dynasty:")) {
    const id = selection.key.slice("dynasty:".length);
    const dynasty = lane.dynasties.includes(id)
      ? data.dynasties.find((d) => d.id === id)
      : undefined;
    if (!dynasty) return null;
    return {
      name: dynasty.name,
      section: "period",
      links: links(dynasty.sources),
      rows: [
        {
          id: dynasty.id,
          start: dynasty.start,
          end: dynasty.end,
          title: null,
          notes: dynasty.notes,
        },
      ],
    };
  }

  const group = selection.key.slice("reign:".length);
  const reigns = lane.reigns
    .map((id) => data.reigns.find((reign) => reign.id === id))
    .filter((reign) => reign !== undefined)
    .filter((reign) => {
      const person = data.people.find((p) => p.id === reign.personId);
      return (
        person !== undefined &&
        `${reign.role}/${reign.personId}/${reign.name ?? person.name}` === group
      );
    })
    .sort((a, b) => bounds(a.start).from - bounds(b.start).from);
  const first = reigns[0];
  const person = first && data.people.find((p) => p.id === first.personId);
  if (!first || !person) return null;
  return {
    name: first.name ?? person.name,
    section: first.role,
    links: links(reigns.flatMap((reign) => reign.sources)),
    rows: reigns.map((reign) => ({
      id: reign.id,
      start: reign.start,
      end: reign.end,
      title: reign.title,
      notes: reign.notes,
    })),
  };
}
