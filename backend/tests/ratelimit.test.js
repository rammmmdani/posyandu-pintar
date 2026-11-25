import test from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:5000/api/v1';

test('login dibatasi setelah terlalu banyak percobaan', async () => {
  let limited = null;
  for (let i = 0; i < 15 && !limited; i += 1) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'tidak.ada@demo.test', password: 'salah' }),
    });
    if (res.status === 429) limited = await res.json();
  }
  assert.ok(limited, 'seharusnya ada respons 429 dalam 15 percobaan');
  assert.equal(limited.code, 'TOO_MANY_REQUESTS');
});