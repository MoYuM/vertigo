import { TAU, clamp, lerp, norm, rng } from './core/util.js';
import { createScroll } from './core/scroll.js';
import { createDecay, STAGES } from './core/decay.js';
import { shatterText } from './core/shatter.js';
import { createPhysics } from './core/physics.js';
import { createFX } from './core/fx.js';
import { PRODUCTS, renderGrid } from './products.js';

/* ══ Flex gap 能力检测 ═══════════════════════════════════
   必须赶在下面任何一次布局测量之前落地：碎片的文档坐标是按最终间距
   算的，class 晚挂一步，整套 _y 就全偏了。
   语法检测（@supports / CSS.supports）证明不了 gap 在 flexbox 里真生效，
   只能实测一次两行 Flex 容器的高度。 */
function supportsFlexGap() {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;visibility:hidden;display:flex;flex-direction:column;row-gap:1px';
  probe.appendChild(document.createElement('div'));
  probe.appendChild(document.createElement('div'));
  document.body.appendChild(probe);
  const ok = probe.scrollHeight === 1;
  probe.parentNode.removeChild(probe);
  return ok;
}

if (supportsFlexGap()) document.documentElement.classList.add('supports-flex-gap');

/* ══ 装配 ══════════════════════════════════════════════ */

const site = document.getElementById('site');
const root = document.documentElement;

renderGrid(document.getElementById('grid'), PRODUCTS.slice(0, 6), 0);
renderGrid(document.getElementById('grid2'), PRODUCTS.slice(6), 6);

const chars = shatterText(site);
// 零件按面积升序：小零件先脱落，大块最后走。
// 反过来的话大块一飞就把里面的小件带走了，戏就没了。
const pieces = [...site.querySelectorAll('[data-piece]')]
  .sort((a, b) => a.offsetWidth * a.offsetHeight - b.offsetWidth * b.offsetHeight);

// 每个字符记下它在文档里的位置，用于视口剔除
const rand = rng(4242);
for (const ch of chars) {
  const r = ch.getBoundingClientRect();
  ch._y = r.top + scrollY;
  ch._seed = parseFloat(ch.dataset.seed) || rand();
}

const scroll = createScroll();
const decay = createDecay();
const physics = createPhysics(site);
const fx = createFX(document.getElementById('fx'));

const hud = document.getElementById('hud');
const stabilityBar = document.getElementById('stability');
const stabilityVal = document.getElementById('stability-v');

/* ══ 重影层：页面自己的残像 ═══════════════════════════ */

let echo = null, echoInner = null;
function buildEcho() {
  if (echo) return;
  echo = document.createElement('div');
  echo.id = 'echo';
  echoInner = document.createElement('div');
  echoInner.className = 'echo-inner';
  const clone = site.cloneNode(true);
  clone.removeAttribute('id');
  clone.style.transform = 'none';
  clone.style.filter = 'none';
  clone.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  echoInner.appendChild(clone);
  echo.appendChild(echoInner);
  document.body.appendChild(echo);
}

/* ══ 逐步脱落 ═════════════════════════════════════════ */

let charCursor = 0;   // 已释放到 chars 的第几个
let pieceCursor = 0;

// 字符和零件分开配额：否则一千多个字符会把物理预算吃光，
// 卡片和黑色横幅永远飞不起来 —— 而那才是最有分量的碎片。
const CHAR_QUOTA = 260;

function shedChars(sick) {
  const want = Math.floor(norm(sick, 0.44, 1) * CHAR_QUOTA);
  let budget = 6; // 每帧上限，避免释放时掉帧
  while (charCursor < chars.length && physics.charCount < want && budget-- > 0) {
    const ch = chars[charCursor++];
    if (ch.isConnected && !ch.closest('.freed')) physics.free(ch, { kind: 'char' });
  }
}

function shedPieces(sick) {
  const want = Math.floor(norm(sick, 0.58, 0.97) * pieces.length);
  let budget = 1;
  while (pieceCursor < want && budget-- > 0) {
    const el = pieces[pieceCursor++];
    if (el.isConnected && !el.closest('.freed')) {
      physics.free(el, { inline: getComputedStyle(el).display === 'inline', kind: 'piece' });
    }
  }
}

/* ══ 眼震波形 ═════════════════════════════════════════
   慢相漂移 + 快相回跳。这是前庭性眼震的真实形状，
   比单纯的左右摆更让人不适。                            */
function nystagmus(t, amp, freq) {
  const ph = (t * freq) % 1;
  return ph < 0.82
    ? lerp(-amp, amp, ph / 0.82)
    : lerp(amp, -amp, (ph - 0.82) / 0.18);
}

/* ══ 主循环 ═══════════════════════════════════════════ */

let running = false;
let safeMode = false;
let last = performance.now();
let stageShown = -1;

/* 终幕：崩坏度触顶后，碎片被吸进隧道中心湮灭 */
const endEl = document.getElementById('end');
let implode = 0;
let ended = false;
const IMPLODE_SEC = 3.4;

function finish() {
  ended = true;
  running = false;
  decay.frozen = true;
  document.body.classList.add('locked');
  site.style.visibility = 'hidden';
  if (echo) echo.style.display = 'none';
  document.getElementById('fx').style.opacity = '0';
  hud.classList.remove('on');

  endEl.classList.add('on');
  requestAnimationFrame(() => endEl.classList.add('reveal'));
  // 标语先完整出现，再让前半截褪掉 —— 只剩下 NOTHING
  setTimeout(() => endEl.classList.add('fade'), 2800);
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 20);
  last = now;
  requestAnimationFrame(frame);
  if (!running) return;

  scroll.update(dt);
  decay.update(dt, scroll);

  const sick = safeMode ? 0 : decay.sick;
  const turb = safeMode ? 0 : scroll.turb;
  const t = now / 1000;

  /* ── 整站姿态 ───────────────────────────────── */
  const tiltAmp = norm(sick, 0.10, 1) * 13;
  const tilt =
    Math.sin(t * 0.28) * tiltAmp * 0.6 +
    Math.sin(t * 0.11 + 1.7) * tiltAmp * 0.4 +
    turb * 3.5 * Math.sign(scroll.vel || 1);
  const skew = Math.sin(t * 0.37 + 0.9) * norm(sick, 0.24, 1) * 4.2;
  const swim = nystagmus(t, norm(sick, 0.18, 1) * 26, 0.55 + sick * 1.4);

  root.style.setProperty('--tilt', tilt.toFixed(3) + 'deg');
  root.style.setProperty('--skew', skew.toFixed(3) + 'deg');
  root.style.setProperty('--swim', swim.toFixed(2) + 'px');
  root.style.setProperty('--chroma', (norm(sick, 0.28, 1) * 5).toFixed(2) + 'px');
  root.style.setProperty('--blur', (norm(sick, 0.80, 1) * 1.6).toFixed(2) + 'px');
  root.style.setProperty('--sick', sick.toFixed(3));

  document.body.classList.toggle('defocus', sick > 0.80);

  // 旋转必须绕当前视口中心，否则长文档会被甩到天外
  site.style.transformOrigin = `50% ${(scrollY + innerHeight / 2).toFixed(0)}px`;

  document.body.classList.toggle('chroma', sick > 0.28);

  /* ── 字符离骨：先在基线上抖，再真正掉下来 ───── */
  const drift = norm(sick, 0.12, 0.62);
  if (drift > 0) {
    const top = scrollY - 200, bot = scrollY + innerHeight + 200;
    const ax = drift * 7, ay = drift * 9, ar = drift * 0.34;
    for (const ch of chars) {
      if (ch._y < top || ch._y > bot || ch.dataset.freed) continue;
      const s = ch._seed;
      const p = t * (0.7 + s * 1.9) + s * TAU;
      ch.style.transform =
        `translate(${(Math.sin(p) * ax).toFixed(2)}px,${(Math.cos(p * 1.31) * ay).toFixed(2)}px) ` +
        `rotate(${(Math.sin(p * 0.83) * ar).toFixed(3)}rad)`;
    }
  }

  /* ── 重影 ───────────────────────────────────── */
  if (sick > 0.30) {
    buildEcho();
    echo.style.opacity = (norm(sick, 0.30, 0.9) * 0.5).toFixed(3);
    const lag = Math.sin(t * 0.6) * 70 * norm(sick, 0.3, 1);
    echoInner.style.transform =
      `translate3d(${(-swim * 1.8).toFixed(1)}px, ${(-scrollY + lag).toFixed(1)}px, 0) ` +
      `rotate(${(-tilt * 0.55).toFixed(3)}deg) scale(${(1 + norm(sick, 0.3, 1) * 0.05).toFixed(3)})`;
  }

  /* ── 崩塌 ───────────────────────────────────── */
  if (!safeMode) {
    if (sick >= 0.999) implode = Math.min(1, implode + dt / IMPLODE_SEC);
    shedChars(sick);
    shedPieces(sick);
    physics.update(dt, sick, turb, implode);
    if (implode >= 1 && !ended) finish();
  }

  fx.draw(t, sick, turb, implode);

  /* ── HUD ────────────────────────────────────── */
  const stab = Math.round((1 - sick) * 100);
  stabilityBar.style.width = (100 - sick * 100).toFixed(1) + '%';
  if (decay.stage !== stageShown) {
    stageShown = decay.stage;
    stabilityVal.textContent = stab + '%';
    document.title = sick > 0.6
      ? 'ad̷i̶d̸a̷s̶ ̴官̷方̸商̴城'
      : 'adidas 官方商城 | IMPOSSIBLE IS NOTHING';
  } else if ((now | 0) % 4 === 0) {
    stabilityVal.textContent = stab + '%';
  }
}

requestAnimationFrame(frame);

/* ══ 入口 ═════════════════════════════════════════════ */

const gate = document.getElementById('gate');
const hint = document.getElementById('gate-hint');
document.body.classList.add('locked');

if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
  hint.textContent = '检测到你的系统偏好「减弱动态效果」。建议选择静态模式。';
}

function start(safe) {
  safeMode = safe;
  running = true;
  last = performance.now();
  document.body.classList.remove('locked');
  gate.classList.add('gone');
  if (!safe) hud.classList.add('on');
  setTimeout(() => gate.remove(), 1200);
}

document.getElementById('enter').addEventListener('click', () => start(false));
document.getElementById('enter-safe').addEventListener('click', () => start(true));

// 尺寸变化后字符的文档坐标需要重算，否则视口剔除会错
addEventListener('resize', () => {
  for (const ch of chars) {
    if (ch.dataset.freed) continue;
    ch._y = ch.getBoundingClientRect().top + scrollY;
  }
});

/* ══ 演示/调试钩子 ═════════════════════════════════════
   评委演示和录屏时不可能真去滚三万像素，留一个入口直接跳档。 */
window.vertigo = {
  get sick() { return decay.sick; },
  get stage() { return STAGES[decay.stage].name; },
  get debris() { return physics.count; },
  /** 直接跳到某个崩坏度 0..1 */
  jump(v) {
    return decay.seek(v, scroll);
  },
  /** 在 sec 秒内从当前值线性推到 1，用于录屏 */
  ramp(sec = 60) {
    const from = decay.sick, t0 = performance.now();
    const tick = () => {
      const k = clamp((performance.now() - t0) / (sec * 1000));
      this.jump(lerp(from, 1, k));
      if (k < 1) requestAnimationFrame(tick);
    };
    tick();
  },
  reset() { location.reload(); },
};
