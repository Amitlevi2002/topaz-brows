// Shapes the API returns (see core/handler.ts).
import type { Catalog, Extras, Photo, Settings, Status } from '../../../core/types';
import type { Api } from './api';
import type { ReactNode } from 'react';

export type { Catalog, Extras, Photo, Settings, Status, Api, ReactNode };

export interface Info {
  phone: string;
  address: string;
  instagram: string;
  about: string;
  cancelHours: number;
  catalog: Catalog;
  /** The nearest time still free to ask for; null when nothing is open. */
  nextFree: { date: string; time: string } | null;
  gallery: Photo[];
}

export interface RequestView {
  id: number;
  date: string;
  time: string;
  note: string;
  status: Status;
  service: string;
  extras: Extras;
  price: number;
  attended: boolean | null;
  customerId: number;
  fullName: string;
  phone: string;
}

export interface AdminDay {
  id: number;
  date: string;
  isOpen: boolean;
  slots: string[];
  pending: number;
  approved: number;
}
export interface ClientDay {
  id: number;
  date: string;
  slots: string[];
}

export interface DueClient {
  id: number;
  fullName: string;
  phone: string;
  lastVisit: string;
}
export interface WaitlistView {
  id: number;
  service: string;
  note: string;
  createdAt: string;
  customerId: number;
  fullName: string;
  phone: string;
}

export interface Overview {
  pending: RequestView[];
  upcoming: RequestView[];
  reschedule: RequestView[];
  toMark: RequestView[];
  due: DueClient[];
  waitlist: WaitlistView[];
  month: {
    count: number;
    income: number;
    byService: { service: string; count: number; income: number }[];
    bookings: RequestView[];
  };
}

export interface CustomerRow {
  id: number;
  fullName: string;
  phone: string;
  blocked: boolean;
  createdAt: string;
  total: number;
  approved: number;
  lastVisit: string | null;
}
export interface CustomerProfile {
  id: number;
  fullName: string;
  phone: string;
  note: string;
  blocked: boolean;
  createdAt: string;
  history: RequestView[];
  stats: { visits: number; spent: number; cancelled: number; noShows: number };
}

export type ListName = 'pending' | 'upcoming' | 'reschedule' | 'toMark' | 'due' | 'waitlist';

/** Admin screens; the router in admin/Admin.tsx switches on `name`. */
export type Screen =
  | { name: 'home' }
  | { name: 'day'; id: number }
  | { name: 'move'; req: RequestView }
  | { name: 'open'; date?: string }
  | { name: 'list'; list: ListName }
  | { name: 'month' }
  | { name: 'clients' }
  | { name: 'client'; id: number }
  | { name: 'book'; prefill?: { fullName?: string; phone?: string; service?: string; date?: string; time?: string } }
  | { name: 'settings' };

export interface Nav {
  go(screen: Screen): void;
  home(): void;
  reload(): Promise<unknown>;
}
