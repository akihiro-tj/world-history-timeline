// 出典パネルに出す中身（名前・出典のリンク・期間の行・注記）を作る（spec §5）
import { COPY } from "../app/copy";
import type { Note, Person, TimelineData, Year } from "../data/timeline";
import type { Selection } from "./selection";

// 節の見出し: 王朝は「期間」、君主は「在位」、首相・大統領などは「在任」
export type PanelSection = "period" | "monarch" | "leader";
export type PanelLink = { label: string; url: string };
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

const WIKIDATA_ITEM = "https://www.wikidata.org/wiki/";

// Wikidata のリンクを先に、続けて注記の資料を行の順に集める。同じ URL は 1 つにする
function links(item: Pick<Person, "wikidata" | "wikidataLabel">, notes: Note[]): PanelLink[] {
  const result: PanelLink[] = [];
  if (item.wikidata !== null && item.wikidataLabel !== null) {
    result.push({
      label: COPY.wikidataLink(item.wikidataLabel),
      url: WIKIDATA_ITEM + item.wikidata,
    });
  }
  for (const ref of notes.flatMap((note) => note.refs)) {
    if (!result.some((link) => link.url === ref.url)) result.push(ref);
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
      links: links(dynasty, dynasty.notes),
      rows: [
        {
          id: dynasty.id,
          start: dynasty.start,
          end: dynasty.end,
          title: null,
          notes: dynasty.notes.map((note) => note.reason),
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
      return person !== undefined && `${reign.personId}/${reign.name ?? person.name}` === group;
    })
    .sort((a, b) => a.start.year - b.start.year);
  const first = reigns[0];
  const person = first && data.people.find((p) => p.id === first.personId);
  if (!first || !person) return null;
  return {
    name: first.name ?? person.name,
    section: first.role,
    links: links(
      person,
      reigns.flatMap((reign) => reign.notes),
    ),
    rows: reigns.map((reign) => ({
      id: reign.id,
      start: reign.start,
      end: reign.end,
      title: reign.title,
      notes: reign.notes.map((note) => note.reason),
    })),
  };
}
