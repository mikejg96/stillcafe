#!/usr/bin/env node
/**
 * Image-sequence pipeline.
 *
 *   assets/<id>/*.png  ──►  public/media/sequences/<id>/<width>/<0000>.webp
 *                      ──►  src/content/sequences.gen.json  (manifest, imported at build time)
 *
 * - Every directory in /assets whose files end in a frame number is treated as a sequence.
 * - Frames are ordered by their trailing number, not by filename sort.
 * - Each frame is emitted at every width in WIDTHS that does not exceed the source width.
 * - Incremental: frames whose output is newer than the source are skipped.
 * - The manifest carries a content version so URLs can be cached immutably.
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC_DIR = path.join(ROOT, 'assets')
const OUT_DIR = path.join(ROOT, 'public/media/sequences')
const MANIFEST = path.join(ROOT, 'src/content/sequences.gen.json')
const PUBLIC_BASE = '/media/sequences'

const WIDTHS = [640, 1280, 1920]
const WEBP = { quality: 80, effort: 5, smartSubsample: true }
const PAD = 4
const FRAME_RE = /(\d+)\.(png|jpe?g|webp|tiff?)$/i
const FORCE = process.argv.includes('--force') || process.argv.includes('--clean')

const exists = (p) => stat(p).then((s) => s, () => null)

async function pool(items, limit, fn) {
  let i = 0
  const run = async () => {
    while (i < items.length) await fn(items[i++])
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
}

async function buildSequence(id) {
  const dir = path.join(SRC_DIR, id)
  const frames = (await readdir(dir))
    .map((name) => ({ name, m: name.match(FRAME_RE) }))
    .filter((f) => f.m)
    .sort((a, b) => Number(a.m[1]) - Number(b.m[1]))
    .map((f) => path.join(dir, f.name))

  if (frames.length === 0) return null

  const { width, height } = await sharp(frames[0]).metadata()
  const widths = WIDTHS.filter((w) => w < width)
  if (!widths.includes(width)) widths.push(width)

  const hash = createHash('sha1')
  const jobs = []
  for (const [index, src] of frames.entries()) {
    const s = await stat(src)
    hash.update(`${path.basename(src)}:${s.size}:${s.mtimeMs}`)
    for (const w of widths) {
      jobs.push({ src, srcMtime: s.mtimeMs, w, out: path.join(OUT_DIR, id, String(w), `${String(index).padStart(PAD, '0')}.webp`) })
    }
  }
  hash.update(JSON.stringify({ widths, WEBP }))

  await Promise.all(widths.map((w) => mkdir(path.join(OUT_DIR, id, String(w)), { recursive: true })))

  let written = 0
  await pool(jobs, availableParallelism(), async (job) => {
    const prev = await exists(job.out)
    if (!FORCE && prev && prev.mtimeMs >= job.srcMtime) return
    const img = sharp(job.src)
    if (job.w !== width) img.resize({ width: job.w, kernel: 'lanczos3' })
    await img.webp(WEBP).toFile(job.out)
    written++
  })

  console.log(`  ${id}: ${frames.length} frames × ${widths.join('/')}w (${written} written)`)

  return {
    frameCount: frames.length,
    width,
    height,
    base: `${PUBLIC_BASE}/${id}`,
    ext: 'webp',
    pad: PAD,
    widths,
    version: hash.digest('hex').slice(0, 10),
  }
}

const entries = await readdir(SRC_DIR, { withFileTypes: true }).catch(() => [])
const manifest = {}
console.log('Building image sequences…')
for (const entry of entries) {
  // Ignore non-directories, images stills, hidden folders, and backup folders (e.g. seq1_x).
  if (
    !entry.isDirectory() ||
    entry.name === 'images' ||
    entry.name.startsWith('.') ||
    entry.name.startsWith('_') ||
    entry.name.endsWith('_x') ||
    entry.name.toLowerCase().includes('backup')
  ) {
    continue
  }
  const seq = await buildSequence(entry.name)
  if (seq) manifest[entry.name] = seq
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Manifest → ${path.relative(ROOT, MANIFEST)}`)
