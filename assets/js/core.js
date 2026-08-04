/* ═══════════════════════════════════════════════════════════
   致下雨天 · 共享特效引擎 core.js
   Chrome injection · Backgrounds · Motion · Player · Lightbox
   零依赖 · 所有页面共用
   ═══════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ─── 全站数据 ─────────────────────────────────────────── */
const START = new Date(2026, 4, 5, 0, 0, 0);          // 2026-05-05 在一起

/* 在一起的天数 —— 全站唯一真源。
   语义：在一起那天就是「第 1 天」（和人们口头数纪念日的方式一致）。
   之前各处用 Math.floor((now-START)/864e5)，算的是「已经过了几个整天」，
   会比「第 N 天」少 1（2026-08-03 应为第 91 天，旧算法显示 90）。
   同时改为日界对齐，只比较年月日，不受当前时刻与夏令时影响。 */
function daysTogether(when) {
  const a = new Date(START.getFullYear(), START.getMonth(), START.getDate());
  const n = when ? new Date(when) : new Date();
  const b = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  return Math.round((b - a) / 864e5) + 1;
}
const PHOTOS = [
  ['assets/photos/photo01.png', '第一次对话 · 满满的小心机'],
  ['assets/photos/photo02.png', '疯狂抓拍 · 只为多聊几句'],
  ['assets/photos/photo03.jpg', '我们的第一张合影'],
  ['assets/photos/photo04.jpg', '万象城的那个夜晚'],
  ['assets/photos/photo05.jpg', '2025 平安夜'],
  ['assets/photos/photo06.jpg', '一起听歌到深夜'],
  ['assets/photos/photo07.jpg', '特别的人'],
  ['assets/photos/photo08.jpg', '漫无目的的「你好」'],
  ['assets/photos/photo09.jpg', '2026.03.27 我的生日'],
  ['assets/photos/photo10.jpg', '志愿活动 · 别吃醋了'],
  ['assets/photos/photo11.jpg', '2026.05.05 表白成功'],
  ['assets/photos/photo12.jpg', '第一次约会 · 一起拼豆'],
  ['assets/photos/photo13.jpg', '一起看的那场电影'],
  ['assets/photos/photo14.jpg', '2026.05.20 第一个 520'],
  ['assets/photos/photo15.jpg', '一起做的那对戒指'],
  ['assets/photos/photo16.jpg', '牵着手，就不怕走散'],
  ['assets/photos/photo17.jpg', '路灯下的影子，也是两个人'],
  ['assets/photos/photo18.jpg', '一起拼的黑白小猫'],
  ['assets/photos/photo19.jpg', '花丛边的悄悄话'],
  ['assets/photos/photo20.jpg', '属于我们的第一对对戒'],
  ['assets/photos/photo21.jpg', '夜色里，指环在发光'],
  ['assets/photos/photo22.jpg', '把夕阳框进手心里'],
  ['assets/photos/photo23.jpg', '每一次出发，都牵着你'],
  ['assets/photos/photo24.jpg', '公园里的背影，像一封情书'],
  ['assets/photos/photo25.jpg', '在校园的路上，一起回家'],
  ['assets/photos/photo26.jpg', '一直牵着，一直走']
];
const NAV = [
  ['01', '故事', 'story.html'],
  ['02', '影像', 'gallery.html'],
  ['03', '盲盒', 'blindbox.html'],
  ['04', '纪念', 'days.html'],
  ['05', '私语', 'whisper.html'],
  ['06', '信',   'letter.html']
];
const HEART_SVG = '<svg viewBox="0 0 32 32"><path d="M16 27C6 20 2 14.5 2 10.5A6.5 6.5 0 0 1 16 7 6.5 6.5 0 0 1 30 10.5C30 14.5 26 20 16 27Z"/></svg>';

window.SITE = { START, PHOTOS, daysTogether };   // daysTogether 供各页复用，杜绝各页各算各的

/* ─── 工具 ─────────────────────────────────────────────── */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH = matchMedia('(hover: none)').matches || innerWidth < 981;
const MOBILE = innerWidth < 760;   // 手机：整体降配，避免多画布叠加卡顿
let LITE = MOBILE || REDUCED;      // 轻量模式：移动端或「减弱动效」偏好下，跳过多余装饰画布
const PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
const FX = (document.body.dataset.fx || '').split(/\s+/).filter(Boolean);
const has = n => FX.indexOf(n) > -1;

/* ═══════════ 1. 注入全站外壳 ═══════════ */
function buildChrome() {
  const head =
    '<div class="wash"></div>' +
    '<canvas id="space"></canvas>' +
    '<canvas id="stars"></canvas>' +
    '<canvas id="meteor"></canvas>' +
    '<canvas id="sakura"></canvas>' +
    '<canvas id="rain"></canvas>' +
    '<div id="torch"></div>' +
    '<div class="grain"></div>' +
    '<div id="bar"></div>' +
    '<div id="cur"></div><div id="curDot"></div><div id="glow"></div>' +
    '<canvas id="dust"></canvas>' +
    '<div id="trans"><div class="sheet"></div><div class="mark">' + HEART_SVG + '</div></div>' +
    '<nav id="nav">' +
      '<a href="index.html" class="brand" data-cur>' +
        '<svg viewBox="0 0 32 32" fill="none"><path d="M16 27C6 20 2 14.5 2 10.5A6.5 6.5 0 0 1 16 7 6.5 6.5 0 0 1 30 10.5C30 14.5 26 20 16 27Z" stroke="currentColor" stroke-width="1.6"/></svg>' +
        '<span>Rainy Day</span></a>' +
      '<div class="nav-r"><ul id="menu">' +
        '<li><a href="index.html" data-cur' + (PAGE === 'index.html' ? ' class="on"' : '') + '><i>00</i>首页</a></li>' +
        NAV.map(n => '<li><a href="' + n[2] + '" data-cur' + (PAGE === n[2] ? ' class="on"' : '') +
          '><i>' + n[0] + '</i>' + n[1] + '</a></li>').join('') +
      '</ul>' +
      '<button class="icon-btn" id="theme" data-cur aria-label="切换主题">' +
        '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>' +
        '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg></button>' +
      '<button class="icon-btn" id="burger" data-cur aria-label="菜单">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 8h16M4 16h16"/></svg></button>' +
      '</div></nav>';
  const box = document.createElement('div');
  box.innerHTML = head;
  const anchor = document.body.firstChild;
  while (box.firstChild) document.body.insertBefore(box.firstChild, anchor);

  /* FOOTER */
  const ft = document.createElement('footer');
  ft.innerHTML =
    '<div class="fnav"><a href="index.html" data-cur>首页</a>' +
      NAV.map(n => '<a href="' + n[2] + '" data-cur>' + n[1] + '</a>').join('') + '</div>' +
    HEART_SVG.replace('<svg', '<svg fill="currentColor"') +
    '<div class="cp">Only For Us Two · 2026</div>';
  document.body.appendChild(ft);

  /* LIGHTBOX + PLAYER + TOP */
  const tail = document.createElement('div');
  tail.innerHTML =
    '<div id="beatGlow"></div>' +
    '<div id="lb">' +
      '<button class="x" data-cur><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="ar pv" data-cur>‹</button><img src="" alt="">' +
      '<button class="ar nx" data-cur>›</button>' +
      '<div class="lc"><b id="lbNo"></b><span id="lbCap"></span></div>' +
    '</div>' +
    '<div id="pl" title="背景音乐 · 点黑胶播放/暂停，⏭ 切换歌曲">' +
      '<div id="disc" data-cur><svg id="ppI" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>' +
      '<div class="pi"><div class="pt" id="pt">别怕变老</div><div class="ps" id="ps">王以太 / 艾热 · 点黑胶开始</div>' +
      '<div id="pbar" data-cur><div id="pfill"></div><div id="phandle"></div></div>' +
      '<div class="ptime"><span id="pnow">0:00</span><span id="ptot">0:00</span></div></div>' +
      '<button id="pp" data-cur title="上一首"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 5L9 12L18 19ZM6 5h2.4v14H6z"/></svg></button>' +
      '<button id="pn" data-cur title="下一首"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5l9 7-9 7zM16 5h2.4v14H16z"/></svg></button>' +
      '<div id="spec"></div>' +
      '<audio id="bgm" preload="metadata"></audio>' +
    '</div>' +
    '<button id="top" data-cur><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>';
  while (tail.firstChild) document.body.appendChild(tail.firstChild);
}

/* ═══════════ 2. 主题 ═══════════ */
/* 两套主题的关键色（与 main.css 同步），用于切换时做整体调色板补间 */
const THEME_PAL = {
  dark:  { '--bg':'#080510', '--bg-2':'#0e0a1a', '--tx':'#f2ecf6',
           '--tx-2':'rgba(242,236,246,.68)', '--tx-3':'rgba(242,236,246,.42)',
           '--line':'rgba(255,255,255,.11)', '--line-s':'rgba(255,255,255,.20)',
           '--surface':'rgba(255,255,255,.045)', '--surface-2':'rgba(255,255,255,.075)' },
  light: { '--bg':'#fdf8f6', '--bg-2':'#f6eef0', '--tx':'#2c1a26',
           '--tx-2':'rgba(44,26,38,.70)', '--tx-3':'rgba(44,26,38,.45)',
           '--line':'rgba(60,20,40,.11)', '--line-s':'rgba(60,20,40,.22)',
           '--surface':'rgba(255,255,255,.66)', '--surface-2':'rgba(255,255,255,.86)' }
};
function parseColor(c){
  if(c[0] === '#'){ const n = parseInt(c.slice(1), 16); return [n>>16&255, n>>8&255, n&255, 255]; }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if(m){ const p = m[1].split(',').map(s => parseFloat(s)); return [p[0], p[1], p[2], (p.length>3?p[3]:1)*255]; }
  return [255,255,255,255];
}
function lerpColor(a, b, t){
  const A = parseColor(a), B = parseColor(b);
  const r = Math.round(A[0]+(B[0]-A[0])*t), g = Math.round(A[1]+(B[1]-A[1])*t),
        bl = Math.round(A[2]+(B[2]-A[2])*t), al = A[3]+(B[3]-A[3])*t;
  return 'rgba(' + r + ',' + g + ',' + bl + ',' + (al/255).toFixed(3) + ')';
}
/* 切换主题：GSAP 将整组 CSS 变量从旧主题补间到新主题，调色板平滑过渡（降级时直接硬切） */
function tweenTheme(from, to){
  if(!window.gsap){ return; }
  const A = THEME_PAL[from], B = THEME_PAL[to], root = document.documentElement;
  const keys = Object.keys(A), proxy = { t: 0 };
  keys.forEach(k => root.style.setProperty(k, A[k]));     // 起点写内联，压住选择器跳变
  window.gsap.to(proxy, { t: 1, duration: 0.6, ease: 'power2.inOut',
    onUpdate(){ keys.forEach(k => root.style.setProperty(k, lerpColor(A[k], B[k], proxy.t))); },
    onComplete(){ keys.forEach(k => root.style.removeProperty(k)); }  // 交还 CSS 控制
  });
}
function initTheme() {
  const saved = localStorage.getItem('rd-theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  $('#theme').addEventListener('click', () => {
    const from = document.documentElement.dataset.theme;
    const next = from === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;            // 先切换，CSS 其余属性（过渡）即时跟上
    localStorage.setItem('rd-theme', next);
    if(!REDUCED) tweenTheme(from, next);                      // 调色板变量做平滑补间
  });
}

/* ═══════════ 3. 载入 + 页面转场 ═══════════ */
function initLoader() {
  const ld = $('#loader');
  if (!ld) { document.body.classList.remove('locked'); return; }
  const fill = $('#ldFill'), pct = $('#ldPct');
  // 只统计非懒加载（eager）图片：lazy 图在滚到视口前不会触发 load，
  // 若计入则 done 永远达不到 total → loader 卡在保险闸 → 刷新时整页长时间空白（故事页“刷新有问题”根因）
  const imgs = $$('img').filter(im => im.getAttribute('loading') !== 'lazy');
  let done = 0;
  const total = Math.max(imgs.length, 1);
  const bump = () => {
    done++;
    const p = Math.round(done / total * 100);
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = p + '%';
    if (done >= total) finish();
  };
  let ended = false;
  function finish() {
    if (ended) return; ended = true;
      setTimeout(() => {
        ld.classList.add('off');
        document.body.classList.remove('locked');
        if (!$('#enterGate')) document.body.classList.add('entered');
        document.dispatchEvent(new Event('rd:ready'));
      }, 320);
  }
  if (!imgs.length) { if (fill) fill.style.width = '100%'; if (pct) pct.textContent = '100%'; finish(); }
  imgs.forEach(im => {
    if (im.complete) bump();
    else { im.addEventListener('load', bump); im.addEventListener('error', bump); }
  });
  setTimeout(finish, 1400);           // 保险闸（缩短：避免刷新时长空白）
}

function initTransition() {
  const tr = $('#trans');
  /* 进场：若来自站内跳转，先盖住再揭开。加硬保险，避免任何情况下 cover 卡死 */
  if (sessionStorage.getItem('rd-nav') === '1') {
    sessionStorage.removeItem('rd-nav');
    tr.classList.add('cover');
    const reveal = () => {
      tr.classList.remove('cover');
      tr.classList.add('in');
      setTimeout(() => { tr.className = ''; }, 760);
    };
    requestAnimationFrame(() => requestAnimationFrame(reveal));
    setTimeout(reveal, 120);            // rAF 未触发时兜底
    setTimeout(() => { tr.className = ''; }, 1400); // 终极兜底
  }
  /* 出场 */
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || a.target === '_blank' ||
        /^(https?:|mailto:|tel:)/.test(href) || a.hasAttribute('data-lb')) return;
    e.preventDefault();
    savePlayback();
    sessionStorage.setItem('rd-nav', '1');
    tr.classList.add('out');
    setTimeout(() => { location.href = href; }, 560);
    setTimeout(() => { tr.className = ''; }, 900); // 若导航被取消,清掉 out
  });
}

/* ═══════════ 4. 光标 ═══════════ */
function initCursor() {
  if (TOUCH) return;
  const c = $('#cur'), d = $('#curDot'), g = $('#glow');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, gx = mx, gy = my;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    d.style.transform = 'translate(' + (mx - 2.5) + 'px,' + (my - 2.5) + 'px)';
  }, { passive: true });
  (function tick() {
    cx += (mx - cx) * 0.17; cy += (my - cy) * 0.17;
    gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
    c.style.transform = 'translate(' + (cx - 17) + 'px,' + (cy - 17) + 'px)';
    g.style.left = gx + 'px'; g.style.top = gy + 'px';
    requestAnimationFrame(tick);
  })();
  const grow = on => c.classList.toggle('grow', on);
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a,button,[data-cur],textarea,.gi,.pane')) grow(true);
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a,button,[data-cur],textarea,.gi,.pane')) grow(false);
  });
}

/* ═══════════ 5. 导航 / 滚动 ═══════════ */
function initScrollChrome() {
  const nav = $('#nav'), bar = $('#bar'), top = $('#top'), menu = $('#menu');
  $('#burger').addEventListener('click', () => menu.classList.toggle('open'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) menu.classList.remove('open'); });
  top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (max > 0 ? y / max * 100 : 0) + '%';
      nav.classList.toggle('sticky', y > 60);
      top.classList.toggle('on', y > 700);
      const rail = $('#railFill');
      if (rail) {
        const tl = $('.tl');
        const r = tl.getBoundingClientRect();
        const p = clamp((innerHeight * 0.55 - r.top) / r.height, 0, 1);
        rail.style.height = (p * 100) + '%';
      }
      document.dispatchEvent(new CustomEvent('rd:scroll', { detail: { y: y } }));
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ═══════════ 6. 滚动揭示 / 计数 ═══════════ */
function initReveal() {
  const io = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('on');
      if (en.target.dataset.scramble && window.rdScramble) {
        const txt = en.target.dataset.scramble;
        setTimeout(() => window.rdScramble(en.target, txt), 420);
      }
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  const mo = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) en.target.classList.add('on'); });
  }, { threshold: 0.25 });
  $$('.mo').forEach(el => mo.observe(el));

  /* 数字计数 */
  const co = new IntersectionObserver(es => {
    es.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.to || 0;
      co.unobserve(el);
      const dur = 1700, t0 = performance.now();
      (function run(t) {
        const p = clamp((t - t0) / dur, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e).toLocaleString();
        if (p < 1) requestAnimationFrame(run);
      })(t0);
    });
  }, { threshold: 0.5 });
  $$('[data-to]').forEach(el => co.observe(el));

  /* 动态注入的 .rv/.mo/[data-to]（如 days.html 横向时间线）也要被观察 */
  const dyn = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.matches && n.matches('.rv')) io.observe(n);
      if (n.matches && n.matches('.mo')) mo.observe(n);
      if (n.matches && n.matches('[data-to]')) co.observe(n);
      if (n.querySelectorAll) {
        n.querySelectorAll('.rv').forEach(el => io.observe(el));
        n.querySelectorAll('.mo').forEach(el => mo.observe(el));
        n.querySelectorAll('[data-to]').forEach(el => co.observe(el));
      }
    }));
  });
  dyn.observe(document.body, { childList: true, subtree: true });
}

/* ═══════════ 7. 3D 倾斜 / 磁吸 / 辉光 ═══════════ */
function initTilt() {
  if (TOUCH || REDUCED) return;
  $$('[data-tilt]').forEach(el => {
    const amt = +el.dataset.tilt || 7;
    let r = null;
    /* 进入时缓存一次包围盒，滚动失效；避免 mousemove 时反复 getBoundingClientRect 触发布局抖动 */
    el.addEventListener('mouseenter', () => { r = el.getBoundingClientRect(); });
    addEventListener('scroll', () => { r = null; }, { passive: true });
    el.addEventListener('mousemove', e => {
      if (!r) r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = 'perspective(1100px) rotateX(' + ((0.5 - py) * amt).toFixed(2) +
        'deg) rotateY(' + ((px - 0.5) * amt).toFixed(2) + 'deg) translateZ(6px)';
      el.style.setProperty('--mx', (px * 100) + '%');
      el.style.setProperty('--my', (py * 100) + '%');
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; r = null; });
  });
  $$('[data-mag]').forEach(el => {
    if (window.gsap) return;                 // GSAP 加载后会接管磁吸，避免重复绑定
    const move = e => {
      const r = el.getBoundingClientRect();
      el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) +
        'px,' + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px)';
    };
    const leave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    el._magFallback = { move, leave };        // 供 GSAP 接管时移除
  });
  $$('.card').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      el.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });
}

/* ═══════════ 8. 背景性能调度 ═══════════
   固定层背景始终可见，所以不能直接停；策略：
   · 首屏之外 → 降频到 ~30fps
   · 标签页隐藏 → 完全停
   · 粒子爱心属于首屏元素 → 随滚动淡出并停算            */
let lowPower = false, frameN = 0;
function skipFrame() {
  if (document.hidden) return true;
  frameN++;
  if (MOBILE && (frameN & 1)) return true;        // 移动端：保护层叠画布，整体降到 ~30fps
  return lowPower && (frameN & 1) === 1;
}
function initVisibility() {
  const upd = () => { lowPower = scrollY > innerHeight * 0.9; };
  addEventListener('scroll', upd, { passive: true });
  upd();
}


/* ═══════════ 10. 雨痕 ═══════════ */
function initRain() {
  const cv = $('#rain'); if (!cv || REDUCED) return;
  const c = cv.getContext('2d');
  let W, H, far = [], near = [], splashes = [], dpr = 1;
  let dropLight = null, dropDark = null;
  /* 预渲染液滴精灵（泪滴形 + 高光），避免逐帧 path 绘制，保证 60fps */
  function makeDrop(rgb) {
    /* rgb 传纯三元组 '205,222,255'，避免占位符字符串误入 addColorStop */
    const cs = a => 'rgba(' + rgb + ',' + a + ')';
    const Wd = 22, Hd = 48, oc = document.createElement('canvas'); oc.width = Wd; oc.height = Hd;
    const g = oc.getContext('2d');
    g.translate(Wd / 2, Hd / 2);
    const grd = g.createLinearGradient(0, -Hd / 2, 0, Hd / 2);
    grd.addColorStop(0, cs(0.18));
    grd.addColorStop(0.55, cs(0.7));
    grd.addColorStop(1, cs(0.95));
    const w = Wd * 0.40, h = Hd * 0.46;
    g.beginPath();
    g.moveTo(0, -h);
    g.bezierCurveTo(w, -h * 0.15, w, h * 0.5, 0, h);
    g.bezierCurveTo(-w, h * 0.5, -w, -h * 0.15, 0, -h);
    g.closePath();
    g.fillStyle = grd; g.fill();
    g.beginPath(); g.ellipse(-w * 0.22, h * 0.04, w * 0.20, h * 0.26, 0, 0, 6.283);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
    return oc;
  }
  function buildDrops() {
    if (dropLight && dropDark) return;
    dropLight = makeDrop('205,222,255');   // 暗场：冷白发光雨
    dropDark = makeDrop('150,120,175');    // 亮场：淡紫雨
  }
  function mk(isNear) {
    return {
      x: Math.random() * W, y: Math.random() * H,
      l: isNear ? 26 + Math.random() * 40 : 12 + Math.random() * 20,   // 液滴长度（高度）
      v: isNear ? 7.5 + Math.random() * 7 : 2.6 + Math.random() * 6.4,
      o: isNear ? 0.10 + Math.random() * 0.20 : 0.06 + Math.random() * 0.16,
      w: isNear ? 7 + Math.random() * 5 : 3 + Math.random() * 3,        // 液滴宽度
      near: isNear
    };
  }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildDrops();
    far = []; near = [];
    const nf = Math.round(W / (MOBILE ? 22 : 13)), nn = Math.round(W / (MOBILE ? 120 : 64));
    for (let i = 0; i < nf; i++) far.push(mk(false));
    for (let i = 0; i < nn; i++) near.push(mk(true));
  }
  size(); addEventListener('resize', size);
  function drawArr(arr, dark) {
    const spr = dark ? dropLight : dropDark;
    for (const d of arr) {
      const dw = d.w, dh = d.l * (0.9 + d.v * 0.04);   // 速度越快越拉长，像下落的液滴
      c.globalAlpha = d.o;
      c.drawImage(spr, d.x - dw / 2, d.y - dh / 2, dw, dh);
      d.y += d.v; d.x -= (d.near ? 0.5 : 0.14) * d.v;
      if (d.y - dh / 2 > H) {
        if (d.near && Math.random() < 0.5) splashes.push({ x: d.x, y: H - 1, r: 1, a: 0.5 });
        d.y = -dh; d.x = Math.random() * W;
      }
    }
    c.globalAlpha = 1;
  }
  (function loop() {
    requestAnimationFrame(loop);
    if (skipFrame()) return;
    c.clearRect(0, 0, W, H);
    const dark = document.documentElement.dataset.theme === 'dark';
    c.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    drawArr(far, dark);
    drawArr(near, dark);
    c.globalCompositeOperation = 'source-over';
    for (let i = splashes.length - 1; i >= 0; i--) {
      const s = splashes[i];
      s.r += 0.9; s.a -= 0.022;
      if (s.a <= 0) { splashes.splice(i, 1); continue; }
      c.strokeStyle = (dark ? 'rgba(200,215,255,' : 'rgba(150,120,170,') + s.a.toFixed(3) + ')';
      c.lineWidth = 1;
      c.beginPath(); c.ellipse(s.x, s.y, s.r, s.r * 0.34, 0, Math.PI, 0); c.stroke();
    }
  })();
}

/* ═══════════ 11. 星空 + 流星 ═══════════ */
function initStars() {
  const cv = $('#stars'); if (!cv || REDUCED) return;
  const c = cv.getContext('2d');
  let W, H, dpr = 1, stars = [], metes = [], glints = [];
  let starSprites = [], spritesBuilt = false;
  const tints = ['255,255,255', '200,220,255', '255,210,230', '220,200,255'];
  /* 预渲染星形精灵：四角星芒 / 五角星 / 钻石星，带烘焙辉光，逐帧 blit 即可（避免重复 path） */
  function buildSprites() {
    if (spritesBuilt) return; spritesBuilt = true;
    const kinds = [
      (g, S, col) => {                                   // 四角星芒 sparkle
        g.translate(S / 2, S / 2);
        const mk = a => {
          const grd = g.createLinearGradient(-S / 2 * a, 0, S / 2 * a, 0);
          grd.addColorStop(0, 'rgba(' + col + ',0)');
          grd.addColorStop(.5, 'rgba(' + col + ',.95)');
          grd.addColorStop(1, 'rgba(' + col + ',0)');
          g.strokeStyle = grd; g.lineWidth = S * 0.065; g.lineCap = 'round';
          g.beginPath(); g.moveTo(-S / 2 * a, 0); g.lineTo(S / 2 * a, 0);
          g.moveTo(0, -S / 2 * a); g.lineTo(0, S / 2 * a); g.stroke();
        };
        mk(0.48); mk(0.26);
        g.beginPath(); g.arc(0, 0, S * 0.11, 0, 6.283); g.fillStyle = 'rgba(' + col + ',1)'; g.fill();
      },
      (g, S, col) => {                                   // 五角星
        g.translate(S / 2, S / 2); g.beginPath();
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? S * 0.16 : S * 0.42;
          const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr; i ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath(); g.fillStyle = 'rgba(' + col + ',1)'; g.fill();
      },
      (g, S, col) => {                                   // 钻石星
        g.translate(S / 2, S / 2); g.beginPath();
        g.moveTo(0, -S * 0.44); g.lineTo(S * 0.18, 0); g.lineTo(0, S * 0.44); g.lineTo(-S * 0.18, 0); g.closePath();
        g.fillStyle = 'rgba(' + col + ',1)'; g.fill();
      }
    ];
    starSprites = [];
    kinds.forEach(k => tints.forEach(t => {
      const S = 40, oc = document.createElement('canvas'); oc.width = oc.height = S;
      const g = oc.getContext('2d');
      g.shadowColor = 'rgba(' + t + ',1)'; g.shadowBlur = S * 0.35; k(g, S, t);
      starSprites.push(oc);
    }));
  }
  function size() {
    dpr = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildSprites();
    stars = [];
    /* 前景层刻意稀疏：它是「点睛的有形恒星」，不是第二片星海（星海交给 WebGL 星系）。
       手机端给一个下限，避免夜空显得空荡（共享帧计数器不能拿来给多层各自降频，故星层走满帧、量可控） */
    const n = Math.min(MOBILE ? 46 : 96, Math.max(MOBILE ? 16 : 22, Math.round(W * H / (MOBILE ? 40000 : 24000))));
    for (let i = 0; i < n; i++) stars.push({
      x: Math.random() * W, y: Math.random() * H,
      ph: Math.random() * 6.28, sp: 0.4 + Math.random() * 1.6,
      spi: (Math.random() * starSprites.length) | 0,
      base: 9 + Math.random() * 16,
      dim: 0.34 + Math.random() * 0.46          // 每颗独立亮度上限，形成主次
    });
    glints = [];
    const ng = W < 700 ? 4 : 7;
    for (let i = 0; i < ng; i++) glints.push({
      x: Math.random() * W, y: Math.random() * H * 0.92,
      len: 12 + Math.random() * 18, ph: Math.random() * 6.28,
      sp: 0.6 + Math.random() * 1.2, rot: Math.random() * 6.28,
      col: tints[(Math.random() * tints.length) | 0]
    });
  }
  size(); addEventListener('resize', size);
  function meteor() {
    metes.push({ x: Math.random() * W * 0.85, y: -40, v: 9 + Math.random() * 7, len: 130 + Math.random() * 150, a: 1 });
    setTimeout(meteor, 2600 + Math.random() * 6000);
  }
  setTimeout(meteor, 1800);
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    const dark = document.documentElement.dataset.theme === 'dark';
    c.clearRect(0, 0, W, H);
    if (!dark) return;                      // 星空只在夜间
    const t = performance.now() / 1000;
    c.globalCompositeOperation = 'lighter';
    for (const s of stars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      const sz = s.base * (0.75 + 0.5 * tw);
      c.globalAlpha = tw * (0.55 + s.dim * 0.55);
      c.drawImage(starSprites[s.spi], s.x - sz / 2, s.y - sz / 2, sz, sz);
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    /* 明亮“钻石星”：十字光芒 + 微闪，增加深空细节 */
    for (const g of glints) {
      const tw = 0.55 + 0.45 * Math.sin(t * g.sp + g.ph);
      const L = g.len * (0.7 + 0.3 * tw);
      c.save();
      c.translate(g.x, g.y); c.rotate(g.rot);
      const grd = c.createLinearGradient(-L, 0, L, 0);
      grd.addColorStop(0, 'rgba(' + g.col + ',0)');
      grd.addColorStop(0.5, 'rgba(' + g.col + ',' + (0.8 * tw).toFixed(3) + ')');
      grd.addColorStop(1, 'rgba(' + g.col + ',0)');
      c.strokeStyle = grd; c.lineWidth = 1.1; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-L, 0); c.lineTo(L, 0); c.moveTo(0, -L); c.lineTo(0, L); c.stroke();
      c.restore();
      c.beginPath(); c.arc(g.x, g.y, 2.2 * tw + 0.8, 0, 6.283);
      c.fillStyle = 'rgba(' + g.col + ',' + (tw*1.15).toFixed(3) + ')'; c.fill();
    }
    for (let i = metes.length - 1; i >= 0; i--) {
      const m = metes[i];
      const g = c.createLinearGradient(m.x, m.y, m.x - m.len * 0.6, m.y - m.len);
      g.addColorStop(0, 'rgba(255,235,245,' + m.a + ')');
      g.addColorStop(1, 'rgba(255,235,245,0)');
      c.strokeStyle = g; c.lineWidth = 1.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x - m.len * 0.6, m.y - m.len); c.stroke();
      m.x += m.v * 0.6; m.y += m.v; m.a -= 0.006;
      if (m.y > H + m.len || m.a <= 0) metes.splice(i, 1);
    }
  })();
}


/* ═══════════ 13. 灯箱 ═══════════ */
function initLightbox() {
  const lb = $('#lb'); if (!lb) return;
  const im = $('img', lb), no = $('#lbNo'), cap = $('#lbCap');
  let list = [], i = 0;
  function show(n) {
    i = (n + list.length) % list.length;
    const it = list[i];
    im.src = it[0]; cap.textContent = it[1];
    no.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
  }
  /* 关灯箱：若此前是从宇宙里点星飞入的，镜头原路退回，保持镜头语言连贯 */
  function closeLB() {
    lb.classList.remove('on'); document.body.classList.remove('locked');
    if (window.Space3D && window.Space3D.flyBack) window.Space3D.flyBack(0.9);
  }
  window.rdOpenLB = function (arr, idx) {
    list = arr && arr.length ? arr : PHOTOS;
    show(idx); lb.classList.add('on'); document.body.classList.add('locked');
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-lb]');
    if (t) { e.preventDefault(); window.rdOpenLB(PHOTOS, +t.dataset.lb); return; }
    if (e.target.closest('#lb .x') || e.target === lb) { closeLB(); return; }
    if (e.target.closest('#lb .pv')) show(i - 1);
    if (e.target.closest('#lb .nx')) show(i + 1);
  });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('on')) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
}

/* ═══════════ 14. 音乐（跨页面延续） ═══════════ */
let bgm, ac, analyser, mode = null, kicked = false, specBars = [];
let seeking = false, pendingSeek = null;   // 拖动态：拖动中由 seekAt 乐观渲染接管，setProg 不抢戏
let resumeTime = 0, resumeDone = false, pendingMode = null;   // 跨页续播定位
function savePlayback() {
  if (!bgm) return;
  try {
    sessionStorage.setItem('rd-music', (mode && !bgm.paused) ? '1' : '0');
    sessionStorage.setItem('rd-time', String(bgm.currentTime || 0));
    sessionStorage.setItem('rd-track', String(trackIdx));
  } catch (err) { /* ignore */ }
}
function initMusic() {
  bgm = $('#bgm');
  const disc = $('#disc'), ppI = $('#ppI'), ps = $('#ps'), spec = $('#spec'), pt = $('#pt'), pn = $('#pn'), pp = $('#pp');
  const pbar = $('#pbar'), pfill = $('#pfill'), phandle = $('#phandle'), pnow = $('#pnow'), ptot = $('#ptot');
  window.RD_BEAT = window.RD_BEAT || { on:false, level:0, bass:0, mid:0, treble:0, beat:0 };
  if (!bgm) return;
  for (let i = 0; i < 16; i++) { const b = document.createElement('i'); spec.appendChild(b); specBars.push(b); }

  const PLAY = 'M8 5v14l11-7z', PAUSE = 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z';
  /* 歌单：新歌置顶（用户要求加入），旧曲保留为第二首 */
  const TRACKS = [
    { src: 'assets/music/our-song.m4a',  title: '特别的人', sub: '方大同' },
    { src: 'assets/music/bpbl.mp4',      title: '别怕变老', sub: '王以太 / 艾热' }
  ];
  /* 关键修复：CloudStudio 网关不支持 HTTP Range，远程 <audio> 的 seekable=[0,0]，
     导致进度条拖动时 currentTime 设不上去（拖了白拖、松手跳回 0）。
     解法：fetch 整文件 → Blob URL，浏览器对本地 Blob 媒体原生支持完整 seek，
     彻底绕开服务器 Range 限制。 */
  const blobUrls = {};
  const blobPromises = {};
  const BLOB_MIME = { m4a:'audio/mp4', mp4:'video/mp4', mp3:'audio/mpeg', ogg:'audio/ogg', webm:'audio/webm' };
  /* 每轨一个 Promise，确保「跨页续播」时 start() 能 await 到本地 Blob 再起播，
     否则会先用远程 url 播放（远程无 Range → seek 失败 → 从 0 重播，正是“换页就切了”的根因之一） */
  function fetchBlob(i) {
    if (blobUrls[i]) return Promise.resolve(blobUrls[i]);
    if (blobPromises[i]) return blobPromises[i];
    const tk = TRACKS[i];
    const ext = (tk.src.split('.').pop() || '').toLowerCase();
    blobPromises[i] = fetch(tk.src).then(r => r.arrayBuffer()).then(buf => {
      const blob = new Blob([buf], { type: BLOB_MIME[ext] || 'application/octet-stream' });
      blobUrls[i] = URL.createObjectURL(blob);
      // 若当前正播放该轨且仍用远程 url，无缝切到本地 Blob（保持播放位置，立即可拖动）
      if (i === trackIdx && bgm.src.indexOf('blob:') === -1) {
        const t = bgm.currentTime || 0, playing = !bgm.paused;
        bgm.src = blobUrls[i];
        try { bgm.currentTime = t; } catch (e) {}
        if (playing) bgm.play().catch(() => {});
      }
      return blobUrls[i];
    }).catch(() => { delete blobPromises[i]; return null; });
    return blobPromises[i];
  }
  function prefetchBlobs() { TRACKS.forEach((tk, i) => fetchBlob(i)); }
  const savedTrack = parseInt(sessionStorage.getItem('rd-track') || '0', 10);
  let trackIdx = (isNaN(savedTrack) ? 0 : ((savedTrack % TRACKS.length) + TRACKS.length) % TRACKS.length), switching = false;
  function loadTrack(i, autoplay) {
    trackIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    const tk = TRACKS[trackIdx];
    resumeTime = 0; resumeDone = false;            // 手动切歌即放弃续播定位
    bgm.src = blobUrls[trackIdx] || tk.src;        // 优先用本地 Blob（可 seek），未就绪回落远程 url
    if (pfill) { pfill.style.width = '0%'; phandle.style.left = '0%'; }
    if (pnow) pnow.textContent = '0:00';
    if (ptot) ptot.textContent = '0:00';
    if (pt) pt.textContent = tk.title;
    if (ps) ps.dataset.track = tk.sub;
    if (autoplay && !switching) {
      switching = true;
      bgm.play().then(() => { mode = 'real'; initReal(); ui(true); switching = false; })
        .catch(() => { switching = false; });
    }
  }
  loadTrack(trackIdx, false);   // 延续上次所在曲目（不自动播放）
  prefetchBlobs();              // 后台整文件拉取 → Blob URL，让进度条可拖动

  /* ── 进度条 ── */
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtT = s => { s = Math.max(0, s | 0); const m = (s / 60) | 0, x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; };
  function setProg() {
    if (seeking) return;                 // 拖动进行中：进度视觉由 seekAt 接管，避免 timeupdate 把进度条拉回
    const d = bgm.duration, t = bgm.currentTime || 0;
    const ok = isFinite(d) && d > 0;
    const r = ok ? clampN(t / d, 0, 1) : 0;
    if (pfill) { pfill.style.width = (r * 100) + '%'; if (pbar) pbar.classList.remove('live'); }
    if (phandle) phandle.style.left = (r * 100) + '%';
    if (pnow) pnow.textContent = fmtT(t);
    if (ptot) ptot.textContent = ok ? fmtT(d) : '——';
  }
  if (bgm) {
    bgm.addEventListener('timeupdate', setProg);
    bgm.addEventListener('loadedmetadata', setProg);
    bgm.addEventListener('durationchange', setProg);
    bgm.addEventListener('seeked', setProg);
    bgm.addEventListener('ended', () => { loadTrack(trackIdx + 1, true); });  // 放完自动放下一首（循环歌单）
  }
  if (pbar) {
    /* 拖动时立即更新视觉（乐观反馈），即使媒体尚未可定位也不会“看起来没反应” */
    const render = ratio => {
      if (pfill) pfill.style.width = (ratio * 100) + '%';
      if (phandle) phandle.style.left = (ratio * 100) + '%';
      if (pnow) pnow.textContent = fmtT(ratio * (isFinite(bgm.duration) && bgm.duration > 0 ? bgm.duration : 0));
    };
    const seekAt = cx => {
      const r = pbar.getBoundingClientRect();
      if (!r.width) return;
      const ratio = clampN((cx - r.left) / r.width, 0, 1);
      render(ratio);
      /* 媒体还没可定位（如刚进页面、元数据未就绪）：记录目标比例，等 canplay 后再真实 seek */
      if (!(isFinite(bgm.duration) && bgm.duration > 0)) { pendingSeek = ratio; return; }
      try { bgm.currentTime = ratio * bgm.duration; pendingSeek = null; } catch (e) {}
    };
    const applyPending = () => {
      if (pendingSeek == null) return;
      if (isFinite(bgm.duration) && bgm.duration > 0) {
        try { bgm.currentTime = pendingSeek * bgm.duration; } catch (e) {}
        if (!seeking) pendingSeek = null;
      }
    };
    bgm.addEventListener('loadedmetadata', applyPending);
    bgm.addEventListener('canplay', applyPending);
    pbar.addEventListener('pointerdown', e => {
      seeking = true; pendingSeek = null; pbar.classList.add('seeking');
      try { pbar.setPointerCapture(e.pointerId); } catch (_) {}
      prefetchBlobs();   // 确保尽快切到本地 Blob，拖动可真正 seek
      if (!(isFinite(bgm.duration) && bgm.duration > 0)) { try { bgm.load(); } catch (_) {} }  // 触发元数据加载，便于立即可拖
      seekAt(e.clientX);
    });
    pbar.addEventListener('pointermove', e => { if (seeking) seekAt(e.clientX); });
    const endSeek = () => {
      if (seeking && pendingSeek != null && isFinite(bgm.duration) && bgm.duration > 0) {
        try { bgm.currentTime = pendingSeek * bgm.duration; } catch (e) {}
      }
      pendingSeek = null; seeking = false; pbar.classList.remove('seeking');
    };
    pbar.addEventListener('pointerup', endSeek);
    pbar.addEventListener('pointercancel', endSeek);
    pbar.addEventListener('click', e => { e.stopPropagation(); });
  }
  function ui(on) {
    disc.classList.toggle('spin', on);
    $('path', ppI).setAttribute('d', on ? PAUSE : PLAY);
    const tk = TRACKS[trackIdx];
    ps.textContent = on ? ('♪ ' + tk.title) : '已暂停';
  }

  /* —— 真实歌曲 —— */
  let src = null;
  function initReal() {
    if (src) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      analyser = ac.createAnalyser(); analyser.fftSize = 256;
      src = ac.createMediaElementSource(bgm);
      src.connect(analyser); analyser.connect(ac.destination);
    } catch (err) { analyser = null; }
  }

  /* 跨页续播：媒体可定位后再设置 currentTime（preload=none 时不能立即 seek） */
  function applyResume() {
    if (resumeDone || mode !== 'real') return;
    if (resumeTime > 0 && isFinite(bgm.duration) && bgm.duration > 0) {
      try { bgm.currentTime = Math.min(resumeTime, bgm.duration - 0.05); resumeDone = true; setProg(); }
      catch (e) { /* 暂不可定位，等待下次事件 */ }
    }
  }
  bgm.addEventListener('loadedmetadata', applyResume);
  bgm.addEventListener('canplay', applyResume);
  bgm.addEventListener('canplaythrough', applyResume);

  function start() {
    if (kicked) return; kicked = true;
    resumeTime = parseFloat(sessionStorage.getItem('rd-time') || '0');
    resumeDone = false;
    const begin = () => bgm.play().then(() => {
      mode = 'real'; initReal();
      if (ac && ac.state === 'suspended') ac.resume();
      ui(true);
      applyResume();
    }).catch(() => { kicked = false; pendingMode = 'real'; });   // 自动播放被拦截：保留真实歌曲意图，等用户手势再续播
    // 关键：必须先拿到本地 Blob（可 seek）再起播，否则远程 url 无 Range → seek 失败 → 从 0 重播
    if (blobUrls[trackIdx]) { bgm.src = blobUrls[trackIdx]; begin(); }
    else { pendingMode = 'real'; fetchBlob(trackIdx).then(u => { if (u && pendingMode === 'real') { bgm.src = u; begin(); } }); }
  }
  function toggle() {
    if (mode === 'real') { if (bgm.paused) { bgm.play(); ui(true); } else { bgm.pause(); ui(false); } return; }
    kicked = false; start();
  }
  disc.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  if (pp) pp.addEventListener('click', e => { e.stopPropagation(); loadTrack(trackIdx - 1, true); });
  if (pn) pn.addEventListener('click', e => { e.stopPropagation(); loadTrack(trackIdx + 1, true); });

  /* 首次交互自动起播 / 跨页续播 */
  const wants = sessionStorage.getItem('rd-music') === '1';
  function gesture() {
    if (ac && ac.state === 'suspended') ac.resume();
    if (mode === 'real' || !mode) { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); initReal(); } catch (e) {} }
    if (mode === 'real' && bgm.paused) bgm.play().catch(function () {});
    if (!mode) {
      if (pendingMode === 'real') start();
      else { kicked = false; start(); }
    }
    if (mode) {
      document.removeEventListener('click', gesture);
      document.removeEventListener('keydown', gesture);
      document.removeEventListener('touchstart', gesture);
    }
  }
  document.addEventListener('click', gesture);
  document.addEventListener('keydown', gesture);
  document.addEventListener('touchstart', gesture);
  if (wants) start();     // 跨页续播：先试，被拦截则等首次交互
  addEventListener('beforeunload', savePlayback);
  addEventListener('pagehide', savePlayback);

  /* 频谱 + 音频律动（驱动雨滴 / 星河 / 黑胶辉光 / 背景脉冲） */
  let buf = null, beatSmooth = 0;
  const beatGlow = document.getElementById('beatGlow');
  (function draw() {
    requestAnimationFrame(draw);
    if (document.hidden) return;
    const on = (mode === 'real' && !bgm.paused);
    if (!on) {
      specBars.forEach(b => b.style.height = '2px');
      window.RD_BEAT = { on:false, level:0, bass:0, mid:0, treble:0, beat:0 };
      if (disc) disc.style.boxShadow = '';
      if (ppI) ppI.style.transform = '';
      if (beatGlow) beatGlow.style.opacity = '0';
      if (pbar) pbar.classList.remove('live');
      return;
    }
    let level = 0, bass = 0, mid = 0, treble = 0;
    if (analyser) {
      if (!buf || buf.length !== analyser.frequencyBinCount) buf = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(buf);
      const n = buf.length, midEnd = Math.floor(n * 0.4);
      let all = 0;
      for (let i = 0; i < n; i++) {
        const v = buf[i]; all += v;
        if (i < 6) bass += v;
        else if (i < midEnd) mid += v;
        else treble += v;
      }
      bass   /= 6;
      mid    /= Math.max(1, midEnd - 6);
      treble /= Math.max(1, n - midEnd);
      level   = all / n;
      const bn = bass / 255;
      beatSmooth += (bn - beatSmooth) * 0.18;
      const beat = Math.max(0, bn - beatSmooth) * 3.2;
      window.RD_BEAT = { on:true, level: level / 255, bass: bn, mid: mid / 255, treble: treble / 255, beat: Math.min(1, beat) };
      for (let i = 0; i < specBars.length; i++) {
        const idx = 1 + Math.floor(i / specBars.length * midEnd);
        const v = buf[idx] || 0;
        specBars[i].style.height = Math.max(2, v / 255 * 22) + 'px';
      }
      // 黑胶：随低频脉动发光 + 图标缩放
      if (disc) disc.style.boxShadow = '0 0 ' + (6 + bn * 26).toFixed(1) + 'px rgba(255,111,141,' + (0.28 + bn * 0.6).toFixed(2) + ')';
      if (ppI) ppI.style.transform = 'scale(' + (1 + bn * 0.16).toFixed(3) + ')';
      if (beatGlow) {
        beatGlow.style.opacity = (bn * 0.55).toFixed(3);
        beatGlow.style.transform = 'translate(-50%,-50%) scale(' + (1 + bn * 0.07).toFixed(3) + ')';
      }
    } else {
      specBars.forEach(b => { b.style.height = '2px'; });
      window.RD_BEAT = { on:false, level:0, bass:0, mid:0, treble:0, beat:0 };
    }
  })();
}

/* ═══════════ 15. 通用小特效 ═══════════ */
/* 爱心/星点爆发 */
window.rdSpark = function (x, y, n, colors) {
  n = n || 26;
  colors = colors || ['#ff6f8d', '#f5c56b', '#9d7bff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const c = colors[(Math.random() * colors.length) | 0];
    const sz = 5 + Math.random() * 8;
    s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz +
      'px;background:' + c + ';box-shadow:0 0 12px ' + c;
    document.body.appendChild(s);
    const a = Math.random() * 6.283, d = 60 + Math.random() * 190;
    s.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: 'translate(' + (Math.cos(a) * d - 50) + '%,' + (Math.sin(a) * d + 40) + '%) scale(0)', opacity: 0 }
    ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.16,1,.3,1)' })
      .onfinish = () => s.remove();
  }
};
/* 花瓣雨 */
window.rdPetals = function (n) {
  n = n || 44;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    const sz = 8 + Math.random() * 12;
    p.style.cssText = 'left:' + (Math.random() * 100) + 'vw;top:-40px;width:' + sz + 'px;height:' + (sz * 0.8) +
      'px;background:linear-gradient(135deg,#ff9db3,#ff6f8d);border-radius:50% 0 50% 50%;opacity:.9';
    document.body.appendChild(p);
    p.animate([
      { transform: 'translateY(0) rotate(0deg)', opacity: .95 },
      { transform: 'translateY(' + (innerHeight + 120) + 'px) translateX(' + (Math.random() * 260 - 130) + 'px) rotate(' + (Math.random() * 900 - 450) + 'deg)', opacity: 0 }
    ], { duration: 3800 + Math.random() * 3200, delay: Math.random() * 1400, easing: 'linear' })
      .onfinish = () => p.remove();
  }
};
/* 逐字拆分 */
window.rdSplit = function (el) {
  if (!el || el.dataset.done) return;
  el.dataset.done = '1';
  const txt = el.textContent;
  el.textContent = '';
  txt.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ch'; s.textContent = ch === ' ' ? '\u00a0' : ch;
    s.style.transitionDelay = (i * 0.085) + 's';
    el.appendChild(s);
  });
};
/* 打字机 */
window.rdType = function (el, text, speed, done) {
  let i = 0;
  (function step() {
    if (i <= text.length) {
      el.textContent = text.slice(0, i++);
      setTimeout(step, text.charAt(i - 1) === '\n' ? 260 : (speed || 62));
    } else if (done) done();
  })();
};
/* 恋爱计时 */
window.rdClock = function (map) {
  function tick() {
    const d = Date.now() - START.getTime();
    const days = daysTogether();
    if (map.d) map.d.textContent = days;
    if (map.h) map.h.textContent = String(Math.floor(d / 36e5) % 24).padStart(2, '0');
    if (map.m) map.m.textContent = String(Math.floor(d / 6e4) % 60).padStart(2, '0');
    if (map.s) map.s.textContent = String(Math.floor(d / 1e3) % 60).padStart(2, '0');
  }
  tick(); setInterval(tick, 1000);
  return daysTogether();
};

/* 文字解码 / 打乱 */
window.rdScramble = function (el, text, duration) {
  if (!el || el.dataset.scrambled) return;
  el.dataset.scrambled = '1';
  const chars = '下雨天肖雨童我爱你1314520';
  const len = text.length;
  const dur = duration || 1200;
  const start = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - start) / dur);
    const reveal = Math.floor(p * len);
    let out = text.slice(0, reveal);
    for (let i = reveal; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
    el.textContent = out;
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
};

/* 鼠标轨迹爱心 */
function initTrail() {
  if (matchMedia('(pointer: coarse)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ff6f8d', '#ff9db3', '#f5c56b', '#9d7bff', '#ffffff'];
  let last = 0, cx = 0, cy = 0;
  function spawn(x, y) {
    const h = document.createElement('div');
    h.className = 'trail-heart';
    h.innerHTML = HEART_SVG;
    const c = colors[(Math.random() * colors.length) | 0];
    const sz = 10 + Math.random() * 16;
    h.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;--th:' + c;
    document.body.appendChild(h);
    h.animate([
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: .9 },
      { transform: 'translate(' + (Math.random() * 60 - 30) + 'px,' + (-90 - Math.random() * 80) + 'px) scale(.2) rotate(' + (Math.random() * 60 - 30) + 'deg)', opacity: 0 }
    ], { duration: 900 + Math.random() * 600, easing: 'cubic-bezier(.16,1,.3,1)' }).onfinish = () => h.remove();
  }
  document.addEventListener('mousemove', e => {
    const now = performance.now();
    if (now - last < 45) return;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    if (dx * dx + dy * dy < 900) return;
    last = now; cx = e.clientX; cy = e.clientY;
    spawn(cx, cy);
  });
  document.addEventListener('click', e => { spawn(e.clientX, e.clientY); });
}

/* ═══════════ 滚动推进宇宙（#83）：页面滚动 → 相机随之前行，像在星河中穿行 ═══════════ */
function initScrollCosmos() {
  const cb = () => {
    if(!window.Space3D || !window.Space3D.setScrollTravel) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    window.Space3D.setScrollTravel(p);
  };
  addEventListener('scroll', cb, { passive: true });
  cb();
}

/* ═══════════ 光标星尘（#87）：跟随光标的细微星点，悬停交互元素时向心汇聚 ═══════════ */
function initStardust() {
  if(TOUCH || REDUCED) return;
  const cv = document.getElementById('dust'); if(!cv) return;
  const c = cv.getContext('2d');
  let W, H, dpr;
  function size(){ dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    cv.width = W*dpr; cv.height = H*dpr; cv.style.width = W+'px'; cv.style.height = H+'px'; c.setTransform(dpr,0,0,dpr,0,0); }
  size(); addEventListener('resize', size);
  const parts = [], COLS = ['255,111,141','245,197,107','157,123,255','255,255,255'];
  let mx = innerWidth/2, my = innerHeight/2, hovering = false;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if(Math.random() < 0.55){
      parts.push({ x: mx, y: my, vx: (Math.random()-0.5)*0.7, vy: (Math.random()-0.5)*0.7,
        life: 1, r: Math.random()*1.9+0.6, col: COLS[(Math.random()*COLS.length)|0] });
    }
  }, { passive: true });
  document.addEventListener('mouseover', e => { hovering = !!(e.target.closest && e.target.closest('a,button,[data-cur],.gi,.pane,.dc')); });
  document.addEventListener('mouseout',  e => { if(e.target.closest && e.target.closest('a,button,[data-cur],.gi,.pane,.dc')) hovering = false; });
  (function loop(){
    requestAnimationFrame(loop);
    if(document.hidden) return;
    c.clearRect(0, 0, W, H);
    for(let i = parts.length-1; i >= 0; i--){
      const p = parts[i];
      if(hovering){ p.vx += (mx - p.x)*0.014; p.vy += (my - p.y)*0.014; }  // 向光标（心）汇聚
      p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life -= 0.018;
      if(p.life <= 0){ parts.splice(i, 1); continue; }
      c.globalAlpha = p.life * 0.9;
      c.fillStyle = 'rgba(' + p.col + ',1)';
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
    }
    c.globalAlpha = 1;
    if(parts.length > 150) parts.splice(0, parts.length - 150);   // 性能上限
  })();
}

/* ═══════════ 标题双击心跳爆发 + 相伴天数进度环（#89） ═══════════ */
function initTitleBurst() {
  const d = document.getElementById('tD');
  if(d && !d.closest('.tring')){
    const NS = 'http://www.w3.org/2000/svg';
    const wrap = document.createElement('span'); wrap.className = 'tring';
    d.parentNode.insertBefore(wrap, d); wrap.appendChild(d);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 44 44'); svg.setAttribute('class', 'tring-svg');
    svg.innerHTML = '<circle class="trk" cx="22" cy="22" r="19"></circle><circle class="val" cx="22" cy="22" r="19"></circle>';
    wrap.insertBefore(svg, d);
    const C = 2 * Math.PI * 19, val = svg.querySelector('.val');
    val.style.strokeDasharray = C; val.style.strokeDashoffset = C;
    const days = daysTogether();
    requestAnimationFrame(() => { val.style.strokeDashoffset = C * (1 - Math.min(1, days/365)); });
  }
  const t = document.getElementById('hTitle'); if(!t) return;
  t.style.cursor = 'pointer';
  t.addEventListener('dblclick', () => {
    const r = t.getBoundingClientRect();
    if(window.rdSpark) window.rdSpark(r.left + r.width/2, r.top + r.height/2, 42);
    if(window.rdPetals) window.rdPetals(26);
    if(window.Space3D && window.Space3D.pulse) window.Space3D.pulse();
    const ring = document.querySelector('.tring-svg .val');
    if(ring){
      const C = 2 * Math.PI * 19;
      ring.style.transition = 'stroke-dashoffset .9s var(--ease)';
      ring.style.strokeDashoffset = '0';
      setTimeout(() => { const days = daysTogether();
        ring.style.strokeDashoffset = C * (1 - Math.min(1, days/365)); }, 1050);
    }
  });
}

/* ═══════════ 横向里程碑时间线（#88）：GSAP 钉住 + 横向滚动；降级为原生横向滚动 ═══════════ */
function initTimeline() {
  const sec = document.querySelector('[data-timeline]'); if(!sec || sec.dataset.tl) return;
  const track = sec.querySelector('.hz-track'); if(!track) return;
  if(TOUCH || REDUCED || !window.gsap || !window.ScrollTrigger){ sec.style.overflowX = 'auto'; sec.dataset.tl = '1'; return; }
  /* ⚠ 轨道内容由页面底部的 inline 脚本异步填充，而 bootDom 的 DOMContentLoaded 监听器
     注册更早、先执行 —— 此刻 track 往往还是空的（scrollWidth=0）。若在这里直接判定
     「一屏放得下」并写死 data-tl，钉住就永久失效了。所以内容未就绪时挂观察器等它填充，
     绝不提前落锁。 */
  if(!track.children.length){
    if(sec.dataset.tlWait) return; sec.dataset.tlWait = '1';
    const mo = new MutationObserver(() => {
      if(!track.children.length) return;
      mo.disconnect(); delete sec.dataset.tlWait;
      requestAnimationFrame(() => requestAnimationFrame(initTimeline));  // 等布局稳定再量宽度
    });
    mo.observe(track, { childList: true });
    setTimeout(() => { mo.disconnect(); delete sec.dataset.tlWait; if(track.children.length) initTimeline(); }, 3000);
    return;
  }
  if(track.scrollWidth <= sec.clientWidth + 4){ sec.dataset.tl = '1'; return; }   // 一屏放得下就不钉
  try {
    sec.classList.add('pinned');
    const dist = () => Math.max(0, track.scrollWidth - sec.clientWidth);
    window.gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(),
        pin: true, scrub: true, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    sec.dataset.tl = '1';
  } catch (e) { sec.style.overflowX = 'auto'; sec.classList.remove('pinned'); sec.dataset.tl = '1'; }
}

/* ═══════════ BOOT ═══════════ */
buildChrome();
initTheme();
initTransition();
initCursor();
initScrollChrome();
initVisibility();
/* 性能门控：移动端 / 减弱动效偏好下，跳过多余装饰画布，只保留招牌雨幕 + 夜间恒星，
   大幅减少常驻 rAF 循环数量——这是「所有页面都卡」的首要原因（多画布叠加 + 子页常驻 WebGL）。 */
initSpace();            // 子页现已跳过 WebGL；仅首页/影像页渲染实时宇宙
initStars();            // 前景「有形恒星」层（轻量，仅夜间）
if(!LITE){
  initMeteor();         // 流星划过深空（粉金尾迹）
  initSakura();         // 漫天樱花，飘落在星河之上
}
initRain();             // 「致下雨天」招牌雨幕（呼应主题，始终保留）
initLightbox();
initMusic();

let booted = false;
/* ═══════════ 9. GSAP 高级动效层（优雅降级）═══
   站点零依赖，GSAP 通过 CDN 动态注入；若网络不可用，
   下方所有效果静默跳过，站点保持原有行为，绝不报错。 */
function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = res; s.onerror = () => rej(new Error('load ' + src));
    document.head.appendChild(s);
  });
}
let gsapTried = false, heroResolved = false;
function initGsap() {
  /* GSAP 已随页面 <script defer> 本地预载（assets/vendor/），到这里通常已就位 →
     同步注册立即生效。此前走 jsdelivr CDN 需数秒才到，期间时间线钉住、标题逐字、
     章节 scrub 等全部效果都还没接管，用户看到的就是「改动没生效 / 不精致」。 */
  if (window.gsap && window.ScrollTrigger) {
    try { gsap.registerPlugin(ScrollTrigger); } catch (e) {}
    applyGsap();
    return;
  }
  if (gsapTried) return; gsapTried = true;
  /* 兜底：本地文件缺失时再回退 CDN（保持零依赖站点的容错性） */
  const base = 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/';
  Promise.all([loadScript(base + 'gsap.min.js'), loadScript(base + 'ScrollTrigger.min.js')])
    .then(() => {
      if (window.gsap && window.ScrollTrigger) { gsap.registerPlugin(ScrollTrigger); applyGsap(); }
    })
    .catch(() => { revealHeroFallback(); });
  setTimeout(revealHeroFallback, 4000);
}
/* 首页标题拆字（同步，避免 GSAP 加载前闪烁）*/
function initHeroTitle() {
  const t = document.getElementById('hTitle');
  if (!t || t.dataset.split) return;
  if (REDUCED || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const txt = t.textContent;
  t.textContent = '';
  t.setAttribute('aria-label', txt);
  const frag = document.createDocumentFragment();
  [...txt].forEach(ch => {
    const s = document.createElement('span');
    s.className = 'ch'; s.textContent = ch; s.setAttribute('aria-hidden', 'true');
    s.style.opacity = '0'; s.style.transform = 'translateY(120%) rotate(8deg)';  // 先隐，GSAP 接管后浮现
    frag.appendChild(s);
  });
  t.appendChild(frag); t.dataset.split = '1';
}
function revealHeroFallback() {
  if (heroResolved) return; heroResolved = true;
  $$('.h-title .ch').forEach(c => { c.style.opacity = 1; c.style.transform = 'none'; });
}
/* GSAP 就位后应用动效 */
function applyGsap() {
  if (!window.gsap) return;
  const reduce = REDUCED || matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ① 首页入场门标题：逐字弹性浮现（back.out + 轻微旋转）*/
  const title = document.getElementById('hTitle');
  if (title && title.dataset.split) {
    heroResolved = true;                       // GSAP 已接管，4s 兜底不再干预
    if (reduce) {
      gsap.set('.h-title .ch', { autoAlpha: 1, yPercent: 0, rotateZ: 0 });
    } else {
      gsap.set('.h-title .ch', { yPercent: 120, autoAlpha: 0, rotateZ: 8 });
      gsap.to('.h-title .ch', {
        yPercent: 0, autoAlpha: 1, rotateZ: 0,
        duration: 0.95, ease: 'back.out(1.7)', stagger: 0.09, delay: 0.35
      });
    }
  }

  /* ② 磁吸按钮升级为 GSAP 弹性跟随（移除可能的兜底监听）*/
  upgradeMagneticGsap();

  /* ③ 滚动视差：带 data-parallax 的元素随滚动缓缓位移，增加纵深 */
  if (!reduce && window.ScrollTrigger) {
    gsap.utils.toArray('[data-parallax]').forEach(el => {
      const amt = parseFloat(el.dataset.parallax) || 36;
      gsap.to(el, {
        yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ③b 板块 scrub 淡入：标题区的幽灵序号与标题随滚动差速浮现（作用在被 .rv 包裹之外
       的子元素上，不与父级 .rv 的 transform 冲突） */
    gsap.utils.toArray('.sh').forEach(el => {
      const idx = el.querySelector('.idx');
      const head = [el.querySelector('h2'), el.querySelector('p')].filter(Boolean);
      if(idx) gsap.fromTo(idx, { yPercent: 34, opacity: 0.18 },
        { yPercent: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 48%', scrub: true } });
      if(head.length) gsap.fromTo(head, { y: 28, opacity: 0.32 },
        { y: 0, opacity: 1, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 50%', scrub: true } });
    });
    initTimeline();   // GSAP 就位后把横向时间线钉住横向滚动
  }
}
function upgradeMagneticGsap() {
  $$('[data-mag]').forEach(el => {
    if (el._magFallback) {
      el.removeEventListener('mousemove', el._magFallback.move);
      el.removeEventListener('mouseleave', el._magFallback.leave);
      el._magFallback = null;
    }
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.35);
      yTo((e.clientY - r.top - r.height / 2) * 0.5);
    });
    el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });
}

function bootDom() {
  if (booted) return; booted = true;
  initReveal();
  initTilt();
  initLoader();
  initHeroTitle();
  initGsap();
  initTitleBurst();
  bindEnterGate();
  /* 下列装饰画布较重：仅在非轻量模式（桌面 + 未要求减弱动效）下启用，
     移动端 / 减弱动效偏好下跳过，进一步压低卡顿。 */
  if (LITE) return;
  initTrail();
  initDepth();
  initTorch();
  initScrollCosmos();
  initStardust();
}

/* ═══════════ SPACE：3D 宇宙接入 ═══════════ */
function initSpace() {
  if (window.Space3D) window.Space3D.init({ heart: has('heart'), hue: +(document.body.dataset.hue || 0) });
}

/* ═══════════ 入场门：标题 + 唯一按钮 → 飞入宇宙 ═══════════ */
function bindEnterGate() {
  const btn = document.getElementById('enterUniverse');
  if (!btn) return;                       // 仅首页有此门
  btn.addEventListener('click', () => {
    document.body.classList.add('entered');
    if (window.Space3D && window.Space3D.enter) window.Space3D.enter();
    if (window.rdBurst) window.rdBurst();   // 一点星火点缀
  });
}

/* ═══════════ 流星层（2D 叠加，落在 #space 之上、内容之下） ═══════════ */
function initMeteor() {
  const cv = document.getElementById('meteor'); if (!cv || REDUCED || MOBILE) return;
  const c = cv.getContext('2d');
  let W, H, dpr;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener('resize', size);
  const dark = () => document.documentElement.dataset.theme !== 'light';
  const list = [];
  function spawn() {
    const fromL = Math.random() < 0.5;
    const x = fromL ? -40 : W * (0.2 + Math.random() * 0.8);
    const y = Math.random() * H * 0.5;
    const dir = fromL ? 1 : -1;
    list.push({ x, y, vx: dir * (7 + Math.random() * 6), vy: 4 + Math.random() * 4, len: 120 + Math.random() * 160, a: 0, life: 1 });
    setTimeout(spawn, 2600 + Math.random() * 5200);
  }
  setTimeout(spawn, 1400);
  (function loop() {
    requestAnimationFrame(loop);
    if (document.hidden || !dark()) { c.clearRect(0, 0, W, H); return; }
    c.clearRect(0, 0, W, H);
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      m.a += (1 - m.a) * 0.06;                 // 渐显
      m.x += m.vx; m.y += m.vy; m.life -= 0.004;
      const tx = m.x - m.vx / Math.hypot(m.vx, m.vy) * m.len;
      const ty = m.y - m.vy / Math.hypot(m.vx, m.vy) * m.len;
      const A = m.a * m.life;
      /* 粉→金渐变尾迹：头部亮白粉，中段蜜金，尾端消散 */
      const g = c.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, 'rgba(255,238,246,' + A + ')');
      g.addColorStop(0.35, 'rgba(255,160,190,' + (A * 0.7) + ')');
      g.addColorStop(0.75, 'rgba(245,197,107,' + (A * 0.3) + ')');
      g.addColorStop(1, 'rgba(245,197,107,0)');
      c.strokeStyle = g; c.lineWidth = 1.8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(tx, ty); c.stroke();
      /* 头部辉光 */
      const hg = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, 7);
      hg.addColorStop(0, 'rgba(255,244,250,' + (A * 0.9) + ')');
      hg.addColorStop(1, 'rgba(255,180,205,0)');
      c.fillStyle = hg;
      c.beginPath(); c.arc(m.x, m.y, 7, 0, 6.283); c.fill();
      if (m.life <= 0 || m.x < -200 || m.x > W + 200 || m.y > H + 200) list.splice(i, 1);
    }
  })();
}

/* ═══════════ 漫天樱花：2D 花瓣层（贝塞尔花瓣形 · 三轴翻转飘落） ═══════════ */
function initSakura() {
  const cv = document.getElementById('sakura'); if (!cv || REDUCED || MOBILE) return;
  const c = cv.getContext('2d');
  let W, H, dpr;
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 1.6);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size(); addEventListener('resize', size);

  const N = innerWidth < 760 ? 14 : 26;
  const petals = [];
  function reset(p, top) {
    p.x = Math.random() * W;
    p.y = top ? -20 : Math.random() * H;
    p.s = 4 + Math.random() * 6;               // 尺寸
    p.vy = 0.35 + Math.random() * 0.7;         // 下落速度
    p.sway = 0.6 + Math.random() * 1.4;        // 横向摆幅
    p.ph = Math.random() * 6.283;              // 摆动相位
    p.rot = Math.random() * 6.283;             // 平面旋转
    p.vr = (Math.random() - 0.5) * 0.02;
    p.flip = Math.random() * 6.283;            // 翻转相位（模拟 3D 侧转）
    p.vf = 0.008 + Math.random() * 0.02;
    p.hue = Math.random();                     // 0=粉白 1=偏粉
    p.a = 0.35 + Math.random() * 0.4;
  }
  for (let i = 0; i < N; i++) { const p = {}; reset(p, false); petals.push(p); }

  /* 单瓣：两段贝塞尔勾出樱瓣（顶端小凹口） */
  function petal(p, t) {
    const flip = Math.abs(Math.cos(p.flip));   // 侧转 → 宽度压缩
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot + Math.sin(p.ph) * 0.3);
    c.scale(1, 0.28 + 0.72 * flip);
    const s = p.s;
    const g = c.createRadialGradient(0, -s * 0.2, 0, 0, 0, s * 1.3);
    if (p.hue < 0.5) { g.addColorStop(0, 'rgba(255,238,245,' + p.a + ')'); g.addColorStop(1, 'rgba(255,182,203,' + (p.a * 0.55) + ')'); }
    else { g.addColorStop(0, 'rgba(255,214,228,' + p.a + ')'); g.addColorStop(1, 'rgba(255,150,180,' + (p.a * 0.5) + ')'); }
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, -s);                                        // 顶端
    c.bezierCurveTo(s * 0.9, -s * 0.7, s * 0.85, s * 0.55, 0, s);   // 右缘
    c.bezierCurveTo(-s * 0.85, s * 0.55, -s * 0.9, -s * 0.7, 0, -s); // 左缘
    // 顶端小凹口
    c.moveTo(0, -s);
    c.quadraticCurveTo(0, -s * 0.72, s * 0.16, -s * 0.86);
    c.fill();
    c.restore();
  }

  let last = 0;
  (function loop(ts) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    if (ts - last < 24) return;                // ~40fps 足够柔美，省电
    last = ts;
    c.clearRect(0, 0, W, H);
    const t = ts / 1000;
    for (const p of petals) {
      p.ph += 0.012 * p.sway;
      p.x += Math.sin(p.ph) * p.sway * 0.6 + 0.18;   // 微风向右
      p.y += p.vy;
      p.rot += p.vr;
      p.flip += p.vf;
      petal(p, t);
      if (p.y > H + 24 || p.x > W + 40) reset(p, true);
    }
  })(0);
}

/* ═══════════ 内容景深：让页面漂浮在 3D 空间里 ═══════════ */
function initDepth() {
  if (TOUCH || REDUCED) return;
  /* 安静内容页（故事/纪念/私语/信）不做全局景深视差——关掉可省掉一整个常驻 rAF 循环，
     故事页滚动立省一份合成开销（用户反馈“一直卡”的根因之一） */
  if (document.body.dataset.explore !== '1' && document.body.dataset.gallery !== '1') return;
  let els = $$('main > *');
  if (!els.length) els = $$('body > section, body > div');
  if (els.length < 2) return;
  /* 跳过含 fixed/sticky 子元素的块，避免破坏悬浮导航 */
  els = els.filter(el => {
    if (/fixed|sticky/.test(getComputedStyle(el).position)) return false;
    const kids = el.getElementsByTagName('*');
    for (let i = 0; i < kids.length; i++)
      if (/fixed|sticky/.test(getComputedStyle(kids[i]).position)) return false;
    return true;
  });
  if (els.length < 2) return;
  els.forEach(el => { el.style.willChange = 'transform'; el.style.transformOrigin = 'center ' + (40 + Math.random() * 20).toFixed(0) + '%'; });
  let mx = 0, my = 0, cx = 0, cy = 0;
  addEventListener('mousemove', e => {
    mx = e.clientX / innerWidth - 0.5;
    my = e.clientY / innerHeight - 0.5;
  }, { passive: true });
  (function t() {
    requestAnimationFrame(t);
    cx += (mx - cx) * 0.06; cy += (my - cy) * 0.06;
    els.forEach((el, i) => {
      const dir = (i % 2 ? 1 : -1);
      const ry = cx * 3.0 * dir, rx = -cy * 2.2 * dir;
      const tx = cx * -9 * dir, ty = cy * -7 * dir;
      el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) rotateX(' +
        rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
    });
  })();
}

/* ═══════════ 暗场光标点亮：叠加光晕 ═══════════ */
function initTorch() {
  const tv = $('#torch'); if (!tv || TOUCH) return;
  let lit = false;
  addEventListener('mousemove', e => {
    tv.style.setProperty('--tx', e.clientX + 'px');
    tv.style.setProperty('--ty', e.clientY + 'px');
    if (!lit) { lit = true; document.documentElement.classList.add('rd-lit'); }
  }, { passive: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootDom);
else bootDom();
})();
