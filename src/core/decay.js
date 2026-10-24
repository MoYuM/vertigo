import { clamp } from './util.js';

/**
 * 崩坏度 sick ∈ [0,1]，单调不减。
 *
 * 来源刻意不是"滚到哪儿"，而是"你消耗了它多少"：
 *   travel —— 累计滚动路程，主项
 *   dwell  —— 停留时长，副项（站着不动它也在坏）
 * 所以滚回顶部并不能让页面复原。这是作品的核心命题。
 *
 * 两项都不各自封顶：谁先到顶就把另一项卡死的话，
 * 猛滚的观众会在 0.7 处停下来干等，节奏就断了。
 * 只有加权和最后统一夹到 1。
 */
const TRAVEL_FULL = 24000; // px
const DWELL_FULL = 200;    // 秒
const W_TRAVEL = 0.78;
const W_DWELL = 0.55;

export function createDecay() {
  const d = { sick: 0, stage: 0, dwell: 0, frozen: false };

  d.update = (dt, scroll) => {
    if (d.frozen) return d;
    d.dwell += dt;
    const raw =
      (scroll.travel / TRAVEL_FULL) * W_TRAVEL +
      (d.dwell / DWELL_FULL) * W_DWELL;
    d.sick = Math.max(d.sick, clamp(raw)); // 只增不减
    d.stage = stageOf(d.sick);
    return d;
  };

  /** 跳到指定崩坏度，并把两个来源按权重摊回去，避免下一帧被重算带偏 */
  d.seek = (v, scroll) => {
    const s = clamp(v);
    const k = s / (W_TRAVEL + W_DWELL);
    scroll.travel = k * TRAVEL_FULL;
    d.dwell = k * DWELL_FULL;
    d.sick = s;
    d.stage = stageOf(s);
    return s;
  };

  return d;
}

/** 六个阶段，只用于分派"这一层该不该开始工作" */
export const STAGES = [
  { at: 0.00, name: '完好' },
  { at: 0.13, name: '倾斜' },
  { at: 0.30, name: '重影' },
  { at: 0.48, name: '离骨' },
  { at: 0.68, name: '失重' },
  { at: 0.87, name: '湮灭' },
];

export function stageOf(sick) {
  let i = 0;
  for (let k = 0; k < STAGES.length; k++) if (sick >= STAGES[k].at) i = k;
  return i;
}
