import { rng } from './util.js';

/**
 * 把 [data-shatter] 里的每个字符拆成独立 span。
 * 拆完页面视觉上毫无变化 —— 骨头已经断了，皮还完好。
 */
export function shatterText(root = document) {
  const rand = rng(20260905);
  const chars = [];

  root.querySelectorAll('[data-shatter]').forEach((host) => {
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const texts = [];
    let n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) texts.push(n);

    texts.forEach((node) => {
      const frag = document.createDocumentFragment();
      for (const c of node.nodeValue) {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = c;
        span.dataset.seed = rand().toFixed(4);
        frag.appendChild(span);
        chars.push(span);
      }
      node.parentNode.replaceChild(frag, node);
    });
  });

  // 打乱顺序：脱落不按阅读顺序，才像结构性失效而不是动画
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}
