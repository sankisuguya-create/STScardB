// Code.gs の保存処理を、UserProperties の制限（1値 9KB）つきの偽物で確かめる
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');

function sandbox() {
  const store = {};
  const props = {
    getProperties: () => ({ ...store }),
    setProperties: (o) => { for (const [k, v] of Object.entries(o)) { if (Buffer.byteLength(v) > 9216) throw new Error('too big ' + k); store[k] = v; } },
    deleteProperty: (k) => { delete store[k]; }
  };
  const ctx = { PropertiesService: { getUserProperties: () => props }, LockService: { getUserLock: () => ({ waitLock() {}, releaseLock() {} }) }, store };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../gas/Code.gs', 'utf8'), ctx);
  return ctx;
}

test('長い日本語の状態を分けて保存し、そのまま読み戻せる', () => {
  const g = sandbox();
  const json = JSON.stringify({ log: Array.from({ length: 800 }, (_, i) => ({ k: 'msg', t: 'こころの よゆう が へった' + i })) });
  assert.ok(json.length > 20000);
  assert.strictEqual(g.saveRun(json), true);
  assert.strictEqual(g.loadRun(), json);
});

test('短い状態で上書きすると、古い断片が残らない', () => {
  const g = sandbox();
  g.saveRun('x'.repeat(9000));
  g.saveRun('{"a":1}');
  assert.strictEqual(g.loadRun(), '{"a":1}');
  assert.strictEqual(Object.keys(g.store).length, 2);
  g.clearRun();
  assert.strictEqual(g.loadRun(), null);
});
