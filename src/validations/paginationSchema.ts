import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type PaginationQuery = z.infer<typeof paginationSchema>
