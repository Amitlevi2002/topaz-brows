const SRC = '/ba/ai-split.webp';

/**
 * The AI picture Amit made is one face split down the middle: the brow as it grows on the left, shaped on the right.
 * Each half is mirrored onto the other side, so there is a whole face "before" and a whole face "after";
 * the two sit on top of each other and the "after" brows fade in, hold, and fade back, with a gold light passing over.
 * With reduced motion it is the original split picture, standing still.
 */
export function BrowMorph() {
  const face = (side: 'before' | 'after') => (
    <div className={`face ${side}`} aria-hidden="true">
      <img src={SRC} alt="" className="half own" draggable={false} />
      <img src={SRC} alt="" className="half mirror" draggable={false} />
    </div>
  );
  return (
    <figure className="morph" data-rise>
      <img className="still-split" src={SRC} alt="המחשה: אותה אישה, לפני עיצוב הגבות ואחריו" width={1254} height={1254} />
      {face('before')}
      {face('after')}
      <span className="sweep" aria-hidden="true" />
      <span className="tag t-before" aria-hidden="true">
        לפני
      </span>
      <span className="tag t-after" aria-hidden="true">
        אחרי
      </span>
      <figcaption>המחשה</figcaption>
    </figure>
  );
}
