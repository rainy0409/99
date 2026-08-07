/* ═══════════════════════════════════════════════════════════
   space3d.js · v18 · 上市级优化（程序化星点 / 分层 bloom 辉光 / 品牌色体积星云 / 安静页降档 / 内容模型精修）
   建模思路（纯粒子，无实体星球）：
   - 星系 = THREE.Points 双旋臂螺旋盘 + 径向光晕 sprite + 深度缩放 + 相位闪烁
   - 颜色梯度：青白核 → 蓝 → 蓝紫 → 紫 → 粉（随半径）
   - 核球辉光 = 加法混合 Sprite，模拟银河核与对侧亮区
   - 相机绕核心轨道：拖拽环绕 / 滚轮缩放轨道距离 / 双击回正
   - 内容 = THREE.Sprite 真实几何面，Raycaster 拾取（仅舞台内、灯箱关闭时）
   ═══════════════════════════════════════════════════════════ */
(function () {
'use strict';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH   = matchMedia('(hover: none)').matches || innerWidth < 981;
const MOBILE  = innerWidth < 760;

/* 性能看门狗（core.js）判定弱设备后广播 rd:slow：把 WebGL 宇宙像素比再压到 1，
   叠加 core.js 隐藏 4 个装饰画布，让集成显卡老设备也回到流畅。 */
addEventListener('rd:slow', () => {
  if (!renderer) return;
  DPR = Math.min(DPR, 1);
  try { renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, true); } catch (e) {}
});

let renderer, scene, camera, envGroup, contentGroup, starPoints, starMat, starGeo;
let planets = [];
let auroraGrp = null, petalGrp = null, dustPoints = null;
let cv, W = 0, H = 0, DPR = 1;
let raf = 0, started = false;
let explore = false, gallery = false, showHeart = false;

/* 相机 / 动画（环绕轨道：绕星系核心观察，呈现完整螺旋） */
let az = 0, el = 0.62, dist = 96, targetAz = 0, targetEl = 0.62, targetDist = 96;
const DEF_EL = 0.62, MIN_EL = -0.12, MAX_EL = 1.32;
const MIN_DIST = 42, MAX_DIST = 165;
let dragOn = false, lastDragT = 0, dragMoved = 0, panOn = false;
let roam = false;
let spin = 0;
let enterOn = false, enterT0 = 0, enterFrom = 0;   // 入场：从远处缓入
let active = true;                                 // 3D 交互总开关（灯箱/网格视图时关闭）
let pulse = 0;
let scrollProg = -1;                               // 滚动进度 0..1 → 宇宙随页面滚动推进（穿行感）
let light = { x: 0, y: 0 };
let lightStr = 0, targetLight = 0.6;

/* 星系结构常数（供 buildStars / buildNebula 共享，确保气体与恒星在同一螺旋臂上） */
const ARMS = 2, TWIST = 1.15;

/* 自动旋转（安静页也缓慢自转，避免背景“死”）与视角平移 */
let quiet = false;                  // 非 explore/gallery 页：仅自动旋转，不接管交互
let panX = 0, panY = 0, panZ = 0;   // 视角平移（右键拖拽）
let focusC = [0, 0, 0];             // 当前聚焦中心（平移夹取以它为圆心，飞入后仍可自由微调）
let distFloor = 42;                 // 轨道距离动态下限：常态 = MIN_DIST；聚焦某星时临时下放，
                                    // 否则内容壳层（半径 12~30）永远被挡在 42 之外，星体只能是小点
let preFly = null;                  // 飞入前的机位快照，用于关卡片后原路返回
let tween = null;                   // setView 补间状态
let lod = 0;                        // 运行时 LOD 级别（0 高 / 1 中 / 2 低）
let fpsT = 0, fpsN = 0, nebulaGrp = null;

/* 各页面取景预设（统一优质的 3D 背景 + 页面间平滑视角切换） */
const VIEWS = {
  'index.html':   { az: 0.35, el: 0.52, dist: 96 },
  'gallery.html': { az: 0.00, el: 0.30, dist: 70 },
  'story.html':   { az: -0.50, el: 0.42, dist: 110 },
  'days.html':    { az: 0.60, el: 0.46, dist: 112 },
  'whisper.html': { az: 0.20, el: 0.40, dist: 120 },
  'letter.html':  { az: -0.25, el: 0.44, dist: 120 }
};
const easeInOut = t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

/* 主题 */
let isDark = true;

/* 工具 */
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function mix(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function col(hex) { const n=parseInt(hex.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function gauss(){ let u=Math.random()||1e-6, v=Math.random(); return clamp(Math.sqrt(-2*Math.log(u))*Math.cos(6.283*v), -3, 3); }

/* 调色板 */
const PAL = {
  star:  [0.94, 0.96, 1.00],
  pink:  [1.00, 0.42, 0.56],
  gold:  [1.00, 0.78, 0.40],
  purp:  [0.62, 0.48, 1.00],
  blue:  [0.65, 0.88, 1.00],
  rose:  [1.00, 0.72, 0.78]
};

/* 内容对象配色 */
const KIND_COL = {
  photo:   '#FF6F8D',
  line:    '#E8C268',
  mile:    '#9D7BFF',
  portal:  '#FF8FB0',
  letter:  '#FF6F8D'
};

/* ═══ 贴图工厂 ═══ */
let glowTex = null, starTex = null;
function makeGlow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64,64,0,64,64,64);
  grd.addColorStop(0.0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18,'rgba(255,255,255,0.55)');
  grd.addColorStop(0.50,'rgba(255,255,255,0.12)');
  grd.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0,0,128,128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
function makeStarTex() {
  if (starTex) return starTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  // 亮心
  let grd = g.createRadialGradient(64,64,0,64,64,26);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.65,'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0,0,128,128);
  // 外层光晕
  grd = g.createRadialGradient(64,64,0,64,64,62);
  grd.addColorStop(0, 'rgba(255,255,255,0.42)');
  grd.addColorStop(0.30,'rgba(255,255,255,0.10)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0,0,128,128);
  starTex = new THREE.CanvasTexture(c);
  return starTex;
}
function hexA(hex,a){ const n=parseInt(hex.slice(1),16); return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')'; }
/* 相框内的照片贴图。
   ⚠ 清晰度关键：飞入特写时相框约占屏 30%（1440 宽 / 2x DPR ≈ 800 物理像素），
   原来固定 384px 的画布被放大一倍多，正是「照片糊」的直接原因。
   这里按设备能力自适应到 768/1024，并把各向异性过滤拉满、开启 mipmap。 */
const PHOTO_TEX_S = (function(){
  if(MOBILE) return 512;
  return (devicePixelRatio||1) > 1.4 ? 1024 : 768;
})();
function makePhotoTex(url,cb){
  new THREE.TextureLoader().load(url, tex=>{
    const img=tex.image, S=PHOTO_TEX_S, c=document.createElement('canvas'); c.width=c.height=S;
    const g=c.getContext('2d'), r=S*0.12;
    g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
    g.save();
    g.beginPath(); g.moveTo(r,0); g.arcTo(S,0,S,S,r); g.arcTo(S,S,0,S,r); g.arcTo(0,S,0,0,r); g.arcTo(0,0,S,0,r); g.closePath(); g.clip();
    const iw=img.width, ih=img.height, s=Math.max(S/iw,S/ih);
    g.drawImage(img,(S-iw*s)/2,(S-ih*s)/2,iw*s,ih*s); g.restore();
    g.strokeStyle='rgba(255,255,255,0.85)'; g.lineWidth=S/64;
    roundRect(g,S/77,S/77,S-S/38,S-S/38,r); g.stroke();
    const ct=new THREE.CanvasTexture(c);
    ct.anisotropy = maxAniso();                       // 拉满，斜视角下照片不再拉丝
    ct.generateMipmaps = true;
    ct.minFilter = THREE.LinearMipmapLinearFilter;    // 远景平滑、近景锐利
    ct.magFilter = THREE.LinearFilter;
    if('colorSpace' in ct && THREE.SRGBColorSpace) ct.colorSpace = THREE.SRGBColorSpace;
    else if('encoding' in ct && THREE.sRGBEncoding) ct.encoding = THREE.sRGBEncoding;
    ct.needsUpdate = true;
    cb(ct);
  }, undefined, ()=>cb(null));
}
/* 取设备支持的最大各向异性（renderer 未就绪时给个安全值） */
function maxAniso(){
  try{ return renderer ? renderer.capabilities.getMaxAnisotropy() : 8; }catch(e){ return 8; }
}
/* 传送门能量旋涡贴图（程序化螺旋，Additive 混合用） */
function makeSwirlTex(col){
  const c=document.createElement('canvas'); c.width=c.height=256;
  const g=c.getContext('2d'), cx=128, cy=128;
  const hex='#'+col.getHexString();
  const grd=g.createRadialGradient(cx,cy,0,cx,cy,128);
  grd.addColorStop(0, 'rgba(255,255,255,0.98)');
  grd.addColorStop(0.35, hexA(hex,0.55));
  grd.addColorStop(0.75, hexA(hex,0.18));
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle=grd; g.fillRect(0,0,256,256);
  g.strokeStyle='rgba(255,255,255,0.32)'; g.lineWidth=2.5; g.lineCap='round';
  for(let i=0;i<5;i++){
    g.beginPath();
    for(let a=0;a<Math.PI*5;a+=0.08){
      const r=8+a*14;
      const x=cx+Math.cos(a+i*1.26)*r;
      const y=cy+Math.sin(a+i*1.26)*r;
      if(a===0) g.moveTo(x,y); else g.lineTo(x,y);
    }
    g.stroke();
  }
  const t=new THREE.CanvasTexture(c); t.anisotropy=4;
  return t;
}
function starShape(g,cx,cy,spikes,outer,inner){
  let rot=-Math.PI/2; const step=Math.PI/spikes;
  g.beginPath(); g.moveTo(cx,cy-outer);
  for(let i=0;i<spikes;i++){ g.lineTo(cx+Math.cos(rot)*outer,cy+Math.sin(rot)*outer); rot+=step; g.lineTo(cx+Math.cos(rot)*inner,cy+Math.sin(rot)*inner); rot+=step; }
  g.closePath(); g.fill();
}
function roundRect(g,x,y,w,h,r){
  g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath();
}

/* 星球程序化贴图：带条带+斑点 */
function makePlanetTex(c1, c2, bands){
  const c=document.createElement('canvas'); c.width=c.height=1024;
  const g=c.getContext('2d');
  g.fillStyle=c1; g.fillRect(0,0,1024,1024);
  // 柔和条带
  for(let i=0;i<bands;i++){
    const y=rnd(60,960), h=rnd(40,140);
    const grd=g.createLinearGradient(0,y,0,y+h);
    grd.addColorStop(0, hexA(c2,0)); grd.addColorStop(0.5, hexA(c2,0.32)); grd.addColorStop(1, hexA(c2,0));
    g.fillStyle=grd; g.fillRect(0,y,1024,h);
  }
  // 旋涡状斑点
  for(let i=0;i<28;i++){
    const x=rnd(0,1024), y=rnd(0,1024), r=rnd(20,90);
    const grd=g.createRadialGradient(x,y,0,x,y,r);
    grd.addColorStop(0, hexA(c2,0.24)); grd.addColorStop(1, hexA(c2,0));
    g.fillStyle=grd; g.beginPath(); g.arc(x,y,r,0,6.283); g.fill();
  }
  // 轻微暗斑
  for(let i=0;i<14;i++){
    const x=rnd(0,1024), y=rnd(0,1024), r=rnd(25,70);
    const grd=g.createRadialGradient(x,y,0,x,y,r);
    grd.addColorStop(0, 'rgba(0,0,0,0.08)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle=grd; g.beginPath(); g.arc(x,y,r,0,6.283); g.fill();
  }
  return new THREE.CanvasTexture(c);
}
function makeRingTex(c){
  const can=document.createElement('canvas'); can.width=512; can.height=128;
  const g=can.getContext('2d');
  const grd=g.createRadialGradient(256,64,60,256,64,256);
  grd.addColorStop(0, hexA(c,0)); grd.addColorStop(0.18, hexA(c,0.55)); grd.addColorStop(0.45, hexA(c,0.22)); grd.addColorStop(0.75, hexA(c,0.08)); grd.addColorStop(1, hexA(c,0));
  g.fillStyle=grd; g.fillRect(0,0,512,128);
  return new THREE.CanvasTexture(can);
}

/* ═══ 背景：环绕螺旋星系（相机在中心，旋臂斜跨天空）═══ */
function buildStars(){
  const pts=[];
  const push=(x,y,z,c,s,phase)=>pts.push({x,y,z,c,s,phase});

  // 螺旋星系盘
  const rMin = 5, rMax = 64;      // 半径范围
  const TILT = 0.46;              // 盘倾角：斜跨视野形成银河带
  const cT = Math.cos(TILT), sT = Math.sin(TILT);
  const NS = quiet ? (MOBILE ? 1100 : 2100) : (MOBILE ? 1400 : 3000);   // 安静页（子页）降档，但略提密度让背景更“有内容”
  // 颜色梯度（芯 → 外）
  const C_CORE=[0.80,0.96,1.00];  // 青白
  const C_IN  =[0.42,0.74,1.00];  // 蓝
  const C_MID =[0.55,0.55,1.00];  // 蓝紫
  const C_OUT =[0.84,0.56,0.98];  // 紫
  const C_PNK =[1.00,0.66,0.82];  // 粉
  // 锐利旋臂：角向散布随半径收窄；越靠近臂心越亮、越大；臂间被压暗 → 呈现真实星系结构
  const SIGMA = 0.34;            // 臂心高斯宽度
  const KNOT_RATE = 0.055;       // 沿臂“亮结”比例
  for(let i=0;i<NS;i++){
    const arm = i % ARMS;
    const t = Math.sqrt(Math.random());           // 0..1 均匀面密度
    const r = rMin + (rMax-rMin)*t;
    const armAng = arm*(Math.PI*2/ARMS) + r*TWIST;
    // 角向偏移：核心更散、旋臂更紧
    const spread = gauss() * (0.28*(1.0-0.45*t)+0.12);
    const ang = armAng + spread;
    const x = Math.cos(ang)*r;
    const z = Math.sin(ang)*r;
    // 盘厚度（核心更厚，模拟核球）
    const thick = 0.45 + 2.4*Math.exp(-r/10);
    const y = gauss()*thick;
    // 倾斜盘
    const y2 = y*cT - z*sT;
    const z2 = y*sT + z*cT;
    // 颜色随半径梯度
    let c;
    if(t<0.12)      c = C_CORE;
    else if(t<0.35) c = mix(C_CORE,C_IN,(t-0.12)/0.23);
    else if(t<0.60) c = mix(C_IN,C_MID,(t-0.35)/0.25);
    else if(t<0.82) c = mix(C_MID,C_OUT,(t-0.60)/0.22);
    else            c = mix(C_OUT,C_PNK,(t-0.82)/0.18);
    // 臂心增强 / 臂间压暗
    const armFactor = Math.exp(-spread*spread/(2*SIGMA*SIGMA));
    const isKnot = Math.random() < KNOT_RATE && armFactor > 0.62 && r > 8 && r < 54;
    const baseBright = (0.80 + 0.62*(1.0-t)) * (0.52 + 0.48*armFactor) * (isKnot ? 1.45 : 1.0);
    c = [c[0]*baseBright, c[1]*baseBright, c[2]*baseBright];
    // 尺寸：臂心更大、亮结更大、核心更大
    let s = (rnd(1.6,3.6)*(0.66 + 0.34*armFactor) + (isKnot?2.0:0)) * (t<0.25?1.4:1.0);
    push(x, y2, z2, c, s, Math.random()*6.283);
  }

  // 远景稀疏背景星（少量，保持深空干净，不抢旋臂）
  const NF = MOBILE ? 170 : 300;
  for(let i=0;i<NF;i++){
    const r = rnd(60, 175);
    const a = Math.random()*6.283, b = Math.acos(rnd(-1,1));
    let c = Math.random()<0.82 ? PAL.star : (Math.random()<0.5 ? PAL.blue : PAL.purp);
    push(Math.sin(b)*Math.cos(a)*r, Math.cos(b)*r, Math.sin(b)*Math.sin(a)*r, c, rnd(1.6,3.4), Math.random()*6.283);
  }

  // 旋臂末端“信标星”：更大更亮的恒星，给星系明确的视觉锚点与层次（避免背景“差点意思”）
  for(let i=0;i<10;i++){
    const arm = i % ARMS;
    const ang = arm*(Math.PI*2/ARMS) + rMax*TWIST + (Math.random()-0.5)*0.5;
    const r = rMax + rnd(-4, 3);
    const x = Math.cos(ang)*r, z = Math.sin(ang)*r;
    const y = gauss()*0.5;
    const y2 = y*cT - z*sT, z2 = y*sT + z*cT;
    push(x, y2, z2, [1.0, 0.95, 0.92], rnd(5.5, 8.5), Math.random()*6.283);
  }

  const count=pts.length;
  const pos=new Float32Array(count*3), colA=new Float32Array(count*3), siz=new Float32Array(count), pha=new Float32Array(count), rimA=new Float32Array(count), rndA=new Float32Array(count);
  for(let i=0;i<count;i++){
    const p=pts[i];
    pos[i*3]=p.x; pos[i*3+1]=p.y; pos[i*3+2]=p.z;
    colA[i*3]=p.c[0]; colA[i*3+1]=p.c[1]; colA[i*3+2]=p.c[2];
    siz[i]=p.s; pha[i]=p.phase;
    rimA[i]= i<NS ? 1 : 0;          // 仅螺旋盘星做盘缘柔化，背景星球保持完整
    rndA[i]= Math.random();          // 每星微随机：尺寸/亮度抖动，避免整齐划一显得“儿戏”
  }
  starGeo=new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(colA,3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(siz,1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(pha,1));
  starGeo.setAttribute('aRim', new THREE.BufferAttribute(rimA,1));
  starGeo.setAttribute('aRand', new THREE.BufferAttribute(rndA,1));
}

/* ═══ 背景：纯粒子星系（v15 起不再使用实体星球）═══ */

/* ═══ 星系核球辉光（分层加法混合，模拟真实 bloom：大范围柔晕 → 热核）═══ */
function buildCoreGlow(){
  const tex=makeGlow();
  const TILT=0.46, sT=Math.sin(TILT), cT=Math.cos(TILT);
  const place=(hex,sx,sy,zd,op,ro)=>{
    const s=new THREE.Sprite(new THREE.SpriteMaterial({
      map:tex, color:new THREE.Color(hex), transparent:true, opacity:op,
      depthWrite:false, blending:THREE.AdditiveBlending
    }));
    s.scale.set(sx,sy,1);
    s.position.set(0, -zd*sT, zd*cT);   // 与 buildStars 同一盘倾斜
    s.renderOrder=ro||2;
    envGroup.add(s);
  };
  // 外层弥散柔晕（低强度大范围 → 像 bloom 溢出）
  place(0x6fd0ff, 200, 130, -14, quiet?0.045:0.060, 1);
  place(0x9a6bff, 156, 102,  16, quiet?0.035:0.050, 1);
  // 宽幅氛围光晕（整片深空微微泛紫，让安静页背景也“有空气感”）
  place(0x9a6bff, 280, 200,   0, quiet?0.030:0.045, 0);
  // 中层辉光
  place(0x8fe3ff,  98,  64, -10, quiet?0.085:0.120, 2);
  place(0xb98bff,  72,  47,  18, quiet?0.070:0.100, 2);
  // 近核亮区
  place(0xbfefff,  52,  34,  -6, quiet?0.15:0.22, 3);
  // 热核（纯白青，多层叠加出体积感）
  place(0xffffff,  27,  18,  -2, quiet?0.28:0.40, 4);
  place(0xeafcff,  15,  10,   0, quiet?0.36:0.52, 5);
}

/* ═══ 体积星云（沿旋臂分布的多层加法气体，品牌色：青→蓝→紫→粉，营造真实弥漫辉光）═══ */
function buildNebula(){
  const tex=makeGlow();
  const TILT=0.46, sT=Math.sin(TILT), cT=Math.cos(TILT);
  const grp=new THREE.Group();
  const place=(hex,sx,sy,X,Yn,Z,op,ro)=>{
    const s=new THREE.Sprite(new THREE.SpriteMaterial({
      map:tex, color:new THREE.Color(hex), transparent:true, opacity:op,
      depthWrite:false, blending:THREE.AdditiveBlending
    }));
    s.scale.set(sx,sy,1);
    s.position.set(X, Yn*cT - Z*sT, Yn*sT + Z*cT);   // 落在同一倾斜盘面上
    s.renderOrder=ro||1;
    grp.add(s);
  };
  // 沿两条旋臂分布星云团：用品牌色（青→蓝→紫→粉）勾勒臂的走向，强化“真实星系”结构
  const k = quiet ? 0.7 : 1.0;   // 安静页星云保留七成，背景仍“有内容”
  const clusters = [
    {r:12, arm:0, hex:0x5fd0ff, sx:70, sy:46, z:0,  op:0.12},
    {r:20, arm:0, hex:0x6fb6ff, sx:96, sy:62, z:3,  op:0.10},
    {r:26, arm:0, hex:0x4aa8ff, sx:100, sy:66, z:6, op:0.11},
    {r:40, arm:0, hex:0x9a6bff, sx:130, sy:84, z:14, op:0.10},
    {r:52, arm:0, hex:0xff7fae, sx:96, sy:64, z:22, op:0.08},
    {r:15, arm:1, hex:0x6fe0ff, sx:80, sy:52, z:-3, op:0.11},
    {r:24, arm:1, hex:0x7fa8ff, sx:104, sy:68, z:2, op:0.10},
    {r:32, arm:1, hex:0x8a7bff, sx:120, sy:78, z:8, op:0.10},
    {r:46, arm:1, hex:0xff9ec6, sx:92, sy:60, z:-16, op:0.08},
  ];
  // 宽幅弥散“牛奶路”：盘心一团大柔晕，给整片旋臂覆上弥漫辉光，背景更显真实星系
  place(0x7fb0ff, 220, 120, 0, 0, 0, 0.05*k, 0);
  clusters.forEach((cl, idx) => {
    if(quiet && cl.r > 48) return;
    const ang = cl.arm*(Math.PI*2/ARMS) + cl.r*TWIST + (Math.random()-0.5)*0.18;
    const X = Math.cos(ang)*cl.r;
    const Z = Math.sin(ang)*cl.r + cl.z;
    place(cl.hex, cl.sx, cl.sy, X, 0, Z, cl.op*k, 1 + (idx%2));
  });
  envGroup.add(grp); nebulaGrp=grp;
}

/* ═══ 微尘层（精细建模：散布在星系四周的细小光尘，随星系缓慢自转，增加纵深与“空气感”）═══ */
function buildDust(){
  const NF = quiet ? (MOBILE ? 360 : 520) : (MOBILE ? 520 : 860);
  const pos = new Float32Array(NF*3), col = new Float32Array(NF*3);
  const pal = [PAL.star, PAL.blue, PAL.purp, [1.0, 0.80, 0.88]];
  for(let i=0;i<NF;i++){
    const r = rnd(42, 188);
    const a = Math.random()*6.283, b = Math.acos(rnd(-1, 1));
    pos[i*3]   = Math.sin(b)*Math.cos(a)*r;
    pos[i*3+1] = Math.cos(b)*r*0.6;          // 略压扁，贴近盘面四周
    pos[i*3+2] = Math.sin(b)*Math.sin(a)*r;
    const c = pal[(Math.random()*pal.length)|0];
    const dim = 0.45 + Math.random()*0.55;
    col[i*3]   = c[0]*dim; col[i*3+1] = c[1]*dim; col[i*3+2] = c[2]*dim;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const tex = makeGlow();
  const m = new THREE.PointsMaterial({
    size: MOBILE ? 3.0 : 4.6, map: tex, vertexColors: true, transparent: true,
    opacity: quiet ? 0.5 : 0.7, depthWrite: false, blending: THREE.AdditiveBlending,
    sizeAttenuation: true, alphaTest: 0.02
  });
  dustPoints = new THREE.Points(g, m);
  dustPoints.frustumCulled = false;
  dustPoints.renderOrder = 0;
  envGroup.add(dustPoints);
}

/* ═══ 花瓣（仅主页） ═══ */
function buildPetals(){
  if(!explore) return null;
  const tex=makeGlow();
  const grp=new THREE.Group();
  const N=MOBILE?12:24;
  for(let i=0;i<N;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({
      map:tex, color:new THREE.Color(0xffc6d6), transparent:true, opacity:rnd(0.12,0.28),
      depthWrite:false, blending:THREE.AdditiveBlending
    }));
    const sc=rnd(1.6,3.2); s.scale.set(sc,sc,1);
    const a=Math.random()*6.283, b=Math.acos(rnd(-0.7,0.7)), r=rnd(18,55);
    s.position.set(Math.sin(b)*Math.cos(a)*r, Math.cos(b)*r, Math.sin(b)*Math.sin(a)*r);
    s.userData={spd:rnd(0.35,0.9), ph:Math.random()*6.283};
    grp.add(s);
  }
  scene.add(grp); return grp;
}

/* 程序化星点着色器（无贴图：片元内绘制亮心+柔光晕+星芒，比模糊贴图更精致、更省） */
const VS=[
  'attribute vec3 aColor; attribute float aSize; attribute float aPhase; attribute float aRim; attribute float aRand;',
  'uniform float uTime,uTintR,uTintG,uTintB,uAlpha,uAmb,uLightStr,uFog,uPx;',
  'varying vec3 vColor; varying float vAlpha; varying float vRad; varying float vRim;',
  'varying float vTw; varying float vRnd; varying float vPx;',
  'void main(){',
  ' vec4 mv=modelViewMatrix*vec4(position,1.0);',
  ' float dist=max(-mv.z,0.05);',
  ' gl_Position=projectionMatrix*mv;',
  ' float sz=aSize*(0.8+0.45*aRand);',                  // 每星微随机尺寸，避免整齐划一
  ' float ps=clamp(sz*uPx/dist, 2.0, 72.0);',            // 下限提到 2px：保证星形可辨识，不再退化成圆点
  ' gl_PointSize=ps;',
  ' float tw=0.72+0.28*sin(uTime*1.1+aPhase);',
  ' float fog=clamp(1.0-(dist-2.0)*uFog,0.05,1.0);',
  ' float lit=uAmb+uLightStr;',
  ' vColor=aColor*vec3(uTintR,uTintG,uTintB)*tw*fog*lit;',
  ' vAlpha=clamp(tw*fog*lit,0.0,1.0)*uAlpha;',
  ' vRad=clamp(length(position.xz)/64.0, 0.0, 1.4);',
  ' vRim=aRim;',
  ' vTw=tw; vRnd=aRand; vPx=ps;',
  '}'
].join('\n');
/* 片元内程序化「有形状的恒星」：锐利亮心 + 柔光晕 + 十字衍射星芒（亮星再叠 45° 芒 → 八芒）
   每颗星按 aRand 随机旋转芒角，闪烁 tw 驱动芒长，远处小星自动退化为柔光点以免噪点。 */
const FS=[
  'precision highp float;',
  'varying vec3 vColor; varying float vAlpha; varying float vRad; varying float vRim;',
  'varying float vTw; varying float vRnd; varying float vPx;',
  'float spike(vec2 p, float thin, float len){',
  ' float a=max(0.0,1.0-abs(p.x)*thin);',
  ' float b=max(0.0,1.0-abs(p.y)*len);',
  ' return pow(a,3.0)*pow(b,1.35);',
  '}',
  'void main(){',
  ' vec2 pc=gl_PointCoord-0.5;',
  ' float d=length(pc);',
  ' if(d>0.708) discard;',
  ' float core=pow(smoothstep(0.30,0.0,d),1.9);',       // 锐利亮心
  ' float halo=exp(-d*6.2)*0.50;',                       // 紧致光晕（比原来更收敛，避免糊成一团）
  // 每星独立芒角：让星芒朝向各异，摆脱“整齐圆点”观感
  ' float ang=vRnd*3.14159;',
  ' float cs=cos(ang), sn=sin(ang);',
  ' vec2 rp=vec2(pc.x*cs - pc.y*sn, pc.x*sn + pc.y*cs);',
  // 星芒长度随闪烁呼吸（tw 0.44~1.0 → len 系数 2.6~1.9，越亮越长）
  ' float lenK=mix(2.75,1.85,clamp(vTw,0.0,1.0));',
  ' float s4=spike(rp,15.0,lenK)+spike(rp.yx,15.0,lenK);',
  // 亮星（随机 35%）追加 45° 对角芒 → 八芒星，制造层次
  ' vec2 dp=vec2(rp.x+rp.y, rp.y-rp.x)*0.70711;',
  ' float diag=step(0.65,vRnd)*(spike(dp,19.0,lenK*1.25)+spike(dp.yx,19.0,lenK*1.25))*0.55;',
  // 小于 4px 的远星没必要画星芒（会变成噪点），平滑淡出
  ' float shape=smoothstep(3.0,7.0,vPx);',
  ' float flare=(s4+diag)*shape*(0.55+0.55*vTw);',
  ' float a=clamp(core*0.95+halo+flare*0.85,0.0,1.0);',
  ' float rim=clamp((1.06 - vRad)/(1.06-0.45), 0.0, 1.0);',  // 盘缘柔化：内亮外隐，消除硬边
  ' float aa=vAlpha*mix(1.0, rim, vRim);',
  ' vec3 col=vColor*(1.0+1.15*core+flare*1.6);',         // 芒线与亮心提亮：加色混合下呈现真实恒星质感
  ' gl_FragColor=vec4(col, a*aa);',
  '}'
].join('\n');

/* ═══ 内容对象：真实 3D 几何体（替代 canvas 精灵，精致建模、平滑自转）═══ */
let ITEMS=[], raycaster=null, _ndc=null;
let onPickCb=null, onHoverCb=null, hovered=null;

/* —— 几何辅助 —— */
function roundedRectShape(w,h,r){
  const s=new THREE.Shape(); const x=-w/2,y=-h/2;
  s.moveTo(x+r,y);
  s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
function extrudeStarShape(outer,inner,depth){
  const s=new THREE.Shape(); let rot=-Math.PI/2; const step=Math.PI/5;
  s.moveTo(0,-outer);
  for(let i=0;i<5;i++){ s.lineTo(Math.cos(rot)*outer,Math.sin(rot)*outer); rot+=step; s.lineTo(Math.cos(rot)*inner,Math.sin(rot)*inner); rot+=step; }
  s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:depth,bevelEnabled:true,bevelSize:0.045,bevelThickness:0.045,bevelSegments:2});
  g.center(); return g;
}
function triangleShape(w,h){
  const s=new THREE.Shape(); s.moveTo(-w,0); s.lineTo(w,0); s.lineTo(0,h); s.closePath();
  return new THREE.ShapeGeometry(s);
}
/* 背后辉光（加法混合 Sprite，模拟真实 bloom，无需后处理破坏透明画布） */
function addHalo(grp,col,sx,op){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({
    map:makeGlow(), color:col.clone(), transparent:true, opacity:op,
    depthWrite:false, blending:THREE.AdditiveBlending
  }));
  s.scale.set(sx,sx,1); s.renderOrder=9; grp.add(s);
}
/* —— 按种类建立精致 3D 模型（每个都是真实几何 + 辉光，平滑自转）—— */
function buildModel(d){
  const grp=new THREE.Group();
  const col=new THREE.Color(KIND_COL[d.kind]||'#ffffff');
  if(d.kind==='photo'){
    /* 精致相片框：真实厚框 + 背板 + 卡纸 + 照片层 + 玻璃反光，始终面向相机 */
    const fw=1.6, fh=1.6;                 // 外框尺寸（方形，与贴图一致）
    const matW=1.38, matH=1.38;           // 内卡纸
    const photoW=1.22, photoH=1.22;       // 照片显示区
    const frameD=0.22;                    // 框厚度，做出真实立体感

    // 背板：让框有“实体”，避免背后星空透穿
    const back=new THREE.Mesh(
      new THREE.BoxGeometry(fw+0.08, fh+0.08, 0.06),
      new THREE.MeshStandardMaterial({color:0x14141c, roughness:0.85, metalness:0.1})
    );
    back.position.z=-frameD*0.5-0.03;
    grp.add(back);

    // 外框：圆角挤出 + 倒角 + 香槟金金属
    const frameShape=roundedRectShape(fw, fh, 0.18);
    frameShape.holes.push(roundedRectShape(matW, matH, 0.12));
    const frameGeo=new THREE.ExtrudeGeometry(frameShape,{
      depth:frameD, bevelEnabled:true, bevelSize:0.045, bevelThickness:0.045, bevelSegments:3
    });
    frameGeo.center();
    const frameMat=new THREE.MeshStandardMaterial({
      color:0xE8C268, emissive:0x2a1a0a, emissiveIntensity:0.18,
      metalness:0.78, roughness:0.20
    });
    const frame=new THREE.Mesh(frameGeo, frameMat);
    grp.add(frame);

    // 内卡纸（暖白，模拟真实相框卡纸）
    const matMesh=new THREE.Mesh(
      new THREE.PlaneGeometry(matW, matH),
      new THREE.MeshStandardMaterial({color:0xfff9f0, roughness:0.92})
    );
    matMesh.position.z=frameD*0.5+0.004;
    grp.add(matMesh);

    // 照片平面（先暗色占位，异步加载后点亮）
    const photoMat=new THREE.MeshBasicMaterial({color:0x1a1a24, transparent:true, opacity:0.95, depthWrite:false});
    const photo=new THREE.Mesh(new THREE.PlaneGeometry(photoW, photoH), photoMat);
    photo.position.z=frameD*0.5+0.008;
    grp.add(photo);

    // 玻璃反光层（Additive，轻微高光）
    const glass=new THREE.Mesh(
      new THREE.PlaneGeometry(photoW, photoH),
      new THREE.MeshBasicMaterial({
        color:0xffffff, transparent:true, opacity:0.06, depthWrite:false,
        blending:THREE.AdditiveBlending
      })
    );
    glass.position.z=frameD*0.5+0.012;
    grp.add(glass);

    // 品牌色柔光晕（取代把整框涂成粉色）
    addHalo(grp, col, 3.0, 0.42);
    grp.userData.photoMat=photoMat;
    grp.userData.isPhoto=true;
  } else if(d.kind==='line'){
    /* 情话：发光宝石 + 环绕光环 */
    const gem=new THREE.Mesh(new THREE.IcosahedronGeometry(0.62,0), new THREE.MeshStandardMaterial({color:col, emissive:col.clone().multiplyScalar(0.55), metalness:0.3, roughness:0.2}));
    grp.add(gem);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.92,0.022,8,40), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.5}));
    grp.add(ring); grp.userData.spinRing=ring;
    addHalo(grp, col, 2.5, 0.55);
  } else if(d.kind==='mile'){
    /* 里程碑：立体五角星（挤出 + 倒角），缓缓自转 */
    const star=new THREE.Mesh(extrudeStarShape(0.72,0.30,0.18), new THREE.MeshStandardMaterial({color:col, emissive:col.clone().multiplyScalar(0.5), metalness:0.2, roughness:0.25}));
    grp.add(star); grp.userData.spin=star;
    addHalo(grp, col, 2.5, 0.5);
  } else if(d.kind==='portal'){
    /* 星门：晶体外环 + 旋转能量环 + 旋涡盘面 + 亮核 + 粒子环 */
    // 外环：白色晶体，带品牌色自发光勾边
    const outer=new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.075, 14, 64),
      new THREE.MeshStandardMaterial({
        color:0xffffff, emissive:col, emissiveIntensity:0.45,
        metalness:0.55, roughness:0.16
      })
    );
    grp.add(outer);

    // 内能量环：半透明品牌色，倾斜旋转
    const innerRing=new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.04, 12, 48),
      new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.75, depthWrite:false})
    );
    innerRing.rotation.x=Math.PI/2;
    grp.add(innerRing); grp.userData.spinRing=innerRing;

    // 旋涡盘面：Additive 混合，照亮门内
    const swirlMat=new THREE.MeshBasicMaterial({
      map:makeSwirlTex(col), color:0xffffff, transparent:true, opacity:0.9,
      depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide
    });
    const disc=new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), swirlMat);
    disc.position.z=0.02;
    grp.add(disc); grp.userData.spinDisc=disc;

    // 亮核
    const core=new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 24),
      new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.95})
    );
    core.position.z=0.03;
    grp.add(core);

    // 门周 8 颗能量粒子
    for(let i=0;i<8;i++){
      const spark=new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.85})
      );
      const a=i*Math.PI/4;
      spark.position.set(Math.cos(a)*0.82, Math.sin(a)*0.82, 0.04);
      grp.add(spark);
    }

    addHalo(grp, col, 3.4, 0.6);
  } else if(d.kind==='letter'){
    /* 信封：立体卡片 + 翻盖 + 爱心封印 */
    const body=new THREE.Mesh(new THREE.BoxGeometry(1.3,0.9,0.12), new THREE.MeshStandardMaterial({color:0xfff3ef, emissive:0xffd9e2, emissiveIntensity:0.22, roughness:0.6, metalness:0.0}));
    grp.add(body);
    const flap=new THREE.Mesh(triangleShape(0.66,0.5), new THREE.MeshStandardMaterial({color:0xffe3ea, emissive:0xffd0dd, emissiveIntensity:0.18, roughness:0.6, side:THREE.DoubleSide, metalness:0.0}));
    flap.position.set(0,0.45,0.07); flap.rotation.x=-Math.PI*0.05; grp.add(flap);
    const seal=new THREE.Mesh(new THREE.SphereGeometry(0.1,16,16), new THREE.MeshStandardMaterial({color:col, emissive:col, emissiveIntensity:0.5}));
    seal.position.set(0,-0.02,0.08); grp.add(seal);
    addHalo(grp, col, 2.3, 0.4);
  } else {
    const m=new THREE.Mesh(new THREE.SphereGeometry(0.6,24,24), new THREE.MeshStandardMaterial({color:col, emissive:col.clone().multiplyScalar(0.4)}));
    grp.add(m); addHalo(grp, col, 2.3, 0.5);
  }
  grp.traverse(o=>{ o.userData.data=d; });   // 供射线拾取回查到数据
  return grp;
}

function clearContents(){
  if(!contentGroup) return;
  ITEMS.forEach(it=>{
    contentGroup.remove(it.obj);
    it.obj.traverse(o=>{
      if(o.geometry) o.geometry.dispose();
      if(o.material){ if(o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
  });
  ITEMS=[];
}
function setContents(list){
  if(!contentGroup) return;
  clearContents();
  (list||[]).forEach(d=>{
    const base = d.kind==='photo'?3.4 : d.kind==='letter'?2.4 : d.kind==='portal'?2.4 : d.kind==='mile'?2.2 : d.kind==='line'?1.9 : 1.7;
    const grp=buildModel(d);
    grp.position.set(d.x, d.y, -d.z);
    grp.userData.base=base; grp.userData.data=d;
    contentGroup.add(grp); ITEMS.push({obj:grp, data:d});
    /* 照片异步加载贴图，加载完成后点亮相框内的照片平面 */
    if(d.kind==='photo' && d.url) makePhotoTex(d.url, tex=>{
      if(!tex || !grp.parent) return;
      const pm=grp.userData.photoMat;
      if(pm){ pm.map=tex; pm.opacity=1.0; pm.color.set(0xffffff); pm.needsUpdate=true; }
    });
  });
}

/* 照片墙：照片分布在相机四周球面上（同样用精致相框模型） */
let wallGen=0;
function setPhotoWall(photos){
  if(!contentGroup || !photos) return;
  clearContents();
  if(!photos.length) return;
  const gen=++wallGen;
  const count=photos.length;
  const goldenAngle=Math.PI*(3-Math.sqrt(5));
  photos.forEach((p,i)=>{
    const t=i/count;
    const inclination=Math.acos(1-2*(t+0.05)); // 避免挤在极点
    const azimuth=goldenAngle*i;
    const r=22; // 球半径
    const x=r*Math.sin(inclination)*Math.cos(azimuth);
    const y=r*Math.cos(inclination);
    const z=r*Math.sin(inclination)*Math.sin(azimuth);
    const d={kind:'photo',type:'photo',url:p[0],label:p[1],payload:i};
    const grp=buildModel(d);
    grp.position.set(x,y,z);
    grp.userData.base=4.4; grp.userData.data=d;
    contentGroup.add(grp); ITEMS.push({obj:grp, data:d});
    makePhotoTex(p[0], tex=>{
      if(!tex || !grp.parent || gen!==wallGen) return;
      const pm=grp.userData.photoMat;
      if(pm){ pm.map=tex; pm.opacity=1.0; pm.color.set(0xffffff); pm.needsUpdate=true; }
    });
  });
}

function pickAt(cx,cy){
  if(!raycaster || !ITEMS.length) return null;
  camera.updateMatrixWorld();
  _ndc.set((cx/innerWidth)*2-1, -(cy/innerHeight)*2+1);
  raycaster.setFromCamera(_ndc, camera);
  const hits=raycaster.intersectObjects(ITEMS.map(i=>i.obj), true);   // 真实几何 → 原生射线拾取，更精准
  if(!hits.length) return null;
  let o=hits[0].object; while(o && !o.userData.data) o=o.parent;
  return o ? o.userData.data : null;
}
function setHover(data){ if(hovered===data) return; hovered=data; }

/* ═══ 尺寸 ═══ */
function resize(){
  if(!renderer) return;                       // 子页未创建渲染器：直接跳过，避免空上下文崩溃
  DPR=Math.min(devicePixelRatio||1, MOBILE?1:1.5);   // 移动端封 1、桌面封 1.5：星系是柔光晕，降分辨率几乎无感、GPU 负载砍半
  W=innerWidth; H=innerHeight;
  renderer.setPixelRatio(DPR); renderer.setSize(W,H,true);
  camera.fov=MOBILE?58:48;
  camera.aspect=W/H; camera.updateProjectionMatrix();
  if(starMat) starMat.uniforms.uPx.value=(H*DPR)*18/800;
}

/* ═══ 运行时 LOD（按 FPS 自动降档，保流畅）═══ */
function updateLOD(fps){
  if(fps<42 && lod<2) lod++;
  else if(fps>54 && lod>0) lod--;
  applyLOD();
}
function applyLOD(){
  if(!starMat) return;
  const xs=[1.0,0.82,0.66][lod];
  starMat.uniforms.uPx.value=(H*DPR)*18/800*xs;
  starMat.uniforms.uAlpha.value=(isDark?1.0:0.88)*[1.0,0.8,0.62][lod];
  if(nebulaGrp) nebulaGrp.visible = lod<2;
  if(petalGrp)  petalGrp.visible  = lod<1;
  if(dustPoints) dustPoints.visible = lod<2;
}

/* ═══ 主循环 ═══ */
function frame(){
  raf=requestAnimationFrame(frame);
  if(document.hidden) return;
  try{
    const tt=performance.now()/1000;
    const dark=document.documentElement.dataset.theme!=='light';
    isDark=dark;

    targetLight=dark?0.85:0.55;
    lightStr+=(targetLight-lightStr)*0.04;

    // 自动漂移（未拖拽时缓慢环绕核心；安静页也转，避免背景死板）
    const idle=!dragOn && panOn===false && (performance.now()-lastDragT)>2200;
    if(!tween && idle && (active||quiet)) targetAz += (active?0.0009:0.0006);

    // 视角补间（setView / flyTo 平滑切换）或直接阻尼插值
    if(tween){
      const p=clamp((performance.now()-tween.t0)/tween.dur, 0, 1);
      const e=easeInOut(p);
      // 方位角走最短弧：避免飞向身后星体时相机绕远路整整一圈
      let daz=tween.f1-tween.f0;
      while(daz> Math.PI) daz-=Math.PI*2;
      while(daz<-Math.PI) daz+=Math.PI*2;
      az   = tween.f0 + daz*e;
      el   = tween.e0 + (tween.e1-tween.e0)*e;
      dist = tween.d0 + (tween.d1-tween.d0)*e;
      if(tween.p0){                                    // 携带平移（flyTo 聚焦某星）
        panX = tween.p0[0] + (tween.p1[0]-tween.p0[0])*e;
        panY = tween.p0[1] + (tween.p1[1]-tween.p0[1])*e;
        panZ = tween.p0[2] + (tween.p1[2]-tween.p0[2])*e;
      }
      if(p>=1){
        if(tween.p0){ panX=tween.p1[0]; panY=tween.p1[1]; panZ=tween.p1[2]; }
        targetAz=az; targetEl=tween.e1; targetDist=tween.d1;   // 用插值后的 az，防止最短弧收尾时回弹
        tween=null;
      }
    }else{
      const driftEl = idle ? Math.sin(tt*0.028)*0.04 : 0;
      // 拖拽中提高阻尼，让视角 1:1 跟手（否则 0.10 的缓动会让手机拖拽明显“慢半拍”）
      const damp=(dragOn||panOn)?0.42:0.10;
      az   += (targetAz - az)*damp;
      el   += (targetEl + driftEl - el)*damp;
      dist += (targetDist - dist)*0.09;
    }

    spin += REDUCED?0 : 0.0006;        // 星系缓慢自转
    pulse *= 0.94;

    // 入场：从远处缓入到默认距离
    let dolly=0;
    if(enterOn){
      const e=clamp((performance.now()-enterT0)/1500,0,1);
      dolly=(1-Math.pow(1-e,3))*enterFrom;
      if(e>=1) enterOn=false;
    }
    // 滚动推进：向下滚动时相机缓缓推近，像在星河中穿行（安静内容页随阅读一起前行）
    const scrollOffset = scrollProg >= 0 ? -scrollProg * 38 : 0;
    const cd = dist + dolly + scrollOffset;

    // 相机：绕星系核心轨道（呈现完整螺旋），可平移观察点
    const ce=Math.cos(el), se=Math.sin(el);
    camera.position.set(cd*ce*Math.sin(az), cd*se, cd*ce*Math.cos(az));
    camera.lookAt(panX, panY, panZ);

    // 星系自转（星场 + 核球），内容保持静止便于点击
    envGroup.rotation.y = spin;

    // 花瓣飘落
    if(petalGrp){
      petalGrp.children.forEach(s=>{
        s.position.y -= s.userData.spd*0.012;
        s.position.x += Math.sin(tt*0.22+s.userData.ph)*0.007;
        if(s.position.y<-30){ s.position.y=30; const a=Math.random()*6.283,b=Math.acos(rnd(-0.7,0.7)),r=rnd(18,55); s.position.set(Math.sin(b)*Math.cos(a)*r, Math.cos(b)*r, Math.sin(b)*Math.sin(a)*r); }
      });
    }
    // 星云缓慢漂移
    if(auroraGrp){ auroraGrp.position.x=Math.sin(tt*0.025)*3; auroraGrp.position.y=Math.cos(tt*0.022)*2; }

    // 内容呼吸、悬停放大、平滑自转，照片始终面向相机
    const tnow=tt;
    ITEMS.forEach(it=>{
      const grp=it.obj, d=it.data;
      if(grp.userData.isPhoto) grp.lookAt(camera.position);   // 相框 billboard，任意角度都能看清照片
      const breath=1+0.05*Math.sin(tnow*4.0/1.6+(d.z||0));
      const hov=(it.data===hovered)?1.18:1.0;
      const s=grp.userData.base*breath*hov;
      grp.scale.set(s,s,s);
      if(grp.userData.spin)     grp.userData.spin.rotation.y     += 0.010;   // 宝石/恒星自转
      if(grp.userData.spinRing) grp.userData.spinRing.rotation.z += 0.008;   // 光环旋绕
      if(grp.userData.spinDisc) grp.userData.spinDisc.rotation.z -= 0.012;   // 传送门旋涡
    });

    // 主题应用到星星
    if(starMat){
      const u=starMat.uniforms;
      u.uTime.value=tt;
      u.uLightStr.value=lightStr;
      u.uAmb.value=dark?0.22:0.50;
      u.uFog.value=0.010;
      u.uAlpha.value=dark?1.0:0.88;
      const tint=dark?[1,1,1]:[0.28,0.32,0.55];
      u.uTintR.value=tint[0]; u.uTintG.value=tint[1]; u.uTintB.value=tint[2];
      starMat.blending=dark?THREE.AdditiveBlending:THREE.NormalBlending;
    }

    renderer.render(scene, camera);

    // 运行时 LOD：监测 FPS，掉帧则降档保流畅
    fpsN++;
    const now=performance.now();
    if(!fpsT) fpsT=now;
    if(now-fpsT>=1000){ const fps=fpsN*1000/(now-fpsT); fpsN=0; fpsT=now; updateLOD(fps); }
  }catch(e){
    if(!frame._err){ frame._err=1; console.error('[space3d] render error', e); }
    cancelAnimationFrame(raf); raf=0;
  }
}

/* ═══ 输入（环绕轨道：拖拽绕核心、滚轮缩放、点击拾取）═══ */
function inStage(e){
  // 探索页：整屏可交互；照片墙：仅舞台区域（头/尾/标签区让页面正常滚动）
  return explore ? true : (gallery ? !!(e.target && e.target.closest('#viewRing')) : false);
}
function lbOpen(){
  const lb=document.getElementById('lb');
  return !!(lb && lb.classList.contains('on'));
}

function bindInput(){
  let px=0, py=0, pid=-1;
  const isUI=e=>e.target.closest('a,button,input,textarea,nav,.roam-panel,#gxcard,.hero-overlay,.lx-bar,.hc,#nav,#enterGate,.gtabs,.wform,.ml,.gi,#lb,#viewGrid');

  // 鼠标位置（仅用于光标光晕）
  addEventListener('mousemove', e=>{
    light.x=e.clientX/innerWidth*2-1;
    light.y=-(e.clientY/innerHeight*2-1);
  },{passive:true});

  // 拖拽环绕
  addEventListener('pointerdown', e=>{
    if(!active || !inStage(e) || lbOpen()) return;
    if(isUI(e)) return;
    if(e.button===2){ panOn=true; pid=e.pointerId; px=e.clientX; py=e.clientY; return; }  // 右键平移视角
    dragOn=true; pid=e.pointerId; px=e.clientX; py=e.clientY; dragMoved=0;
    document.documentElement.classList.add('rd-grab');
  },{passive:true});
  addEventListener('pointermove', e=>{
    if(panOn && e.pointerId===pid){
      const dx=e.clientX-px, dy=e.clientY-py; px=e.clientX; py=e.clientY;
      const k=0.02*(dist/96);
      const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0);
      const up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);
      panX += (-right.x*dx + up.x*dy)*k;
      panY += (-right.y*dx + up.y*dy)*k;
      panZ += (-right.z*dx + up.z*dy)*k;
      // 夹取以“当前聚焦中心”为圆心：飞入某星后仍可小幅微调构图，而不会被拽回世界原点
      const R=18, ox=panX-focusC[0], oy=panY-focusC[1], oz=panZ-focusC[2], len=Math.hypot(ox,oy,oz);
      if(len>R){ const k=R/len; panX=focusC[0]+ox*k; panY=focusC[1]+oy*k; panZ=focusC[2]+oz*k; }
      lastDragT=performance.now(); return;
    }
    if(!dragOn || e.pointerId!==pid) return;
    const dx=e.clientX-px, dy=e.clientY-py;
    px=e.clientX; py=e.clientY; dragMoved+=Math.abs(dx)+Math.abs(dy);
    // 触屏手指扫动幅度更大，灵敏度反而要比鼠标高一档，否则“要拖好远才转一点”= 慢
    const s=TOUCH?0.0078:0.0062;
    targetAz -= dx*s;                                  // 拖动 -> 绕核心转
    targetEl = clamp(targetEl + dy*s*0.8, MIN_EL, MAX_EL);
    lastDragT=performance.now();
  },{passive:true});
  const endDrag=e=>{ if(e && pid!==-1 && e.pointerId!==pid) return; dragOn=false; panOn=false; pid=-1; lastDragT=performance.now(); document.documentElement.classList.remove('rd-grab'); };
  addEventListener('pointerup', endDrag, {passive:true});
  addEventListener('pointercancel', endDrag, {passive:true});

  // 滚轮：缩放轨道距离（仅在舞台内拦截，避免霸占页面滚动）
  addEventListener('wheel', e=>{
    if(!active || lbOpen()) return;
    if(gallery && !(e.target && e.target.closest('#viewRing'))) return;   // 照片墙非舞台区：放行滚动
    e.preventDefault();
    const step=(e.shiftKey?7:15)*(e.deltaY>0?1:-1);
    targetDist=clamp(targetDist+step, distFloor, MAX_DIST);
    if(targetDist>=MIN_DIST) distFloor=MIN_DIST;      // 一旦退回常规区间，护栏自动复位
  },{passive:false});

  // 双击回正
  addEventListener('dblclick', e=>{
    if(!active || !inStage(e) || lbOpen() || isUI(e)) return;
    targetAz=0; targetEl=DEF_EL; targetDist=MOBILE?120:96; panX=panY=panZ=0;
    focusC=[0,0,0]; preFly=null; tween=null; distFloor=MIN_DIST;   // 回正即解除聚焦
  });

  // 右键用于平移视角，禁用舞台内默认右键菜单
  addEventListener('contextmenu', e=>{ if(active && inStage(e)) e.preventDefault(); }, {passive:false});

  // 悬停 + 点击
  let pdX=0, pdY=0, pdT=0, pdMoving=false;
  addEventListener('pointermove', e=>{
    if(!active || !inStage(e) || dragOn || pdMoving || lbOpen()) return;
    if(isUI(e)){ setHover(null); document.body.style.cursor=''; return; }
    const hit=pickAt(e.clientX,e.clientY);
    setHover(hit);
    if(hit){ document.body.style.cursor='pointer'; if(onHoverCb) onHoverCb(hit,e.clientX,e.clientY); }
    else{ document.body.style.cursor=''; if(onHoverCb) onHoverCb(null); }
  },{passive:true});
  addEventListener('pointerdown', e=>{ if(!active || !inStage(e) || lbOpen()) return; pdX=e.clientX; pdY=e.clientY; pdT=performance.now(); pdMoving=false; },{passive:true});
  addEventListener('pointermove', e=>{ if(!active || !inStage(e) || lbOpen()) return; if(Math.hypot(e.clientX-pdX,e.clientY-pdY)>6) pdMoving=true; },{passive:true});
  addEventListener('pointerup', e=>{
    if(!active || !inStage(e) || pdMoving || lbOpen() || isUI(e)) return;
    if(performance.now()-pdT>500) return;
    const hit=pickAt(e.clientX,e.clientY);
    if(hit && onPickCb) onPickCb(hit,e.clientX,e.clientY);
  },{passive:true});

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden) resize();
  });
}

/* ═══ 投影 ═══ */
const _v=new THREE.Vector3();
function toScreen(wx,wy,wz){
  camera.updateMatrixWorld();
  _v.set(wx,wy,wz).project(camera);
  const depth=_v.z;
  if(depth>1 || depth<-1) return {x:-9999,y:-9999,depth,clip:999};
  return {x:(_v.x*0.5+0.5)*innerWidth, y:(0.5-_v.y*0.5)*innerHeight, depth:(depth+1)*0.5, clip:Math.hypot(_v.x,_v.y)};
}

/* 平滑视角切换（页面间 / 程序触发） */
function setView(v, dur){
  v=v||{};
  const toAz  = (v.az  !=null)? v.az  : targetAz;
  const toEl  = (v.el  !=null)? clamp(v.el, MIN_EL, MAX_EL) : targetEl;
  distFloor=MIN_DIST;                                  // 页面级取景切换：护栏复位
  const toDist= (v.dist !=null)? clamp(v.dist, MIN_DIST, MAX_DIST) : targetDist;
  targetAz=toAz; targetEl=toEl; targetDist=toDist;
  tween = (dur && dur>0) ? { f0:az, e0:el, d0:dist, f1:toAz, e1:toEl, d1:toDist, t0:performance.now(), dur:dur } : null;
}
function getView(){ return { az, el, dist, panX, panY, panZ }; }

/* ═══ 公开接口 ═══ */
window.Space3D={
  init(opts){
    if(started) return; started=true;
    try{
      opts=opts||{};
      explore=document.body.dataset.explore==='1';
      gallery=document.body.dataset.gallery==='1';
      showHeart=!!opts.heart;
      quiet = !explore && !gallery;          // 子页：不渲染实时宇宙，仅用 CSS 深空背景，省下整个 WebGL 上下文
      cv=document.getElementById('space');
      if(!cv || !window.THREE){ if(cv) cv.style.display='none'; return; }
      if(quiet){                              // 子页跳过 WebGL：避免每张子页都常驻一个 WebGL 上下文（卡顿主因）
        cv.style.display='none';
        return;
      }
      try{
        renderer=new THREE.WebGLRenderer({canvas:cv, alpha:true, antialias:false, premultipliedAlpha:true, powerPreference:'high-performance'});
      }catch(e){ if(cv) cv.style.display='none'; return; }
      renderer.setClearColor(0x000000,0);
      scene=new THREE.Scene();
      camera=new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 700);
      // 环绕轨道初值（相机在星系之外观察完整螺旋）
      az=0; el=DEF_EL; dist=targetDist=MOBILE?120:96; targetAz=0; targetEl=DEF_EL;
      active = explore || gallery;
      // 漫游激活时给 html 加 rd-roam：禁用浏览器手势抢占，拖拽 1:1 跟手（仅沉浸式页启用，不影响子页滚动）
      document.documentElement.classList.toggle('rd-roam', active);
      camera.position.set(0,0,1);   // 占位，frame() 每帧重算
      raycaster=new THREE.Raycaster(); _ndc=new THREE.Vector2();

      // 光照（让星球有体积感，但星球用 Basic 保持颜色稳定）
      scene.add(new THREE.AmbientLight(0xffffff, 0.30));
      const sun=new THREE.DirectionalLight(0xfff4e6, 1.0);
      sun.position.set(20,30,20); scene.add(sun);

      envGroup=new THREE.Group(); envGroup.rotation.order='YXZ'; scene.add(envGroup);
      contentGroup=new THREE.Group(); scene.add(contentGroup); contentGroup.renderOrder=10;

      buildStars();
      buildCoreGlow();
      petalGrp=buildPetals();
      buildNebula();
      buildDust();

      starMat=new THREE.ShaderMaterial({
        uniforms:{
          uTime:{value:0}, uTintR:{value:1}, uTintG:{value:1}, uTintB:{value:1},
          uAlpha:{value:1}, uAmb:{value:0.16}, uLightStr:{value:0.78},
          uFog:{value:0.010}, uPx:{value:3.6}
        },
        vertexShader:VS, fragmentShader:FS,
        transparent:true, depthTest:true, depthWrite:false,
        blending:THREE.AdditiveBlending
      });
      starPoints=new THREE.Points(starGeo, starMat);
      starPoints.frustumCulled=false;
      envGroup.add(starPoints);

      resize(); bindInput();
      // 按页面选择取景预设，做平滑入场过渡（所有页面统一的优质 3D 背景）
      const pgName=(location.pathname.split('/').pop()||'index.html').toLowerCase();
      setView(VIEWS[pgName]||{az:0.3,el:0.5,dist:100}, 1500);
      window.rdBurst=function(){ pulse=1.4; };
      if(TOUCH && explore) window.Space3D.setRoam(true);
      frame();
    }catch(e){ console.error('[space3d] init error', e); }
  },
  setContents,
  setPhotoWall,
  setView,
  getView,
  /* 滚动推进：0..1 的页面进度映射到相机推近（穿行感）。传 null 关闭。 */
  setScrollTravel(p){ scrollProg = (p == null) ? -1 : clamp(p, 0, 1); },
  /* 点击星点飞入：相机沿该星所在射线停到它外侧 gap 处并注视它，
     背后即是星系核心 —— 星体占屏约三分之一，真正“飞到眼前”。
     注意：相机始终绕世界原点公转（position 由 az/el/cd 决定，pan 只改注视点），
     所以镜头到星体的真实距离是 |cd - R|，必须按 cd = R + gap 反解，不能直接给“距离”。 */
  flyTo(w, dur){
    if(!started) return;
    dur = dur || 1.0;
    const R    = Math.hypot(w.x, w.y, w.z) || 1;
    const gap  = MOBILE ? 17 : 14;                       // 期望的镜头—星体间距
    const tAz  = Math.atan2(w.x, w.z);
    const tEl  = clamp(Math.asin(clamp(w.y / R, -1, 1)), MIN_EL, MAX_EL);
    const tDist= clamp(R + gap, 16, MAX_DIST);
    preFly = { az: targetAz, el: targetEl, dist: targetDist, pan: [panX, panY, panZ], c: focusC.slice() };
    focusC = [w.x, w.y, w.z];                            // 平移夹取改以该星为圆心
    distFloor = Math.min(MIN_DIST, tDist - 6);           // 临时下放护栏，留出继续凑近的余量
    tween = {
      f0: az, e0: el, d0: dist,
      f1: tAz, e1: tEl, d1: tDist,
      p0: [panX, panY, panZ], p1: [w.x, w.y, w.z],
      t0: performance.now(), dur: dur
    };
  },
  /* 关闭卡片后原路返回：回到飞入前的机位，形成完整的“靠近—阅读—退开”镜头闭环 */
  flyBack(dur){
    if(!started || !preFly) return;
    const s = preFly; preFly = null; focusC = s.c; distFloor = MIN_DIST;
    tween = {
      f0: az, e0: el, d0: dist,
      f1: s.az, e1: s.el, d1: s.dist,
      p0: [panX, panY, panZ], p1: s.pan,
      t0: performance.now(), dur: dur || 1.0
    };
  },
  enter(){
    if((!explore && !gallery) || REDUCED) return;
    tween=null;
    enterOn=true; enterT0=performance.now(); enterFrom=MOBILE?34:26;
  },
  setRoam(on){
    roam=!!on;
    document.documentElement.classList.toggle('rd-roam', on || gallery);
    tween=null;
    if(!on){ targetAz=0; targetEl=DEF_EL; targetDist=MOBILE?120:96; dragOn=false; }
  },
  setActive(b){ active=!!b; document.documentElement.classList.toggle('rd-roam', active); },
  isRoam(){ return roam; },
  toScreen,
  pulse(){ pulse=1.4; },
  setOnPick(cb){ onPickCb=cb; },
  setOnHover(cb){ onHoverCb=cb; }
};

})();
