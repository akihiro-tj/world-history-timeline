import { z } from 'zod'

// Why: 1 = skeletal (era-defining), 2 = major (rulers/popes/wars/treaties), 3 = detail (deep zoom only)
const MIN_IMPORTANCE = 1
const MAX_IMPORTANCE = 3

export const configSchema = z
  .object({
    minYear: z.number().int(),
    maxYear: z.number().int(),
  })
  .refine((c) => c.minYear < c.maxYear, { message: 'minYear must be less than maxYear' })

export const regionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

const baseEntryFields = {
  id: z.string().regex(/^[a-z0-9-]+$/),
  region: z.string().min(1),
  group: z.string().min(1).optional(),
  groupName: z.string().min(1).optional(),
  title: z.string().min(1),
  reading: z.string().regex(/^[ぁ-ゖー・\s]+$/),
  start: z.number().int(),
  importance: z.number().int().min(MIN_IMPORTANCE).max(MAX_IMPORTANCE),
  description: z.string().min(1),
}

const rulerEntrySchema = z.object({
  ...baseEntryFields,
  type: z.literal('ruler'),
  end: z.number().int(),
})

const personEntrySchema = z.object({
  ...baseEntryFields,
  type: z.literal('person'),
  end: z.number().int(),
})

const eventEntrySchema = z.object({
  ...baseEntryFields,
  type: z.literal('event'),
  end: z.number().int().optional(),
})

export const entrySchema = z
  .discriminatedUnion('type', [rulerEntrySchema, personEntrySchema, eventEntrySchema])
  .superRefine((e, ctx) => {
    if (e.end !== undefined && e.end < e.start) {
      ctx.addIssue({ code: 'custom', message: `${e.id}: end must be >= start` })
    }
    if (e.group !== undefined && e.groupName === undefined) {
      ctx.addIssue({ code: 'custom', message: `${e.id}: group requires groupName` })
    }
  })

export const regionsSchema = z.array(regionSchema)
export const entriesSchema = z.array(entrySchema)

export type Config = z.infer<typeof configSchema>
export type Region = z.infer<typeof regionSchema>
export type Entry = z.infer<typeof entrySchema>

export type Dataset = {
  config: Config
  regions: Region[]
  entries: Entry[]
}
