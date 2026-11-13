/* 沙暴行动 · 辅助终端 ASSIST v1
   仅用于本地/局域网自建对局调试。 */
(function () {
  'use strict';
  if (window.__cxLoaded) return;
  window.__cxLoaded = true;

  var cfg = {
    esp: true, box: true, hp: true, name: true, dist: true, line: true,
    linePos: 'bottom', aim: false, aimFov: 70, aimRange: 260,
    infAmmo: false, speed: 1, god: false, show: true
  };
  try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem('sandstorm.assist.v1') || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem('sandstorm.assist.v1', JSON.stringify(cfg)); } catch (e) {} }

  var engine = null, canvas, ctx, panel, fab, lastState = '';

  function tip(t) {
    var g = engine && engine.game;
    if (g && g.hud) { try { g.hud.center && g.hud.center(t); } catch (e) {} }
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ---------------------------------------------------------------- 面板 */
  function buildUI() {
    var style = el('style');
    style.textContent = [
      '#cx-win{position:fixed;right:16px;top:16px;width:264px;z-index:10001;border-radius:16px;',
      'background:rgba(252,252,253,.92);backdrop-filter:blur(24px) saturate(180%);',
      'box-shadow:0 18px 50px rgba(20,24,32,.22),0 1px 0 rgba(255,255,255,.9) inset;',
      'border:1px solid rgba(20,24,32,.10);color:#171a1f;font:500 12px/1.5 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;',
      'overflow:hidden;user-select:none;display:none}',
      '#cx-win.on{display:block}',
      '#cx-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;cursor:move;',
      'border-bottom:1px solid rgba(20,24,32,.08)}',
      '#cx-head b{font-size:13px;letter-spacing:.02em}',
      '#cx-head small{color:#8a8f98;font-weight:600;letter-spacing:.08em;margin-left:6px}',
      '#cx-hide{width:22px;height:22px;border-radius:11px;border:0;background:rgba(20,24,32,.06);color:#555;cursor:pointer;font-size:12px}',
      '.cx-body{padding:10px 14px 14px;max-height:60vh;overflow:auto}',
      '.cx-sec{margin:10px 0 4px;font-size:11px;letter-spacing:.1em;color:#8a8f98;font-weight:700}',
      '.cx-line{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;min-height:28px}',
      '.cx-line label{color:#3a3f47;font-weight:500}',
      '.cx-sw{width:38px;height:22px;border-radius:11px;border:0;background:#e3e5e9;position:relative;cursor:pointer;flex:0 0 auto;transition:.16s}',
      '.cx-sw i{position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:9px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:.16s}',
      '.cx-sw[aria-pressed="true"]{background:#2f6bff}',
      '.cx-sw[aria-pressed="true"] i{left:18px}',
      '.cx-seg{display:flex;gap:4px;background:#eceef2;border-radius:9px;padding:3px}',
      '.cx-seg button{border:0;background:transparent;padding:4px 9px;border-radius:7px;font:600 11px/1 -apple-system,sans-serif;color:#5a6068;cursor:pointer}',
      '.cx-seg button[aria-pressed="true"]{background:#fff;color:#14171c;box-shadow:0 1px 2px rgba(0,0,0,.10)}',
      '.cx-range{display:flex;align-items:center;gap:8px;flex:1;justify-content:flex-end}',
      '.cx-range input{width:110px;accent-color:#2f6bff}',
      '.cx-range output{width:38px;text-align:right;color:#6b717a;font-variant-numeric:tabular-nums}',
      '#cx-esp{position:fixed;inset:0;pointer-events:none;z-index:10000}',
      '#cx-fab{position:fixed;right:16px;bottom:20px;z-index:10001;width:44px;height:44px;border-radius:22px;border:0;',
      'background:rgba(252,252,253,.94);box-shadow:0 8px 24px rgba(0,0,0,.18);color:#171a1f;font:700 12px/44px -apple-system;cursor:pointer}',
      '#cx-fab.on{display:none}'
    ].join('');
    document.head.appendChild(style);
    canvas = el('canvas'); canvas.id = 'cx-esp'; document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');

    panel = el('div'); panel.id = 'cx-win';
    var rows = '';
    function sw(k, label) {
      return '<div class="cx-line"><label>' + label + '</label><button class="cx-sw" data-k="' + k + '" aria-pressed="' + (cfg[k] ? 'true' : 'false') + '"><i></i></button></div>';
    }
    rows += '<div class="cx-sec">透视 · ESP</div>' + sw('esp', '总开关') + sw('box', '方框') + sw('hp', '血量') +
      sw('name', '名字') + sw('dist', '距离') + sw('line', '射线') +
      '<div class="cx-line"><label>射线起点</label><div class="cx-seg" id="cx-linepos">' +
      '<button data-lp="top">顶部</button><button data-lp="mid">中间</button><button data-lp="bottom">底部</button></div></div>';
    rows += '<div class="cx-sec">自瞄</div>' + sw('aim', '开启') +
      '<div class="cx-line"><label>视角范围</label><div class="cx-range"><input id="cx-aimfov" type="range" min="10" max="180" step="5"><output id="cx-aimfov-v"></output></div></div>' +
      '<div class="cx-line"><label>锁定距离</label><div class="cx-range"><input id="cx-aimrange" type="range" min="40" max="500" step="10"><output id="cx-aimrange-v"></output></div></div>';
    rows += '<div class="cx-sec">内存</div>' + sw('infAmmo', '无限弹药') + sw('god', '无敌') +
      '<div class="cx-line"><label>移动速度</label><div class="cx-range"><input id="cx-speed" type="range" min="1" max="5" step=".1"><output id="cx-speed-v"></output></div></div>';

    panel.innerHTML = '<div id="cx-head"><div><b>辅助终端</b><small>SANDSTORM</small></div><button id="cx-hide">–</button></div>' +
      '<div class="cx-body">' + rows +
      '<div class="cx-sec" id="cx-stat">—</div></div>';
    document.body.appendChild(panel);
    fab = el('button', '', '辅助'); fab.id = 'cx-fab'; fab.classList.toggle('on', cfg.show);
    document.body.appendChild(fab);

    // 事件
    panel.querySelectorAll('.cx-sw').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        cfg[k] = !cfg[k];
        b.setAttribute('aria-pressed', cfg[k] ? 'true' : 'false');
        sync();
        save();
      });
    });
    panel.querySelectorAll('#cx-linepos button').forEach(function (b) {
      b.addEventListener('click', function () {
        cfg.linePos = b.getAttribute('data-lp'); sync(); save();
      });
    });
    function slider(id, key, fmt) {
      var i = document.getElementById(id), o = document.getElementById(id + '-v');
      i.value = cfg[key]; o.textContent = fmt(cfg[key]);
      i.addEventListener('input', function () { cfg[key] = +i.value; o.textContent = fmt(cfg[key]); save(); });
    }
    slider('cx-aimfov', 'aimFov', function (v) { return v + '°'; });
    slider('cx-aimrange', 'aimRange', function (v) { return v + 'm'; });
    slider('cx-speed', 'speed', function (v) { return (+v).toFixed(1) + '×'; });
    document.getElementById('cx-hide').addEventListener('click', function (e) { e.stopPropagation(); setShow(false); });
    fab.addEventListener('click', function () { setShow(true); });
    drag(panel, document.getElementById('cx-head'));
    setShow(cfg.show);
  }

  function sync() {
    panel.querySelectorAll('.cx-sw').forEach(function (b) {
      b.setAttribute('aria-pressed', cfg[b.getAttribute('data-k')] ? 'true' : 'false');
    });
    panel.querySelectorAll('#cx-linepos button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lp') === cfg.linePos ? 'true' : 'false');
    });
  }

  function setShow(on) {
    cfg.show = on;
    panel.classList.toggle('on', on);
    fab.classList.toggle('on', on);
    canvas.style.display = on ? 'block' : 'none';
    if (!on) { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    save();
  }

  function drag(win, handle) {
    var sx = 0, sy = 0, ox = 0, oy = 0, on = false;
    handle.addEventListener('pointerdown', function (e) {
      on = true; sx = e.clientX; sy = e.clientY;
      var r = win.getBoundingClientRect();
      ox = r.left; oy = r.top; win.style.right = 'auto'; win.style.left = r.left + 'px'; win.style.top = r.top + 'px';
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', function (e) {
      if (!on) return;
      win.style.left = Math.max(4, ox + e.clientX - sx) + 'px';
      win.style.top = Math.max(4, oy + e.clientY - sy) + 'px';
    });
    handle.addEventListener('pointerup', function () { on = false; });
  }

  /* ---------------------------------------------------------------- ESP */
  var _v = null;
  function drawESP() {
    var W = innerWidth, H = innerHeight;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    ctx.clearRect(0, 0, W, H);
    var g = engine && engine.game;
    if (!cfg.show || !cfg.esp || !g || !g.actors || !g.camera) return;
    var cam = g.camera, proj = cam.projectionMatrix;
    var me = g.player;
    if (!_v && window.THREE) _v = new THREE.Vector3();
    if (!_v) return;

    function toScreen(x, y, z) {
      _v.set(x, y, z).project(cam);
      if (_v.z < -1 || _v.z > 1) return null;
      return { x: (_v.x * .5 + .5) * W, y: (-_v.y * .5 + .5) * H };
    }

    for (var i = 0; i < g.actors.length; i++) {
      var a = g.actors[i];
      if (!a.alive || a === me || (me && a.team === me.team)) continue;
      var eye = a.pos.y + (a.ducked ? 1.35 : 1.72);
      var head = toScreen(a.pos.x, eye, a.pos.z);
      var feet = toScreen(a.pos.x, a.pos.y + .05, a.pos.z);
      if (!head || !feet) continue;
      var h = Math.max(18, feet.y - head.y);
      var w = h * .42;
      var x = head.x - w / 2, y = head.y;
      var dist = Math.hypot(a.pos.x - me.pos.x, a.pos.y - me.pos.y, a.pos.z - me.pos.z);

      if (cfg.line) {
        var ox = W / 2, oy = cfg.linePos === 'top' ? 0 : cfg.linePos === 'mid' ? H / 2 : H;
        ctx.strokeStyle = 'rgba(47,107,255,.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(head.x, head.y + h * .45); ctx.stroke();
      }
      if (cfg.box) {
        ctx.strokeStyle = 'rgba(47,107,255,.9)'; ctx.lineWidth = 1.2;
        ctx.strokeRect(x, y, w, h);
      }
      if (cfg.hp) {
        var hp = Math.max(0, a.hp) / 100;
        ctx.fillStyle = 'rgba(20,24,32,.18)'; ctx.fillRect(x, y - 6, w, 3);
        ctx.fillStyle = hp > .5 ? '#2f6bff' : hp > .25 ? '#f0a020' : '#e5484d';
        ctx.fillRect(x, y - 6, w * hp, 3);
      }
      if (cfg.name) {
        ctx.font = '600 11px -apple-system, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(10,12,16,.85)';
        ctx.fillText(a.name || '敌人', head.x, y - 11);
      }
      if (cfg.dist) {
        ctx.font = '500 10px -apple-system, sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(90,96,104,.95)';
        ctx.fillText(Math.round(dist) + 'm', head.x, y + h + 12);
      }
    }
  }

  /* ---------------------------------------------------------------- 逻辑 */
  function tick(dt) {
    var g = engine && engine.game;
    if (!g || !g.player) return;
    if (g.infiniteAmmo !== cfg.infAmmo) g.infiniteAmmo = cfg.infAmmo;
    var p = g.player;
    if (cfg.speed > 1) p.velMod = Math.max(1, cfg.speed);
    if (cfg.god) {
      p.hp = 100;
      if (p.armor < 100) p.armor = 100;
    }
    if (cfg.aim) aimAt(g, p);
    document.getElementById('cx-stat').textContent = '弹药 ' + (p.weapon ? (p.weapon.mag ?? '?') : '?') + ' / ' + (p.weapon ? (p.weapon.reserve ?? '?') : '?') + ' · 敌人 ' + enemies(g).length;
  }

  function enemies(g) {
    var me = g.player, out = [];
    for (var i = 0; i < g.actors.length; i++) {
      var a = g.actors[i];
      if (a.alive && a !== me && a.team !== me.team) out.push(a);
    }
    return out;
  }

  function aimAt(g, p) {
    var list = enemies(g), best = null, bestA = 1e9;
    var fw = p.forward(new (window.THREE.Vector3)());
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var dx = a.pos.x - p.pos.x, dz = a.pos.z - p.pos.z, dy = (a.pos.y + (a.ducked ? 1.35 : 1.6)) - (p.pos.y + 1.62);
      var d = Math.hypot(dx, dy, dz);
      if (d > cfg.aimRange) continue;
      var ang = Math.acos(Math.max(-1, Math.min(1, (dx * fw.x + dy * fw.y + dz * fw.z) / d))) * 180 / Math.PI;
      if (ang > cfg.aimFov) continue;
      if (ang < bestA) { bestA = ang; best = { a: a, dx: dx, dy: dy, dz: dz, d: d }; }
    }
    if (!best) return;
    p.yaw = Math.atan2(-best.dx, -best.dz);
    p.pitch = Math.asin(best.dy / best.d);
  }

  /* ---------------------------------------------------------------- 启动 */
  var lastT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    var dt = lastT ? Math.min(.05, (t - lastT) / 1000) : .016;
    lastT = t;
    engine = window.__engine || engine;
    if (!engine) return;
    if (!panel) return;
    tick(dt);
    drawESP();
  }

  function boot() {
    engine = window.__engine;
    if (!engine) { setTimeout(boot, 100); return; }
    buildUI();
    requestAnimationFrame(loop);
    document.addEventListener('keydown', function (e) {
      if (e.code === 'F8') { e.preventDefault(); setShow(!cfg.show); }
    });
    console.log('[assist] sandstorm assist ready');
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(boot, 300);
  else window.addEventListener('load', function () { setTimeout(boot, 300); });
})();
