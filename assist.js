/* 沙暴行动 · 辅助终端 ASSIST v2
   仅用于本地/局域网自建对局调试。
   v2：去掉自瞄，改为「子弹追踪 + 穿墙」；面板隐藏不再影响透视/功能；触屏可点。 */
(function () {
  'use strict';
  if (window.__cxLoaded) return;
  window.__cxLoaded = true;

  var cfg = {
    esp: true, box: true, hp: true, name: true, dist: true, line: true, linePos: 'bottom',
    track: true, trackRange: 260, trackPart: 'chest', wallbang: true,
    infAmmo: false, speed: 1, god: false, show: true
  };
  try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem('sandstorm.assist.v2') || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem('sandstorm.assist.v2', JSON.stringify(cfg)); } catch (e) {} }

  var engine = null, canvas, ctx, panel, fab;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function buildUI() {
    var style = el('style');
    style.textContent = [
      '#cx-win{position:fixed;right:14px;top:14px;width:268px;z-index:10030;border-radius:16px;',
      'background:rgba(250,251,252,.94);backdrop-filter:blur(26px) saturate(180%);',
      'box-shadow:0 20px 54px rgba(16,20,28,.24),0 1px 0 rgba(255,255,255,.9) inset;',
      'border:1px solid rgba(20,24,32,.10);color:#171a1f;font:500 12px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;',
      'overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:manipulation;display:none}',
      '#cx-win.on{display:block}',
      '#cx-head{display:flex;align-items:center;justify-content:space-between;padding:13px 14px;cursor:move;touch-action:none;',
      'border-bottom:1px solid rgba(20,24,32,.08)}',
      '#cx-head b{font-size:13px;letter-spacing:.02em}',
      '#cx-head small{color:#8a8f98;font-weight:600;letter-spacing:.08em;margin-left:6px}',
      '#cx-hide{width:30px;height:30px;border-radius:15px;border:0;background:rgba(20,24,32,.06);color:#444;cursor:pointer;font-size:14px}',
      '.cx-body{padding:8px 14px 14px;max-height:62vh;overflow:auto;overscroll-behavior:contain}',
      '.cx-sec{margin:12px 0 4px;font-size:11px;letter-spacing:.1em;color:#8a8f98;font-weight:700}',
      '.cx-line{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;min-height:34px}',
      '.cx-line label{color:#3a3f47;font-weight:500}',
      '.cx-sw{width:42px;height:24px;border-radius:12px;border:0;background:#e3e5e9;position:relative;cursor:pointer;flex:0 0 auto;transition:.16s}',
      '.cx-sw i{position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:.16s}',
      '.cx-sw[aria-pressed="true"]{background:#2f6bff}',
      '.cx-sw[aria-pressed="true"] i{left:20px}',
      '.cx-seg{display:flex;gap:4px;background:#eceef2;border-radius:9px;padding:3px}',
      '.cx-seg button{border:0;background:transparent;padding:6px 10px;border-radius:7px;font:600 11px/1 -apple-system,sans-serif;color:#5a6068;cursor:pointer}',
      '.cx-seg button[aria-pressed="true"]{background:#fff;color:#14171c;box-shadow:0 1px 2px rgba(0,0,0,.10)}',
      '.cx-range{display:flex;align-items:center;gap:8px;flex:1;justify-content:flex-end}',
      '.cx-range input{width:100px;accent-color:#2f6bff}',
      '.cx-range output{width:40px;text-align:right;color:#6b717a;font-variant-numeric:tabular-nums}',
      '#cx-esp{position:fixed;inset:0;pointer-events:none;z-index:10010}',
      '#cx-fab{position:fixed;right:14px;top:16px;z-index:10030;height:40px;padding:0 16px;border-radius:20px;border:0;',
      'background:rgba(250,251,252,.94);box-shadow:0 8px 24px rgba(0,0,0,.18);color:#171a1f;font:700 12px/40px -apple-system;cursor:pointer}',
      '#cx-fab.on{display:none}'
    ].join('');
    document.head.appendChild(style);
    canvas = el('canvas'); canvas.id = 'cx-esp'; document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    panel = el('div'); panel.id = 'cx-win';
    function sw(k, label) { return '<div class="cx-line"><label>' + label + '</label><button class="cx-sw" data-k="' + k + '" aria-pressed="' + (cfg[k] ? 'true' : 'false') + '"><i></i></button></div>'; }
    var rows = '';
    rows += '<div class="cx-sec">透视 · ESP</div>' + sw('esp', '总开关') + sw('box', '方框') + sw('hp', '血量') + sw('name', '名字') + sw('dist', '距离') + sw('line', '射线') +
      '<div class="cx-line"><label>射线起点</label><div class="cx-seg" id="cx-linepos"><button data-lp="top">顶部</button><button data-lp="mid">中间</button><button data-lp="bottom">底部</button></div></div>';
    rows += '<div class="cx-sec">子弹追踪</div>' + sw('track', '追踪') + sw('wallbang', '穿墙') +
      '<div class="cx-line"><label>追踪部位</label><div class="cx-seg" id="cx-part"><button data-p="head">头部</button><button data-p="chest">胸部</button></div></div>' +
      '<div class="cx-line"><label>追踪距离</label><div class="cx-range"><input id="cx-trackrange" type="range" min="40" max="500" step="10"><output id="cx-trackrange-v"></output></div></div>';
    rows += '<div class="cx-sec">内存</div>' + sw('infAmmo', '无限弹药') + sw('god', '无敌') +
      '<div class="cx-line"><label>移动速度</label><div class="cx-range"><input id="cx-speed" type="range" min="1" max="5" step=".1"><output id="cx-speed-v"></output></div></div>';

    panel.innerHTML = '<div id="cx-head"><div><b>辅助终端</b><small>SANDSTORM</small></div><button id="cx-hide">–</button></div>' +
      '<div class="cx-body">' + rows + '<div class="cx-sec" id="cx-stat">—</div></div>';
    document.body.appendChild(panel);
    fab = el('button', '', '辅助'); fab.id = 'cx-fab'; fab.classList.toggle('on', cfg.show);
    document.body.appendChild(fab);

    panel.querySelectorAll('.cx-sw').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k'); cfg[k] = !cfg[k];
        b.setAttribute('aria-pressed', cfg[k] ? 'true' : 'false'); sync(); save();
      });
    });
    panel.querySelectorAll('#cx-linepos button').forEach(function (b) {
      b.addEventListener('click', function () { cfg.linePos = b.getAttribute('data-lp'); sync(); save(); });
    });
    panel.querySelectorAll('#cx-part button').forEach(function (b) {
      b.addEventListener('click', function () { cfg.trackPart = b.getAttribute('data-p'); sync(); save(); });
    });
    function slider(id, key, fmt) {
      var i = document.getElementById(id), o = document.getElementById(id + '-v');
      i.value = cfg[key]; o.textContent = fmt(cfg[key]);
      i.addEventListener('input', function () { cfg[key] = +i.value; o.textContent = fmt(cfg[key]); save(); });
    }
    slider('cx-trackrange', 'trackRange', function (v) { return v + 'm'; });
    slider('cx-speed', 'speed', function (v) { return (+v).toFixed(1) + '×'; });
    document.getElementById('cx-hide').addEventListener('click', function (e) { e.stopPropagation(); setShow(false); });
    fab.addEventListener('click', function () { setShow(true); });
    drag(panel, document.getElementById('cx-head'));
    sync(); setShow(cfg.show);
  }

  function sync() {
    if (!panel) return;
    panel.querySelectorAll('.cx-sw').forEach(function (b) { b.setAttribute('aria-pressed', cfg[b.getAttribute('data-k')] ? 'true' : 'false'); });
    panel.querySelectorAll('#cx-linepos button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lp') === cfg.linePos ? 'true' : 'false'); });
    panel.querySelectorAll('#cx-part button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-p') === cfg.trackPart ? 'true' : 'false'); });
  }

  function isTouchDev() {
    return (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
  }

  // 桌面端指针锁定时鼠标点不到面板：开面板先解锁，关面板再锁回去；解锁不触发暂停
  function hookUnlock() {
    if (typeof Input === 'undefined' || !Input.onUnlock || Input.onUnlock.__cxWrapped) return;
    var orig = Input.onUnlock;
    Input.onUnlock = function () {
      if (Input.__cxPanel) return;
      return orig.apply(this, arguments);
    };
    Input.onUnlock.__cxWrapped = true;
  }

  function setShow(on) {
    cfg.show = on;
    panel.classList.toggle('on', on);
    fab.classList.toggle('on', on);
    save();
    if (!isTouchDev() && typeof Input !== 'undefined') {
      try {
        hookUnlock();
        if (on) {
          Input.__cxPanel = true;
          if (Input.unlock) Input.unlock();
        } else {
          Input.__cxPanel = false;
          var g = engine && engine.game;
          if (g && !engine.paused && Input.lock) Input.lock();
        }
      } catch (e) {}
    }
  }

  function drag(win, handle) {
    var sx = 0, sy = 0, ox = 0, oy = 0, on = false, pid = null;
    handle.addEventListener('pointerdown', function (e) {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      on = true; pid = e.pointerId; sx = e.clientX; sy = e.clientY;
      var r = win.getBoundingClientRect();
      ox = r.left; oy = r.top; win.style.right = 'auto'; win.style.left = r.left + 'px'; win.style.top = r.top + 'px';
      try { handle.setPointerCapture(pid); } catch (err) {}
      e.preventDefault();
    });
    handle.addEventListener('pointermove', function (e) {
      if (!on) return;
      win.style.left = Math.max(4, ox + e.clientX - sx) + 'px';
      win.style.top = Math.max(4, oy + e.clientY - sy) + 'px';
    });
    function up() { on = false; pid = null; }
    handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
  }

  /* ---------------------------------------------------------------- ESP */
  var _v = null;
  function drawESP() {
    var W = innerWidth, H = innerHeight;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    var g = engine && engine.game;
    if (!cfg.esp || !g || !g.actors || !g.camera) return;
    var cam = g.camera, me = g.player;
    if (!window.THREE) return;
    if (!_v) _v = new THREE.Vector3();

    function toScreen(x, y, z) {
      _v.set(x, y, z).project(cam);
      if (_v.z < -1 || _v.z > 1) return null;
      return { x: (_v.x * .5 + .5) * W, y: (-_v.y * .5 + .5) * H };
    }

    for (var i = 0; i < g.actors.length; i++) {
      var a = g.actors[i];
      if (!a.alive || a === me || (me && a.team === me.team)) continue;
      var eh = a.ducked ? 1.35 : 1.72;
      var head = toScreen(a.pos.x, a.pos.y + eh, a.pos.z);
      var feet = toScreen(a.pos.x, a.pos.y + .05, a.pos.z);
      if (!head || !feet) continue;
      var h = Math.max(18, feet.y - head.y), w = h * .42;
      var x = head.x - w / 2, y = head.y;
      var dist = me ? Math.hypot(a.pos.x - me.pos.x, a.pos.y - me.pos.y, a.pos.z - me.pos.z) : 0;

      if (cfg.line) {
        var ox = W / 2, oy = cfg.linePos === 'top' ? 0 : cfg.linePos === 'mid' ? H / 2 : H;
        ctx.strokeStyle = 'rgba(47,107,255,.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(head.x, head.y + h * .45); ctx.stroke();
      }
      if (cfg.box) { ctx.strokeStyle = 'rgba(47,107,255,.9)'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h); }
      if (cfg.hp) {
        var hp = Math.max(0, a.hp) / 100;
        ctx.fillStyle = 'rgba(20,24,32,.18)'; ctx.fillRect(x, y - 6, w, 3);
        ctx.fillStyle = hp > .5 ? '#2f6bff' : hp > .25 ? '#f0a020' : '#e5484d';
        ctx.fillRect(x, y - 6, w * hp, 3);
      }
      if (cfg.name) { ctx.font = '600 11px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(10,12,16,.85)'; ctx.fillText(a.name || '敌人', head.x, y - 11); }
      if (cfg.dist) { ctx.font = '500 10px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(90,96,104,.95)'; ctx.fillText(Math.round(dist) + 'm', head.x, y + h + 12); }
    }
  }

  /* ---------------------------------------------------------------- 子弹追踪 */
  function installTrack(g) {
    if (!g || g.__cxTrack) return;
    g.__cxTrack = true;
    var orig = g.fireBullet.bind(g);
    g.fireBullet = function (sh, o, d, def) {
      if (cfg.track && sh && sh === this.player && sh.alive) {
        var t = pickTarget(this, sh, o);
        if (t) {
          var dx = t.x - o.x, dy = t.y - o.y, dz = t.z - o.z;
          var L = Math.hypot(dx, dy, dz);
          if (L > .001) { dx /= L; dy /= L; dz /= L; d.set(dx, dy, dz); }
        }
        if (cfg.wallbang && def && (def.pen || 0) < 6) def = Object.assign({}, def, { pen: 6 });
      }
      return orig(sh, o, d, def);
    };
  }

  function pickTarget(g, sh, o) {
    var best = null, bestD = 1e9;
    for (var i = 0; i < g.actors.length; i++) {
      var a = g.actors[i];
      if (!a.alive || a === sh || a.team === sh.team) continue;
      var h = a.ducked ? 1.2 : 1.62;
      var ty = a.pos.y + (cfg.trackPart === 'head' ? h + .12 : h * .72);
      var dist = Math.hypot(a.pos.x - o.x, ty - o.y, a.pos.z - o.z);
      if (dist > cfg.trackRange) continue;
      if (dist < bestD) { bestD = dist; best = { x: a.pos.x, y: ty, z: a.pos.z }; }
    }
    return best;
  }

  /* ---------------------------------------------------------------- 逻辑 */
  function tick() {
    var g = engine && engine.game;
    if (!g || !g.player) return;
    installTrack(g);
    if (g.infiniteAmmo !== cfg.infAmmo) g.infiniteAmmo = cfg.infAmmo;
    var p = g.player;
    p.velMod = Math.max(1, cfg.speed);
    if (cfg.god) { p.hp = 100; if (p.armor < 100) p.armor = 100; }
    var st = document.getElementById('cx-stat');
    if (st) st.textContent = '敌人 ' + enemies(g).length + ' · 追踪 ' + (cfg.track ? '开' : '关') + ' · 穿墙 ' + (cfg.wallbang ? '开' : '关');
  }

  function enemies(g) {
    var me = g.player, out = [];
    for (var i = 0; i < g.actors.length; i++) { var a = g.actors[i]; if (a.alive && a !== me && a.team !== me.team) out.push(a); }
    return out;
  }

  function loop(t) {
    requestAnimationFrame(loop);
    engine = window.__engine || engine;
    if (!engine || !panel) return;
    tick();
    drawESP();
  }

  function boot() {
    engine = window.__engine;
    if (!engine) { setTimeout(boot, 100); return; }
    buildUI();
    requestAnimationFrame(loop);
    document.addEventListener('keydown', function (e) { if (e.code === 'F8') { e.preventDefault(); setShow(!cfg.show); } });
    console.log('[assist] sandstorm assist v2 ready');
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 300);
  else window.addEventListener('load', function () { setTimeout(boot, 300); });
})();
