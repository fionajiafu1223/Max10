// Freed 免费次数限制
// 用法：<script src="free-limit.js" data-feature="emotion"></script>
//      （放在 supabase-client.js 和 paywall-web.js 之后）
// 规则：
//  · 会员不受限制
//  · 免费用户每个功能每天（手机本地时间零点重置）打开一次，打开后可连续释放
//  · 离开页面（切 app、锁屏、闪退、切标签页）不超过 1 小时，回来仍算同一次；超过则结束
//  · 没有登录信息 → 回主页登录
//  · 网络失败 → 放行
(function () {
  var SUPA_URL = 'https://ryoaxziysgdkjcjiuqti.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5b2F4eml5c2dka2pjaml1cXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDg2MDAsImV4cCI6MjA4OTA4NDYwMH0.ORG_8Ue8LjYfReMvKo1iQOFNGN7fcTz1_fMs8Gq1Kds';
  var HOME_URL = 'web.html';
  var GRACE_MS = 60 * 60 * 1000;      // 离开宽限：1 小时
  var HEARTBEAT_MS = 5 * 60 * 1000;   // 页面可见时每 5 分钟记录一次活跃
  var BLOCK_MSG = '今天的免费次数已用完，明天再来，或开通会员无限使用';

  var scriptEl = document.currentScript;
  var FEATURE = scriptEl && scriptEl.getAttribute('data-feature');
  if (!FEATURE) return;

  var state = { active: false, blocked: false, token: null, uid: null, date: null, hiddenAt: null, timer: null };

  // ── 登录信息 ──
  function getToken() {
    try {
      var raw = localStorage.getItem('sb-ryoaxziysgdkjcjiuqti-auth-token');
      if (raw) {
        var v = JSON.parse(raw);
        var t = (v && (v.access_token || (v.session && v.session.access_token)));
        if (t) return t;
      }
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('supabase') > -1 || k.indexOf('sb-') > -1) && k.indexOf('auth') > -1) {
          var val = JSON.parse(localStorage.getItem(k));
          var tk = val && (val.access_token || (val.session && val.session.access_token));
          if (tk) return tk;
        }
      }
    } catch (_) {}
    return null;
  }
  function getUid(token) {
    try {
      var p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(escape(atob(p)))).sub || null;
    } catch (_) { return null; }
  }
  function localDate() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  // ── Supabase 请求 ──
  function api(path, opts) {
    opts = opts || {};
    var f = window.freedFetch || fetch;
    return f(SUPA_URL + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      keepalive: !!opts.keepalive,
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': 'Bearer ' + state.token,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  function rowFilter() {
    return 'free_usage?user_id=eq.' + state.uid + '&feature=eq.' + FEATURE + '&use_date=eq.' + state.date;
  }
  function touch(keepalive) {
    if (!state.active || state.blocked) return;
    api(rowFilter(), { method: 'PATCH', body: { last_active_at: new Date().toISOString() }, keepalive: keepalive })
      .catch(function () {});
  }

  // ── 拦截：付费墙 + 关闭即回主页 ──
  function block() {
    if (state.blocked) return;
    state.blocked = true;
    state.active = false;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }

    var shield = document.createElement('div');
    shield.id = 'fl-shield';
    shield.style.cssText = 'position:fixed;inset:0;z-index:9990;background:rgba(10,20,40,0.92);';
    document.body.appendChild(shield);

    var goHome = function () { window.location.href = HOME_URL; };
    var onGranted = function () {
      // 当场开通了会员：解除拦截
      state.blocked = false;
      var s = document.getElementById('fl-shield');
      if (s) s.remove();
    };

    if (!window.FreedPaywall) { goHome(); return; }
    window.FreedPaywall.showPaywall(onGranted).then(function () {
      var sheet = document.getElementById('pw-sheet');
      if (sheet) {
        var note = document.createElement('div');
        note.textContent = BLOCK_MSG;
        note.style.cssText = 'margin:0 0 12px;padding:10px 12px;border-radius:10px;background:rgba(74,144,226,0.12);color:#2c5d9e;font-size:0.82rem;line-height:1.5;text-align:center;';
        var h2 = sheet.querySelector('h2');
        if (h2 && h2.nextSibling) sheet.insertBefore(note, h2.nextSibling); else sheet.appendChild(note);
      }
      var closeBtn = document.getElementById('pw-close');
      if (closeBtn) closeBtn.addEventListener('click', function () { if (state.blocked) goHome(); });
      var overlay = document.getElementById('pw-overlay');
      if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay && state.blocked) goHome(); });
    }).catch(goHome);
  }

  // ── 开始本次使用 ──
  function startSession() {
    state.active = true;
    state.timer = setInterval(function () {
      if (document.visibilityState === 'visible') touch(false);
    }, HEARTBEAT_MS);
  }

  document.addEventListener('visibilitychange', function () {
    if (!state.active) return;
    if (document.visibilityState === 'hidden') {
      state.hiddenAt = Date.now();
      touch(true);
    } else {
      if (state.hiddenAt && Date.now() - state.hiddenAt > GRACE_MS) { block(); return; }
      state.hiddenAt = null;
      touch(false);
    }
  });
  window.addEventListener('pagehide', function () { touch(true); });

  // ── 进入页面时检查 ──
  async function guard() {
    state.token = getToken();
    state.uid = state.token && getUid(state.token);
    if (!state.token || !state.uid) {
      window.location.href = HOME_URL + '?login=1&redirect=' + encodeURIComponent(window.location.href);
      return;
    }

    // 刚从 Stripe 付款回来：交给付费墙自己确认状态
    var params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === '1' || params.get('stripe_cancel') === '1') return;

    // 会员不受限制（查询失败时 checkPremium 会放行）
    try {
      if (window.FreedPaywall && await window.FreedPaywall.checkPremium()) return;
    } catch (_) { return; }

    state.date = localDate();
    var rows;
    try {
      rows = await api('free_usage?select=last_active_at&user_id=eq.' + state.uid +
                       '&feature=eq.' + FEATURE + '&use_date=eq.' + state.date);
    } catch (_) { return; } // 网络失败：放行

    if (!rows || rows.length === 0) {
      // 今天第一次打开
      try {
        await api('free_usage', { method: 'POST', body: {
          user_id: state.uid, feature: FEATURE, use_date: state.date,
          last_active_at: new Date().toISOString()
        }});
      } catch (_) {}
      startSession();
      return;
    }

    var last = Date.parse(rows[0].last_active_at);
    if (last && Date.now() - last <= GRACE_MS) {
      // 1 小时内回来（误退出、闪退）：算同一次
      startSession();
      touch(false);
      return;
    }
    block();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guard);
  else guard();
})();
