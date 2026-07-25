import { afterEach, describe, expect, test, vi } from 'vitest'
import { fetchDataset } from './load'

const config = { minYear: -3000, maxYear: 2100 }
const regions = [
  { id: 'east-asia', name: '東アジア', order: 6, color: '#3fa06b' },
  { id: 'west-europe', name: '西欧', order: 1, color: '#4a90d9' },
]
const entries = [
  {
    id: 'edward-1',
    type: 'ruler',
    region: 'west-europe',
    title: 'エドワード1世',
    reading: 'えどわーどいっせい',
    start: 1272,
    end: 1307,
    importance: 2,
    description: 'ウェールズを征服。',
  },
]

function stubFetchWith(bodies: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      const body = bodies[name]
      if (body === undefined) return new Response('not found', { status: 404 })
      return new Response(JSON.stringify(body))
    }),
  )
}

function stubFetchRejectingFor(file: string, bodies: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      if (name === file) throw new Error('network down')
      const body = bodies[name]
      if (body === undefined) return new Response('not found', { status: 404 })
      return new Response(JSON.stringify(body))
    }),
  )
}

function stubFetchWithInvalidJsonFor(file: string, bodies: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const name = String(url).split('/').pop() ?? ''
      if (name === file) return new Response('not valid json')
      const body = bodies[name]
      if (body === undefined) return new Response('not found', { status: 404 })
      return new Response(JSON.stringify(body))
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDataset', () => {
  test('3ファイルを取得し、地域を order 順に返す', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions, 'entries.json': entries })
    const result = await fetchDataset('/base/')
    if (!result.ok) throw new Error('expected ok result')
    expect(result.value.config).toEqual(config)
    expect(result.value.regions.map((r) => r.id)).toEqual(['west-europe', 'east-asia'])
    expect(result.value.entries).toHaveLength(1)
  })

  test('baseUrl からのパスで取得する', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions, 'entries.json': entries })
    await fetchDataset('/base/')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/base/data/config.json')
  })

  test('HTTP エラーで http 種別の失敗を返す', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions })
    const result = await fetchDataset('/base/')
    if (result.ok) throw new Error('expected error result')
    expect(result.error).toEqual({
      type: 'http',
      file: 'entries',
      url: '/base/data/entries.json',
      status: 404,
    })
  })

  test('fetch が reject しても network 種別の失敗を返す（reject しない）', async () => {
    stubFetchRejectingFor('entries.json', { 'config.json': config, 'regions.json': regions })
    const result = await fetchDataset('/base/')
    if (result.ok) throw new Error('expected error result')
    if (result.error.type !== 'network') throw new Error('expected network error')
    expect(result.error.file).toBe('entries')
    expect(result.error.url).toBe('/base/data/entries.json')
    expect(result.error.cause).toBeInstanceOf(Error)
  })

  test('レスポンスが JSON として読めなくても invalid-json 種別の失敗を返す', async () => {
    stubFetchWithInvalidJsonFor('entries.json', { 'config.json': config, 'regions.json': regions })
    const result = await fetchDataset('/base/')
    if (result.ok) throw new Error('expected error result')
    if (result.error.type !== 'invalid-json') throw new Error('expected invalid-json error')
    expect(result.error.file).toBe('entries')
    expect(result.error.url).toBe('/base/data/entries.json')
    expect(result.error.cause).toBeDefined()
  })

  test('スキーマ違反で validation 種別の失敗を返す', async () => {
    stubFetchWith({
      'config.json': config,
      'regions.json': regions,
      'entries.json': [{ id: 'broken' }],
    })
    const result = await fetchDataset('/base/')
    if (result.ok) throw new Error('expected error result')
    if (result.error.type !== 'validation') throw new Error('expected validation error')
    expect(result.error.file).toBe('entries')
    expect(result.error.issues.length).toBeGreaterThan(0)
  })
})
