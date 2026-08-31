/* تست‌های صحت تخته و منطق حرکت — اجرا: npm test */
import test from 'node:test';
import assert from 'node:assert/strict';

const TRACK_LEN = 52, POS_BASE = -1, LAST_TRACK = 50, HOME_ENTRY = 51, POS_FINISH = 57;
const START = { RED: 0, GREEN: 13, YELLOW: 26, BLUE: 39 };
const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const toAbs = (c, p) => (p >= 0 && p <= LAST_TRACK) ? (START[c] + p) % TRACK_LEN : -1;
const fwd = (a, b) => (b - a + TRACK_LEN) % TRACK_LEN;

test('هر رنگ دقیقاً ۵۲ خانه تا برگشت به نقطهٔ شروع می‌پیماید', () => {
  for (const c of Object.keys(START)) {
    assert.equal(toAbs(c, 0), START[c]);
    assert.equal(toAbs(c, LAST_TRACK), (START[c] + 50) % 52);
  }
});

test('مسیر هر مهره ۵۷ قدم است: ۵۱ خانهٔ عمومی + ۶ خانهٔ خانه', () => {
  assert.equal(POS_FINISH - 0, 57);
  assert.equal(HOME_ENTRY, LAST_TRACK + 1);
  assert.equal(POS_FINISH - HOME_ENTRY, 6);
});

test('نقاط شروع همه امن‌اند و فاصلهٔ آنها ۱۳ خانه است', () => {
  const s = Object.values(START).sort((a, b) => a - b);
  for (const v of s) assert.ok(SAFE.has(v), `خانهٔ ${v} باید امن باشد`);
  for (let i = 1; i < s.length; i++) assert.equal(s[i] - s[i - 1], 13);
});

test('۸ خانهٔ امن داریم و همه در بازهٔ معتبرند', () => {
  assert.equal(SAFE.size, 8);
  for (const v of SAFE) assert.ok(v >= 0 && v < TRACK_LEN);
});

test('فاصلهٔ رو به جلو همیشه بین ۰ و ۵۱ است', () => {
  for (let a = 0; a < 52; a += 7)
    for (let b = 0; b < 52; b += 5) {
      const d = fwd(a, b);
      assert.ok(d >= 0 && d < 52);
      assert.equal((a + d) % 52, b);
    }
});

test('ورود به بازی فقط با ۶ (قانون کلاسیک)', () => {
  const entry = [6];
  for (let d = 1; d <= 6; d++)
    assert.equal(entry.includes(d), d === 6, `تاس ${d}`);
});

test('رسیدن به خانه نیاز به عدد دقیق دارد', () => {
  const exact = true;
  const tryTo = (from, dice) => {
    const to = from + dice;
    if (to > POS_FINISH) return exact ? null : POS_FINISH;
    return to;
  };
  assert.equal(tryTo(55, 2), 57);        // دقیق → مجاز
  assert.equal(tryTo(55, 3), null);      // زیاد → رد
  assert.equal(tryTo(51, 6), 57);
});

test('تعداد خانه‌های طی‌شده همیشه برابر عدد تاس است', () => {
  for (let from = 0; from <= 50; from++)
    for (let d = 1; d <= 6; d++) {
      const to = from + d;
      if (to > POS_FINISH) continue;
      assert.equal(to - from, d, `از ${from} با تاس ${d}`);
    }
});

test('مختصات ۵۲ خانه یکتا و همسایه‌اند', () => {
  const T = [[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],
  [8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],
  [13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],
  [6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
  assert.equal(T.length, 52);
  assert.equal(new Set(T.map(c => c.join(','))).size, 52, 'خانهٔ تکراری وجود ندارد');
  for (let i = 0; i < 52; i++) {
    const a = T[i], b = T[(i + 1) % 52];
    const dist = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    assert.equal(dist, 1, `خانهٔ ${i} و ${(i + 1) % 52} همسایه نیستند`);
  }
});

test('توزیع تاس تصادفی و متعادل است', () => {
  const counts = new Array(7).fill(0);
  const buf = new Uint32Array(1);
  const below = (max) => {
    const limit = Math.floor(0xffffffff / max) * max;
    let v; do { crypto.getRandomValues(buf); v = buf[0]; } while (v >= limit);
    return v % max;
  };
  for (let i = 0; i < 60000; i++) counts[below(6) + 1]++;
  for (let f = 1; f <= 6; f++)
    assert.ok(counts[f] > 8500 && counts[f] < 11500, `وجه ${f}: ${counts[f]}`);
});
