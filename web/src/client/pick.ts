import type { Extras } from '../lib/types';
import { cleanExtras, getCatalog } from '../lib/catalog';
import { store } from '../lib/storage';

const KEY = 'topaz_client_pick';

/** The treatment and extras a client put together on the front page; booking starts from it. */
export interface Pick {
  service: string;
  extras: Extras;
}

export function readPick(): Pick {
  try {
    const raw = JSON.parse(store.get(KEY) || 'null');
    const service = getCatalog().services.some((s) => s.id === raw?.service) ? raw.service : '';
    return { service, extras: service ? cleanExtras(raw.extras) : {} };
  } catch {
    return { service: '', extras: {} };
  }
}

export const savePick = (p: Pick) => store.set(KEY, JSON.stringify(p));
