import { readFileSync } from 'node:fs'
import { configSchema, entriesSchema, regionsSchema } from '../src/data/schema'
import { validateDataset } from '../src/data/validate'

const read = (name: string) => JSON.parse(readFileSync(`public/data/${name}`, 'utf-8'))

const dataset = {
  config: configSchema.parse(read('config.json')),
  regions: regionsSchema.parse(read('regions.json')),
  entries: entriesSchema.parse(read('entries.json')),
}
const errors = validateDataset(dataset)
if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`OK: ${dataset.regions.length} regions, ${dataset.entries.length} entries`)
