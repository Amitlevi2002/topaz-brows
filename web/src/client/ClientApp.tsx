import type { Info } from '../lib/types';
import { useState, useMemo } from 'react';
import { store } from '../lib/storage';
import { NAME, TOKEN } from './session';
import { makeApi } from '../lib/api';
import { Welcome } from './Welcome';
import { Booking } from './Booking';
import { BrandBar } from './Brand';

export function ClientApp({ info }: { info: Info }) {
  const [token, setToken] = useState(store.get(TOKEN));
  const [name, setName] = useState(store.get(NAME) || '');
  const logout = () => {
    store.del(TOKEN);
    store.del(NAME);
    setToken(null);
  };
  const api = useMemo(() => makeApi(TOKEN, logout), []);
  if (!token)
    return (
      <Welcome
        info={info}
        onDone={(t, n) => {
          store.set(TOKEN, t);
          store.set(NAME, n);
          setName(n);
          setToken(t);
        }}
      />
    );
  return (
    <>
      <BrandBar />
      <Booking api={api} info={info} name={name} onLogout={logout} />
    </>
  );
}
