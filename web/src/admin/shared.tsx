import type { ReactNode } from '../lib/types';
import { dayLabel, fmtPhone, slots, waLink } from '../lib/format';
import { IconBack, IconChat, IconPhone } from '../components/icons';

export const TOKEN = 'topaz_admin_token';

export const initials = (n: string) =>
  n
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

export const firstName = (n: string) => n.split(' ')[0];

export const appLink = () => window.location.origin;
/* ---------- ready-made WhatsApp messages (Topaz taps, WhatsApp opens, she sends) ---------- */

/* ---------- ready-made WhatsApp messages (Topaz taps, WhatsApp opens, she sends) ---------- */
export const MSG = {
  confirm: (r, address) =>
    `היי ${firstName(r.fullName)} 🤍 התור שלך אצל טופז נקבע ל${dayLabel(r.date)} בשעה ${r.time}${address ? ` · ${address}` : ''}. מחכה לך!`,
  moved: (r, date, time) =>
    `היי ${firstName(r.fullName)} 🤍 קבעתי לך תור ל${dayLabel(date)} בשעה ${time}. אם לא מתאים תכתבי לי`,
  due: (n) => `היי ${firstName(n)} 🤍 עברו כמה שבועות מהטיפול האחרון, רוצה לקבוע תור? ${appLink()}`,
  waitlist: (n) => `היי ${firstName(n)} 🤍 התפנה מקום! רוצה לקבוע? ${appLink()}`,
};

export function Head({ onBack, end }: { onBack?: () => void; end?: ReactNode }) {
  return (
    <div className="head">
      <div className="side">
        {onBack && (
          <button className="icon" onClick={onBack} aria-label="חזרה">
            <IconBack />
          </button>
        )}
      </div>
      <div className="center" />
      <div
        className="side"
        style={{
          justifyContent: 'flex-end',
        }}
      >
        {end}
      </div>
    </div>
  );
}

export const WA = ({ phone, text, label = 'וואטסאפ' }: { phone: string; text?: string; label?: string }) => (
  <a className="mini wa" href={waLink(phone, text)} target="_blank" rel="noreferrer">
    <IconChat />
    {label}
  </a>
);

export const Call = ({ phone }: { phone: string }) => (
  <a className="mini" href={`tel:${phone}`} aria-label={`התקשרות ל-${fmtPhone(phone)}`}>
    <IconPhone />
    <span className="ltr">{fmtPhone(phone)}</span>
  </a>
);
/* ================================================================ */

export const byDate = (rows) => {
  const m = new Map();
  for (const r of rows) m.set(r.date, [...(m.get(r.date) ?? []), r]);
  return [...m.entries()];
};
/* ---------- lists behind the tiles ---------- */

/* ---------- calendar ---------- */
export const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------- slot picker ---------- */
export const GRID = slots('08:00', '22:00', 30);

export /* ---------- settings: details, rules, price list, gallery ---------- */
async function shrink(file) {
  const img = await new Promise<HTMLImageElement>((ok, fail) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = URL.createObjectURL(file);
  });
  const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(img.src);
  return c.toDataURL('image/jpeg', 0.82);
}
