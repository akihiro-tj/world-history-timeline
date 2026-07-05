import { z } from 'zod'

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

export const entrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    type: z.enum(['ruler', 'person', 'event']),
    region: z.string().min(1),
    group: z.string().min(1).optional(),
    groupName: z.string().min(1).optional(),
    title: z.string().min(1),
    reading: z.string().regex(/^[ぁ-ゖー・\s]+$/),
    start: z.number().int(),
    end: z.number().int().optional(),
    importance: z.number().int().min(1).max(3),
    description: z.string().min(1),
  })
  .superRefine((e, ctx) => {
    if (e.type !== 'event' && e.end === undefined) {
      ctx.addIssue({ code: 'custom', message: `${e.id}: ruler/person requires end` })
    }
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
