import type { ReactNode } from '../lib/types';
import { IconBack } from '../components/icons';

export function Head({ onBack, title, end }: { onBack?: () => void; title?: string; end?: ReactNode }) {
  return (
    <div className="head">
      <div className="side">
        {onBack && (
          <button className="icon" onClick={onBack} aria-label="חזרה">
            <IconBack />
          </button>
        )}
      </div>
      <div className="center">{title}</div>
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
/** Full-screen viewer: swipe between photos, counter, close. */
