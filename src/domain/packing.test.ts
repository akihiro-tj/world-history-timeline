import { describe, expect, test } from 'vitest'
import { makeEntry } from '../test/factory'
import { columnGroupNames, packLane } from './packing'

function columnOf(layout: ReturnType<typeof packLane>, id: string): number {
  const found = layout.positioned.find((p) => p.entry.id === id)
  if (!found) throw new Error(`entry not found: ${id}`)
  return found.column
}

describe('packLane', () => {
  test('空レーンは幅1', () => {
    expect(packLane([])).toEqual({ columnCount: 1, positioned: [] })
  })

  test('同じ group の連続する在位は同じカラムに積まれる', () => {
    const layout = packLane([
      makeEntry({ id: 'henry-3', group: 'england', groupName: 'e', start: 1216, end: 1272 }),
      makeEntry({ id: 'edward-1', group: 'england', groupName: 'e', start: 1272, end: 1307 }),
    ])
    expect(layout.columnCount).toBe(1)
    expect(columnOf(layout, 'henry-3')).toBe(columnOf(layout, 'edward-1'))
  })

  test('期間が重なる別 group は別カラムになる', () => {
    const layout = packLane([
      makeEntry({ id: 'edward-1', group: 'england', groupName: 'e', start: 1272, end: 1307 }),
      makeEntry({ id: 'philippe-4', group: 'france', groupName: 'f', start: 1285, end: 1314 }),
    ])
    expect(layout.columnCount).toBe(2)
    expect(columnOf(layout, 'edward-1')).not.toBe(columnOf(layout, 'philippe-4'))
  })

  test('時代が重ならない group はカラムを共有する', () => {
    const layout = packLane([
      makeEntry({ id: 'augustus', group: 'rome', groupName: 'r', start: -27, end: 14 }),
      makeEntry({ id: 'alfred', group: 'england', groupName: 'e', start: 871, end: 899 }),
    ])
    expect(layout.columnCount).toBe(1)
  })

  test('group 内で期間が重なると group が内部で複数カラムに分かれる', () => {
    const layout = packLane([
      makeEntry({ id: 'co-a', group: 'byz', groupName: 'b', start: 1300, end: 1340 }),
      makeEntry({ id: 'co-b', group: 'byz', groupName: 'b', start: 1320, end: 1350 }),
    ])
    expect(layout.columnCount).toBe(2)
    expect(columnOf(layout, 'co-a')).not.toBe(columnOf(layout, 'co-b'))
  })

  test('group なしのエントリは単独グループとして扱う', () => {
    const layout = packLane([
      makeEntry({ id: 'marco-polo', type: 'person', start: 1271, end: 1295 }),
      makeEntry({ id: 'kublai', group: 'yuan', groupName: 'y', start: 1260, end: 1294 }),
    ])
    expect(layout.columnCount).toBe(2)
  })

  test('点イベントは start のみの区間として扱う', () => {
    const layout = packLane([
      makeEntry({ id: 'anagni', type: 'event', start: 1303, end: undefined }),
      makeEntry({ id: 'lyon', type: 'event', start: 1305, end: undefined }),
    ])
    expect(layout.columnCount).toBe(1)
  })

  test('入力順に依存せず決定的である', () => {
    const entries = [
      makeEntry({ id: 'a', group: 'g1', groupName: 'g', start: 1200, end: 1260 }),
      makeEntry({ id: 'b', group: 'g2', groupName: 'g', start: 1250, end: 1300 }),
      makeEntry({ id: 'c', group: 'g3', groupName: 'g', start: 1290, end: 1350 }),
    ]
    const forward = packLane(entries)
    const reversed = packLane([...entries].reverse())
    expect(forward.columnCount).toBe(reversed.columnCount)
    for (const p of forward.positioned) {
      expect(columnOf(reversed, p.entry.id)).toBe(p.column)
    }
  })
})

describe('columnGroupNames', () => {
  test('カラムごとに groupName を返し、group の無いカラムは null', () => {
    const layout = packLane([
      makeEntry({ id: 'e1', group: 'england', groupName: 'イングランド', start: 1200, end: 1300 }),
      makeEntry({ id: 'f1', group: 'france', groupName: 'フランス', start: 1250, end: 1350 }),
      makeEntry({ id: 'solo', type: 'event', start: 1250, end: undefined }),
    ])
    const names = columnGroupNames(layout, -10000, 10000)
    expect(names).toHaveLength(layout.columnCount)
    expect(names).toContain('イングランド')
    expect(names).toContain('フランス')
    expect(names).toContain(null)
  })

  test('同一カラムを再利用する複数 group は可視年範囲の group 名を返す', () => {
    const layout = packLane([
      makeEntry({
        id: 'kamakura-1',
        group: 'kamakura',
        groupName: '鎌倉幕府',
        start: 1192,
        end: 1333,
      }),
      makeEntry({ id: 'edo-1', group: 'edo', groupName: '江戸幕府', start: 1603, end: 1867 }),
    ])
    expect(layout.columnCount).toBe(1)
    expect(columnGroupNames(layout, 1200, 1300)).toEqual(['鎌倉幕府'])
    expect(columnGroupNames(layout, 1700, 1800)).toEqual(['江戸幕府'])
    expect(columnGroupNames(layout, 1400, 1500)).toEqual([null])
  })
})
