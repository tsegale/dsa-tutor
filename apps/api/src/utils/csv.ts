// Minimal RFC 4180 CSV helpers - no dependency added since both directions
// (serialise, parse) are a few lines each and this is the only place in
// the codebase that needs them.

export function toCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function toCsvRow(fields: string[]): string {
  return fields.map(toCsvField).join(',')
}

export function toCsv(header: string[], rows: string[][]): string {
  return [toCsvRow(header), ...rows.map(toCsvRow)].join('\r\n')
}

/** Parses a full CSV document (with a header row) into an array of
 * objects keyed by the header. Handles quoted fields, escaped quotes
 * ("") and commas/newlines inside quotes - the inverse of toCsv. */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      pushField()
    } else if (char === '\n') {
      pushRow()
    } else if (char === '\r') {
      // swallow, paired \n handles the row break
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    pushRow()
  }

  const nonEmptyRows = rows.filter((r) => !(r.length === 1 && r[0] === ''))
  if (nonEmptyRows.length === 0) return []

  const [header, ...dataRows] = nonEmptyRows
  return dataRows.map((r) => Object.fromEntries(header.map((key, i) => [key, r[i] ?? ''])))
}
