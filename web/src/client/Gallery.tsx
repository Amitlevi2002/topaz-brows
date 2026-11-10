import type { Photo } from '../lib/types';
import { useState, useEffect, useRef } from 'react';

/** Full-screen viewer: swipe between photos, counter, close. */
export function Lightbox({ photos, start, onClose }: { photos: Photo[]; start: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = start * el.clientWidth;
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, []);
  const onScroll = () => {
    const el = ref.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="גלריית עבודות">
      <div className="lb-top">
        <span className="lb-count">
          {i + 1}
          {' / '}
          {photos.length}
        </span>
        <button className="lb-close" onClick={onClose} aria-label="סגירה">
          ✕
        </button>
      </div>
      <div className="lb-track" ref={ref} onScroll={onScroll}>
        {photos.map((p) => (
          <div className="lb-slide" key={p.id}>
            <img src={p.url} alt="גבות לפני ואחרי, עבודה של טופז" />
          </div>
        ))}
      </div>
    </div>
  );
}
/** Swipeable hero with gentle auto-advance (stops once she touches it). */

/** Swipeable hero with gentle auto-advance (stops once she touches it). */
export function HeroCarousel({ photos, onOpen }: { photos: Photo[]; onOpen: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const touched = useRef(false);
  useEffect(() => {
    if (photos.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      const el = ref.current;
      if (!el || touched.current) return;
      const next = (Math.round(el.scrollLeft / el.clientWidth) + 1) % photos.length;
      el.scrollTo({
        left: next * el.clientWidth,
        behavior: 'smooth',
      });
    }, 3800);
    return () => clearInterval(t);
  }, [photos.length]);
  const onScroll = () => {
    const el = ref.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div className="hero">
      <div
        className="hero-track"
        ref={ref}
        onScroll={onScroll}
        onPointerDown={() => {
          touched.current = true;
        }}
      >
        {photos.map((p, n) => (
          <button type="button" className="hero-slide" key={p.id} onClick={() => onOpen(n)} aria-label="הגדלת תמונה">
            <img src={p.url} alt="גבות לפני ואחרי, עבודה של טופז" loading={n ? 'lazy' : 'eager'} />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="dots" aria-hidden="true">
          {photos.slice(0, 12).map((p, n) => (
            <span key={p.id} className={n === i ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  );
}
/** Two-column masonry: photos keep their natural shape. */

/** Two-column masonry: photos keep their natural shape. */
export function Masonry({ photos, onOpen }: { photos: Photo[]; onOpen: (i: number) => void }) {
  return (
    <div className="masonry">
      {photos.map((p, n) => (
        <button key={p.id} className="m-item" onClick={() => onOpen(n)} aria-label="הגדלת תמונה">
          <img src={p.url} alt="גבות לפני ואחרי, עבודה של טופז" loading="lazy" />
        </button>
      ))}
    </div>
  );
}
/* ---------- studio page: gallery, prices, contact ---------- */
