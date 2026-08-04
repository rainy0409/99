# v20 · 时间线排序 + 加入《别怕变老》+ 影像页 GSAP 新展示 · 完成概述

## 完成内容

针对用户最新 3 点指令：① 时间线日期顺序不对；② 加入《别怕变老》；③ 首页与影像页照片展示效果相同，改一个并用 GSAP 换新奇展示。

### 1. 时间线日期顺序
- **根因**：`days.html` 与 `galaxy.js` 的 `MILES` 数组混用 `2026.05.05`、`4 月 9 日`、`第 99 天` 等不可排序格式，导致生日被错误地插在 520 与 99 天之间。
- **修复**：将 `MILES` 改为对象 `{d:'ISO 日期', dt:'显示标签', t:'标题', x:'描述'}`，按 `d` 升序排列后再渲染。
- **新顺序**：`2026.05.05 → 2026.05.20 → 第 99 天(2026.08.11) → 2027.04.09（生日） → 2027.05.05（一周年） → 第 999 天(2029.01.27)`。
- `galaxy.js` 同步调整 `LABEL.mile` 读取 `payload.dt`，保证 3D 星体 tooltip 与横向时间线一致。

### 2. 加入《别怕变老》
- 将 `E:/浏览器下载/【𝐇𝐢-𝐑𝐞𝐬无损音质】｜《别怕变老》- 王以太,艾热AIR ..._音频.mp4` 复制到 `assets/music/bpbl.mp4`（6.7 MB，`ftyp/isom` 验证通过）。
- 把原有单轨播放器扩展为双曲歌单：
  - 曲 1：**别怕变老 · 王以太 / 艾热**（默认）
  - 曲 2：**特别的人 · 方大同**
- `core.js` 中 `#pl` 增加下一首按钮 `#pn`，点击切换曲目并自动播放；黑胶按钮保持播放/暂停。
- **修复子页播放器不可见**：`initLoader` 在非首页（无 `#enterGate`）的页面加载完成后自动给 `body` 加 `entered` 类，使 `#pl/#top/#nav` 等全局控件在子页正常显示，真正跨页延续。

### 3. 影像页 GSAP 新展示
- `gallery.html` 默认视图从「3D 相册墙」改为「时光胶片」。
- 新增 **GSAP ScrollTrigger 钉住横向卷动的立体封面流**：
  - 26 张照片组成横向胶片轨道，滚动时轨道水平 scrub；
  - 每张卡片按距屏幕中心距离实时计算 `rotateY` + `scale`（coverflow）；
  - 卡片内图片做缓慢的 Ken Burns 缩放漂移；
  - hover 时相框放大、边框高亮；
  - 点击卡片仍打开既有的 lightbox；
  - 移动端 / 减少动效环境自动降级为原生横向滚动。
- 保留「太空相册」作为可切换的 3D 视图，但默认不再与首页 3D 宇宙撞效果。

## 验证结果
- `node --check`：`core.js` / `galaxy.js` 语法通过。
- `node .check.js`：全绿。
- 无头 Edge 探测：
  - 时间线顺序正确，0 JS 错误；
  - `gallery.html` 默认显示 filmstrip，26 张卡片，coverflow `rotateY` 生效，scrub 位移 `-789px`；
  - 音乐初始 `bpbl.mp4` / "别怕变老"，点击下一首切换为 `our-song.m4a` / "特别的人"；
  - 6 页 smoke：0 JS 错误。

---

# v19 · 用户 4 点反馈的精准修复 · 完成概述

## 完成内容

针对用户最新 4 点指令逐一深度修复：① 故事页一直卡，深度思考修改；② 后面背景差点意思；③ 附图横分割线太丑（不要）；④ 每个小模型都要精致无比，先 3D 建模后加入，必须非常完美、非常顺滑。

### 1. 故事页卡顿（三处叠加根因，逐一根治）
- **常驻视差循环**：`core.js` 的 `initDepth()` 原本每页都跑永久 `requestAnimationFrame` 做场景视差。改为：`if (TOUCH || REDUCED) return;` 且非 explore/gallery 页面（`body.dataset.explore !== '1' && body.dataset.gallery !== '1'`）直接 `return`——故事/纪念日/私语/信等安静内容页不再跑常驻视差 rAF。
- **昂贵高斯模糊**：`main.css` 的 `.atmo` 原 `filter:blur(90px)` + `mix-blend-mode:screen` 长期动画 = 每帧昂贵的高斯模糊合成。改为 `radial-gradient` 柔光实现（去掉 blur，外观仍是弥散光晕，合成成本极低），故事页滚动明显更顺滑。
- **mousemove 布局抖动**：`core.js` 的 `initTilt()` 原在 `mousemove` 每次执行 `getBoundingClientRect()` 触发强制回流。改为 `mouseenter` 时缓存包围盒、滚动时失效、离开时清空，mousemove 只做轻量算术。

### 2. 背景「差点意思」（富集深空）
- `space3d.js` 安静页星数 1700 → 2100（桌面）/ 1100（移动）。
- `buildCoreGlow()` 提亮安静页核心辉光，并新增宽幅大气晕（更大半径、低透明度）。
- `buildNebula()` 系数 `quiet 0.55 → 0.7`，新增 2 个星团 + 一条银河带（milky-way band），体积感更强。
- 双旋臂末端新增 10 颗 beacon 亮星，作为视觉锚点，让深处也有可停留的焦点。

### 3. 丑分割线（替换为精致菱形星标）
- 用户附图 `Clipboard_Screenshot.png` 中的横分割线（模型无法读取图像，已通过 CSS 定位为 `.sh .rule` / `.phero .rule` 的「1px 渐变贯通线 + 发光圆点」）。
- 改为**居中菱形星标**：9px 玫瑰色菱形 + 4px 白色星芯，带柔光，克制且不割裂画面，符合上市级克制美学。

### 4. 精致 3D 模型（canvas 精灵 → 真实 Three.js 几何）
- `space3d.js` 新增 `buildModel(d)`，用真实几何替代表情贴图内容对象：
  - **photo**：圆角 `ExtrudeGeometry` 相框（带 hole）+ `PlaneGeometry` 照片 + 玻璃面，异步加载贴图到 `group.userData.photoMat`。
  - **line**：宝石 `IcosahedronGeometry` + `TorusGeometry` 光环（`userData.spinRing` 自转）。
  - **mile**：5 角 `extrudeStarShape` 立体星（`userData.spin` 自转）。
  - **portal**：双层 `TorusGeometry` + `CircleGeometry` 圆盘。
  - **letter**：`BoxGeometry` 信封体 + 三角 `ShapeGeometry` 翻盖 + `SphereGeometry` 火漆。
  - fallback：`SphereGeometry`。
  - 每个模型加 `addHalo` 加法 Sprite 辉光（renderOrder 9）模拟 bloom；`grp.traverse(o=>{o.userData.data=d})` 供 Raycaster 回查。
- `setContents` / `setPhotoWall` 改写为用 `buildModel` 并 `ITEMS.push({obj:grp,data:d})`；`clearContents` 递归 dispose 几何/材质；`pickAt` 改用 `raycaster.intersectObjects(ITEMS.map(i=>i.obj), true)` 后回查 `userData.data`；`frame()` 内容循环做平滑自转 + 进场缩放缓动，确保「非常顺滑」。
- 删除无用的 `makeOrbTex` 与孤儿 `starShape`（内容已为真几何）。

## 验证结果
- `node --check assets/js/space3d.js` ✓
- `node --check assets/js/core.js` ✓
- `node --check assets/js/galaxy.js` ✓
- `node .check.js` 全绿 ✓
- 无头 Edge（swiftshader）**6 页 smoke ALL PASS**：Space3D 在、`canvas` 正常、`getView` 有限、`setView` 补间到达、loader 正常隐藏、**0 个 JS 错误** ✓
- 新增 `_probe_models.js` 显式探测 5 类模型（photo/line/mile/portal/letter）均成功构建渲染：`PROBE OK | count=5 | errs=0` ✓（临时探针事后已清理，本地预览服务已停止）

## 关键决策
- **卡顿必须多源根治**：故事页「一直卡」并非单点 bug，而是「常驻视差 rAF + 每帧 blur 合成 + mousemove 强制回流」三者叠加；任一不修都会让阅读页掉帧，故三处一起改。
- **分割线美学**：用「克制菱形星标」替代「贯通硬线」，契合上市级极简精致调性，且不破坏深空背景的连续感。
- **模型升级路线**：把内容对象从 canvas 精灵升级为真实 Three.js 几何（Extrude / Icosahedron / Torus / Box / Circle），既满足「先 3D 建模后加入、精致无比」的要求，又保留原生 Raycaster 稳定拾取 + 平滑自转 + 加法辉光 bloom。

## 后续可选项
- 可在真实 GPU 浏览器中逐类微调模型尺寸/材质（metalness/roughness/emissive），进一步贴近「上市级」质感。
- 若接受把 3D 背景改为不透明，可进一步接入真实 UnrealBloomPass 后期，辉光强度会更强。
- 可继续微调各页面相机 preset，使星系核心不总压在标题正后方。

---

# v19.1 · 照片框与传送门精修

## 完成内容

针对用户新反馈：① 首页/照片页照片展示不清楚、只有一个角度能看到、相框不立体且丑；② 截图中的 portal 模型太丑。

### 1. 照片框重新设计（`space3d.js` `buildModel('photo')`）
- **始终面向相机**：在 `frame()` 循环中对 `isPhoto` 分组调用 `grp.lookAt(camera.position)`，彻底解决「只有一个角度能看到照片」的问题；照片墙/首页/探索页的照片任意视角都 readable。
- **真实立体厚框**：框厚度从 0.12 提到 0.22，倒角加大，做出真实相框的体积感。
- **香槟金金属材质**：把原来整框涂成品牌粉（#FF6F8D）改为 **香槟金（#E8C268）金属框** + 暗色背板 + 暖白卡纸，只在背后保留品牌色柔光晕，照片不再被框架颜色污染。
- **完整层次**：背板 → 金属外框 → 内卡纸 → 照片平面 → 玻璃反光层，每个元素都是真实几何。
- **清晰度**：照片平面使用 `MeshBasicMaterial` 并在异步加载贴图后 `color.set(0xffffff)`，确保照片亮度稳定；占位态为深灰，不抢眼。

### 2. 传送门重新设计（`space3d.js` `buildModel('portal')`）
- **晶体外环**：白色金属 `TorusGeometry` + 品牌色自发光勾边，替代原来单调的粉色胖圆环。
- **旋转能量环**：内部倾斜半透明环持续旋转。
- **旋涡盘面**：新增程序化 `makeSwirlTex()` 生成螺旋能量贴图，`AdditiveBlending` + `DoubleSide`，门内有「吸进去」的漩涡感。
- **亮核 + 能量粒子**：中心亮白小球 + 环周 8 颗能量粒子，增强层次和光感。
- **更强 bloom**： halo 尺寸和透明度都提升，让星门在暗空里更夺目。

### 3. 动画衔接
- 照片 billboard 与既有呼吸/悬停缩放不冲突。
- 传送门新增 `spinDisc` 自转，与 `spinRing` 同向差速旋转，形成动态漩涡。

## 验证结果
- `node --check assets/js/space3d.js` ✓
- `node .check.js` 全绿 ✓
- 无头 Edge 6 页 smoke **ALL PASS（0 JS 错误）** ✓
- 新增 photo+portal 模型探针：`errs=0`，portal/photo 均成功构建且无运行时报错 ✓

## 关键决策
- **照片必须 billboard**：3D 场景中固定朝向的平面照片从侧后方看会完全消失；billboard 是照片墙/内容照片可读性的唯一可靠方案，同时保留立体厚框的侧面体积感。
- **Portal 要「多层 + 自发光 + 旋涡」**：单层圆环被用户评为「太丑」，所以改成晶体外框 + 内旋涡 + 亮核 + 粒子的组合，符合科幻星门的高级感。
- **颜色克制**：相框不再用品牌粉色，改用金属金；品牌色只作为氛围光晕和 portal 能量色出现，避免塑料感。

---

# GSAP 动效层接入（创意美化）

## 安装
- 技能市场安装 `gsap-animation-assistant` v1.0.0（GreenSock 官方，MIT）到 `~/.workbuddy/skills/`。

## 已完成
- **零依赖优雅降级**：`core.js` 动态注入 `gsap@3.12.5` + `ScrollTrigger`（jsdelivr CDN）；失败静默兜底，原站行为不变、绝不报错。
- **① 首页标题逐字弹性浮现**：原 `.h-title .ch` 揭示规则是孤儿代码（从未触发），改为 `initHeroTitle()` 同步拆字 + GSAP `back.out(1.7)` stagger + 轻微旋转；`heroResolved` + 4s 兜底防标题隐身；reduced-motion 直接显示。
- **② 磁吸按钮升级**：`[data-mag]` 由 mousemove 改为 GSAP `quickTo` 弹性跟随；原兜底监听用 `el._magFallback` 跟踪，GSAP 接管时移除，避免重复绑定。
- **③ 滚动视差管道**：`[data-parallax]` 元素接 ScrollTrigger scrub（管道已接好，在 HTML 标注元素即生效）。
- CSS：`.h-title .ch` 去掉默认 `opacity:0`，保证 GSAP 失败标题仍可见。

## 已完成的 7 项高级动效（全部精致落地）
1. **滚动驱动宇宙穿行**：`Space3D.setScrollTravel(p)` + `core.js initScrollCosmos()`，首页滚动把相机沿 z 推近 38 单位，营造「穿过星河」的 dolly。
2. **点击星体镜头飞入**：`flyTo(w,dur)` + `openHot()` 联动；并新增 `flyBack()`，关闭卡片/灯箱时镜头原路返回，形成「靠近—阅读—退开」的完整镜头闭环。
3. **章节 scrub 渐入 + 卡片 shine**：`.sh` 段落逐段 ScrollTrigger scrub fade-in；`.card` hover 扫光。
4. **主题切换色彩补间**：`THEME_PAL` + `tweenTheme()` 用 GSAP 对 CSS 变量做 0.6s 插值，切换不再跳色。
5. **光标星尘粒子**：`#dust` canvas + `initStardust()`，光标拖出粒子，hover 交互元素时粒子向光标汇聚。
6. **横向里程碑时间轴 pin**：`days.html` 插入 `.hztl[data-timeline]`，GSAP ScrollTrigger `pin:true` + scrub 横向滚动。
7. **双击标题爱心爆发 + 数字环形进度**：`initTitleBurst()` 把标题日计数 `#tD` 包成 SVG 进度环；双击标题触发星火+花瓣+宇宙脉冲+环重绘。

## 关键镜头几何修复
- 原 `flyTo` 把 `tDist` 当成「镜头到星体距离」，但相机绕原点公转、pan 只改注视点，真实距离是 `|cd - R|`，导致 R=18 的照片星实际距离 ~42，占屏仅 18%。
- 重写为 `cd = R + gap`（桌面 gap=14 / 移动 gap=17），并引入 `distFloor` 动态护栏，聚焦态可下探、常态保持 `MIN_DIST`。
- tween 方位角改走最短弧；右键平移夹取改以 `focusC` 为圆心。实测照片星占屏 **30.1%**，真正「飞到眼前」。

## 附带修复
- 补上漏调的 `initRain()`，招牌「致下雨天」雨幕全站生效。
- 星座连线升级：虚线流动、节点呼吸发光、深度阈值优化。
- 修正 `bootDom()` 提前同步调用 `initTimeline()` 导致 GSAP 加载前把 `data-tl` 写死、钉住失效的问题；改由 `applyGsap()` 就位后调用。

## 验证
- `node --check`：space3d.js / core.js / galaxy.js 全绿 ✓
- `node .check.js` 全绿 ✓
- `_diag9.js` 无头 Edge 6 页 smoke **ALL PASS（0 JS 错误）** ✓
- `_probe.js` 特性探针全绿：rain/dust/gxline/tring/theme/flyTo（占屏 30.1%）/flyBack/timeline pinned ✓

---

# v20 · 用户 4 点反馈再修复：时间线 / 91 天 / 改动看不见 / 模糊

## 完成内容

针对用户最新 4 点反馈逐一修复并继续打磨精致度。

### 1. 时间线「还是没有」（根因：动态注入的卡片从未被加入 reveal 观察）
- 现象：`days.html` 的横向时间线卡片是 inline 脚本在 `DOMContentLoaded` 后动态注入的 `.rv` 元素，但 `core.js` 的 `initReveal()` 在 `bootDom()` 的 `DOMContentLoaded` 回调中**先执行**，只观察了当时已存在的 `.rv`；新注入的时间线卡片从未被 `IntersectionObserver` 观察，因此永久 `opacity:0`。
- 修复：`initReveal()` 新增 `MutationObserver`，持续观察 `document.body` 子树中新增的 `.rv` / `.mo` / `[data-to]` 元素并补加观察。时间线卡片现在会随滚动正常淡入。
- 同时保留 `initTimeline()` 的 MutationObserver 等待轨道填充逻辑，确保 GSAP pin 在内容就绪后才建立。

### 2. 90 天 → 91 天（首日记为第 1 天）
- `core.js` 新增唯一真源 `daysTogether(when)`：把 `START` 和 `when` 都取到日期边界，计算 `round((b-a)/864e5)+1`，保证 2026-05-05 算第 1 天、2026-08-03 为第 91 天。
- 替换四处原本各自用 `Math.floor((now-START)/864e5)` 的计算：`rdClock` tick / 返回值、标题进度环、双击重绘环、`days.html` 和 `letter.html` 的统计数字。
- 导出 `window.SITE.daysTogether`，供各页统一调用。

### 3. 「改动看不出来」（根因：GSAP 从 jsdelivr CDN 加载，国内网络下迟迟不到）
- 把 `gsap@3.12.5` + `ScrollTrigger` 本地化到 `assets/vendor/gsap.min.js` / `assets/vendor/ScrollTrigger.min.js`。
- 6 个 HTML 页面都在 `<script src="assets/vendor/three.min.js" defer>` 之前以 `<script defer>` 引入本地 GSAP，确保 `core.js` 执行时已经可用。
- `initGsap()` 改为同步检测 `window.gsap && window.ScrollTrigger`，存在立即注册并应用；仅当本地确实缺失时才静默回退 CDN。
- 实测：无头环境下 1.2s 内 `gsap=true`、`ScrollTrigger=true`、pin 已建立、**未回退 CDN**。

### 4. 「太模糊 / 不够精致」（多源综合治理）
- **3D 渲染分辨率**：`space3d.js` `resize()` 把 DPR 上限从 `1.0/1.3/1.6` 提升到 `2.0（移动）/ 2.5（桌面）`，高分屏渲染更锐利。
- **照片贴图精度**：`makePhotoTex()` 用自适应 512/768/1024 canvas（原固定 384）、拉满 `anisotropy`、开启 mipmaps、设置 `sRGB` 色彩空间，斜视角和近景不再拉丝/发虚。
- **内容星分布**：`galaxy.js` 把照片/情话/里程碑/传送门球面半径从 `18/24/30/12` 扩大到 `24/30/36/15`，26 张照片不再挤成一团，呼吸空间更大，单颗星更清晰可辨。
- **模型尺寸**：`space3d.js` 照片 base 从 `2.8` 提到 `3.4`，其他类型等比例微增，近景占屏更饱满。
- **核心辉光过曝**：`buildCoreGlow()` 全层 opacity 降低约 30%–40%，中心白热区从 `0.78` 降到 `0.52`，避免亮核把周围星体/文字洗成一片，整体层次更干净。
- **2D 覆盖层清晰度**：`core.js` 的 `initRain()`、`initStars()`、`initHeartField()` 原本用 CSS 像素渲染画布，在高 DPR 屏上会被浏览器放大发虚。改为与 `initStardust()`/`initMeteor()`/`initSakura()` 一致的 DPR 缩放：canvas 像素尺寸 = CSS 尺寸 × DPR，`ctx.setTransform(dpr,…)`，雨痕、星空、爱心场全部锐利。
- **时间线视觉精致化**：`main.css` 为 `.hz-track` 增加一条贯穿卡片的品牌渐变细线 + 发光阴影；每张卡片顶部加小圆点落在轨道上；卡片 hover 微上浮 + 边框高亮 + 阴影，让「时间线」名副其实且更精致。

## 验证结果
- `node --check assets/js/core.js` ✓
- `node --check assets/js/space3d.js` ✓
- `node --check assets/js/galaxy.js` ✓
- `node .check.js` 全绿 ✓
- `_gsapchk.js`：1.2s 后 `gsap=true` / `ScrollTrigger=true` / `pinned=true` / `回退CDN=false` ✓
- `_measure.js`：`ringDay=91`、`firstCount=91天`、timeline pinned、scrub 位移 0→−757px ✓
- `_diag9.js` 无头 Edge 6 页 smoke **ALL PASS（0 JS 错误）** ✓

## 关键决策
- **动态 reveal 必须全局兜底**：只要页面用 inline 脚本在 DOMContentLoaded 后注入 `.rv`，就需要 MutationObserver 补观察，否则用户看到的永远是「没显示出来」。
- **GSAP 必须本地化**：情侣站主要用户在国内，CDN 不可依赖；本地化后首屏动效 1.2s 内全部就位，改动才「看得见」。
- **模糊是综合感受**：同时提高 3D DPR、贴图精度、内容分布、降低中心光晕、修复 2D 画布 DPR，才能从根上消除「整体模糊」。
- **精致来自克制**：时间线只加一条细线和圆点标记，不做过分装饰；辉光降低而非增强，让内容本身成为焦点。
