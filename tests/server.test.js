import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createStaticServer } from '../tools/serve.js';

test('Static server serves ES modules and rejects private paths and writes', async t => {
  const server = createStaticServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const index = await fetch(url);
  assert.equal(index.status, 200);
  assert.match(await index.text(), /type="module"/);
  const module = await fetch(`${url}/js/main.js`);
  assert.match(module.headers.get('content-type'), /text\/javascript/);
  assert.equal((await fetch(`${url}/.git/config`)).status, 403);
  assert.equal((await fetch(`${url}/%2e%2e%5csecret`)).status, 403);
  assert.equal((await fetch(`${url}/%zz`)).status, 400);
  assert.equal((await fetch(`${url}/missing.js`)).status, 404);
  assert.equal((await fetch(url, { method: 'POST' })).status, 405);
  const head = await fetch(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});
