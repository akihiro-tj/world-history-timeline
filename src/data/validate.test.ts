import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { configSchema, type Dataset, entriesSchema, regionsSchema } from './schema'
import { validateDataset } from './validate'

const config = { minYear: -3000, maxYear: 2100 }
const regions = [{ id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' }]
const entry = {
  id: 'edward-1',
  type: 'ruler' as const,
  region: 'west-europe',
  title: 'エドワード1世',
  start: 1272,
  end: 1307,
  importance: 2,
  description: 'ウェールズを征服。',
}

describe('validateDataset', () => {
  test('正常なデータセットはエラーなし', () => {
    expect(validateDataset({ config, regions, entries: [entry] })).toEqual([])
  })

  test('id 重複を検出する', () => {
    const errors = validateDataset({ config, regions, entries: [entry, { ...entry }] })
    expect(errors).toEqual([expect.stringContaining('duplicate id')])
  })

  test('存在しない地域参照を検出する', () => {
    const errors = validateDataset({ config, regions, entries: [{ ...entry, region: 'mars' }] })
    expect(errors).toEqual([expect.stringContaining('unknown region')])
  })

  test('表示範囲外の年を検出する', () => {
    const errors = validateDataset({ config, regions, entries: [{ ...entry, start: -4000 }] })
    expect(errors).toEqual([expect.stringContaining('out of range')])
  })
})

describe('public/data', () => {
  test('実データがスキーマと横断検証を通過する', () => {
    const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf-8'))
    const dataset: Dataset = {
      config: configSchema.parse(read('config.json')),
      regions: regionsSchema.parse(read('regions.json')),
      entries: entriesSchema.parse(read('entries.json')),
    }
    expect(validateDataset(dataset)).toEqual([])
    expect(dataset.regions).toHaveLength(8)
  })
})
