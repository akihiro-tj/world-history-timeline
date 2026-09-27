// 年表データを取得して検証する
import { parseTimeline, type TimelineData } from "./timeline";

export async function loadTimeline(fetchFn: typeof fetch, url: string): Promise<TimelineData> {
  const response = await fetchFn(url);
  if (!response.ok) {
    throw new Error(`年表データの取得に失敗しました（${response.status}）`);
  }
  return parseTimeline(await response.json());
}
