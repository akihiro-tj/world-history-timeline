// 年表データ（data リポの成果物）の型と、JSON を読み込むときの厳密な検証

export type Year = { year: number; circa: boolean };
export type Lane = { id: string; name: string; dynasties: string[]; reigns: string[] };
// 種類: 国家・体制（王朝・共和政・帝政など）か、政権（体制の中の特定の政府・統治機関・内閣）か
export const DYNASTY_KINDS = ["regime", "government"] as const;
export type DynastyKind = (typeof DYNASTY_KINDS)[number];
// 出典: 値を取った Wikipedia の記事。label は画面に出す名前
export type Source = { label: string; url: string };
// 終わりが null なら現在まで続いている。notes は利用者に見える注記の文
export type Dynasty = {
  id: string;
  name: string;
  kind: DynastyKind;
  start: Year;
  end: Year | null;
  sources: Source[];
  notes: string[];
};
export type Person = { id: string; name: string };
// 役割: 君主（王・女王・皇帝）か、首脳（首相・大統領など）か
export const ROLES = ["monarch", "leader"] as const;
export type Role = (typeof ROLES)[number];
// name はその在位のあいだの表示名。null なら人物の名前を出す（即位で名前が変わる人のため）。title は地位
export type Reign = {
  id: string;
  personId: string;
  name: string | null;
  role: Role;
  title: string;
  start: Year;
  end: Year | null;
  sources: Source[];
  notes: string[];
};
export type TimelineData = {
  lanes: Lane[];
  dynasties: Dynasty[];
  people: Person[];
  reigns: Reign[];
};

const ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const WIKIPEDIA_URL = /^https:\/\/[a-z][a-z-]*\.wikipedia\.org\//;

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

function text(value: unknown, where: string): string {
  if (typeof value !== "string" || value.trim() === "") return fail(where, "文字列が空です");
  return value;
}

// 出典は 1 件以上の Wikipedia の記事
function sources(value: unknown, where: string): Source[] {
  const items = array(value, where);
  if (items.length === 0) fail(where, "出典がありません");
  return items.map((item, i) => {
    const w = `${where}[${i}]`;
    const r = record(item, ["label", "url"], w);
    if (typeof r.url !== "string" || !WIKIPEDIA_URL.test(r.url)) {
      return fail(w, "出典の url は Wikipedia のページです");
    }
    return { label: text(r.label, `${w}.label`), url: r.url };
  });
}

function notes(value: unknown, where: string): string[] {
  return array(value, where).map((item, i) => text(item, `${where}[${i}]`));
}

function year(value: unknown, where: string): Year {
  const r = record(value, ["year", "circa"], where);
  if (typeof r.year !== "number" || !Number.isInteger(r.year)) {
    return fail(where, "year は整数です");
  }
  if (typeof r.circa !== "boolean") return fail(where, "circa は真偽値です");
  return { year: r.year, circa: r.circa };
}

// 終わりが null の期間は現在まで続いている
function period(r: Record<string, unknown>, where: string): { start: Year; end: Year | null } {
  const start = year(r.start, `${where}.start`);
  const end = r.end === null ? null : year(r.end, `${where}.end`);
  if (end && start.year > end.year) fail(where, "開始が終了より後です");
  return { start, end };
}

function dynastyKind(value: unknown, where: string): DynastyKind {
  const found = DYNASTY_KINDS.find((candidate) => candidate === value);
  return found ?? fail(where, `kind は ${DYNASTY_KINDS.join(" か ")} です`);
}

function role(value: unknown, where: string): Role {
  const found = ROLES.find((candidate) => candidate === value);
  return found ?? fail(where, `role は ${ROLES.join(" か ")} です`);
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
    const r = record(item, ["id", "name", "kind", "start", "end", "sources", "notes"], where);
    return {
      id: id(r.id, where),
      name: name(r.name, where),
      kind: dynastyKind(r.kind, where),
      ...period(r, where),
      sources: sources(r.sources, `${where}.sources`),
      notes: notes(r.notes, `${where}.notes`),
    };
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
    const r = record(
      item,
      ["id", "personId", "name", "role", "title", "start", "end", "sources", "notes"],
      where,
    );
    const personId = id(r.personId, where);
    if (!personMap.has(personId)) fail(where, `存在しない人物を参照しています: ${personId}`);
    return {
      id: id(r.id, where),
      personId,
      name: r.name === null ? null : name(r.name, where),
      role: role(r.role, where),
      title: text(r.title, `${where}.title`),
      ...period(r, where),
      sources: sources(r.sources, `${where}.sources`),
      notes: notes(r.notes, `${where}.notes`),
    };
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
