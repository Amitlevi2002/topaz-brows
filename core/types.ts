export type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Service {
  id: string;
  name: string;
  price: number;
  from?: boolean;
  hint?: string;
}
export interface Extra {
  id: string;
  name: string;
  price: number;
  perNail: boolean;
}
export interface Catalog {
  services: Service[];
  extras: Extra[];
}

/** Extra id -> quantity (number of nails, or 1 for a flat extra). */
export type Extras = Record<string, number>;

export interface Settings {
  phone: string;
  address: string;
  instagram: string;
  about: string;
  /** How many hours before an approved appointment a client may still cancel it herself. */
  cancelHours: number;
  autoApprove: boolean;
  catalog: Catalog;
}

export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  note: string;
  blocked: 0 | 1;
  created_at: string;
}
export interface Day {
  id: number;
  date: string;
  open: 0 | 1;
  slots: string[];
}
export interface Request {
  id: number;
  day_id: number;
  customer_id: number;
  time: string;
  service: string;
  extras: Extras;
  price: number;
  note: string;
  status: Status;
  /** null until Topaz marks it: 1 came, 0 no-show. */
  attended: 0 | 1 | null;
}
export interface WaitlistEntry {
  id: number;
  customer_id: number;
  service: string;
  note: string;
  created_at: string;
}
export interface Photo {
  id: number;
  url: string;
}

/** Everything the app stores. Small by design: one studio, one person taking bookings. */
export interface State {
  settings: Settings;
  customers: Customer[];
  days: Day[];
  requests: Request[];
  waitlist: WaitlistEntry[];
  gallery: Photo[];
  nextId: number;
}

export type Session = { role: 'admin' } | { role: 'client'; id: number };

export interface ApiRequest {
  method: string;
  /** Path and query, e.g. "/api/admin/days/12". */
  path: string;
  body: any;
  session: Session | null;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}
