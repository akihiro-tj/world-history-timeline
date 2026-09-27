// 年表データ（data リポの成果物）の型と、JSON を読み込むときの厳密な検証

export type Year = { year: number; circa: boolean };
export type Lane = { id: string; name: string; dynasties: string[]; reigns: string[] };
export type Dynasty = { id: string; name: string; start: Year; end: Year };
export type Person = { id: string; name: string };
export type Reign = { id: string; personId: string; start: Year; end: Year };
export type TimelineData = {
  lanes: Lane[];
  dynasties: Dynasty[];
  people: Person[];
  reigns: Reign[];
};

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;

function fail(where: string, reason: string): never {
  throw new Error(`年表データの ${where}: ${reason}`);
}

// キーが過不足なくそろったオブジェクトであることを確かめる
function record(value: unknown, keys: readonly string[], where: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(where, "オブジェクトではありません");
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail(where, `知らないキー ${key} があります`);
  }
  for (const key of keys) {
    if (!(key in value)) fail(where, `キー ${key} がありません`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value)) return fail(where, "配列ではありません");
  return value;
}

function id(value: unknown, where: string): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) return fail(where, "id が不正です");
  return value;
}

function name(value: unknown, where: string): string {
  if (typeof value !== "string" || value.trim() === "") return fail(where, "名前が空です");
  return value;
}

function year(value: unknown, where: string): Year {
  const r = record(value, ["year", "circa"], where);
  if (typeof r.year !== "number" || !Number.isInteger(r.year)) {
    return fail(where, "year は整数です");
  }
  if (typeof r.circa !== "boolean") return fail(where, "circa は真偽値です");
  return { year: r.year, circa: r.circa };
}

function period(r: Record<string, unknown>, where: string): { start: Year; end: Year } {
  const start = year(r.start, `${where}.start`);
  const end = year(r.end, `${where}.end`);
  if (start.year > end.year) fail(where, "開始が終了より後です");
  return { start, end };
}

function unique<T extends { id: string }>(items: T[], where: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) fail(where, `id が重複しています: ${item.id}`);
    map.set(item.id, item);
  }
  return map;
}

function references(value: unknown, known: Map<string, unknown>, where: string): string[] {
  const seen = new Set<string>();
  return array(value, where).map((item, i) => {
    const ref = id(item, `${where}[${i}]`);
    if (!known.has(ref)) fail(`${where}[${i}]`, `存在しない id を参照しています: ${ref}`);
    if (seen.has(ref)) fail(`${where}[${i}]`, `同じ id を 2 回参照しています: ${ref}`);
    seen.add(ref);
    return ref;
  });
}

export function parseTimeline(value: unknown): TimelineData {
  const root = record(value, ["lanes", "dynasties", "people", "reigns"], "全体");

  const dynasties = array(root.dynasties, "dynasties").map((item, i) => {
    const where = `dynasties[${i}]`;
    const r = record(item, ["id", "name", "start", "end"], where);
    return { id: id(r.id, where), name: name(r.name, where), ...period(r, where) };
  });
  const dynastyMap = unique(dynasties, "dynasties");

  const people = array(root.people, "people").map((item, i) => {
    const where = `people[${i}]`;
    const r = record(item, ["id", "name"], where);
    return { id: id(r.id, where), name: name(r.name, where) };
  });
  const personMap = unique(people, "people");

  const reigns = array(root.reigns, "reigns").map((item, i) => {
    const where = `reigns[${i}]`;
    const r = record(item, ["id", "personId", "start", "end"], where);
    const personId = id(r.personId, where);
    if (!personMap.has(personId)) fail(where, `存在しない人物を参照しています: ${personId}`);
    return { id: id(r.id, where), personId, ...period(r, where) };
  });
  const reignMap = unique(reigns, "reigns");

  const lanes = array(root.lanes, "lanes").map((item, i) => {
    const where = `lanes[${i}]`;
    const r = record(item, ["id", "name", "dynasties", "reigns"], where);
    return {
      id: id(r.id, where),
      name: name(r.name, where),
      dynasties: references(r.dynasties, dynastyMap, `${where}.dynasties`),
      reigns: references(r.reigns, reignMap, `${where}.reigns`),
    };
  });
  unique(lanes, "lanes");

  return { lanes, dynasties, people, reigns };
}
