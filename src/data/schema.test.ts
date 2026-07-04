import { describe, expect, test } from 'vitest'
import { configSchema, entrySchema, regionSchema } from './schema'

const validEntry = {
  id: 'edward-1',
  type: 'ruler',
  region: 'west-europe',
  group: 'england',
  groupName: 'イングランド',
  title: 'エドワード1世',
  start: 1272,
  end: 1307,
  importance: 2,
  description: 'ウェールズを征服し、模範議会を招集。',
}

describe('entrySchema', () => {
  test('正常なエントリを受理する', () => {
    expect(entrySchema.parse(validEntry)).toEqual(validEntry)
  })

  test('end のない event を点イベントとして受理する', () => {
    const event = { ...validEntry, id: 'anagni', type: 'event', end: undefined }
    expect(entrySchema.parse(event).end).toBeUndefined()
  })

  test('end のない ruler を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, end: undefined })).toThrow()
  })

  test('end < start を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, end: 1271 })).toThrow()
  })

  test('groupName のない group を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, groupName: undefined })).toThrow()
  })

  test('importance の範囲外を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, importance: 4 })).toThrow()
  })

  test('小数の年を拒否する', () => {
    expect(() => entrySchema.parse({ ...validEntry, start: 1272.5 })).toThrow()
  })
})

describe('regionSchema', () => {
  test('正常な地域を受理する', () => {
    const region = { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' }
    expect(regionSchema.parse(region)).toEqual(region)
  })

  test('不正な色形式を拒否する', () => {
    expect(() => regionSchema.parse({ id: 'a', name: 'あ', order: 1, color: 'blue' })).toThrow()
  })
})

describe('configSchema', () => {
  test('minYear >= maxYear を拒否する', () => {
    expect(() => configSchema.parse({ minYear: 2100, maxYear: -3000 })).toThrow()
  })
})
