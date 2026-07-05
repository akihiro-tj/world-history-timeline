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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchDataset', () => {
  test('3ファイルを取得し、地域を order 順に返す', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions, 'entries.json': entries })
    const dataset = await fetchDataset('/base/')
    expect(dataset.config).toEqual(config)
    expect(dataset.regions.map((r) => r.id)).toEqual(['west-europe', 'east-asia'])
    expect(dataset.entries).toHaveLength(1)
  })

  test('baseUrl からのパスで取得する', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions, 'entries.json': entries })
    await fetchDataset('/base/')
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('/base/data/config.json')
  })

  test('HTTP エラーで reject する', async () => {
    stubFetchWith({ 'config.json': config, 'regions.json': regions })
    await expect(fetchDataset('/base/')).rejects.toThrow('404')
  })

  test('スキーマ違反で reject する', async () => {
    stubFetchWith({
      'config.json': config,
      'regions.json': regions,
      'entries.json': [{ id: 'broken' }],
    })
    await expect(fetchDataset('/base/')).rejects.toThrow()
  })
})
