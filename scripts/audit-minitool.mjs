/**
 * 小工具产物合规自检。
 *
 * 覆盖 minitool-zip-builder 里能机检的硬约束：包结构、文件类型、容器 CSP、
 * 被禁 Web API、外部资源。体积门禁交给 skill 自带的 audit_artifact 脚本。
 *
 *   node scripts/audit-minitool.mjs dist-minitool
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';

const dir = process.argv[2] || 'dist-minitool';
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

/* ── 包结构 ───────────────────────────────── */

const ALLOWED = new Set([
  '.html', '.css', '.js',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.woff', '.woff2', '.json',
]);
const BANNED_NAMES = [/^node_modules$/, /^\.git$/, /^\.DS_Store$/];

function walk(d, acc = []) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (BANNED_NAMES.some((re) => re.test(name))) {
      err(`包内混进开发垃圾：${relative(dir, p)}`);
      continue;
    }
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(dir);
const rel = (p) => relative(dir, p).split(sep).join('/');

if (!files.some((f) => rel(f) === 'index.html')) {
  err('zip 根目录没有 index.html —— 容器无法加载');
}
for (const f of files) {
  const ext = extname(f).toLowerCase();
  if (!ALLOWED.has(ext)) err(`不支持的文件类型：${rel(f)}`);
  if (ext === '.map') err(`source map 不该进包：${rel(f)}`);
}
if (files.filter((f) => extname(f) === '.html').length > 1) {
  err('小工具是单页应用，只能有一个 index.html');
}

/* ── index.html ───────────────────────────── */

const htmlPath = join(dir, 'index.html');
const html = readFileSync(htmlPath, 'utf8');

const htmlRules = [
  [/<!doctype html>/i, '缺 <!DOCTYPE html>'],
  [/<html[^>]*lang="zh-CN"/i, '缺 lang="zh-CN"'],
  [/<meta[^>]*charset="?UTF-8/i, '缺 charset=UTF-8'],
  [/width=device-width/, 'viewport 缺 width=device-width'],
  [/initial-scale=1\.0/, 'viewport 缺 initial-scale=1.0'],
  [/viewport-fit=cover/, 'viewport 缺 viewport-fit=cover'],
];
for (const [re, msg] of htmlRules) if (!re.test(html)) err(msg);

const htmlBans = [
  [/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i, '存在内联 <script>，容器 CSP 不放行'],
  [/<script[^>]*type="module"/i, '存在 type="module"，容器只接经典脚本'],
  [/\son[a-z]+\s*=\s*["']/i, '存在行内事件属性（onclick 等），改用 addEventListener'],
  [/javascript:/i, '存在 javascript: URI'],
  [/<base\s/i, '存在 <base href>，会破坏真机路径'],
  [/<iframe/i, '存在 <iframe>'],
  [/<object/i, '存在 <object>'],
  [/<meta[^>]*http-equiv="Content-Security-Policy"/i, '自建了 CSP meta，安全策略归容器管'],
  [/target="_blank"/i, '存在 target="_blank"，容器内不能开新窗口 / 跳站外'],
  [/(src|href)="\//, '存在绝对路径引用，离线包只能用相对路径'],
];
for (const [re, msg] of htmlBans) if (re.test(html)) err(msg);

/* ── 外部资源 ─────────────────────────────── */

// XML 命名空间只是标识符，不产生网络请求
const NS_WHITELIST = /https?:\/\/www\.w3\.org\//g;
for (const f of files) {
  if (!['.html', '.css', '.js', '.json', '.svg'].includes(extname(f))) continue;
  const text = readFileSync(f, 'utf8').replace(NS_WHITELIST, '');
  const hits = text.match(/https?:\/\/[^\s"'()]+/g);
  if (hits) err(`${rel(f)} 引用了外部地址（容器不联网）：${[...new Set(hits)].slice(0, 3).join(', ')}`);
}

/* ── 被禁 Web API ─────────────────────────── */

const BANNED_APIS = [
  [/\bfetch\s*\(/, 'fetch()'],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/new\s+WebSocket\s*\(/, 'WebSocket'],
  [/new\s+EventSource\s*\(/, 'EventSource'],
  [/RTCPeerConnection/, 'RTCPeerConnection'],
  [/navigator\.geolocation/, 'geolocation'],
  [/navigator\.clipboard/, 'clipboard'],
  [/execCommand\s*\(\s*["'](copy|cut|paste)/, 'execCommand 剪贴板'],
  [/navigator\.(bluetooth|usb|hid|serial)/, '硬件连接 API'],
  [/navigator\.(getBattery|connection|credentials|locks)/, '设备信息 / 凭据 API'],
  [/navigator\.mediaDevices\.(enumerateDevices|getDisplayMedia)/, '设备枚举 / 屏幕共享'],
  [/navigator\.storage\.persist/, 'storage.persist'],
  [/navigator\.serviceWorker/, 'Service Worker'],
  [/new\s+(Shared)?Worker\s*\(/, 'Worker'],
  [/new\s+(Accelerometer|Gyroscope|Magnetometer)\s*\(/, '传感器 API'],
  [/Device(Motion|Orientation)Event|["'](devicemotion|deviceorientation)["']/, '设备运动 / 方向事件'],
  [/(webkit)?[rR]equestFullscreen/, 'requestFullscreen（全屏归容器管）'],
  [/\beval\s*\(/, 'eval()'],
  [/new\s+Function\s*\(/, 'new Function()'],
  [/WebAssembly\./, 'WebAssembly'],
  [/window\.open\s*\(/, 'window.open()'],
  [/window\.prompt\s*\(|[^.\w]prompt\s*\(/, 'window.prompt()'],
  [/location\.(href\s*=|assign\s*\(|replace\s*\()/, '站外跳转'],
  [/\bdownload\s*=/, 'a[download] 文件下载'],
];

for (const f of files) {
  if (!['.js', '.html'].includes(extname(f))) continue;
  const text = readFileSync(f, 'utf8');
  for (const [re, name] of BANNED_APIS) {
    if (re.test(text)) err(`${rel(f)} 用到被禁能力：${name}`);
  }
}

/* ── 经典脚本 ─────────────────────────────── */

for (const f of files.filter((f) => extname(f) === '.js')) {
  const text = readFileSync(f, 'utf8');
  if (/^\s*(import|export)\s/m.test(text) || /\bimport\s*\(/.test(text)) {
    err(`${rel(f)} 残留 ESM 语法，离线 zip 里 module 解析不可靠`);
  }
}

/* ── Base64 体量 ──────────────────────────── */

for (const f of files) {
  if (!['.html', '.css', '.js'].includes(extname(f))) continue;
  for (const m of readFileSync(f, 'utf8').matchAll(/;base64,([A-Za-z0-9+/=]+)/g)) {
    const bytes = Math.floor((m[1].length * 3) / 4);
    if (bytes > 1024 * 1024) err(`${rel(f)} 内嵌 Base64 解码后 ${(bytes / 1048576).toFixed(2)} MiB，必须改独立文件`);
    else if (bytes > 100 * 1024) warn(`${rel(f)} 内嵌 Base64 解码后 ${(bytes / 1024).toFixed(0)} KiB，建议改独立文件`);
  }
}

/* ── 报告 ─────────────────────────────────── */

const total = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`审计目录：${dir}（${files.length} 个文件，解压后 ${(total / 1024).toFixed(1)} KiB）`);
for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
console.log(errors.length ? `\n✗ ${errors.length} 项违规` : `\n✓ 合规检查全部通过${warns.length ? `（${warns.length} 条提示）` : ''}`);
process.exit(errors.length ? 1 : 0);
