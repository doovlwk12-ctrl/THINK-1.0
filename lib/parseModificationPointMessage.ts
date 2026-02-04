/**
 * Parses chat message content to detect the "نقطة التعديل" (modification point) format.
 * Used to render modification points as distinct cards in the chat UI.
 */

export interface ParsedModificationPoint {
  pinIndex: number
  location: string
  note: string
  rawContent: string
}

const PIN_INDEX_REGEX = /نقطة\s*التعديل\s*#\s*(\d+)/
const LOCATION_REGEX = /الموقع:\s*\(([^)]+)\)/
const NOTE_REGEX = /الملاحظة:\s*([\s\S]+?)(?=\n\n|\nهل|$)/

/**
 * Returns parsed modification point data if content matches the known format, otherwise null.
 */
export function parseModificationPointMessage(content: string): ParsedModificationPoint | null {
  if (!content || typeof content !== 'string') return null

  const pinMatch = content.match(PIN_INDEX_REGEX)
  const locationMatch = content.match(LOCATION_REGEX)
  const noteMatch = content.match(NOTE_REGEX)

  if (!pinMatch || !locationMatch) return null

  const pinIndex = parseInt(pinMatch[1], 10)
  const location = locationMatch[1].trim()
  const note = (noteMatch?.[1] ?? '').trim().replace(/\n+$/, '') || 'بدون ملاحظة'

  return {
    pinIndex,
    location,
    note,
    rawContent: content,
  }
}
