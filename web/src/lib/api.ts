export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type Transport = (
  path: string,
  init: { method: string; body?: unknown; token: string | null },
) => Promise<{ status: number; data: any }>;

// Unset: the hosted demo, where the booking rules from /core run right here in the browser.
// Empty string: same origin, when the server also serves this build. A URL: a separate API host.
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export const isDemo = API_URL === undefined;

const httpTransport: Transport = async (path, { method, body, token }) => {
  const res = await fetch(API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};

// Loaded only in the demo, so a real deployment never ships the sample data or the in-browser server.
let demo: Promise<typeof import('./demo')> | undefined;
const demoTransport: Transport = async (path, init) => (await (demo ??= import('./demo'))).demoTransport(path, init);

export const transport: Transport = isDemo ? demoTransport : httpTransport;

export type Api = <T = any>(path: string, opts?: { method?: string; body?: unknown }) => Promise<T>;

/** An api() bound to one stored session (client or admin); a 401 on a signed-in call logs that session out. */
export function makeApi(tokenKey: string, onUnauthorized: () => void): Api {
  return async (path, opts = {}) => {
    let token: string | null = null;
    try {
      token = localStorage.getItem(tokenKey);
    } catch {
      /* private mode: no saved session */
    }
    const { status, data } = await transport(path, { method: opts.method ?? 'GET', body: opts.body, token });
    if (status === 401 && token) onUnauthorized();
    if (status >= 400) throw new ApiError(data.error || 'משהו השתבש, נסי שוב', status);
    return data;
  };
}

/** For the few public calls made before anyone signs in. */
export const publicApi = makeApi('', () => {});
