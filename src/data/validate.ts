import type { Dataset } from './schema'

export function validateDataset({ config, regions, entries }: Dataset): string[] {
  const errors: string[] = []
  const regionIds = new Set(regions.map((r) => r.id))
  const seen = new Set<string>()
  for (const e of entries) {
    if (seen.has(e.id)) errors.push(`duplicate id: ${e.id}`)
    seen.add(e.id)
    if (!regionIds.has(e.region)) errors.push(`${e.id}: unknown region ${e.region}`)
    if (e.start < config.minYear || (e.end ?? e.start) > config.maxYear) {
      errors.push(`${e.id}: out of range`)
    }
  }
  return errors
}
