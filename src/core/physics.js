import { TAU, clamp, rng } from './util.js';

const MAX_BODIES = 420;

/**
 * 挣脱布局的碎片。
 *
 * 坐标系用的是 #site 的局部（文档）坐标而不是视口坐标：
 * #site 身上有 transform，它已经是 fixed 后代的包含块，
 * 顺着这一点走，碎片就能跟着整站一起倾斜，而不是浮在变形之外。
 * 代价是所有视口边界都要加 scrollY —— 见 update()。
 */
export function createPhysics(site) {
  const rand = rng(77);
  const bodies = [];
  let charCount = 0;
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };

  addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  }, { passive: true });
  addEventListener('pointerleave', () => { mouse.active = false; });

  /** 元素相对 #site 的布局坐标（未经变换，正是 fixed 后代的坐标系） */
  function localPos(el) {
    let x = 0, y = 0, n = el;
    while (n && n !== site) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent;
    }
    return { x, y };
  }

  /** 让一个元素脱离布局，原位留一个等大的空洞，排版因此不会整体塌陷 */
  function free(el, opts = {}) {
    if (bodies.length >= MAX_BODIES || el.dataset.freed) return null;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w && !h) return null;
    const { x, y } = localPos(el);

    const inline = opts.inline !== false;
    const ghost = document.createElement(inline ? 'span' : 'div');
    ghost.className = 'ghost';
    ghost.style.cssText =
      `display:${inline ? 'inline-block' : 'block'};width:${w}px;height:${h}px;`;
    el.parentNode.insertBefore(ghost, el);

    el.dataset.freed = '1';
    el.classList.add('freed');
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    if (opts.kind === 'char') charCount++;

    const b = {
      el, x, y, w, h,
      vx: (rand() - 0.5) * 160,
      vy: (rand() - 0.5) * 160,
      rot: 0,
      vrot: (rand() - 0.5) * 2.8,
      seed: rand(),
    };
    bodies.push(b);
    return b;
  }

  function update(dt, sick, turb, implode = 0) {
    if (!bodies.length) return;
    const t = performance.now() / 1000;

    // 重力矢量绕圈：没有"下"这个方向了 —— 这就是眩晕的解剖学定义
    const ga = t * (0.22 + sick * 1.5);
    const G = 420 * sick * sick * (1 - implode);
    const gx = Math.cos(ga) * G;
    const gy = Math.sin(ga) * G;

    // 终幕：唯一一次出现真正的方向 —— 所有东西被吸进中心
    const cx = innerWidth / 2, cy = scrollY + innerHeight / 2;

    const chaos = (0.4 + turb) * sick;
    const step = Math.min(dt, 1 / 30);
    const drag = Math.pow(0.55, step);
    const spinDrag = Math.pow(0.7, step);

    // 视口在文档坐标里的范围
    const top = scrollY, bottom = scrollY + innerHeight;
    const mx = mouse.x, my = mouse.y + scrollY;
    const pad = 6;

    for (const b of bodies) {
      b.vx += gx * step;
      b.vy += gy * step;

      // 低频噪声推挤，制造"没有规律的漂"
      b.vx += Math.sin(t * 1.7 + b.seed * TAU) * 130 * chaos * step;
      b.vy += Math.cos(t * 1.3 + b.seed * TAU * 1.6) * 130 * chaos * step;

      if (implode > 0) {
        const dx = cx - (b.x + b.w / 2);
        const dy = cy - (b.y + b.h / 2);
        const d = Math.hypot(dx, dy) + 1;
        const f = 1400 * implode;
        b.vx += (dx / d) * f * step;
        b.vy += (dy / d) * f * step;
        b.vrot += (b.seed - 0.5) * 26 * implode * step;
      }

      // 鼠标是排斥源：观众越想稳住它，它散得越开
      if (mouse.active && implode < 0.4) {
        const dx = b.x + b.w / 2 - mx;
        const dy = b.y + b.h / 2 - my;
        const d2 = dx * dx + dy * dy + 900;
        const f = (56000 * sick) / d2;
        b.vx += dx * f * step;
        b.vy += dy * f * step;
      }

      b.vx *= drag; b.vy *= drag;
      b.x += b.vx * step;
      b.y += b.vy * step;
      b.rot += b.vrot * step * (0.5 + sick);
      b.vrot *= spinDrag;

      // 内爆时撤掉墙：碎片要能一路收进中心
      if (implode > 0.05) {
        const s2 = Math.max(0, 1 - implode) * (1 + Math.sin(t * 2.1 + b.seed * 9) * 0.09);
        b.el.style.opacity = Math.max(0, 1 - implode * 1.15).toFixed(3);
        b.el.style.transform =
          `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) ` +
          `rotate(${b.rot.toFixed(3)}rad) scale(${s2.toFixed(3)})`;
        continue;
      }

      // 撞视口边界回弹：碎片必须留在画面里，跑出去就不压迫了
      if (b.x < -b.w + pad)         { b.x = -b.w + pad;         b.vx =  Math.abs(b.vx) * 0.55; b.vrot += 1.2; }
      if (b.x > innerWidth - pad)   { b.x = innerWidth - pad;   b.vx = -Math.abs(b.vx) * 0.55; b.vrot -= 1.2; }
      if (b.y < top - b.h + pad)    { b.y = top - b.h + pad;    b.vy =  Math.abs(b.vy) * 0.55; b.vrot -= 1.2; }
      if (b.y > bottom - pad)       { b.y = bottom - pad;       b.vy = -Math.abs(b.vy) * 0.55; b.vrot += 1.2; }

      const s = 1 + Math.sin(t * 2.1 + b.seed * 9) * 0.09 * sick;
      b.el.style.transform =
        `translate3d(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px,0) ` +
        `rotate(${b.rot.toFixed(3)}rad) scale(${s.toFixed(3)})`;
    }
  }

  return {
    free, update, bodies, mouse,
    get count() { return bodies.length; },
    get charCount() { return charCount; },
  };
}
