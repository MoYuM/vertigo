export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** 把 v 从 [a,b] 线性映射到 0..1 并夹紧 */
export const norm = (v, a, b) => clamp((v - a) / (b - a));

/** 平滑的 0..1，两端一阶导为 0 */
export const smooth = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/** 区间权重：进入 in 段淡入，离开 out 段淡出，中间为 1 */
export function band(p, start, end, fadeIn = 0.04, fadeOut = 0.04) {
  if (p <= start - fadeIn || p >= end + fadeOut) return 0;
  if (p < start) return smooth((p - (start - fadeIn)) / fadeIn);
  if (p > end) return 1 - smooth((p - end) / fadeOut);
  return 1;
}

export const easeInQuad = (t) => t * t;
export const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** 确定性伪随机，同一 seed 永远同一序列 —— 保证作品每次运行完全一致 */
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}
