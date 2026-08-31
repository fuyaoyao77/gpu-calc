'use strict';

/**
 * 单元测试：gpu_calc 计算核心模块
 * 运行：npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { computeCosts, formatMoney, GPU_PRESETS, HOURS_PER_YEAR } = require('../src/calculator.js');

// A800 默认 8 卡：整机 100 万 / 4.2kW / 租价 10 元/卡时
const BASE = {
  cards: 8,
  rigPrice: 1000000,
  years: 5,
  powerKw: 4.2,
  priceKwh: 0.8,
  opex: 80000,
  rentRate: 10,
  load: 0.3
};

test('基础计算：30% 负载下自建 vs 租用', () => {
  const r = computeCosts(BASE);
  // 折旧 = 100万/5 = 20万；电费 = 4.2*8760*0.8*0.3 = 8828.64；运维 8万 → 自建 ≈ 28.88万
  assert.ok(Math.abs(r.selfCost - (200000 + 4.2 * HOURS_PER_YEAR * 0.8 * 0.3 + 80000)) < 1e-6, '自建成本应 = 折旧+电费+运维');
  // 租用 = 10*8*8760*0.3 = 210240
  assert.ok(Math.abs(r.rentCost - (10 * 8 * HOURS_PER_YEAR * 0.3)) < 1e-6, '租用成本应 = 单价*卡数*小时*负载');
  assert.equal(r.verdict, 'rent', '30% 负载下应判定为租');
});

test('盈亏平衡负载率计算', () => {
  const r = computeCosts(BASE);
  // 固定成本 = 20万 + 8万 = 28万；满负载租费 = 10*8*8760 = 700800
  const expect = (200000 + 80000) / (10 * 8 * HOURS_PER_YEAR);
  assert.ok(Math.abs(r.breakeven - expect) < 1e-9, '盈亏平衡负载率 = 固定成本/满负载租费');
  // 28万/70.08万 ≈ 39.95%
  assert.ok(r.breakeven > 0.39 && r.breakeven < 0.41, 'A800 场景平衡点应在 40% 附近');
});

test('高负载下应判定为买', () => {
  const r = computeCosts({ ...BASE, load: 0.9 });
  // 租用 = 10*8*8760*0.9 = 63万 > 自建 ~29万
  assert.equal(r.verdict, 'buy', '90% 负载下应判定为买');
  assert.ok(r.diff < 0, '自建-租用应为负（自建更省）');
});

test('零负载边界：自建成本 = 固定成本，租用 = 0', () => {
  const r = computeCosts({ ...BASE, load: 0 });
  assert.equal(r.rentCost, 0, '零负载下租用应为 0');
  assert.ok(Math.abs(r.selfCost - (200000 + 80000)) < 1e-6, '零负载下自建 = 折旧+运维');
  assert.equal(r.verdict, 'rent', '零负载下必然租');
});

test('满负载边界：租用成本达上限', () => {
  const r = computeCosts({ ...BASE, load: 1 });
  assert.ok(Math.abs(r.rentCost - (10 * 8 * HOURS_PER_YEAR)) < 1e-6, '满负载租用 = 单价*卡数*小时');
});

test('卡数非 8 的倍数时整机数向上取整', () => {
  const r = computeCosts({ ...BASE, cards: 9 });
  assert.equal(r.rigs, 2, '9 张卡应算 2 台整机');
  // 折旧按 2 台整机
  assert.ok(Math.abs(r.capexPerYear - (1000000 * 2) / 5) < 1e-6, '折旧按向上取整的整机数');
});

test('非法输入防护：0/负数/NaN', () => {
  const r = computeCosts({ ...BASE, cards: 0, rigPrice: -100, years: 0, powerKw: -1, rentRate: NaN, load: 5 });
  assert.equal(r.cards, 1, '卡数下限 1');
  assert.equal(r.rigs, 1, '整机数下限 1');
  assert.ok(r.capexPerYear >= 0, '负价格被钳制为 0，折旧非负');
  assert.equal(r.load, 1, '负载上限 1');
  assert.ok(isFinite(r.selfCost) && isFinite(r.rentCost), '非法输入不产生 NaN');
});

test('rentRate=0（免费租用）时平衡点应为 Infinity 且判租', () => {
  const r = computeCosts({ ...BASE, rentRate: 0 });
  assert.equal(r.breakeven, Infinity, '租费为 0 时平衡点为无穷');
  assert.equal(r.verdict, 'rent', '租费为 0（免费）时应判租');
});

test('formatMoney：万元格式与千分位', () => {
  assert.equal(formatMoney(10000), '¥1.0万');
  assert.equal(formatMoney(288828.64), '¥28.9万');
  assert.equal(formatMoney(5000), '¥5,000');
  assert.equal(formatMoney(Infinity), '--');
  assert.equal(formatMoney(NaN), '--');
});

test('GPU 预设完整性', () => {
  const keys = Object.keys(GPU_PRESETS);
  assert.ok(keys.length >= 6, '应有 6 个预设型号');
  for (const k of keys) {
    const p = GPU_PRESETS[k];
    assert.ok(p.label && p.price > 0 && p.kw > 0 && p.rent > 0, `预设 ${k} 字段完整`);
  }
});
