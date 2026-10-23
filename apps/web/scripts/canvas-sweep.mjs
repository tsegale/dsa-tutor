/**
 * Opens every structure topic in a real browser and looks at it.
 *
 * The unit suite is 3,000-odd pure-logic tests and not one of them opens a
 * page, so a canvas could draw its contents below the fold, or print a
 * caption straight through another one, with everything green. Both of
 * those shipped. This is the check that would have caught them.
 *
 * For each topic it asserts:
 *   - the canvas says what operation is happening (the banner), and
 *   - nothing drawn in the banner's band is underneath it, and
 *   - nothing drawn in the svg falls outside the box the user can see.
 *
 * Usage:
 *   pnpm --filter web build && pnpm --filter web preview --port 4173 &
 *   node apps/web/scripts/canvas-sweep.mjs http://127.0.0.1:4173
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:4173'
const T = 4000

const TOPICS = [
  'array-access',
  'array-insert',
  'array-delete',
  'stack',
  'queue',
  'circular-queue',
  'deque',
  'singly-linked-list',
  'doubly-linked-list',
  'circular-linked-list',
  'hash-table-chaining',
  'hash-table-probing',
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
const failures = []

async function clearModals() {
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[role=dialog]').first()
    if ((await dialog.count()) === 0) return
    const dismiss = dialog.getByRole('button', { name: /^(skip|close|got it|start|dismiss|later)/i }).first()
    if (await dismiss.count()) await dismiss.click({ timeout: T }).catch(() => {})
    else await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
  }
}

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForTimeout(900)
  const demo = page.getByRole('button', { name: /explore without an account|try the demo|demo/i }).first()
  if (await demo.count()) {
    await demo.click({ timeout: T }).catch(() => {})
    await page.waitForTimeout(1500)
  }

  for (const slug of TOPICS) {
    await page.goto(`${BASE}/algorithm/${slug}?mode=PRACTICE`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1600)
    await clearModals()

    // Two steps in, so an operation is actually under way rather than the
    // run sitting on its opening frame.
    for (let i = 0; i < 2; i++) {
      const next = page.getByRole('button', { name: /^(next|step forward|forward)/i }).first()
      if (await next.count()) await next.click({ timeout: T }).catch(() => {})
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(1200)
    await clearModals()

    const result = await page.evaluate(() => {
      const headline = document.querySelector('p.font-semibold.text-small')
      if (!headline) return { labelled: false }
      const header = headline.parentElement.parentElement
      const detail = headline.nextElementSibling

      // The paragraph boxes run the full width of the header; the words do
      // not. Measuring the box reports collisions that are not there.
      const textRect = (el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        return range.getBoundingClientRect()
      }
      const head = textRect(headline)
      const tail = detail ? textRect(detail) : head
      const bandBottom = Math.max(head.bottom, tail.bottom)
      const bandRight = Math.max(head.right, tail.right)

      const svg = Array.from(document.querySelectorAll('svg')).sort(
        (a, b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height,
      )[0]
      if (!svg) return { labelled: true, headline: headline.textContent, under: [], outside: [] }

      const scroller = svg.parentElement
      const box = scroller.getBoundingClientRect()
      // A box the user can scroll is not hiding anything from them; one
      // that cannot scroll and still has drawing past its edge is.
      const scrolls = scroller.scrollHeight > scroller.clientHeight + 2
      const under = []
      const outside = []
      for (const el of svg.querySelectorAll('rect, text, circle, line, path, polygon')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        const name = `${el.tagName}:${(el.textContent || '').trim().slice(0, 10)}`
        // A circle's box spans its whole ring, so its edges are what count.
        const spans = el.tagName === 'circle' || el.tagName === 'path'
        if (!spans && r.top < bandBottom && r.bottom > head.top && Math.min(r.right, bandRight) - Math.max(r.left, head.left) > 2) {
          under.push(name)
        }
        if (!scrolls && (r.bottom > box.bottom + 1 || r.top < box.top - 1)) outside.push(name)
      }
      return {
        labelled: true,
        headline: headline.textContent,
        detail: detail?.textContent ?? '',
        under: under.slice(0, 4),
        outside: outside.slice(0, 4),
      }
    })

    if (!result.labelled) {
      failures.push(`${slug}: no operation banner`)
      console.log(`${slug.padEnd(22)} FAIL  no operation banner`)
      continue
    }
    if (result.under.length) failures.push(`${slug}: drawn under the banner - ${result.under.join(', ')}`)
    if (result.outside.length) failures.push(`${slug}: drawn outside the visible box - ${result.outside.join(', ')}`)

    const verdict = result.under.length || result.outside.length ? 'FAIL' : 'ok  '
    console.log(`${slug.padEnd(22)} ${verdict}  ${result.headline}`)
  }
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(`\n${failures.length} problem(s):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log(`\n${TOPICS.length} topics, all labelled and inside their box.`)
