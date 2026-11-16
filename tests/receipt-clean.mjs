// בדיקת הניקוי של קבלה אחרי הקריאה (בלי בינה מלאכותית): כפילויות בחפיפה בין תמונות, שורות סה״כ/תשלום, הנחות שנקראו כמוצר
// מריצים: node receipt-clean.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../supabase/functions/ai-chat/index.ts', import.meta.url), 'utf8');
const a = src.indexOf('type RcItem'), b = src.indexOf('const verifyPrompt');
assert.ok(a > 0 && b > a, 'receipt code not found in ai-chat/index.ts');
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rc-')), 'rc.ts');
const fa = src.indexOf('function applyReceiptFix'), fb = src.indexOf('async function receiptGemini');
assert.ok(fa > b && fb > fa, 'applyReceiptFix not found in ai-chat/index.ts');
fs.writeFileSync(tmp, src.slice(a, b) + '\n' + src.slice(fa, fb) + '\nexport { cleanReceipt, checkReceipt, rnum, applyReceiptFix };\n');
const { cleanReceipt, checkReceipt, rnum, applyReceiptFix } = await import(tmp);

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✓', name); };
const it = (part, raw, total, extra = {}) => ({ part, raw, name: raw, qty: 1, price: total, list_price: total, total, ...extra });
const read = (r) => { const notes = cleanReceipt(r); return { notes, chk: checkReceipt(r, 1) }; };

t('numbers: trailing minus and decimal comma', () => {
  assert.equal(rnum('3.90-'), -3.9);
  assert.equal(rnum('12,90'), 12.9);
  assert.equal(rnum('1,234.50'), 1234.5);
  assert.equal(rnum(7), 7);
});

t('lines repeated in the overlap between two photos are counted once', () => {
  const r = { total: 60, items: [it(1, 'חלב 3%', 6), it(1, 'לחם אחיד', 8), it(1, 'ביצים L', 14), it(2, 'לחם אחיד', 8), it(2, 'ביצים L', 14), it(2, 'גבינה צהובה', 32)] };
  const { chk, notes } = read(r);
  assert.equal(r.items.length, 4);
  assert.equal(chk.ok, true);
  assert.match(notes.join(), /פעמיים/);
});

t('a product bought twice in the same part stays twice', () => {
  const r = { total: 20, items: [it(1, 'במבה', 5), it(1, 'במבה', 5), it(1, 'ביסלי', 10)] };
  read(r);
  assert.equal(r.items.length, 3);
});

t('identical adjacent lines are removed only when that makes the printed total match', () => {
  const r = { total: 15, items: [it(1, 'במבה', 5), it(1, 'במבה', 5), it(1, 'ביסלי', 10)] };
  const { chk } = read(r);
  assert.equal(r.items.length, 2);
  assert.equal(chk.ok, true);
});

t('total / VAT / payment lines read as products are removed', () => {
  const r = { total: 30, items: [it(1, 'קפה טורקי', 18), it(1, 'סוכר', 12), it(1, 'סה"כ ביניים', 30), it(1, 'מע"מ 17%', 4.36), it(1, 'ויזה', 30)] };
  const { chk } = read(r);
  assert.deepEqual(r.items.map((x) => x.raw), ['קפה טורקי', 'סוכר']);
  assert.equal(chk.ok, true);
});

t('a discount line read as a product with a positive price goes onto the product above', () => {
  const r = { total: 16.1, items: [it(1, 'שמן קנולה', 20), { part: 1, raw: 'הנחת מועדון', name: 'הנחת מועדון', qty: 1, price: 3.9, total: 3.9 }] };
  const { chk } = read(r);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].total, 16.1);
  assert.equal(r.items[0].discount, 3.9);
  assert.equal(chk.ok, true);
});

t('a discount already applied to the product is not taken off twice', () => {
  const r = { total: 16.1, items: [it(1, 'שמן קנולה', 16.1, { list_price: 20, price: 16.1, discount: 3.9 }), { part: 1, raw: 'הנחה 3.90-', name: 'הנחה', qty: 1, price: '3.90-', total: '3.90-' }] };
  const { chk } = read(r);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].total, 16.1);
  assert.equal(chk.ok, true);
});

t('a product line that mentions a line total is not removed', () => {
  const r = { total: 11.8, items: [it(1, '2 X 5.90 סה"כ 11.80 יוגורט', 11.8, { qty: 2, price: 5.9, list_price: 5.9, name: 'יוגורט' })] };
  read(r);
  assert.equal(r.items.length, 1);
});

t('a correct receipt is left as is', () => {
  const r = { total: 50, items: [it(1, 'עגבניות', 10), it(1, 'מלפפונים', 15), it(2, 'תפוחים', 25)] };
  const { notes, chk } = read(r);
  assert.equal(r.items.length, 3);
  assert.equal(notes.length, 0);
  assert.equal(chk.ok, true);
});

// הבדיקה השנייה מחזירה רק תיקונים — מחילים אותם על הקריאה הראשונה
t('second check: only the corrections are applied (fix, missing line, extra line, total)', () => {
  const base = { store: 'רמי לוי', total: 61, items: [it(1, 'חלב', 6), it(1, 'לחם', 8), it(1, 'לחם', 8), it(2, 'גבינה', 23)] };
  const r = applyReceiptFix(base, JSON.stringify({ fix: [{ i: 3, total: 32, price: 32, list_price: 32 }], add: [{ after: 0, part: 1, raw: 'ביצים', name: 'ביצים', qty: 1, price: 15, total: 15 }], remove: [2], notes: 'לחם נספר פעמיים' }));
  assert.deepEqual(r.items.map((x) => x.raw), ['חלב', 'ביצים', 'לחם', 'גבינה']);
  assert.equal(r.items[3].total, 32);
  assert.equal(checkReceipt(r, 2).ok, true);
  assert.equal(base.items.length, 4, 'the first reading is not changed');
  assert.equal(base.items[3].total, 23);
  const t2 = applyReceiptFix(base, JSON.stringify({ fix: [], add: [], remove: [], total: 45 }));
  assert.equal(t2.total, 45);
  assert.equal(t2.items.length, 4);
});

t('second check: bad indexes are ignored, an old-style full answer still works', () => {
  const base = { total: 10, items: [it(1, 'א', 4), it(1, 'ב', 5)] };
  const r = applyReceiptFix(base, '```json\n' + JSON.stringify({ fix: [{ i: 9, total: 100 }, { i: -1, total: 100 }], add: [{ after: 99, name: 'ג', total: 1 }, { after: 0, name: '', total: 3 }], remove: [7] }) + '\n```');
  assert.deepEqual(r.items.map((x) => x.name), ['א', 'ב', 'ג']);
  const full = applyReceiptFix(base, JSON.stringify({ total: 10, items: [it(1, 'א', 5), it(1, 'ב', 5)] }));
  assert.equal(full.items[0].total, 5);
  assert.equal(applyReceiptFix(base, 'not json'), null);
});

console.log(`\n${n} receipt checks passed`);
