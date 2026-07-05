import { configSchema, type Dataset, entriesSchema, regionsSchema } from './schema'

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed to fetch ${url}: ${res.status}`)
  return res.json()
}

export async function fetchDataset(baseUrl: string = import.meta.env.BASE_URL): Promise<Dataset> {
  const [config, regions, entries] = await Promise.all([
    fetchJson(`${baseUrl}data/config.json`),
    fetchJson(`${baseUrl}data/regions.json`),
    fetchJson(`${baseUrl}data/entries.json`),
  ])
  return {
    config: configSchema.parse(config),
    regions: [...regionsSchema.parse(regions)].sort((a, b) => a.order - b.order),
    entries: entriesSchema.parse(entries),
  }
}
