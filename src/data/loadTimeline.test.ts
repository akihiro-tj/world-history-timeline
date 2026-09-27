import { describe, expect, it } from "vitest";
import { loadTimeline } from "./loadTimeline";

const empty = { lanes: [], dynasties: [], people: [], reigns: [] };

function fakeFetch(status: number, body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("loadTimeline", () => {
  it("取得したデータを検証して返す", async () => {
    await expect(loadTimeline(fakeFetch(200, empty), "/timeline.json")).resolves.toEqual(empty);
  });

  it("取得に失敗したら例外にする", async () => {
    await expect(loadTimeline(fakeFetch(404, {}), "/timeline.json")).rejects.toThrow("（404）");
  });

  it("検証に失敗したら例外にする", async () => {
    await expect(loadTimeline(fakeFetch(200, []), "/timeline.json")).rejects.toThrow(
      "オブジェクトではありません",
    );
  });

  it("JSON でなければ例外にする", async () => {
    const fetchFn: typeof fetch = async () => new Response("<html>", { status: 200 });
    await expect(loadTimeline(fetchFn, "/timeline.json")).rejects.toThrow();
  });
});
