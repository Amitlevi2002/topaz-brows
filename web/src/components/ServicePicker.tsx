import type { Dispatch, SetStateAction } from 'react';
import type { Extras } from '../lib/types';
import { MAX_NAILS, fmtPrice, getCatalog } from '../lib/catalog';

/* ---------- service + extras picker (booking and waitlist) ---------- */
export function ServicePicker({
  service,
  setService,
  extras,
  setExtras,
  withExtras = true,
}: {
  service: string;
  setService: (s: string) => void;
  extras?: Extras;
  setExtras?: Dispatch<SetStateAction<Extras>>;
  withExtras?: boolean;
}) {
  const cat = getCatalog();
  return (
    <>
      <div className="list" role="radiogroup" aria-label="טיפול">
        {cat.services.map((s) => (
          <button
            key={s.id}
            className={`choice ${service === s.id ? 'on' : ''}`}
            role="radio"
            aria-checked={service === s.id}
            onClick={() => setService(s.id)}
          >
            <span className="radio" />
            <span className="main">
              <b>{s.name}</b>
              {s.hint && <span>{s.hint}</span>}
            </span>
            <span className="price">{fmtPrice(s.price, s.from)}</span>
          </button>
        ))}
      </div>
      {withExtras && service && cat.extras.length > 0 && (
        <>
          <div className="section">תוספות (לא חובה)</div>
          <div className="extras">
            {cat.extras.map((e) => {
              const n = extras?.[e.id] || 0;
              const set = (v) =>
                setExtras?.((x) => ({
                  ...x,
                  [e.id]: Math.max(0, Math.min(e.perNail ? MAX_NAILS : 1, v)),
                }));
              return (
                <div className="extra" key={e.id}>
                  <div className="main">
                    <b>{e.name}</b>
                    <span>
                      {e.price}
                      {' \u20AA'}
                    </span>
                  </div>
                  {e.perNail ? (
                    <div className="stepper">
                      <button onClick={() => set(n + 1)} aria-label={`עוד ${e.name}`} disabled={n >= MAX_NAILS}>
                        +
                      </button>
                      <output aria-live="polite">{n}</output>
                      <button onClick={() => set(n - 1)} aria-label={`פחות ${e.name}`} disabled={n === 0}>
                        −
                      </button>
                    </div>
                  ) : (
                    <button
                      className={`toggle ${n ? 'on' : ''}`}
                      role="switch"
                      aria-checked={!!n}
                      aria-label={e.name}
                      onClick={() => set(n ? 0 : 1)}
                    >
                      <span />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
