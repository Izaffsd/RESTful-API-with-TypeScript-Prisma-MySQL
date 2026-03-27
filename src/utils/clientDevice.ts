/** Short human label for security emails (no extra dependencies). */
export function describeUserAgent(ua: string | undefined): string {
  const u = (ua ?? '').trim()
  if (!u) return 'Unknown browser'

  const os =
    /Windows/i.test(u) ? 'Windows'
    : /Mac OS X|Macintosh/i.test(u) ? 'macOS'
    : /Android/i.test(u) ? 'Android'
    : /iPhone|iPad/i.test(u) ? 'iOS'
    : 'Unknown OS'

  if (/Edg\//i.test(u)) return `Edge on ${os}`
  if (/Firefox\//i.test(u)) return `Firefox on ${os}`
  if (/Chrome\//i.test(u) && !/Edg/i.test(u)) return `Chrome on ${os}`
  if (/Safari/i.test(u) && !/Chrome/i.test(u)) return `Safari on ${os}`

  return `Browser on ${os}`
}
