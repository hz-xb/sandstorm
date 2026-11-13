/* 沙暴行动 · 触屏支持 TOUCH v1
   左侧摇杆移动，右侧滑动转视角，右下角开火/瞄准/跳跃/下蹲/换弹/换枪。
   仅在触屏设备或 ?touch=1 时启用。 */
(function () {
  'use strict';
  if (window.__cxTouchLoaded) return;
  window.__cxTouchLoaded = true;

  var forced = /[?&]touch=1/.test(location.search);
  var isTouch = forced || (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);
  if (!isTouch) return;

  var style = document.createElement('style');
  style.textContent = [
    'html,body{touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}',
    '#cx-touch{position:fixed;inset:0;z-index:10002;pointer-events:none;font:600 12px -apple-system,"PingFang SC",sans-serif;display:none}',
    '#cx-touch.live{display:block}',
    '#cx-look{position:absolute;left:38%;top:0;right:0;bottom:0;pointer-events:auto}',
    '#cx-stick{position:absolute;left:22px;bottom:26px;width:132px;height:132px;border-radius:66px;pointer-events:auto;',
    'background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.16),rgba(255,255,255,.07));',
    'border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(6px);box-shadow:0 8px 28px rgba(0,0,0,.18)}',
    '#cx-stick i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:28px;',
    'background:rgba(255,255,255,.88);box-shadow:0 3px 12px rgba(0,0,0,.22);transition:transform .05s linear}',
    '.cx-btn{position:absolute;pointer-events:auto;border-radius:50%;border:1px solid rgba(255,255,255,.28);',
    'background:rgba(28,32,40,.28);backdrop-filter:blur(10px);color:#fff;display:flex;align-items:center;justify-content:center;',
    'letter-spacing:.04em;box-shadow:0 6px 20px rgba(0,0,0,.22);text-shadow:0 1px 2px rgba(0,0,0,.4)}',
    '.cx-btn:active,.cx-btn.on{background:rgba(47,107,255,.55);border-color:rgba(255,255,255,.5)}',
    '#cx-fire{right:22px;bottom:24px;width:88px;height:88px;font-size:15px}',
    '#cx-ads{right:120px;bottom:38px;width:62px;height:62px;font-size:12px}',
    '#cx-jump{right:34px;bottom:124px;width:60px;height:60px;font-size:12px}',
    '#cx-crouch{right:106px;bottom:112px;width:52px;height:52px;font-size:11px}',
    '#cx-reload{right:24px;bottom:196px;width:52px;height:52px;font-size:11px}',
    '#cx-swap{right:92px;bottom:182px;width:52px;height:52px;font-size:11px}',
    '#cx-tip{position:absolute;left:50%;top:14px;transform:translateX(-50%);padding:6px 12px;border-radius:12px;',
    'background:rgba(20,24,32,.55);color:#fff;font-size:11px;opacity:0;transition:.3s}',
    '#cx-win{transform-origin:top right}',
    '@media (max-height:520px){#cx-win{zoom:.82}}',
    '@media (max-width:720px){',
    '#menu{align-items:flex-start;overflow-y:auto;background:linear-gradient(180deg,rgba(8,9,11,.94),rgba(8,9,11,.78))}',
    '.menu-inner{width:calc(100% - 24px);margin:12px auto;padding-bottom:28px}',
    '.brand .logo{font-size:38px;letter-spacing:6px}.brand .sub{font-size:12px;letter-spacing:4px}',
    '.cards{margin:16px 0 12px;gap:8px}.card{padding:11px 12px}.card .ct{font-size:16px}.card .cd{font-size:12px}',
    '.opts{gap:8px;margin-bottom:16px}.opt{flex-direction:column;align-items:flex-start;gap:6px}.opt label{width:auto;font-size:12px;color:#9a958c}',
    '.actions{gap:8px}.actions button{flex:1 1 42%;padding:10px 8px;font-size:13px}',
    '.foot{margin-top:14px;font-size:11px}',
    '.panel{padding:14px 16px}.panel.wide{width:calc(100vw - 20px);max-height:92vh}',
    '.srow{grid-template-columns:110px 1fr 44px;font-size:13px}',
    '#cx-win{width:236px;zoom:.86;top:8px;right:8px}',
    '#cx-fab{top:12px;bottom:auto;right:12px}',
    '}'
  ].join('');
  document.head.appendChild(style);

  var root = document.createElement('div'); root.id = 'cx-touch';
  root.innerHTML = '<div id="cx-look"></div>' +
    '<div id="cx-stick"><i></div>' +
    '<div class="cx-btn" id="cx-fire">开火</div>' +
    '<div class="cx-btn" id="cx-ads">瞄准</div>' +
    '<div class="cx-btn" id="cx-jump">跳跃</div>' +
    '<div class="cx-btn" id="cx-crouch">下蹲</div>' +
    '<div class="cx-btn" id="cx-reload">换弹</div>' +
    '<div class="cx-btn" id="cx-swap">换枪</div>' +
    '<div id="cx-tip">触屏已启用</div>';
  document.body.appendChild(root);

  function tip(t) {
    var e = document.getElementById('cx-tip');
    if (!e) return;
    e.textContent = t; e.style.opacity = 1;
    clearTimeout(tip.t); tip.t = setTimeout(function () { e.style.opacity = 0; }, 1200);
  }

  /* ---- 接管输入：触屏没有指针锁 ---- */
  function patchInput() {
    if (typeof Input === 'undefined') return false;
    Input.locked = true;
    Input.lock = function () {
      this.locked = true;
      var cp = document.getElementById('clickToPlay');
      if (cp) cp.classList.add('hidden');
      if (this.onLock) this.onLock();
    };
    Input.unlock = function () { this.locked = true; };
    Input.fullscreen = function () {};
    Input.exitFullscreen = function () {};
    return true;
  }
  var tries = 0;
  (function waitInput() { if (!patchInput() && ++tries < 60) setTimeout(waitInput, 120); })();

  /* ---- 摇杆 ---- */
  var stick = document.getElementById('cx-stick'), knob = stick.querySelector('i');
  var sid = null, sx = 0, sy = 0, R = 52, mx = 0, my = 0;
  stick.addEventListener('touchstart', function (e) {
    e.preventDefault(); e.stopPropagation();
    var t = e.changedTouches[0]; sid = t.identifier;
    var r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2;
    R = r.width * .36;
    move(t);
  }, { passive: false });
  stick.addEventListener('touchmove', function (e) {
    e.preventDefault(); e.stopPropagation();
    for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === sid) move(e.changedTouches[i]);
  }, { passive: false });
  function endStick(e) {
    if (!sid) return;
    sid = null; mx = my = 0; knob.style.transform = '';
    if (typeof Input !== 'undefined') { Input.down.delete('KeyW'); Input.down.delete('KeyS'); Input.down.delete('KeyA'); Input.down.delete('KeyD'); }
  }
  stick.addEventListener('touchend', endStick);
  stick.addEventListener('touchcancel', endStick);
  function move(t) {
    var dx = t.clientX - sx, dy = t.clientY - sy;
    var len = Math.hypot(dx, dy), k = len > R ? R / len : 1;
    dx *= k; dy *= k;
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    mx = dx / R; my = dy / R;
    if (typeof Input === 'undefined') return;
    var dead = .18;
    if (my < -dead) Input.down.add('KeyW'); else Input.down.delete('KeyW');
    if (my > dead) Input.down.add('KeyS'); else Input.down.delete('KeyS');
    if (mx < -dead) Input.down.add('KeyA'); else Input.down.delete('KeyA');
    if (mx > dead) Input.down.add('KeyD'); else Input.down.delete('KeyD');
  }

  /* ---- 右半屏转视角 ---- */
  var look = document.getElementById('cx-look');
  var lid = null, lx = 0, ly = 0;
  look.addEventListener('touchstart', function (e) {
    if (lid !== null) return;
    var t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY;
    e.preventDefault();
  }, { passive: false });
  look.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i]; if (t.identifier !== lid) continue;
      var dx = t.clientX - lx, dy = t.clientY - ly; lx = t.clientX; ly = t.clientY;
      if (typeof Input === 'undefined') continue;
      var sens = (typeof Settings !== 'undefined' && Settings.data && Settings.data.sens) ? Settings.data.sens : 1.6;
      Input.dx += dx * sens * 1.15;
      Input.dy += dy * sens * 1.15;
    }
  }, { passive: false });
  function endLook(e) { if (lid === null) return; for (var i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === lid) lid = null; }
  look.addEventListener('touchend', endLook);
  look.addEventListener('touchcancel', endLook);

  /* ---- 按钮 ---- */
  function bind(id, onDown, onUp) {
    var b = document.getElementById(id);
    b.addEventListener('touchstart', function (e) {
      e.preventDefault(); e.stopPropagation(); b.classList.add('on');
      if (typeof Input !== 'undefined') { Input.locked = true; }
      onDown();
    }, { passive: false });
    var up = function (e) { e.preventDefault(); e.stopPropagation(); b.classList.remove('on'); if (onUp) onUp(); };
    b.addEventListener('touchend', up);
    b.addEventListener('touchcancel', up);
  }

  bind('cx-fire', function () {
    Input.mouse[0] = true; Input.mPressed[0] = true;
  }, function () {
    Input.mouse[0] = false; Input.mReleased[0] = true;
  });

  var adsOn = false;
  bind('cx-ads', function () {
    adsOn = !adsOn;
    Input.mouse[2] = adsOn; if (adsOn) Input.mPressed[2] = true; else Input.mReleased[2] = true;
    document.getElementById('cx-ads').classList.toggle('on', adsOn);
    tip(adsOn ? '开镜' : '收镜');
  });

  bind('cx-jump', function () {
    Input.pressed.add('Space'); Input.down.add('Space');
  }, function () { Input.down.delete('Space'); });

  var crouched = false;
  bind('cx-crouch', function () {
    crouched = !crouched;
    if (crouched) Input.down.add('ControlLeft'); else Input.down.delete('ControlLeft');
    document.getElementById('cx-crouch').classList.toggle('on', crouched);
  });

  bind('cx-reload', function () { Input.pressed.add('KeyR'); });

  var swapIdx = 0;
  bind('cx-swap', function () {
    swapIdx = (swapIdx + 1) % 3;
    Input.pressed.add('Digit' + (swapIdx + 1));
    tip(['主武器', '副武器', '近战'][swapIdx]);
  });

  // 购买菜单：抬起手指时按坐标取当前节点（菜单每帧重绘，节点会换）
  var buyTouch = null;
  document.addEventListener('touchstart', function (e) {
    var bm = document.getElementById('buymenu');
    if (!bm || bm.classList.contains('hidden')) return;
    var t = e.changedTouches[0];
    buyTouch = { x: t.clientX, y: t.clientY };
    e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    if (!buyTouch) return;
    var t = e.changedTouches[0], pt = buyTouch; buyTouch = null;
    var bm = document.getElementById('buymenu');
    if (!bm || bm.classList.contains('hidden')) return;
    var el = document.elementFromPoint(pt.x || t.clientX, pt.y || t.clientY);
    var it = el && el.closest && el.closest('[data-buy]');
    var g = window.__engine && window.__engine.game;
    if (it && g) { g.buy(g.player, it.getAttribute('data-buy'), true); return; }
    if (el && el.closest && el.closest('.bmh')) HUD.closeBuy();
  }, { passive: false });

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  setTimeout(function () {
    if (innerWidth < 720) {
      var p = document.getElementById('cx-win'), h = document.getElementById('cx-hide');
      if (p && p.classList.contains('on') && h) h.click();
      tip('左下摇杆移动 · 右侧滑动转向');
    }
  }, 1400);
  setInterval(function () {
    var menu = document.getElementById('menu');
    var live = !!(window.__engine && window.__engine.game) && !(menu && !menu.classList.contains('hidden'));
    root.classList.toggle('live', live);
  }, 400);
  console.log('[touch] controls ready');
})();
