import type { Catalog } from './types';

export const DEFAULT_CATALOG: Catalog = {
  services: [
    { id: 'design', name: 'עיצוב ושיקום גבות טבעיות', price: 60 },
    { id: 'lift', name: 'הרמת גבות', price: 180 },
    { id: 'sideburns', name: 'פאות פנים', price: 20 },
    { id: 'lip', name: 'שפם', price: 10 },
    { id: 'nose', name: 'אף', price: 5 },
  ],
  extras: [
    { id: 'lip', name: 'שפם', price: 10, perNail: false },
    { id: 'nose', name: 'אף', price: 5, perNail: false },
    { id: 'tint', name: 'צבע', price: 10, perNail: false },
    { id: 'sideburns', name: 'פאות פנים', price: 20, perNail: false },
  ],
};

export const MAX_NAILS = 10;
// The web app sets this once at startup from /api/info; the server passes its own copy explicitly.

export // The web app sets this once at startup from /api/info; the server passes its own copy explicitly.
let current: Catalog = DEFAULT_CATALOG;

export const setCatalog = (c) => {
  current = c;
};

export const getCatalog = () => current;
/** Cleans client input: known extras only, counts within range. */

/** Cleans client input: known extras only, counts within range. */
export function cleanExtras(raw, cat = current) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const e of cat.extras) {
    const n = Math.floor(Number(raw[e.id]) || 0);
    if (n > 0) out[e.id] = Math.min(n, e.perNail ? MAX_NAILS : 1);
  }
  return out;
}

export function priceOf(serviceId, extras, cat = current) {
  const s = cat.services.find((x) => x.id === serviceId);
  if (!s) return null;
  let total = s.price;
  for (const e of cat.extras) total += (extras[e.id] || 0) * e.price;
  return {
    total,
    from: !!s.from,
  };
}
/** "פרנץ׳ · ציורים ×4" */

/** "פרנץ׳ · ציורים ×4" */
export function extrasLabel(extras, cat = current) {
  return cat.extras
    .filter((e) => extras?.[e.id])
    .map((e) => (e.perNail ? `${e.name} ×${extras[e.id]}` : e.name))
    .join(' · ');
}

export const serviceName = (id, cat = current) => cat.services.find((s) => s.id === id)?.name ?? 'טיפול שהוסר';

export const isFromPrice = (id, cat = current) => !!cat.services.find((s) => s.id === id)?.from;

export const fmtPrice = (n, from = false) => `${from ? 'החל מ-' : ''}${n} ₪`;
/** Validates a catalog Topaz saved; returns null when unusable. */

/** Validates a catalog Topaz saved; returns null when unusable. */
export function cleanCatalog(raw) {
  if (!raw || !Array.isArray(raw.services) || !Array.isArray(raw.extras)) return null;
  const str = (v, max = 60) =>
    String(v ?? '')
      .trim()
      .slice(0, max);
  const num = (v) => Math.max(0, Math.min(5000, Math.round(Number(v) || 0)));
  const services = raw.services
    .map((s) => ({
      id: str(s.id, 40) || `s${Math.random().toString(36).slice(2, 8)}`,
      name: str(s.name),
      price: num(s.price),
      from: !!s.from,
      hint: str(s.hint, 80) || undefined,
    }))
    .filter((s) => s.name);
  const extras = raw.extras
    .map((e) => ({
      id: str(e.id, 40) || `e${Math.random().toString(36).slice(2, 8)}`,
      name: str(e.name),
      price: num(e.price),
      perNail: !!e.perNail,
    }))
    .filter((e) => e.name);
  return services.length
    ? {
        services,
        extras,
      }
    : null;
}
