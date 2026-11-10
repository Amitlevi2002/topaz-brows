import type { Extras, Info } from '../lib/types';
import { useState, useMemo, useEffect, useRef } from 'react';
import { makeApi } from '../lib/api';
import { TOKEN } from './session';
import { Lightbox } from './Gallery';
import { extrasLabel, fmtPrice, priceOf, serviceName } from '../lib/catalog';
import { dayLabel, waLink } from '../lib/format';
import { LOGO } from '../lib/brand';
import { BeforeAfter } from './BeforeAfter';
import { Steps } from './Steps';
import { readPick, savePick } from './pick';

/** Sections fade up the first time they scroll into view. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.front .reveal');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/* ---------- the front page: her logo, before and after, a treatment she puts together, then name and phone ---------- */
export function Welcome({ info, onDone }: { info: Info; onDone: (token: string, name: string) => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [lb, setLb] = useState<number | null>(null);
  const [service, setService] = useState(() => readPick().service);
  const [extras, setExtras] = useState<Extras>(() => readPick().extras);
  const [formInView, setFormInView] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const api = useMemo(() => makeApi(TOKEN, () => {}), []);
  useReveal();

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
    <div className="front">
      <section className="hero">
        <h1 className="logo-h1">
          <img className="logo-hero" src={LOGO} alt="Topaz Mudahi Eyebrows" width={512} height={512} />
        </h1>
        <div className="kicker">עיצוב · שיקום · הרמת גבות</div>
        <div className="hero-actions">
          <a className="pill-btn" href="#book">
            לקביעת תור
          </a>
          <a className="text-link" href="#build">
            למחירון
          </a>
        </div>
        {info.nextFree && (
          <p className="next-free">
            {'התור הפנוי הקרוב: '}
            <b>
              {dayLabel(info.nextFree.date)}
              {', '}
              <span className="ltr">{info.nextFree.time}</span>
            </b>
          </p>
        )}
      </section>

      <section className="dark">
        <div className="sec-head reveal">
          <h2 className="big">
            לפני.
            <br />
            <em>אחרי.</em>
          </h2>
          <p className="sub">עבודות אמיתיות של טופז, כמו שצולמו בסטודיו.</p>
        </div>
        <div className="reveal">
          <BeforeAfter />
        </div>
      </section>

      <section className="build" id="build" aria-labelledby="build-h">
        <div className="sec-head reveal">
          <h2 className="big" id="build-h">
            בוני את
            <br />
            הטיפול שלך.
          </h2>
          <p className="sub">בוחרים טיפול ותוספות, והמחיר מתעדכן.</p>
        </div>
        <div className="tiles reveal" role="radiogroup" aria-labelledby="build-h">
          {info.catalog.services.map((s) => (
            <button
              type="button"
              className={`tile-pick ${service === s.id ? 'on' : ''}`}
              key={s.id}
              role="radio"
              aria-checked={service === s.id}
              onClick={() => pick(service === s.id ? '' : s.id, service === s.id ? {} : extras)}
            >
              <span className="tick" aria-hidden="true" />
              <b>{s.name}</b>
              <span className="pr">{fmtPrice(s.price, s.from)}</span>
            </button>
          ))}
        </div>
        {info.catalog.extras.length > 0 && (
          <div className="addons reveal">
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
                      <span>+{e.price} ₪</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </section>

      <form className="card book reveal" id="book" ref={form} onSubmit={submit}>
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

      {info.gallery.length > 0 && (
        <section className="work reveal">
          <h2 className="mid">עוד עבודות.</h2>
          <div className="strip">
            {info.gallery.map((p, n) => (
              <button key={p.id} onClick={() => setLb(n)} aria-label="הגדלת תמונה">
                <img src={p.url} alt="גבות לפני ואחרי, עבודה של טופז" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="contact">
        <img src={LOGO} alt="" width={96} height={96} />
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

      <div className={`bag ${price && !formInView ? 'up' : ''}`} aria-hidden={!price || formInView}>
        <div className="bag-in">
          <span className="bag-what">
            <small>{chosen}</small>
            <b>{price ? fmtPrice(price.total, price.from) : ''}</b>
          </span>
          <a className="pill-btn" href="#book" tabIndex={price && !formInView ? 0 : -1}>
            לקביעת תור
          </a>
        </div>
      </div>
      {lb !== null && <Lightbox photos={info.gallery} start={lb} onClose={() => setLb(null)} />}
    </div>
  );
}
