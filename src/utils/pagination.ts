import type { Request } from 'express'

export const buildPagination = (req: Request, page: number, limit: number, total: number) => {
  const totalPages = Math.ceil(total / limit) || 1
  const hasNext = page < totalPages
  const hasPrev = page > 1
  const basePath = `${req.baseUrl}${req.path}`

  const buildUrl = (p: number) => {
    const params = new URLSearchParams(req.query as Record<string, string>)
    params.set('page', String(p))
    params.set('limit', String(limit))
    return `${basePath}?${params}`
  }

  return {
    meta: { page, limit, total, totalPages, hasNext, hasPrev },
    links: {
      self: buildUrl(page),
      next: hasNext ? buildUrl(page + 1) : null,
      prev: hasPrev ? buildUrl(page - 1) : null,
      first: buildUrl(1),
      last: buildUrl(totalPages),
    },
  }
}
