import type { Extras, Info } from '../lib/types';
import { useState, useMemo, useEffect, useRef } from 'react';
import { makeApi } from '../lib/api';
import { TOKEN } from './session';
import { Lightbox } from './Gallery';
import { extrasLabel, fmtPrice, priceOf, serviceName } from '../lib/catalog';
import { dayLabel, waLink } from '../lib/format';
import { BrowMorph } from './BrowMorph';
import { Steps } from './Steps';
import { readPick, savePick } from './pick';
import { startMotion } from './motion';

const LOGO_HERO = '/logo.png';
const GOLD_MARK = '/mark-gold.png';

/** A heading whose lines rise out of a mask, one after another. Each line stays one text node, so translation still finds it. */
function Lines({ lines, className, id }: { lines: { text: string; gold?: boolean }[]; className: string; id?: string }) {
  return (
    <h2 className={className} id={id} data-words>
      {lines.map((l) => (
        <span className="w" key={l.text}>
          <i className={l.gold ? 'gold' : ''}>{l.text}</i>
        </span>
      ))}
    </h2>
  );
}

/* ---------- the front page: gold on black, her work, a treatment she puts together, then name and phone ---------- */
const DESCRIPTIONS: Record<string, string> = {
  design:
    'טיפול שבו אני מנקה ומעצבת את הגבות לפי מבנה הפנים שלך, ליצור מראה מחמיא, מסודר, נקי והכי חשוב: טבעי. אם הגבה צריכה שיקום, נכנסים לסדרת שיקום שדורשת הקפדה: להגיע לתור כל 3 שבועות. אני נותנת לך שמן קיק שמזין ומחזק את שורש השיער ומעודד צמיחה, ויש להשתמש בו פעמיים ביום.',
  lift:
    'טיפול שמעניק לגבה מראה מורם, מסודר ומלא יותר. במהלך הטיפול אני מסדרת את השערות כלפי מעלה, בצורה שמדגישה את הגבה ונותנת לפנים מראה פתוח ומטופח. המטרה: לפטור אותך מלשים ג׳ל גבות על השערות בכל פעם. ההרמה מחזיקה עד חודש וחצי.',
};

export function Welcome({ info, onDone }: { info: Info; onDone: (token: string, name: string) => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [lb, setLb] = useState<number | null>(null);
  const [service, setService] = useState(() => readPick().service);
  const [extras, setExtras] = useState<Extras>(() => readPick().extras);
  const [formInView, setFormInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  // the page is right-to-left: "next" moves toward the left
  const slide = (dir: number) => track.current?.scrollBy({ left: dir * Math.min(720, track.current.clientWidth * 0.8), behavior: 'smooth' });
  const form = useRef<HTMLFormElement>(null);
  const api = useMemo(() => makeApi(TOKEN, () => {}), []);

  useEffect(() => startMotion(root.current!), []);
  // the floating total steps aside once the booking form itself is on screen
  useEffect(() => {
    if (!form.current || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([en]) => setFormInView(en.isIntersecting), { threshold: 0.15 });
    io.observe(form.current);
    return () => io.disconnect();
  }, []);

  // whatever she picks here is waiting for her at the treatment step of the booking
  const pick = (s: string, x: Extras) => {
    setService(s);
    setExtras(x);
    savePick({ service: s, extras: x });
  };
  const price = service ? priceOf(service, extras) : null;
  const chosen = service ? [serviceName(service), extrasLabel(extras)].filter(Boolean).join(' · ') : '';
  const bagUp = !!price && !formInView;

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api('/api/client/login', { method: 'POST', body: { fullName, phone } });
      onDone(r.token, r.customer.fullName);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="front lux" ref={root}>
      <div className="cursor" aria-hidden="true" />
      <div className="glitter" aria-hidden="true">
        <i className="g1" /><i className="g2" /><i className="g3" /><i className="g4" /><i className="g5" />
      </div>

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <h1 className="hero-logo">
          <img src={LOGO_HERO} alt="Topaz Mudahi Eyebrows" width={512} height={512} />
          <span className="shine" aria-hidden="true" />
        </h1>
        <p className="hero-line" data-hero>
          עיצוב · שיקום · הרמת גבות
        </p>
        <div className="hero-actions" data-hero>
          <a className="gold-btn" href="#book" data-magnetic>
            <span>לקביעת תור</span>
          </a>
          <a className="ghost-link" href="#menu">
            למחירון
          </a>
        </div>
      </section>

      <section className="ba-intro">
        <Lines className="display" lines={[{ text: 'לפני.' }, { text: 'אחרי.', gold: true }]} />
      </section>

      {/* one AI face (marked as an illustration): the whole face "before", then the brows change in place to "after" */}
      <BrowMorph />

      <section className="menu-lux" id="menu" aria-labelledby="menu-h">
        <div className="menu-head">
          <Lines className="display" id="menu-h" lines={[{ text: 'המחירון.' }]} />
          <p className="lede" data-rise>
            בוחרים טיפול ותוספות, והמחיר מתעדכן.
          </p>
        </div>
        <div className="menu-list" role="radiogroup" aria-labelledby="menu-h" data-stagger>
          {info.catalog.services.map((s, n) => (
            <button
              type="button"
              className={`m-row ${service === s.id ? 'on' : ''}`}
              key={s.id}
              role="radio"
              aria-checked={service === s.id}
              onClick={() => pick(service === s.id ? '' : s.id, service === s.id ? {} : extras)}
            >
              <span className="num" aria-hidden="true">
                {String(n + 1).padStart(2, '0')}
              </span>
              <b>{s.name}</b>
              <span className="pr">{fmtPrice(s.price, s.from)}</span>
              <span className="tick" aria-hidden="true" />
              {DESCRIPTIONS[s.id] && <span className="m-desc">{DESCRIPTIONS[s.id]}</span>}
            </button>
          ))}
        </div>
        {info.catalog.extras.length > 0 && (
          <div className="addons" data-rise>
            <h3 id="extras-h">{service ? 'להוסיף לטיפול?' : 'תוספות, אחרי שבוחרים טיפול'}</h3>
            <div className="addon-chips" role="group" aria-labelledby="extras-h">
              {info.catalog.extras
                .filter((e) => e.id !== service)
                .map((e) => {
                  const on = !!extras[e.id];
                  return (
                    <button
                      type="button"
                      className={`chip ${on ? 'on' : ''}`}
                      key={e.id}
                      role="checkbox"
                      aria-checked={on}
                      disabled={!service}
                      onClick={() => pick(service, { ...extras, [e.id]: on ? 0 : 1 })}
                    >
                      {e.name}
                      <small>+{e.price} ₪</small>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </section>

      <section className="tools" aria-labelledby="tools-h">
        <Lines className="display" id="tools-h" lines={[{ text: 'ביד.' }, { text: 'בדיוק.', gold: true }]} />
        <p className="lede" data-rise>
          מנקה ומעצבת לפי מבנה הפנים שלך, למראה מסודר, נקי והכי חשוב: טבעי.
        </p>
        <ul className="tool-row" data-stagger aria-hidden="true">
          <li>
            <svg viewBox="0 0 60 220">
              <path d="M30 4c9 0 14 5 14 12v54c0 5-3 8-6 10l-2 6h-12l-2-6c-3-2-6-5-6-10V16c0-7 5-12 14-12z" />
              <path d="M22 28h16M22 38h16M22 48h16M22 58h16" />
              <path d="M26 86h8v118c0 3-2 5-4 5s-4-2-4-5z" />
            </svg>
            <span>מברשת</span>
          </li>
          <li>
            <svg viewBox="0 0 60 220">
              <path d="M24 6h12v70l5 124h-6L30 96 25 200h-6l5-124z" />
              <path d="M24 6c-1 40 2 60 6 90M36 6c1 40-2 60-6 90" />
            </svg>
            <span>פינצטה</span>
          </li>
          <li>
            <svg viewBox="0 0 60 220">
              <circle cx="20" cy="190" r="12" />
              <circle cx="40" cy="190" r="12" />
              <path d="M24 179L36 8l2 0-8 140 14 -2M36 179L24 8l-2 0 8 140-14-2" />
              <path d="M30 100l0 0" />
            </svg>
            <span>מספריים</span>
          </li>
          <li>
            <svg viewBox="0 0 60 220">
              <path d="M30 6l9 38H21z" />
              <path d="M21 44h18v156H21z" />
              <path d="M21 62h18M21 190h18" />
            </svg>
            <span>עיפרון</span>
          </li>
        </ul>
      </section>

      {info.gallery.length > 0 && (
        <section className="gallery" aria-labelledby="gal-h">
          <div className="gal-head">
            <Lines className="display" id="gal-h" lines={[{ text: 'עוד' }, { text: 'עבודות.', gold: true }]} />
          </div>
          <div
            className="track"
            ref={track}
            tabIndex={0}
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse') return;
              drag.current = { x: e.clientX, left: track.current!.scrollLeft, moved: false };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const dx = e.clientX - d.x;
              if (Math.abs(dx) > 5) {
                d.moved = true;
                track.current!.classList.add('dragging');
                track.current!.style.scrollSnapType = 'none';
              }
              if (d.moved) track.current!.scrollLeft = d.left - dx;
            }}
            onPointerUp={() => {
              track.current?.classList.remove('dragging');
              if (track.current) track.current.style.scrollSnapType = '';
              setTimeout(() => (drag.current = null), 0);
            }}
            onPointerLeave={() => {
              track.current?.classList.remove('dragging');
              if (track.current) track.current.style.scrollSnapType = '';
              drag.current = null;
            }}
            onClickCapture={(e) => {
              if (drag.current?.moved) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
          >
            {info.gallery.map((p, n) => (
              <button key={p.id} onClick={() => setLb(n)} aria-label="הגדלת תמונה">
                <img src={p.url} alt="גבות לפני ואחרי, עבודה של טופז" loading="lazy" />
              </button>
            ))}
          </div>
          <div className="track-nav">
            <button type="button" aria-label="הקודם" onClick={() => slide(1)}>→</button>
            <button type="button" aria-label="הבא" onClick={() => slide(-1)}>←</button>
          </div>
        </section>
      )}

      <section className="book-sec">
        <form className="card book" id="book" ref={form} onSubmit={submit} data-rise>
          <img className="book-mark" src={GOLD_MARK} alt="" width={240} height={240} />
          <h2>קביעת תור</h2>
          <Steps at={0} />
          {chosen && (
            <p className="book-pick">
              <span>הטיפול שבחרת</span>
              <b>
                {chosen}
                {price ? ` · ${fmtPrice(price.total, price.from)}` : ''}
              </b>
            </p>
          )}
          {err && (
            <div className="error" role="alert">
              {err}
            </div>
          )}
          <label className="field">
            <span>שם מלא</span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
          </label>
          <label className="field">
            <span>טלפון</span>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              placeholder="050-000-0000"
              required
            />
          </label>
          <button className="btn" disabled={busy || !fullName || !phone}>
            {busy ? 'רגע...' : 'המשך לבחירת יום'}
          </button>
        </form>
      </section>

      <footer className="foot">
        <img src={GOLD_MARK} alt="" width={240} height={240} />
        <div className="links">
          {info.phone && (
            <a href={waLink(info.phone)} target="_blank" rel="noreferrer">
              <small>וואטסאפ</small>
              <b className="ltr">{info.phone}</b>
            </a>
          )}
          {info.instagram && (
            <a href={`https://instagram.com/${info.instagram}`} target="_blank" rel="noreferrer">
              <small>אינסטגרם</small>
              <b className="ltr">@{info.instagram}</b>
            </a>
          )}
          {info.address && (
            <div>
              <small>איפה</small>
              <b>{info.address}</b>
            </div>
          )}
        </div>
      </footer>

      <div className={`bag ${bagUp ? 'up' : ''}`} aria-hidden={!bagUp}>
        <div className="bag-in">
          <span className="bag-what">
            <small>{chosen}</small>
            <b>{price ? fmtPrice(price.total, price.from) : ''}</b>
          </span>
          <a className="gold-btn small" href="#book" tabIndex={bagUp ? 0 : -1}>
            <span>לקביעת תור</span>
          </a>
        </div>
      </div>
      {lb !== null && <Lightbox photos={info.gallery} start={lb} onClose={() => setLb(null)} />}
    </div>
  );
}
