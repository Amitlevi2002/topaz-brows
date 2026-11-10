import { createRoot } from 'react-dom/client';
import { App } from './App';
import { publicApi } from './lib/api';
import { setCatalog } from './lib/catalog';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

publicApi('/api/info')
  .then((info) => {
    setCatalog(info.catalog);
    root.render(<App info={info} />);
  })
  .catch(() => {
    root.render(
      <p className="empty">
        <b>אין חיבור כרגע</b>נסי לרענן בעוד רגע
      </p>,
    );
  });
