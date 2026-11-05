import { imageSrcSet, images } from './images'
import { frameSrcSet, sequences } from './sequences'

/**
 * The SEQ3 carousel. Copy and imagery are placeholders until the real menu exists – see
 * design/SPEC.md. The carousel loops: with fewer cards than it needs to fill the ring, they repeat.
 */
export interface Card {
  id: string
  name: string
  /** Second line under the name (origin / tagline). */
  origin: string
  /** Detail rows, two columns each. */
  details: [string, string][]
  /** Dot ratings, out of 5. */
  profile: { label: string; value: number }[]
  /** Photo in the card. */
  srcSet: string
}

const details: Card['details'] = [
  ['Mixed Varieties', '100 - 1340 MDPL'],
  ['Espresso Roast', 'Arabica & Robusta'],
]

const profile: Card['profile'] = [
  { label: 'Sweetness', value: 4 },
  { label: 'Body', value: 5 },
  { label: 'Acidity', value: 3 },
]

const seq1 = sequences.seq1

export const cards: Card[] = [
  // Figma SEQ3's centre card: the meadow from the intro.
  {
    id: 'meadow',
    name: 'STILL',
    origin: 'A space to slow down',
    details,
    profile,
    srcSet: frameSrcSet(seq1, 40),
  },
  {
    id: 'still',
    name: 'STILL',
    origin: 'A space to slow down',
    details,
    profile,
    srcSet: imageSrcSet(images.matcha),
  },
  {
    id: 'flores',
    name: 'STILL',
    origin: 'Flores Manggarai & Bali Lemukih',
    details,
    profile,
    srcSet: imageSrcSet(images.beans),
  },
  {
    id: 'matcha',
    name: 'STILL',
    origin: 'Flores Manggarai & Bali Lemukih',
    details,
    profile,
    srcSet: imageSrcSet(images.matcha),
  },
]
