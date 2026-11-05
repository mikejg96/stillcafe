#!/usr/bin/env node
/**
 * Still-image pipeline (logo, card photos).
 *
 *   assets/*.png, assets/images/*  ──►  public/media/images/<name>/<width>.webp
 *                                  ──►  src/content/images.gen.json  (manifest)
 *
 * - <name> is the file name without extension.
 * - Images with an alpha channel are trimmed to their visible bounds (e.g. a padded logo).
 * - Each image is emitted at every width in WIDTHS below its source width, plus the source width.
 * - Incremental, with a content version per image so URLs can be cached immutably.
 */
import { createHash } from 'node:crypto'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const SOURCES = [path.join(ROOT, 'assets'), path.join(ROOT, 'assets/images')]
const OUT_DIR = path.join(ROOT, 'public/media/images')
const MANIFEST = path.join(ROOT, 'src/content/images.gen.json')
const PUBLIC_BASE = '/media/images'

const WIDTHS = [800, 1600, 2400]
const WEBP = { quality: 82, effort: 5, smartSubsample: true, alphaQuality: 90 }
const IMAGE_RE = /\.(png|jpe?g|webp)$/i

const exists = (p) => stat(p).then((s) => s, () => null)

async function buildImage(src) {
  const name = path.basename(src).replace(IMAGE_RE, '')
  const s = await stat(src)
  const meta = await sharp(src).metadata()
  const trim = Boolean(meta.hasAlpha)

  // Source size after trimming decides which widths are worth emitting.
  const { info } = await sharp(src).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true })
  const width = trim ? info.width : meta.width
  const height = trim ? info.height : meta.height
  const widths = WIDTHS.filter((w) => w < width)
  widths.push(width)

  await mkdir(path.join(OUT_DIR, name), { recursive: true })
  let written = 0
  for (const w of widths) {
    const out = path.join(OUT_DIR, name, `${w}.webp`)
    const prev = await exists(out)
    if (prev && prev.mtimeMs >= s.mtimeMs) continue
    let img = sharp(src)
    if (trim) img = img.trim({ threshold: 0 })
    if (w !== width) img = img.resize({ width: w, kernel: 'lanczos3' })
    await img.webp(WEBP).toFile(out)
    written++
  }

  const version = createHash('sha1')
    .update(`${s.size}:${s.mtimeMs}:${JSON.stringify({ widths, WEBP, trim })}`)
    .digest('hex')
    .slice(0, 10)
  console.log(`  ${name}: ${width}×${height} → ${widths.join('/')}w (${written} written)`)
  return [name, { width, height, base: `${PUBLIC_BASE}/${name}`, widths, version }]
}

console.log('Building images…')
const manifest = {}
for (const dir of SOURCES) {
  const files = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const f of files) {
    if (!f.isFile() || !IMAGE_RE.test(f.name)) continue
    const [name, entry] = await buildImage(path.join(dir, f.name))
    manifest[name] = entry
  }
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`Manifest → ${path.relative(ROOT, MANIFEST)}`)
