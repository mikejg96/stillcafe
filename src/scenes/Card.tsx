import type { Card as CardData } from '../content/cards'
import './card.css'

/**
 * One menu card (Figma SEQ3). Static markup only: position, scale and blur are driven by the
 * carousel controller, never by props. `index` is the carousel slot.
 *
 * The photo is marked up for `deferMedia()`: it is only requested once the intro has played.
 */
export function Card({ card, index }: { card: CardData; index: number }) {
  // The srcset's first (smallest) candidate, for browsers that ignore srcset.
  const fallbackSrc = card.srcSet.split(',')[0]?.trim().split(' ')[0]

  return (
    <article className="card" data-index={index} aria-label={`${card.name}, ${card.origin}`}>
      <div className="card__photo">
        <img
          data-src={fallbackSrc}
          data-srcset={card.srcSet}
          sizes="(max-width: 767px) 68vw, 24vw"
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
      <div className="card__body">
        <h3 className="card__name">{card.name}</h3>
        <p className="card__origin">{card.origin}</p>
        <div className="card__details">
          {card.details.flat().map((text, i) => (
            <span key={i}>{text}</span>
          ))}
        </div>
        <ul className="card__profile">
          {card.profile.map(({ label, value }) => (
            <li key={label}>
              <span className="card__label">{label}</span>
              <span className="card__dots" role="img" aria-label={`${value} of 5`}>
                {Array.from({ length: value }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <button className="card__hit" type="button" data-index={index} aria-label={`Show ${card.origin}`} />
    </article>
  )
}
