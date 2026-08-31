/**
 * gpu_calc 计算核心模块
 * 买 vs 租 算力成本测算逻辑（与 DOM 无关，可在浏览器与 Node 中运行）
 * 格式：UMD（浏览器挂载 window.GpuCalc，Node 中 module.exports）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GpuCalc = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  /** 一年小时数 */
  const HOURS_PER_YEAR = 8760;

  /** 每卡最多装入整机的卡数（用于算整机数） */
  const CARDS_PER_RIG = 8;

  /**
   * GPU 型号预设：整机 8 卡参考价(元) / 整机满载功耗(kW) / 每卡时租价(元)
   * 价格为市场示意值，随行情波动
   */
  const GPU_PRESETS = {
    A800: { label: 'A800 80G', price: 1000000, kw: 4.2, rent: 10 },
    A100: { label: 'A100 80G', price: 1100000, kw: 4.3, rent: 12 },
    H20:  { label: 'H20 96G',  price: 900000,  kw: 3.8, rent: 8 },
    H100: { label: 'H100 80G', price: 1800000, kw: 4.6, rent: 20 },
    '4090': { label: 'RTX4090', price: 150000, kw: 1.6, rent: 2 },
    '910B': { label: '昇腾910B', price: 850000, kw: 4.0, rent: 7 }
  };

  /**
   * 计算买/租年成本
   * @param {Object} p 参数
   * @param {number} p.cards     GPU 卡数
   * @param {number} p.rigPrice  整机采购单价(元)
   * @param {number} p.years     折旧年限
   * @param {number} p.powerKw   整机满载功耗(kW)
   * @param {number} p.priceKwh  电价(元/kWh)
   * @param {number} p.opex      年运维/机房费(元/年)
   * @param {number} p.rentRate  租用单价(元/卡/小时)
   * @param {number} p.load      平均负载率(0-1)
   * @returns {Object} 计算结果
   */
  function computeCosts(p) {
    const cards = Math.max(1, Number(p.cards) || 1);
    const rigs = Math.max(1, Math.ceil(cards / CARDS_PER_RIG));
    const rigPrice = Math.max(0, Number(p.rigPrice) || 0);
    const years = Math.max(1, Number(p.years) || 5);
    const powerKw = Math.max(0, Number(p.powerKw) || 0);
    const priceKwh = Math.max(0, Number(p.priceKwh) || 0);
    const opex = Math.max(0, Number(p.opex) || 0);
    const rentRate = Math.max(0, Number(p.rentRate) || 0);
    const load = Math.min(1, Math.max(0, Number(p.load) || 0));

    // 自建年成本 = 折旧 + 电费(按负载) + 运维
    const capexPerYear = (rigPrice * rigs) / years;
    const elec = powerKw * rigs * HOURS_PER_YEAR * priceKwh * load;
    const selfCost = capexPerYear + elec + opex;

    // 租用年成本 = 卡时单价 × 卡数 × 小时数 × 负载率
    const rentCost = rentRate * cards * HOURS_PER_YEAR * load;

    const diff = selfCost - rentCost;

    // 盈亏平衡负载率 = 自建固定成本 / 租用单位年成本(满负载)
    const selfFixed = capexPerYear + opex;
    const elecMax = powerKw * rigs * HOURS_PER_YEAR * priceKwh;   // 满载电费
    const rentMax = rentRate * cards * HOURS_PER_YEAR;            // 满负载租费
    const breakeven = rentMax > 0 ? selfFixed / rentMax : Infinity;

    return {
      cards, rigs, load,
      capexPerYear, elec, selfFixed, elecMax,
      rentMax,
      selfCost, rentCost, diff,
      breakeven,
      verdict: rentCost < selfCost ? 'rent' : 'buy'
    };
  }

  /**
   * 金额格式化（万元）
   * @param {number} n 金额
   * @returns {string}
   */
  function formatMoney(n) {
    if (!isFinite(n)) return '--';
    if (Math.abs(n) >= 10000) return '¥' + (n / 10000).toFixed(1) + '万';
    return '¥' + n.toLocaleString();
  }

  return {
    HOURS_PER_YEAR,
    CARDS_PER_RIG,
    GPU_PRESETS,
    computeCosts,
    formatMoney
  };
});
