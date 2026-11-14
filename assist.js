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
    infAmmo: true, speed: 1, god: false, show: true,
    fly: false, flySpeed: 8, under: false, underDepth: 4,
    superJump: false, jumpMul: 2.2, freeze: false, slowmo: false
  };
  try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem('sandstorm.assist.v2') || '{}')); } catch (e) {}
  function save() { try { localStorage.setItem('sandstorm.assist.v2', JSON.stringify(cfg)); } catch (e) {} }

  var engine = null, canvas, ctx, panel, fab;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function buildUI() {
    var style = el('style');
    style.textContent = [
      '#cx-win{position:fixed;right:14px;top:14px;width:268px;z-index:99999;border-radius:16px;',
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
      '.cx-body{padding:8px 14px 14px;max-height:calc(88vh - 58px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
      '.cx-sec{margin:12px 0 4px;font-size:11px;letter-spacing:.1em;color:#8a8f98;font-weight:700}',
      '.cx-line{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;min-height:34px}',
      '.cx-line label{color:#3a3f47;font-weight:500}',
      '.cx-sw{width:42px;height:24px;border-radius:12px;border:0;background:#e3e5e9;position:relative;cursor:pointer;flex:0 0 auto;transition:.16s}',
      '.cx-sw i{position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18);transition:.16s}',
      '.cx-sw[aria-pressed="true"]{background:#2f6bff}',
      '.cx-sw[aria-pressed="true"] i{left:20px}',
      '.cx-act{border:0;border-radius:9px;background:#2f6bff;color:#fff;font:600 11px/1 -apple-system;padding:9px 12px;cursor:pointer}',
      '.cx-tip{font-size:10.5px;line-height:1.5;color:#8a8f98;margin:2px 0 6px}',
      '.cx-seg{display:flex;gap:4px;background:#eceef2;border-radius:9px;padding:3px}',
      '.cx-seg button{border:0;background:transparent;padding:6px 10px;border-radius:7px;font:600 11px/1 -apple-system,sans-serif;color:#5a6068;cursor:pointer}',
      '.cx-seg button[aria-pressed="true"]{background:#fff;color:#14171c;box-shadow:0 1px 2px rgba(0,0,0,.10)}',
      '.cx-range{display:flex;align-items:center;gap:8px;flex:1;justify-content:flex-end}',
      '.cx-range input{width:100px;accent-color:#2f6bff}',
      '.cx-range output{width:40px;text-align:right;color:#6b717a;font-variant-numeric:tabular-nums}',
      '#cx-esp{position:fixed;inset:0;pointer-events:none;z-index:99997}',
      '#cx-fab{position:fixed;right:14px;top:16px;z-index:99998;width:64px;height:40px;padding:0;border-radius:20px;border:0;',
      'background:rgba(250,251,252,.94);box-shadow:0 8px 24px rgba(0,0,0,.18);color:#171a1f;font:700 12px/40px -apple-system;cursor:pointer}',
      '#cx-fab.on{display:none}',
      '@media(max-width:720px){#cx-win{width:252px;right:8px;top:8px;font-size:11.5px}#cx-fab{top:auto;bottom:200px;right:auto;left:20px;width:62px}}'
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
    rows += '<div class="cx-sec">位移科技</div>' + sw('fly', '飞天（跳跃升/下蹲降）') + sw('under', '遁地') + sw('superJump', '超级跳') +
      '<div class="cx-line"><label>移动速度</label><div class="cx-range"><input id="cx-speed" type="range" min="1" max="6" step=".1"><output id="cx-speed-v"></output></div></div>' +
      '<div class="cx-line"><label>跳跃倍率</label><div class="cx-range"><input id="cx-jumpmul" type="range" min="1" max="4" step=".1"><output id="cx-jumpmul-v"></output></div></div>' +
      '<div class="cx-line"><label>遁地深度</label><div class="cx-range"><input id="cx-underdepth" type="range" min="1" max="8" step=".5"><output id="cx-underdepth-v"></output></div></div>' +
      '<div class="cx-line"><label>瞬移</label><button class="cx-act" id="cx-tp">到敌人身后</button></div>';
    rows += '<div class="cx-sec">战斗科技</div>' + sw('infAmmo', '无限弹药') + sw('god', '无敌') + sw('freeze', '冻结敌人') + sw('slowmo', '子弹时间') +
      '<div class="cx-tip">无敌拦在扣血入口，爆头/爆炸也无效；冻结后敌人原地不动但仍可被击杀。</div>';

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
    slider('cx-jumpmul', 'jumpMul', function (v) { return (+v).toFixed(1) + '×'; });
    slider('cx-underdepth', 'underDepth', function (v) { return v + 'm'; });
    document.getElementById('cx-tp').addEventListener('click', function () {
      var g = engine && engine.game; if (!g || !g.player || !g.player.alive) return;
      var t = pickTarget(g, g.player, g.player.pos); if (!t) return;
      var p = g.player;
      var dx = t.x - p.pos.x, dz = t.z - p.pos.z, L = Math.hypot(dx, dz) || 1;
      p.pos.x = t.x + dx / L * 1.4; p.pos.z = t.z + dz / L * 1.4; p.pos.y = Math.max(0, t.y - 1.15);
      p.vel.set(0, 0, 0); p.onGround = true;
    });
    document.getElementById('cx-hide').addEventListener('click', function (e) { e.stopPropagation(); setShow(false); });
    fab.addEventListener('click', function (e) { e.stopPropagation(); setShow(true); });
    fab.addEventListener('touchend', function (e) { e.preventDefault(); e.stopPropagation(); setShow(true); }, { passive: false });
    document.getElementById('cx-hide').addEventListener('touchend', function (e) { e.preventDefault(); e.stopPropagation(); setShow(false); }, { passive: false });
    /* 手机：pointerup 直接触发一次动作，随后浏览器合成的 click 被时间戳拦掉，避免点一次翻两次 */
    document.addEventListener('pointerup', function (e) {
      if (e.pointerType !== 'touch' || !e.target || !e.target.closest) return;
      var fabBtn = e.target.closest('#cx-fab');
      if (fabBtn) { e.preventDefault(); setShow(true); fabBtn.__cxT = performance.now(); return; }
      if (!panel || !panel.classList.contains('on')) return;
      var b = e.target.closest('#cx-win button'); if (!b) return;
      e.preventDefault(); b.click(); b.__cxT = performance.now();
    }, { capture: true, passive: false });
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('#cx-win button, #cx-fab') : null;
      if (b && b.__cxT && performance.now() - b.__cxT < 700) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, { capture: true, passive: false });
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
    var tr = document.getElementById('cx-touch');
    if (tr) tr.style.pointerEvents = on ? 'none' : '';
    try {
      var btns = document.querySelectorAll('#cx-touch .cx-btn, #cx-touch #cx-stick, #cx-touch #cx-look');
      for (var i = 0; i < btns.length; i++) btns[i].style.pointerEvents = on ? 'none' : 'auto';
    } catch (e) {}
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
  var flyY = null, wrapped = null;

  function applyWrappers(g) {
    var p = g.player;
    /* 移速：velMod 会被游戏钳回 1，改为把每 tick 的实际位移按倍率放大 */
    if (p && !p.__cxSim) {
      var origSim = p.simulate.bind(p);
      p.simulate = function (dt) {
        var x0 = this.pos.x, z0 = this.pos.z, wasGround = this.onGround;
        origSim(dt);
        if (cfg.speed > 1 && this.alive) {
          this.pos.x = x0 + (this.pos.x - x0) * cfg.speed;
          this.pos.z = z0 + (this.pos.z - z0) * cfg.speed;
        }
        if (cfg.superJump && this.cmd.jumpPressed && wasGround && this.vel.y > 0) this.vel.y *= cfg.jumpMul;
      };
      p.__cxSim = true;
    }
    /* 无敌：拦在 applyDamage 入口，任何伤害都不结算 */
    if (!g.__cxDmg) {
      var origDmg = g.applyDamage.bind(g);
      g.applyDamage = function (v) {
        if (cfg.god && v === this.player) { v.hp = 100; v.armor = 100; v.alive = true; return; }
        return origDmg.apply(null, arguments);
      };
      g.__cxDmg = true;
    }
    /* 冻结敌人：跳过 AI tick，玩家仍可杀它们 */
    for (var i = 0; i < g.actors.length; i++) {
      var a = g.actors[i];
      if (!a.brain || a.brain.__cxFrozen) continue;
      a.brain.__cxFrozen = true;
      var ob = a.brain.tick.bind(a.brain);
      a.brain.__origTick = ob;
      a.brain.tick = function (dt) {
        if (cfg.freeze) { this.a.cmd.fwd = 0; this.a.cmd.side = 0; this.a.cmd.attack = false; this.a.cmd.attackPressed = false; return; }
        return ob(dt);
      };
    }
    /* 子弹时间：隔 tick 推进，整体变慢 */
    if (!g.__cxTick) {
      var origTick = g.tick.bind(g), acc = 0;
      g.tick = function (dt) {
        if (cfg.slowmo) { acc += dt; if (acc < 0.034) return; acc = 0; }
        return origTick(dt);
      };
      g.__cxTick = true;
    }
  }

  function tick(dt) {
    var g = engine && engine.game;
    if (!g || !g.player) return;
    installTrack(g);
    applyWrappers(g);
    var p = g.player;

    if (cfg.infAmmo) {
      g.infiniteAmmo = true;
      var w = p.weapon;
      if (w && w.def && !p.reloading) { w.mag = w.def.mag; w.reserve = Math.max(w.reserve, w.def.reserve || 0); }
    } else if (g.infiniteAmmo) g.infiniteAmmo = false;

    if (cfg.god) { p.hp = 100; p.armor = 100; }
    if (cfg.under) {
      p.pos.y = -Math.abs(cfg.underDepth); p.vel.y = 0; p.onGround = false; flyY = null;
    } else if (cfg.fly) {
      if (flyY == null) flyY = p.pos.y;
      if (p.cmd.jump) flyY += cfg.flySpeed * dt;
      if (p.cmd.duck) flyY -= cfg.flySpeed * dt;
      flyY = Math.min(70, Math.max(0.6, flyY));
      p.pos.y = flyY; p.vel.y = 0; p.onGround = false;
    } else flyY = null;

    var st = document.getElementById('cx-stat');
    if (st) st.textContent = '敌人 ' + enemies(g).length + ' · 追踪 ' + (cfg.track ? '开' : '关') + ' · 穿墙 ' + (cfg.wallbang ? '开' : '关') + (cfg.fly ? ' · 飞天' : '') + (cfg.under ? ' · 遁地' : '');
  }

  function enemies(g) {
    var me = g.player, out = [];
    for (var i = 0; i < g.actors.length; i++) { var a = g.actors[i]; if (a.alive && a !== me && a.team !== me.team) out.push(a); }
    return out;
  }

  var lastT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    engine = window.__engine || engine;
    if (!engine || !panel) return;
    var dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0.016; lastT = t;
    tick(dt);
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
