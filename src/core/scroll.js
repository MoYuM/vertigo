import { clamp } from './util.js';

/**
 * 滚动观测。
 * depth  —— 当前深度 0..1（会回落）
 * travel —— 累计滚动路程 px（只增不减：来回滚也在消耗你自己）
 * vel    —— 瞬时速度 px/s，喂给湍流
 */
export function createScroll() {
  const s = { y: 0, depth: 0, travel: 0, vel: 0, turb: 0 };
  let last = window.scrollY;

  const read = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    s.y = window.scrollY;
    s.depth = max > 0 ? clamp(s.y / max) : 0;
    const d = Math.abs(s.y - last);
    s.travel += d;
    last = s.y;
  };

  window.addEventListener('scroll', read, { passive: true });
  window.addEventListener('resize', read);
  read();

  let prevY = s.y;
  s.update = (dt) => {
    s.vel = dt > 0 ? (s.y - prevY) / dt : 0;
    prevY = s.y;
    const kick = clamp(Math.abs(s.vel) / 2600);
    // 湍流跟涨慢落：手停了，晃还要持续一会儿
    s.turb = kick > s.turb ? kick : s.turb + (kick - s.turb) * (1 - Math.pow(0.12, dt));
    return s;
  };

  return s;
}
