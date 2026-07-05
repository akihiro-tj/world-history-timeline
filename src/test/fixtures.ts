import { vi } from 'vitest'
import type { Dataset } from '../data/schema'
import { makeEntry } from './factory'

export const testDataset: Dataset = {
  config: { minYear: -700, maxYear: 2100 },
  regions: [
    { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' },
    { id: 'east-asia', name: '東アジア', order: 6, color: '#3fa06b' },
    { id: 'japan', name: '日本', order: 7, color: '#d94a4a' },
  ],
  entries: [
    makeEntry({
      id: 'edward-1',
      title: 'エドワード1世',
      group: 'england',
      groupName: 'イングランド',
      start: 1272,
      end: 1307,
      importance: 1,
    }),
    makeEntry({
      id: 'philippe-4',
      title: 'フィリップ4世',
      group: 'france',
      groupName: 'フランス',
      start: 1285,
      end: 1314,
      importance: 1,
    }),
    makeEntry({
      id: 'kublai-khan',
      title: 'フビライ・ハン',
      region: 'east-asia',
      group: 'yuan',
      groupName: '元',
      start: 1260,
      end: 1294,
      importance: 1,
    }),
    makeEntry({
      id: 'marco-polo',
      title: 'マルコ・ポーロ',
      region: 'east-asia',
      type: 'person',
      start: 1271,
      end: 1295,
      importance: 1,
    }),
    makeEntry({
      id: 'anagni',
      title: 'アナーニ事件',
      type: 'event',
      start: 1303,
      end: undefined,
      importance: 1,
    }),
    makeEntry({
      id: 'tokimune',
      title: '北条時宗',
      region: 'japan',
      group: 'kamakura',
      groupName: '鎌倉幕府',
      start: 1268,
      end: 1284,
      importance: 2,
    }),
    // 軸範囲はデータから導出されるため、既存テストの座標前提 (-700〜2100) を固定する番兵
    makeEntry({
      id: 'era-start-marker',
      title: '年表始端',
      region: 'japan',
      type: 'event',
      start: -700,
      end: undefined,
      importance: 1,
    }),
    makeEntry({
      id: 'era-end-marker',
      title: '年表終端',
      region: 'japan',
      type: 'event',
      start: 2100,
      end: undefined,
      importance: 1,
    }),
  ],
}

export function stubFetch(dataset: Dataset): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      const body =
        name === 'config.json'
          ? dataset.config
          : name === 'regions.json'
            ? dataset.regions
            : dataset.entries
      return new Response(JSON.stringify(body))
    }),
  )
}
