import type { z } from 'zod'
import { err, ok, type Result } from '../domain/result'
import { configSchema, type Dataset, entriesSchema, regionsSchema } from './schema'

export type DatasetFile = 'config' | 'regions' | 'entries'

export type DatasetError =
  | { type: 'network'; file: DatasetFile; url: string; status: number }
  | { type: 'validation'; file: DatasetFile; issues: z.core.$ZodIssue[] }

async function fetchDatasetFile<T>(
  file: DatasetFile,
  url: string,
  schema: z.ZodType<T>,
): Promise<Result<T, DatasetError>> {
  const res = await fetch(url)
  if (!res.ok) return err({ type: 'network', file, url, status: res.status })

  const json = await res.json()
  const parsed = schema.safeParse(json)
  return parsed.success
    ? ok(parsed.data)
    : err({ type: 'validation', file, issues: parsed.error.issues })
}

export async function fetchDataset(
  baseUrl: string = import.meta.env.BASE_URL,
): Promise<Result<Dataset, DatasetError>> {
  const [configResult, regionsResult, entriesResult] = await Promise.all([
    fetchDatasetFile('config', `${baseUrl}data/config.json`, configSchema),
    fetchDatasetFile('regions', `${baseUrl}data/regions.json`, regionsSchema),
    fetchDatasetFile('entries', `${baseUrl}data/entries.json`, entriesSchema),
  ])

  if (!configResult.ok) return configResult
  if (!regionsResult.ok) return regionsResult
  if (!entriesResult.ok) return entriesResult

  return ok({
    config: configResult.value,
    regions: [...regionsResult.value].sort((a, b) => a.order - b.order),
    entries: entriesResult.value,
  })
}
