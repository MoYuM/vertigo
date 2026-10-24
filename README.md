# 《眩 晕》

一件关于眩晕的数字作品。外壳是一个可信的运动品牌电商页；你用得越久，它坏得越深，而且**不会复原**。

> `IMPOSSIBLE IS NOTHING` —— 页面彻底碎掉之后，这句标语字面意义地只剩下 `NOTHING`。

## 运行

```bash
pnpm install
pnpm dev      # http://localhost:5173/vertigo/
pnpm build    # 产物在 dist/，纯静态，随便丢哪都能跑
```

原生 HTML / CSS / JS + Vite。**零运行时依赖** —— 物理、后期、字符切分全部手写。

部署固定挂在 `/vertigo/` 子路径下（见 `vite.config.js` 的 `base`），所以本地开发也要访问带这个前缀的地址。

## 部署

部署到 hedian 的服务器，挂在 `support.hedianer.cn/vertigo/` 下，物理目录跟 hedian-support 自己的部署目录分开（避免被对方部署脚本的 `--delete` 误删）。

```bash
cp .env.deploy.example .env.deploy   # 首次，填好服务器信息
pnpm build && ./scripts/deploy.sh
```

前置（已在 2026-09-06 完成一次性配置，记录在此供以后参考）：

1. 在 `support.hedianer.cn` 站点的 Nginx 配置（`/www/server/panel/vhost/nginx/html_support.hedianer.cn.conf`）里加了一段。**必须用 `^~` 前缀**——宝塔默认带一条 `location ~ .*\.(js|css)?$` 正则规则做静态资源缓存，普通的 `location /vertigo/`（无 `^~`）会被这条正则抢先匹配，导致 vertigo 自己的 JS/CSS 资源 404：
   ```nginx
   location ^~ /vertigo/ {
     alias /www/wwwroot/support.hedianer.cn-vertigo/;
     try_files $uri $uri/ $uri.html =404;
   }
   ```
   （目录路径需要和 `.env.deploy` 里的 `DEPLOY_PATH` 一致；加完跑 `nginx -t` 校验再 `nginx -s reload`）
2. 本地 SSH 公钥已加入服务器 `~/.ssh/authorized_keys`。

## 小工具版（小红书离线 zip）

同一份源码另出一个走小红书小工具容器的离线包。容器是纯本地不联网的 WebView，
最低内核是 Android 8.1 出场的 Chrome 61，CSP 只收经典脚本。

```bash
pnpm pack:minitool                        # 构建 + 打包，产出 vertigo-minitool.zip
node scripts/audit-minitool.mjs dist-minitool   # 合规自检（打包前跑）
```

`vite.config.minitool.js` 负责容器那几条硬约束：相对路径 base、IIFE 经典脚本、
入口脚本移到 body 末尾、摘掉 favicon 与终幕那枚 App Store 徽章（外域图片 +
跳站外，容器两条都不放行）。这些替换匹配不上就直接构建失败，不会静默出违规包。

Chrome 61 的兼容基线写在 `src/style.css` 里，web 版和小工具版共用：clamp / min /
max、`inset`、`aspect-ratio`、flex `gap`、`backdrop-filter`、`env()` 安全区都先给
一层旧内核能解析的基线，再按能力检测叠增强。flex gap 只靠 `@supports` 查不出来
（认得 gap 却只在 Grid 里生效的内核会漏网），所以 `main.js` 开头实测一次两行
Flex 容器的高度，支持才挂 `.supports-flex-gap` 把基线 margin 换回 gap ——
这段必须跑在任何布局测量之前，碎片的文档坐标是按最终间距算的。


## 名字与图标

上传小工具时填「**眩晕**」，简介用站内那句 `一个你用得越久、就坏得越深的网站`。

图标在 `brand/`：`vertigo-icon.svg` 是主版（母版矢量，另有 1024/512/256/120 的 PNG），
`vertigo-icon-mono.svg` 是去掉色差的纯黑白备选。形取自终幕只剩下的那个 `NOTHING` 的 O，
红青重影用的是站内 `--chroma` 那对颜色。刻意没用三道杠 —— 页面里戏仿是表达，
做成对外的应用标识是另一回事。`brand/explorations/` 是没选上的几版。


## 崩坏怎么被驱动

崩坏度 `sick ∈ [0,1]` **单调不减**，来源刻意不是"你滚到了哪儿"，而是"你消耗了它多少"：

| 来源 | 系数 | 说明 |
|---|---|---|
| 累计滚动路程 | `0.78 / 24000px` | 来回滚同样在消耗，滚回顶部不会复原 |
| 停留时长 | `0.55 / 200s` | 你站着不动，它也在坏 |

两项都**不各自封顶**，只有加权和最后统一夹到 1——谁先到顶就把另一项卡死的话，猛滚的观众会在 0.7 处停下来干等，节奏就断了。

以常人阅读式滚动（约 520 px/s）实测的推进：4s 倾斜 → 12s 重影 → 24s 离骨 → 36s 失重 → 52s 湮灭 → 约 62s 终幕。

滚动速度另外喂给一个「湍流」量：滚得越猛，晃得越厉害，松手后余震缓慢衰减。

## 六个阶段

| # | 名 | 阈值 | 发生了什么 |
|---|---|---|---|
| 0 | 完好 | 0.00 | 一个正常到无聊的商品页。文字**已经**被逐字拆成独立节点了——骨头断了，皮还完好 |
| 1 | 倾斜 | 0.13 | 整站极慢地摆动 + 眼震式漂移（慢相漂移 / 快相回跳，真实前庭眼震波形）；字符离开基线 |
| 2 | 重影 | 0.30 | RGB 色差；页面克隆出一层比本体慢半拍的残像 |
| 3 | 离骨 | 0.48 | 字符逐个挣脱布局，掉进物理场。原位留等大空洞，排版因此**不会整体塌陷**——是被掏空，不是重排 |
| 4 | 失重 | 0.68 | 零件按面积从小到大脱落：按钮 → 卡片 → 黑色横幅。重力矢量持续绕圈，**没有"下"这个方向了** |
| 5 | 湮灭 | 0.87 | 隧道张开：同心矩形以指数速度从中心涌出，永远到不了底 |
| — | 终幕 | 1.00 | 一切被吸进中心湮灭。白屏。静止。只剩 `NOTHING` |

## 结构

```
src/
  main.js            阶段调度与整站姿态
  products.js        目录数据 + 矢量鞋型（不用位图：碎裂时矢量干净得多）
  core/
    scroll.js        滚动观测（深度 / 路程 / 湍流）
    decay.js         崩坏度状态机
    shatter.js       逐字符切分
    physics.js       旋转重力场 + 鼠标斥力
    fx.js            暗角 / 隧道 / 视野呼吸 / 眼震扫描带
```

### 两个值得说的实现取舍

**碎片用文档坐标而不是视口坐标。** `#site` 上有 `transform`，它已经是 `position: fixed` 后代的包含块——顺着这一点走，碎片就能跟着整站一起倾斜，而不是浮在变形之外。代价是所有视口边界都要加 `scrollY`。

**字符和零件分开配额。** 页面有一千两百多个字符节点，不设配额的话它们会把物理预算吃光，卡片和黑色横幅永远飞不起来——而那才是最有分量的碎片。

## 可用性

- 入口页有光敏性癫痫 / 前庭疾病 / 晕动症警告
- **静态模式**：整条崩坏链路被钳死，就是一个正常可浏览的站
- 检测到系统 `prefers-reduced-motion` 时主动建议静态模式
- 刻意不做硬频闪：要让人晕，不要让人发病。视野呼吸是低频无硬边的

## 演示

评委不可能真去滚两万像素，控制台留了入口：

```js
vertigo.jump(0.8)   // 直接跳到某个崩坏度
vertigo.ramp(60)    // 60 秒内推到终幕，用于录屏
vertigo.sick        // 当前崩坏度
vertigo.stage       // 当前阶段名
vertigo.reset()
```
