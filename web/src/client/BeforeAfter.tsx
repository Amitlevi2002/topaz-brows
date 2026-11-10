import { useRef, useState } from 'react';

/** Before/after pairs cut from the split photos Topaz posts. Which half is "after" is set when the photos are prepared. */
export const PAIRS = [1, 2, 3, 4, 5].map((n) => ({ before: `/ba/${n}-before.jpg`, after: `/ba/${n}-after.jpg` }));

/** One frame split down the middle: before on one side, after on the other, the words written on the photo. */
export function BeforeAfter() {
  const [i, setI] = useState(0);
  const p = PAIRS[i];
  const move = (d: number) => setI((x) => (x + d + PAIRS.length) % PAIRS.length);
  const startX = useRef<number | null>(null);
  const rtl = () => document.documentElement.dir !== 'ltr';
  return (
    <section className="ba" aria-roledescription="carousel" aria-label="לפני ואחרי">
      <div
        className="ba-frame"
        key={i}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          const x0 = startX.current;
          startX.current = null;
          if (x0 === null || Math.abs(e.clientX - x0) < 40) return;
          // swiping toward the reading direction's end brings the next one
          const left = e.clientX < x0;
          move(left === rtl() ? 1 : -1);
        }}
      >
        <figure className="half before">
          <img src={p.before} alt={`גבה לפני הטיפול, לקוחה ${i + 1}`} draggable={false} />
          <figcaption>לפני</figcaption>
        </figure>
        <figure className="half after">
          <img src={p.after} alt={`אותה גבה אחרי הטיפול, לקוחה ${i + 1}`} draggable={false} />
          <figcaption>אחרי</figcaption>
        </figure>
      </div>
      <div className="ba-nav">
        <button className="ba-arrow" onClick={() => move(-1)} aria-label="הקודמת">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <span className="ba-count" aria-live="polite">
          {String(i + 1).padStart(2, '0')} / {String(PAIRS.length).padStart(2, '0')}
        </span>
        <button className="ba-arrow" onClick={() => move(1)} aria-label="הבאה">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
