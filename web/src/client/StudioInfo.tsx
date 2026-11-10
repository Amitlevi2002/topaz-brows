import type { Info } from '../lib/types';
import { useState } from 'react';
import { fmtPrice, getCatalog } from '../lib/catalog';
import { Lightbox, Masonry } from './Gallery';
import { waLink } from '../lib/format';

/* ---------- studio page: gallery, prices, contact ---------- */
export function StudioInfo({ info }: { info: Info }) {
  const [open, setOpen] = useState<number | null>(null);
  const cat = getCatalog();
  return (
    <>
      {info.gallery.length > 0 && (
        <>
          <div className="section">העבודות שלי</div>
          <Masonry photos={info.gallery} onOpen={setOpen} />
        </>
      )}
      <div className="section">מחירון</div>
      <div className="summary">
        {cat.services.map((s) => (
          <div key={s.id}>
            <span>{s.name}</span>
            <b>{fmtPrice(s.price, s.from)}</b>
          </div>
        ))}
        {cat.extras.map((e) => (
          <div key={e.id}>
            <span>{e.name}</span>
            <b>
              {e.price}
              {' \u20AA'}
            </b>
          </div>
        ))}
      </div>
      <div className="section">פרטים</div>
      <div className="summary">
        {info.address && (
          <div>
            <span>איפה</span>
            <b>{info.address}</b>
          </div>
        )}
        {info.instagram && (
          <div>
            <span>אינסטגרם</span>
            <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noreferrer">
              <b className="ltr">@{info.instagram}</b>
            </a>
          </div>
        )}
        {info.phone && (
          <div>
            <span>וואטסאפ</span>
            <a href={waLink(info.phone)} target="_blank" rel="noreferrer">
              <b className="ltr">{info.phone}</b>
            </a>
          </div>
        )}
        <div>
          <span>ביטול תור</span>
          <b>
            {'עד '}
            {info.cancelHours}
            {' שעות לפני'}
          </b>
        </div>
      </div>
      {open !== null && <Lightbox photos={info.gallery} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
/* ---------- login ---------- */
