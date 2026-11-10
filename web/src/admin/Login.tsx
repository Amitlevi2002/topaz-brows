import { useState, useMemo } from 'react';
import { makeApi } from '../lib/api';
import { TOKEN } from './shared';
import { LOGO } from '../lib/brand';

export function Login({ onDone }: { onDone: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const api = useMemo(() => makeApi(TOKEN, () => {}), []);
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      onDone(
        (
          await api('/api/admin/login', {
            method: 'POST',
            body: {
              password,
            },
          })
        ).token,
      );
    } catch (e: any) {
      setErr(e.message);
    }
  }
  return (
    <div className="app">
      <form className="screen" onSubmit={submit}>
        <div className="welcome">
          <img src={LOGO} alt="Topaz Mudahi Eyebrows" />
          <div className="brand">Topaz Mudahi</div>
          <p>ניהול תורים</p>
        </div>
        {err && (
          <div className="error" role="alert">
            {err}
          </div>
        )}
        <div className="field">
          <label htmlFor="password">סיסמה</label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div className="bottom">
          <button className="btn" disabled={!password}>
            כניסה
          </button>
        </div>
      </form>
    </div>
  );
}
/* ---------- main router ---------- */
