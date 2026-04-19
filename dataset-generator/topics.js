'use strict';

// ─── SHARED UTILITIES ────────────────────────────────────────────────────────

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
};
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pct = (n) => `${n}%`;
const yr = () => rand(2010, 2024);
const money = () => {
  const amounts = ['$1M', '$5M', '$10M', '$50M', '$100M', '$500M', '$1B', '$10B', '$50B', '$200B', '$1T'];
  return pick(amounts);
};

module.exports = { pick, pickN, rand, pct, yr, money };
