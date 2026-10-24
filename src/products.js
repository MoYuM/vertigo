/** 目录数据。名字全部落在 adidas 的真实产品线上，让"熟悉"这一层立得住。 */
export const PRODUCTS = [
  { name: 'SAMBA OG',        kind: '男女同款经典鞋',   price: 799,  was: null, tag: null },
  { name: 'GAZELLE INDOOR',  kind: '男女同款经典鞋',   price: 849,  was: 999,  tag: '折扣' },
  { name: 'SUPERSTAR II',    kind: '男女同款经典鞋',   price: 699,  was: null, tag: null },
  { name: 'CAMPUS 00s',      kind: '男女同款休闲鞋',   price: 899,  was: null, tag: '新品' },
  { name: 'ULTRABOOST 5',    kind: '男子跑步鞋',       price: 1499, was: 1899, tag: '折扣' },
  { name: 'STAN SMITH',      kind: '男女同款经典鞋',   price: 649,  was: null, tag: null },
  { name: 'FORUM LOW',       kind: '男女同款经典鞋',   price: 749,  was: null, tag: null },
  { name: 'ADIZERO EVO SL',  kind: '男女同款竞速跑鞋', price: 1299, was: null, tag: '新品' },
  { name: 'HANDBALL SPEZIAL',kind: '男女同款经典鞋',   price: 869,  was: null, tag: null },
  { name: 'PREDATOR 25',     kind: '男子足球鞋',       price: 1699, was: 2099, tag: '折扣' },
  { name: 'TERREX AGRAVIC',  kind: '男子越野跑鞋',     price: 1099, was: null, tag: null },
  { name: 'NMD_R1 V3',       kind: '男女同款休闲鞋',   price: 999,  was: 1299, tag: '折扣' },
];

/** 抽象鞋型剪影。不用外部图片资源：碎裂时矢量比位图干净得多。 */
function shoeSVG(seed) {
  const lift = 4 + (seed % 3) * 3;
  return `
  <svg viewBox="0 0 200 110" role="img" aria-label="产品图">
    <g fill="none" stroke="#111" stroke-width="2.4" stroke-linejoin="round">
      <path d="M12 ${80 + lift}
               C8 ${70 + lift} 11 62 20 58
               L54 43 C64 39 71 33 80 27
               L99 14 C106 9 115 10 119 17
               L129 34 C135 43 145 49 157 53
               L177 60 C188 64 192 71 189 ${80 + lift}
               Z" fill="#fff"/>
      <path d="M12 ${80 + lift} L189 ${80 + lift} L186 ${92 + lift} C185 ${97 + lift} 180 ${99 + lift} 174 ${99 + lift}
               L27 ${99 + lift} C19 ${99 + lift} 13 ${94 + lift} 12 ${88 + lift} Z" fill="#111"/>
    </g>
    <g fill="#111">
      <path d="M62 ${78 + lift} L78 41 L92 46 L74 ${78 + lift} Z"/>
      <path d="M82 ${78 + lift} L98 37 L112 43 L94 ${78 + lift} Z"/>
      <path d="M102 ${78 + lift} L118 36 L132 44 L114 ${78 + lift} Z"/>
    </g>
    <circle cx="150" cy="66" r="3.4" fill="#111"/>
  </svg>`;
}

export function renderGrid(el, items, offset = 0) {
  el.innerHTML = items
    .map((p, i) => `
      <a class="card" href="#" data-piece>
        <div class="shot">
          ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
          ${shoeSVG(i + offset)}
        </div>
        <div class="meta">
          <div class="price" data-shatter>¥ ${p.price}${p.was ? `<s>¥ ${p.was}</s>` : ''}</div>
          <div class="name" data-shatter>${p.name}</div>
          <div class="kind" data-shatter>${p.kind}</div>
        </div>
      </a>`)
    .join('');
}
