import data from './sequences.gen.json'

/** Shape of each entry in content/sequences.gen.json (written by scripts/build-sequences.mjs). */
export interface SequenceManifest {
  frameCount: number
  /** Native pixel size of the source frames. */
  width: number
  height: number
  /** Public path; frames live at `${base}/${width}/${index padded}.${ext}`. */
  base: string
  ext: string
  pad: number
  /** Available encoded widths, ascending. */
  widths: number[]
  /** Content hash – appended to URLs so frames can be cached immutably. */
  version: string
}

/** Image sequences built from /assets by `npm run assets`. */
export const sequences: Record<keyof typeof data, SequenceManifest> = data
export type SequenceId = keyof typeof sequences

/** `srcset` for one frame of a sequence, to show it as a plain still (e.g. a card photo). */
export function frameSrcSet(seq: SequenceManifest, index: number) {
  const frame = String(Math.min(seq.frameCount - 1, Math.max(0, index))).padStart(seq.pad, '0')
  const base = `${import.meta.env.BASE_URL}${seq.base.replace(/^\//, '')}`
  return seq.widths.map((w) => `${base}/${w}/${frame}.${seq.ext}?v=${seq.version} ${w}w`).join(', ')
}
