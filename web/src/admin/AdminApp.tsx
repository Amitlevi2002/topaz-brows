import type { Info } from '../lib/types';
import { useState, useMemo } from 'react';
import { store } from '../lib/storage';
import { TOKEN } from './shared';
import { makeApi } from '../lib/api';
import { Login } from './Login';
import { Admin } from './Admin';
import { BrandBar } from '../client/Brand';

/* ================================================================ */
export function AdminApp({ info }: { info: Info }) {
  const [token, setToken] = useState(store.get(TOKEN));
  const logout = () => {
    store.del(TOKEN);
    setToken(null);
  };
  const api = useMemo(() => makeApi(TOKEN, logout), []);
  if (!token)
    return (
      <Login
        onDone={(t) => {
          store.set(TOKEN, t);
          setToken(t);
        }}
      />
    );
  return (
    <>
      <BrandBar end={<span className="brand-role">ניהול</span>} />
      <Admin api={api} info={info} onLogout={logout} />
    </>
  );
}
