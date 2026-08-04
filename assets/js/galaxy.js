/* ═══════════════════════════════════════════════════════════
   galaxy.js · v14 · 环绕式星河内容（相机在中心，星体围绕四周）
   - 真实内容 → 3D 内容对象：照片精灵 / 情话星 / 里程碑环 / 子页传送门
   - 点击 = Space3D 射线拾取 → onPick 打开内容
   - 非 explore 页面仅保留安静 3D 背景
   ═══════════════════════════════════════════════════════════ */
(function () {
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = matchMedia('(hover: none)').matches || innerWidth < 981;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

/* 数据：只引用真实内容，不虚构 */
const PHOTOS = (window.SITE && window.SITE.PHOTOS) || [];
const SENTENCES = [
  '喜欢你宝宝！', '小心机哦～特别的人～', '今年的新年祝福只给你一人～',
  '肖雨童，你愿意做我的女朋友吗～', '这是我们的第一张合影哦！',
  '不知道是谁还亲了我的脸，那一天跟梦一样～',
  '戒指不重要，重要的是戒指另一端连着的人。', '我愿意记住你的喜好，你的点点滴滴。',
  '希望你成为无忧无虑的小女孩嘻嘻～', '岁岁年年跟你在一起。',
  '我要跟你在一起很久很久很久。', '有事一定要告诉我哦，不要自己憋着。',
  '每次真的好心疼你，希望你能开心一点、轻松一点。', '我会从每个小细节做起，好好爱你。',
  '此生爱你一人足矣。'
];
const MILES = [
  { d: '2026-05-05', dt: '2026.05.05', t: '我们在一起了', x: '从「你们表演的音乐发我呗」到单膝跪地，故事从这天开始。' },
  { d: '2026-05-20', dt: '2026.05.20', t: '第一个 520', x: '把「我爱你」说出口的第二天，再一天都不算早。' },
  { d: '2026-08-11', dt: '第 99 天',    t: '99 天之约', x: '九十九天很短，余生很长，约定继续数下去。' },
  { d: '2027-04-09', dt: '2027.04.09', t: '肖雨童的生日', x: '这一天，宇宙多了一颗我最想守护的星星。' },
  { d: '2027-05-05', dt: '2027.05.05', t: '在一起一周年', x: '365 天，每一天都比前一天更确定是你。' },
  { d: '2029-01-27', dt: '第 999 天',  t: '999 天之约', x: '走到这里，我们已经是彼此的习惯与归处。' }
];
const PORTALS = [
  { href: 'story.html',   label: '我们的故事',   sub: '读我们的故事' },
  { href: 'gallery.html', label: '影像收藏',     sub: '二十六张合影' },
  { href: 'days.html',    label: '纪念日',       sub: '一起数着的日子' },
  { href: 'whisper.html', label: '悄悄话',       sub: '想对你说的话' },
  { href: 'letter.html',  label: '一封未寄出的信', sub: '余生请多指教' }
];
const LABEL = {
  photo: h => h.label ? '合影 · ' + h.label : '一张合影',
  line:  () => '一句话 · 点开听',
  mile:  h => '纪念日 · ' + (h.payload && h.payload.dt ? h.payload.dt : ''),
  portal: h => '传送门 · ' + (h.label || '进入')
};

/* 黄金角分布：把球面均匀撒开 */
function spherePos(i, total, radius, yBias) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const t = total > 1 ? i / (total - 1) : 0.5;
  const inclination = Math.acos(1 - 2 * t);   // 0~π
  const azimuth = goldenAngle * i;
  const r = radius;
  const y = r * Math.cos(inclination) + (yBias || 0);
  const horiz = r * Math.sin(inclination);
  return {
    x: horiz * Math.cos(azimuth),
    y: y,
    z: horiz * Math.sin(azimuth)
  };
}

/* 环状分布：用于传送门，围绕在赤道附近 */
function ringPos(i, total, radius, yOff, angOff) {
  const ang = (i / total) * 6.283 + (angOff || 0);
  return {
    x: Math.cos(ang) * radius,
    y: yOff + Math.sin(ang * 2) * 1.6,
    z: Math.sin(ang) * radius
  };
}

function buildContents() {
  const list = [];

  /* 照片：分布在中层球面（半径加大，避免 26 张挤成一团） */
  PHOTOS.forEach((p, i) => {
    const pos = spherePos(i, PHOTOS.length, 24, 0);
    list.push({ ...pos, kind: 'photo', type: 'photo', url: p[0], label: p[1], payload: i });
  });

  /* 情话星：稍外层球面 */
  SENTENCES.forEach((s, i) => {
    const pos = spherePos(i, SENTENCES.length, 30, 0);
    list.push({ ...pos, kind: 'line', type: 'line', payload: i });
  });

  /* 里程碑环：外层 */
  MILES.forEach((m, i) => {
    const pos = spherePos(i, MILES.length, 36, 0);
    list.push({ ...pos, kind: 'mile', type: 'mile', payload: m });
  });

  /* 子页传送门：赤道环，近一点方便点击 */
  PORTALS.forEach((pg, i) => {
    const pos = ringPos(i, PORTALS.length, 15, (i % 2 ? 2.4 : -2.4), 0.7);
    list.push({ ...pos, kind: 'portal', type: 'portal', href: pg.href, label: pg.label, sub: pg.sub });
  });

  return list;
}

let HOT = [];
let lineCv, lctx, card, cardBody, cardCap, tip;
let raf = 0;

function buildDom() {
  lineCv = document.createElement('canvas'); lineCv.id = 'gxline';
  card = document.createElement('div'); card.id = 'gxcard'; card.innerHTML =
    '<button class="x" data-cur aria-label="关闭"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<div class="gc-cap"></div><div class="gc-body"></div>';
  tip = document.createElement('div'); tip.className = 'gx-tip'; tip.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tip);
  document.body.appendChild(card);
  document.body.appendChild(lineCv);
  lctx = lineCv.getContext('2d');
  cardBody = card.querySelector('.gc-body');
  cardCap = card.querySelector('.gc-cap');
  card.querySelector('.x').addEventListener('click', closeCard);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
}

/* 关卡片 → 镜头原路退回飞入前的机位，构成“靠近—阅读—退开”的完整镜头闭环 */
function closeCard() {
  if (!card || !card.classList.contains('on')) return;
  card.classList.remove('on');
  if (window.Space3D && window.Space3D.flyBack) window.Space3D.flyBack(0.9);
}

function openHot(h) {
  if (!h) return;
  if (h.kind === 'portal') { location.href = h.href; return; }
  /* 点击星点 → 相机先“飞向那颗星”（镜头感），再开卡 */
  if (window.Space3D && window.Space3D.flyTo) window.Space3D.flyTo({ x: h.x, y: h.y, z: -h.z }, 0.9);
  if (h.kind === 'photo') { if (window.rdOpenLB) window.rdOpenLB(PHOTOS, h.payload); return; }
  if (h.kind === 'line') {
    cardCap.textContent = '一句想对你说的话';
    cardBody.textContent = SENTENCES[h.payload];
    card.classList.add('on');
  } else if (h.kind === 'mile') {
    cardCap.textContent = h.payload[0];
    cardBody.innerHTML = '<b>' + h.payload[1] + '</b><br>' + h.payload[2];
    card.classList.add('on');
  }
}

function sizeLine() {
  const d = Math.min(devicePixelRatio || 1, 2);
  lineCv.width = innerWidth * d; lineCv.height = innerHeight * d;
  lineCv.style.width = innerWidth + 'px'; lineCv.style.height = innerHeight + 'px';
  lctx.setTransform(d, 0, 0, d, 0, 0);
}

function onPick(hit) { if (hit) openHot(hit); }
function onHover(hit, x, y) {
  if (!hit) { tip.classList.remove('on'); return; }
  tip.textContent = LABEL[hit.type](hit);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
  tip.classList.add('on');
}

/* 星座连线：同型相邻且可见的星之间画发光流光线，并点缀呼吸节点（精致化增强） */
function tick() {
  raf = requestAnimationFrame(tick);
  if (!window.Space3D || !window.Space3D.toScreen) return;
  lctx.clearRect(0, 0, innerWidth, innerHeight);
  if (REDUCED) return;
  const t = performance.now() / 1000;
  const seen = [];
  for (const h of HOT) {
    const s = window.Space3D.toScreen(h.x, h.y, -h.z);
    if (s.depth > 0.22 && s.depth < 1.0 && s.clip < 1.7) seen.push({ x: s.x, y: s.y, kind: h.type, depth: s.depth });
  }
  const byKind = {};
  seen.forEach(p => { (byKind[p.kind] = byKind[p.kind] || []).push(p); });
  lctx.save();
  lctx.lineCap = 'round';
  lctx.setLineDash([3, 9]);
  lctx.lineDashOffset = -t * 14;                 // 流光沿连线流动
  Object.keys(byKind).forEach(k => {
    if (k === 'portal') return;
    const arr = byKind[k].sort((a, b) => a.depth - b.depth);
    const col = k === 'photo' ? '255,111,141' : k === 'line' ? '245,197,107' : k === 'mile' ? '157,123,255' : '255,255,255';
    lctx.shadowColor = 'rgba(' + col + ',.7)';
    lctx.shadowBlur = 7;
    lctx.strokeStyle = 'rgba(' + col + ',.20)';
    lctx.lineWidth = 1.1;
    lctx.beginPath();
    let prev = null;
    for (const p of arr) {
      if (prev && Math.hypot(prev.x - p.x, prev.y - p.y) < 175) { lctx.moveTo(prev.x, prev.y); lctx.lineTo(p.x, p.y); }
      prev = p;
    }
    lctx.stroke();
    /* 节点呼吸微光 */
    lctx.shadowBlur = 9;
    for (const p of arr) {
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + p.depth * 8);
      lctx.fillStyle = 'rgba(' + col + ',' + (0.35 + 0.4 * tw).toFixed(3) + ')';
      lctx.beginPath(); lctx.arc(p.x, p.y, 1.6 + tw, 0, 6.283); lctx.fill();
    }
  });
  lctx.restore();
}

function init() {
  if (document.body.dataset.explore !== '1') return;   // 子页：仅保留安静背景
  if (!window.Space3D) return;
  HOT = buildContents();
  buildDom();
  sizeLine();

  const panel = document.getElementById('roamPanel');
  const toggle = document.getElementById('rpToggle');
  if (panel && toggle) toggle.addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    toggle.setAttribute('aria-expanded', panel.classList.contains('collapsed') ? 'false' : 'true');
  });

  window.__HOTS = HOT;          // 只读诊断句柄：便于自动化脚本核对星体坐标/镜头几何
  window.Space3D.setContents(HOT);
  window.Space3D.setOnPick(onPick);
  window.Space3D.setOnHover(onHover);
  if (!TOUCH) window.Space3D.setRoam(true);

  addEventListener('resize', sizeLine);
  tick();
}

window.RDGalaxy = { init };
if (document.readyState === 'complete') init();
else document.addEventListener('DOMContentLoaded', init);

})();
