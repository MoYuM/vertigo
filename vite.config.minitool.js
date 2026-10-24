/**
 * 小红书小工具离线 zip 的构建配置。
 * 和 web 版的差别全在容器约束上：相对路径、经典脚本、无外部资源、无站外跳转。
 */

/** 构建期就把违反容器约束的片段改掉，改不动就直接失败，别静默产出违规包。 */
function conformToContainer() {
  const cuts = [
    // 外域图片 + target=_blank 跳站外，两条都被容器 CSP 挡死
    [/\s*<a class="end-more-badge"[\s\S]*?<\/a>/, ''],
    // 容器没有浏览器标签栏，favicon 是纯多余的 data: 资源。
    // 按整行截：它的 href 是内嵌 SVG，里头全是 > 和 />，[^>]* 会在半截上停下。
    [/\n[^\n]*<link rel="icon"[^\n]*/, ''],
    // 容器 CSP 不放行 ES module，zip 里也没有目录服务供相对 import 解析
    [/ type="module"/g, ''],
    // 离线包无同源概念，crossorigin 会把本地资源请求推进 CORS 流程
    [/ crossorigin(?==|>|\s)/g, ''],
    // 容器内不该被双击 / 捏合缩放
    [
      /content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/,
      'content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"',
    ],
  ];

  return {
    name: 'minitool-conform',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        let out = cuts.reduce((acc, [pattern, to]) => {
          if (!pattern.test(acc)) {
            throw new Error(`minitool: index.html 里没匹配到 ${pattern}，产物会违反容器约束`);
          }
          return acc.replace(pattern, to);
        }, html);

        // Vite 把入口脚本注进 <head>。module 会等 DOM，摘掉 type 后的经典脚本不会，
        // 留在原地就会在 body 存在之前跑起来。
        const script = out.match(/\s*<script[^>]*src="[^"]*"[^>]*><\/script>/);
        if (!script) throw new Error('minitool: 没找到入口脚本标签');
        return out.replace(script[0], '').replace('</body>', `${script[0].trim()}\n</body>`);
      },
    },
  };
}

export default {
  base: './',
  plugins: [conformToContainer()],
  build: {
    target: ['es2017', 'chrome61'],
    cssTarget: 'chrome61',
    outDir: 'dist-minitool',
    emptyOutDir: true,
    // 容器 CSP 不放行 ES module：产物必须是单个经典脚本
    modulePreload: false,
    // IIFE 下若按 chunk 切 CSS，样式会被塞进 JS 靠运行时注入，白屏一闪
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
  },
};
