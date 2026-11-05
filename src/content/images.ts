import data from './images.gen.json'

/** Shape of each entry in content/images.gen.json (written by scripts/build-images.mjs). */
export interface ImageManifest {
  width: number
  height: number
  /** Public path; files live at `${base}/${width}.webp`. */
  base: string
  /** Available encoded widths, ascending. */
  widths: number[]
  version: string
}

/** Stills built from /assets by `npm run assets`. */
export const images: Record<keyof typeof data, ImageManifest> = data
export type ImageId = keyof typeof images

const url = (base: string, file: string, version: string) =>
  `${import.meta.env.BASE_URL}${base.replace(/^\//, '')}/${file}?v=${version}`

/** Smallest encoded file at least `minWidth` wide (or the largest there is). */
export function imageSrc(img: ImageManifest, minWidth = img.width) {
  const w = img.widths.find((x) => x >= minWidth) ?? img.widths[img.widths.length - 1]!
  return url(img.base, `${w}.webp`, img.version)
}

export function imageSrcSet(img: ImageManifest) {
  return img.widths.map((w) => `${url(img.base, `${w}.webp`, img.version)} ${w}w`).join(', ')
}
