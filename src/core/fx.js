import { TAU, clamp, norm } from './util.js';

/**
 * 后期层：不复制 DOM，只在最上面叠加真正制造生理眩晕的东西——
 * 绕圈的暗角、永远到不了底的隧道、以及缓慢的亮度呼吸。
 * 刻意不做硬频闪：作品要让人晕，不要让人发病。
 */
export function createFX(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  function draw(t, sick, turb, rush = 0) {
    const alpha = Math.max(norm(sick, 0.22, 1), rush);
    canvas.style.opacity = alpha.toFixed(3);
    if (alpha <= 0.001) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2 + Math.cos(t * 0.31) * 60 * sick;
    const cy = H / 2 + Math.sin(t * 0.23) * 60 * sick;
    const maxR = Math.hypot(W, H) * 0.62;

    // ── 绕圈的暗角：视野边缘持续被啃掉，这是"要晕过去"的感觉 ──
    const vig = ctx.createRadialGradient(cx, cy, maxR * (0.30 - sick * 0.20), cx, cy, maxR);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, `rgba(0,0,0,${(0.30 + sick * 0.5).toFixed(3)})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // ── 隧道：同心方框以指数速度从中心涌出，永远到不了底 ──
    const tun = norm(sick, 0.60, 0.95);
    if (tun > 0) {
      const rings = 22;
      const minR = 8, ratio = Math.log(maxR / minR);
      const phase = (t * (0.16 + sick * 0.30 + rush * 2.6)) % 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * (0.10 + sick * 0.55 + rush * 2.2));
      ctx.lineJoin = 'miter';
      for (let i = 0; i < rings; i++) {
        const f = ((i / rings) + phase) % 1;
        const r = minR * Math.exp(f * ratio);
        // 两端淡出，让"涌出"没有起点也没有终点
        const a = Math.sin(f * Math.PI) * 0.82 * tun;
        if (a <= 0.002) continue;
        ctx.beginPath();
        ctx.rotate(0.09);
        // 站是白底，所以只用黑：粗细交替来造节奏，别指望白线能被看见
        ctx.strokeStyle = `rgba(0,0,0,${a.toFixed(3)})`;
        ctx.lineWidth = (i % 2 ? 1.2 : 3.4) + r * 0.03;
        ctx.rect(-r, -r * 0.72, r * 2, r * 1.44);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── 视野呼吸：往暗里压，不是往亮里冲。
    //    白底上压暗才保得住 adidas 那套黑白对比，也更像"要晕过去"。──
    const breath = norm(sick, 0.45, 1);
    if (breath > 0) {
      const b = (Math.sin(t * 1.15) * 0.5 + 0.5) * breath * 0.28 * (0.6 + turb);
      ctx.fillStyle = `rgba(0,0,0,${b.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // ── 扫描漂移带：模拟眼震下视野里那道过不去的横条 ──
    const nys = norm(sick, 0.35, 1);
    if (nys > 0) {
      const y = ((t * 90 * (0.4 + nys)) % (H + 240)) - 120;
      const g = ctx.createLinearGradient(0, y - 110, 0, y + 110);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, `rgba(0,0,0,${(0.11 * nys).toFixed(3)})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 110, W, 220);
    }
  }

  return { draw, resize };
}
