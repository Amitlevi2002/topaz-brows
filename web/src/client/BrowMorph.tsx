import { useRef, useState } from 'react';

const SRC = '/ba/ai-split.webp';

/**
 * Before/after slider on the AI picture Amit made (one face split down the middle, marked as an illustration).
 * It opens exactly like the picture: half the face before, half after. Dragging the gold handle (or the arrow keys)
 * moves the line, so more of the face shows "before" or "after". Behind the line each side is the picture's own half
 * mirrored across, so the face stays whole wherever the line stands. "Before" is on the picture's left in either language.
 */
export function BrowMorph() {
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const at = (clientX: number) => {
    const r = frame.current!.getBoundingClientRect();
    setPos(Math.min(96, Math.max(4, ((clientX - r.left) / r.width) * 100)));
  };
  const face = (side: 'before' | 'after') => (
    <div className={`face ${side}`} aria-hidden="true" style={side === 'after' ? { clipPath: `inset(0 0 0 ${pos}%)` } : undefined}>
      <img src={SRC} alt="" className="half own" draggable={false} />
      <img src={SRC} alt="" className="half mirror" draggable={false} />
    </div>
  );
  return (
    <figure className="morph" data-rise>
      <div
        className="morph-frame"
        ref={frame}
        onPointerDown={(e) => {
          dragging.current = true;
          frame.current!.setPointerCapture(e.pointerId);
          at(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && at(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {face('before')}
        {face('after')}
        <span className="divider" style={{ left: `${pos}%` }} aria-hidden="true">
          <i className="knob">
            <svg viewBox="0 0 24 24">
              <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
            </svg>
          </i>
        </span>
        <span className="tag t-before" aria-hidden="true">
          לפני
        </span>
        <span className="tag t-after" aria-hidden="true">
          אחרי
        </span>
        <span className="note" aria-hidden="true">
          המחשה
        </span>
      </div>
      <input
        className="morph-range"
        type="range"
        min={4}
        max={96}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="המחשה של לפני ואחרי: הזזת הקו בין הגבה לפני הטיפול לגבה אחריו"
        dir="ltr"
      />
    </figure>
  );
}
