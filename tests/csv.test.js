import test from 'node:test';
import assert from 'node:assert/strict';
import { createCsv, csvCell, csvFilename, localDateTime, localPhone } from '../js/storage/csv.js';
import { CsvExport } from '../js/ui/CsvExport.js';

test('CSV escaping quotes separators, embedded quotes and line breaks', () => {
  assert.equal(csvCell('Ana'), 'Ana'); assert.equal(csvCell('a;b'), '"a;b"');
  assert.equal(csvCell('a"b'), '"a""b"'); assert.equal(csvCell('a\r\nb'), '"a\r\nb"');
});
test('Every specified formula prefix is neutralized, including tab and CR', () => {
  for (const prefix of ['=', '+', '-', '@', '\t', '\r']) {
    const cell = csvCell(prefix + 'payload'); assert.ok(cell.startsWith("'") || cell.startsWith('"\''));
  }
  assert.equal(csvCell(null), ''); assert.equal(csvCell(24), '24');
});
test('CSV uses UTF-8 BOM, semicolons, CRLF and the exact 19-column order', () => {
  const play = { id: 'A-1', ts: new Date(2026, 9, 23, 22, 30, 7).getTime(), name: '=malicioso', phone: '+59898123456', email: 'ana@correo.com', consent: true,
    score: 30, baskets: 8, shots: 10, swishes: 2, bestStreak: 3, durationSec: 45, prizeWon: true, prizeCode: 'TD-ABCD', prizeDelivered: false };
  const csv = createCsv([play], { eventName: 'Expo;Uy', deviceLabel: 'Tablet A' });
  assert.equal(Buffer.from(csv)[0], 0xef); assert.equal(Buffer.from(csv)[1], 0xbb); assert.equal(Buffer.from(csv)[2], 0xbf);
  assert.equal(csv.charCodeAt(0), 0xfeff); assert.ok(csv.endsWith('\r\n'));
  assert.equal(csv.slice(1).split('\r\n')[0], 'id;fecha;hora;evento;tablet;nombre;telefono;email;consentimiento;puntaje;canastas;tiros;precision_pct;swishes;mejor_racha;duracion_s;gano_premio;codigo_premio;premio_entregado');
  assert.ok(csv.includes('A-1;23/10/2026;22:30:07;"Expo;Uy";Tablet A;\'=malicioso;098 123 456;ana@correo.com;1;30;8;10;80;2;3;45;1;TD-ABCD;0\r\n'));
});
test('Local phones retain the leading zero as spaced text, and empty phones remain empty', () => {
  assert.equal(localPhone('+59898123456'), '098 123 456'); assert.equal(localPhone(null), '');
});
test('CSV filename uses sanitized event/tablet names and local calendar/time', () => {
  const ts = new Date(2026, 9, 23, 9, 5, 6).getTime();
  assert.equal(csvFilename('Exposición / 2026', 'Tablet A', ts), 'threeball2d_exposicion-2026_tablet-a_2026-10-23_0905.csv');
  assert.deepEqual(localDateTime(ts), { date: '23/10/2026', time: '09:05:06' });
});
test('CSV exports original moderated names and zero-shot precision without NaN', () => {
  const csv = createCsv([{ id: 'x', ts: Date.now(), name: 'mierda', score: 0, baskets: 0, shots: 0, swishes: 0, bestStreak: 0, durationSec: 45 }], { eventName: 'Expo', deviceLabel: 'A' });
  assert.ok(csv.includes(';mierda;')); assert.equal(csv.includes('NaN'), false);
});

test('Download and share preserve CRLF/BOM even though textarea normalizes its displayed line endings', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  function element(tag) {
    let value = '';
    return { setAttribute() {}, append() {}, addEventListener() {}, scrollIntoView() {}, click() {}, remove() {},
      set value(text) { value = tag === 'textarea' ? text.replace(/\r\n/g, '\n') : text; }, get value() { return value; } };
  }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: element } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, 'document', descriptor); else delete globalThis.document; });
  let blob; let revoked = false;
  t.mock.method(URL, 'createObjectURL', value => { blob = value; return 'blob:test'; });
  t.mock.method(URL, 'revokeObjectURL', () => { revoked = true; });
  const exporter = new CsvExport(element('main'), { plays: [], now: () => Date.now(), settings: { eventName: 'Expo' }, meta: { deviceLabel: 'A' } });
  exporter.open(false); assert.equal(exporter.text.value.includes('\r'), false);
  assert.ok(exporter.csv.includes('\r\n')); exporter.saveFile();
  for (const file of [blob, exporter.file]) {
    const bytes = Buffer.from(await file.arrayBuffer());
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]); assert.ok(bytes.toString('utf8').endsWith('\r\n'));
  }
  exporter.close(); assert.equal(revoked, true); assert.equal(exporter.csv, '');
});
