import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from './store';

const tempDb = () => join(mkdtempSync(join(tmpdir(), 'topaz-')), 'test.db');
const cleanup = (path: string) => rmSync(join(path, '..'), { recursive: true, force: true });

test('state survives a restart', () => {
  const path = tempDb();
  const a = openStore(path);
  a.commit({ ...a.get(), nextId: 42 });
  a.close();
  const b = openStore(path);
  assert.equal(b.get().nextId, 42);
  b.close();
  cleanup(path);
});

test('the store keeps working after garbage collection (regression: "statement has been finalized")', () => {
  const path = tempDb();
  const store = openStore(path);
  (globalThis as any).gc?.();
  assert.doesNotThrow(() => store.commit({ ...store.get(), nextId: 7 }));
  store.close();
  cleanup(path);
});
