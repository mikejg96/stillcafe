import { images, type ImageManifest } from './images'

/** SEQ4 – the About / Where? / Time? blocks. `media` fills a block while it is selected. */
export interface InfoBlock {
  id: string
  title: string
  text: string
  /** Figma's "Warm Cream-to-Taupe Grain Gradient": shown while a video loads, or on its own. */
  media: ImageManifest
  /** A looping clip (public/videos) that plays while the block is selected. */
  video?: string
}

export const infoBlocks: InfoBlock[] = [
  { id: 'about', title: 'About', text: 'A place to slow down.', media: images.grain, video: '/videos/about_box.mp4' },
  { id: 'where', title: 'Where?', text: 'Jl. Tukad Balian No. 202, Renon Bali', media: images.grain, video: '/videos/where_box.mp4' },
  // Gradient only for now.
  { id: 'time', title: 'Time?', text: '10 AM - 7 PM Daily', media: images.grain },
]

/** SEQ5 – footer links. Placeholder URLs until the real ones are known (see design/SPEC.md). */
export const footerLinks = [
  { label: 'MENU', href: '#' },
  { label: 'INSTAGRAM', href: '#' },
  { label: 'GOJEK', href: '#' },
  { label: 'GRAB', href: '#' },
]
