import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const input = path.join(root, 'locales', 'locales.csv')
const output = path.join(root, 'src', 'i18n', 'resources.generated.ts')

function parseCsv(source) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { field += '"'; i += 1 } else { quoted = !quoted }
    } else if (char === ',' && !quoted) {
      row.push(field); field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1
      row.push(field); field = ''
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
    } else {
      field += char
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

const rows = parseCsv(fs.readFileSync(input, 'utf8'))
const [header, ...data] = rows
if (!header || header[0] !== 'key') throw new Error('locales.csv must start with key,en,th')
const languages = header.slice(1)
const resources = Object.fromEntries(languages.map((lang) => [lang, {}]))
const seen = new Set()
for (const row of data) {
  const key = row[0]?.trim()
  if (!key) continue
  if (seen.has(key)) throw new Error(`Duplicate locale key: ${key}`)
  seen.add(key)
  languages.forEach((lang, index) => { resources[lang][key] = row[index + 1] ?? '' })
}
const generated = `// GENERATED FILE. Edit locales/locales.csv and run npm run gen:l10n.\nexport const resources = ${JSON.stringify(resources, null, 2)} as const\n\nexport type LocaleKey = keyof typeof resources.en\n`
if (process.argv.includes('--check')) {
  const current = fs.existsSync(output) ? fs.readFileSync(output, 'utf8') : ''
  if (current !== generated) {
    console.error('Generated localization resources are stale. Run npm run gen:l10n.')
    process.exit(1)
  }
  console.log(`Localization resources are current (${seen.size} keys).`)
} else {
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, generated)
  console.log(`Generated ${seen.size} localization keys for: ${languages.join(', ')}`)
}
