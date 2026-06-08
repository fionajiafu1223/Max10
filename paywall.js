// paywall.js — 付费墙弹窗模块
// 引入方式：<script src="paywall.js"></script>
// 使用方式：requirePremium(callbackFn) — 若已付费直接执行回调，否则弹出付费墙
//           checkPremium() — 返回 Promise<boolean>
// 版本：2026-06-07

(function() {
  'use strict';

  const RC_API_KEY = 'test_PsHsCYxJnoCwiZTTVaexMsaHHoO';
  const WORKER_URL = 'https://api.freedreleasing.com';

  const PLANS = [
    { id:'monthly',   rcPackage:'$rc_monthly',     label:'月度会员', sublabel:'Monthly',   price:'¥8',  period:'/ 月', badge:null,        highlight:false },
    { id:'yearly',    rcPackage:'$rc_annual',       label:'年度会员', sublabel:'Annual',    price:'¥68', period:'/ 年', badge:'最划算 省29%', highlight:true  },
    { id:'quarterly', rcPackage:'$rc_three_month',  label:'季度会员', sublabel:'Quarterly', price:'¥18', period:'/ 季', badge:'省25%',      highlight:false },
  ];

  const FEATURES_FREE = ['情绪释放', '欲望释放', '目标表（最多3个）'];
  const FEATURES_PAID_GROUPS = [
    { label: '释放工具', items: ['识别即释放', '情绪欲望释放', '好处坏处释放', '财富释放', '人际关系释放', '身体健康释放'] },
    { label: '释放助手', items: ['卡点释放', '限制性信念释放', '自我允许释放'] },
    { label: '目标表', items: ['无限目标'] },
    { label: '收获本', items: ['收获记录'] },
  ];

  let _premiumCache = null;
  let _cacheTime = 0;
  const CACHE_TTL = 5 * 60 * 1000;

  function getToken() {
    try {
      // 直接读已知的 key
      const direct = localStorage.getItem('sb-ryoaxziysgdkjcjiuqti-auth-token');
      if (direct) {
        const val = JSON.parse(direct);
        const token = val?.access_token || val?.session?.access_token;
        if (token) return token;
      }
      // 兼容旧格式：遍历查找
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-')) && key.includes('auth')) {
          const val = JSON.parse(localStorage.getItem(key));
          const token = val?.access_token || val?.session?.access_token;
          if (token) return token;
        }
      }
    } catch(_) {}
    return null;
  }

  async function checkPremium(forceRefresh) {
    const now = Date.now();
    if (!forceRefresh && _premiumCache !== null && (now - _cacheTime) < CACHE_TTL) return _premiumCache;
    const token = getToken();
    if (!token) { _premiumCache = false; _cacheTime = now; return false; }
    try {
      const res = await fetch(`${WORKER_URL}/subscription/status`, {
        method: 'GET', headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) { _premiumCache = false; _cacheTime = now; return false; }
      const data = await res.json();
      _premiumCache = data.is_premium === true;
      _cacheTime = now;
      return _premiumCache;
    } catch(_) { _premiumCache = false; _cacheTime = now; return false; }
  }

  // ─── 需要付费权限的入口 ───────────────────────────────
  async function requirePremium(onGranted) {
    const isPremium = await checkPremium();
    if (isPremium) {
      if (typeof onGranted === 'function') onGranted();
      return;
    }
    showPaywall(onGranted);
  }

  function injectStyles() {
    if (document.getElementById('pw-styles')) return;
    const style = document.createElement('style');
    style.id = 'pw-styles';
    style.textContent = `
      #pw-overlay {
        position: fixed; inset: 0; z-index: 9999;
        background: transparent;
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: pwFadeIn 0.22s ease;
        pointer-events: none;
      }
      #pw-sheet { pointer-events: auto; }
      @keyframes pwFadeIn { from{opacity:0} to{opacity:1} }
      #pw-sheet {
        width: 100%; max-width: 420px;
        background: rgba(8,28,70,0.88);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-radius: 24px;
        padding: 22px 16px 20px;
        max-height: 88vh; overflow-y: auto;
        animation: pwPopIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
        font-family: 'Noto Serif SC', serif;
        border: 1px solid rgba(120,180,255,0.18);
        box-shadow: 0 8px 48px rgba(0,20,60,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
        position: relative;
      }
      @keyframes pwPopIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      #pw-close {
        position: absolute; top: 14px; right: 14px;
        width: 26px; height: 26px; border-radius: 50%;
        background: rgba(255,255,255,0.10); border: none;
        color: rgba(255,255,255,0.55); font-size: 0.85rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      #pw-close:hover { background: rgba(255,255,255,0.18); }
      #pw-sheet h2 {
        text-align: center; font-size: 1.05rem; letter-spacing: 0.14em;
        color: rgba(220,240,255,0.95); margin-bottom: 3px;
      }
      #pw-sheet .pw-sub {
        text-align: center; font-size: 0.74rem; color: rgba(160,200,240,0.60);
        font-family: 'Noto Sans SC', sans-serif; margin-bottom: 14px; letter-spacing: 0.04em;
      }

      /* ── 功能对比 ── */
      .pw-features { display: flex; gap: 8px; margin-bottom: 14px; align-items: stretch; }
      .pw-feat-col { border-radius: 14px; padding: 11px 10px; }
      .pw-feat-col.free {
        flex: 0 0 34%;
        background: rgba(220,235,250,0.92);
        border: 1px solid rgba(160,200,235,0.5);
      }
      .pw-feat-col.paid {
        flex: 1;
        background: rgba(230,242,255,0.95);
        border: 1px solid rgba(74,159,212,0.35);
      }
      .pw-feat-title {
        font-size: 0.68rem; letter-spacing: 0.06em; margin-bottom: 7px;
        text-align: center; font-family: 'Noto Sans SC', sans-serif;
      }
      .pw-feat-col.free .pw-feat-title { color: #7a9ab8; }
      .pw-feat-col.paid .pw-feat-title { color: #2a7abf; }
      .pw-feat-item {
        font-size: 0.67rem; font-family: 'Noto Sans SC', sans-serif;
        line-height: 1.95; padding-left: 2px; color: #7a9ab8;
        white-space: nowrap;
      }

      /* 会员功能分组 — 两列 */
      .pw-paid-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
      .pw-paid-group-label {
        font-size: 0.63rem; color: #2a7abf; font-family: 'Noto Sans SC', sans-serif;
        letter-spacing: 0.05em; margin-bottom: 3px; white-space: nowrap;
      }
      .pw-paid-group-item {
        font-size: 0.66rem; color: #1a4070; font-family: 'Noto Sans SC', sans-serif;
        line-height: 1.85; white-space: nowrap;
      }

      /* ── 套餐 ── */
      .pw-plans { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
      .pw-plan {
        border-radius: 12px; padding: 10px 14px;
        border: 1px solid rgba(150,200,255,0.18);
        background: rgba(220,235,252,0.90);
        cursor: pointer; transition: all 0.18s;
        display: flex; align-items: center; justify-content: space-between;
        position: relative;
      }
      .pw-plan:hover { background: rgba(200,225,250,0.95); border-color: rgba(74,159,212,0.4); }
      .pw-plan.selected { border-color: #4a9fd4; background: rgba(200,225,252,0.98); box-shadow: 0 2px 12px rgba(74,159,212,0.22); }
      .pw-plan.highlight { background: rgba(210,230,252,0.92); }
      .pw-plan.highlight.selected { border-color: #4a9fd4; background: rgba(200,225,252,0.98); }
      .pw-plan-badge {
        position: absolute; top: -8px; right: 10px;
        background: linear-gradient(135deg, #4a9fd4, #2a7abf);
        color: #fff; font-size: 0.60rem; padding: 2px 9px;
        border-radius: 99px; letter-spacing: 0.06em; font-family: 'Noto Sans SC', sans-serif;
      }
      .pw-plan-left { display: flex; flex-direction: column; gap: 2px; }
      .pw-plan-name { font-size: 0.86rem; color: #1a3a5c; letter-spacing: 0.06em; }
      .pw-plan-sub { font-size: 0.65rem; color: #7a9ab8; font-family:'Noto Sans SC',sans-serif; }
      .pw-plan-right { display: flex; align-items: baseline; gap: 2px; }
      .pw-plan-price { font-size: 1.22rem; color: #2a7abf; }
      .pw-plan-period { font-size: 0.65rem; color: #7a9ab8; font-family:'Noto Sans SC',sans-serif; }

      /* ── 按钮 ── */
      .pw-btn {
        width: 100%; padding: 13px; border: none; border-radius: 14px;
        background: linear-gradient(135deg, #4a9fd4 0%, #2a7abf 100%);
        color: #fff; font-family: 'Noto Serif SC', serif;
        font-size: 0.95rem; letter-spacing: 0.1em; cursor: pointer;
        transition: opacity 0.2s, transform 0.15s; margin-bottom: 10px;
        box-shadow: 0 4px 18px rgba(42,122,191,0.38);
      }
      .pw-btn:hover { opacity: 0.88; transform: scale(1.02); }
      .pw-btn:disabled { opacity: 0.40; cursor: not-allowed; transform: none; }
      .pw-restore {
        text-align: center; font-size: 0.70rem; color: rgba(160,200,240,0.50);
        cursor: pointer; font-family: 'Noto Sans SC', sans-serif;
        letter-spacing: 0.04em; background: none; border: none; width: 100%;
      }
      .pw-restore:hover { color: rgba(160,200,240,0.85); }
      .pw-msg { text-align: center; font-size: 0.74rem; margin-top: 8px; font-family: 'Noto Sans SC', sans-serif; min-height: 18px; color: rgba(140,190,240,0.60); }
      .pw-msg.error { color: rgba(255,120,120,0.85); }
      .pw-msg.success { color: rgba(100,220,180,0.90); }
    `;
    document.head.appendChild(style);
  }

  let _onGrantedCallback = null;
  let _selectedPlan = PLANS.find(p => p.highlight) || PLANS[0];

  function showPaywall(onGranted) {
    _onGrantedCallback = onGranted || null;
    injectStyles();
    if (document.getElementById('pw-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'pw-overlay';
    overlay.innerHTML = `
      <div id="pw-sheet" style="position:relative;">
        <button id="pw-close">✕</button>
        <h2>🫧 解锁完整释放体验</h2>
        <p class="pw-sub">升级会员，体验全部功能</p>
        <div class="pw-features">
          <div class="pw-feat-col free">
            <div class="pw-feat-title">免费功能</div>
            ${FEATURES_FREE.map(f => `<div class="pw-feat-item">· ${f}</div>`).join('')}
          </div>
          <div class="pw-feat-col paid">
            <div class="pw-feat-title">✦ 会员功能</div>
            <div class="pw-paid-groups">
              ${FEATURES_PAID_GROUPS.map(g => `
                <div class="pw-paid-group">
                  <div class="pw-paid-group-label">${g.label}</div>
                  ${g.items.map(i => `<div class="pw-paid-group-item">· ${i}</div>`).join('')}
                </div>`).join('')}
            </div>
          </div>
        </div>
        <div class="pw-plans" id="pw-plans">
          ${PLANS.map(p => `
            <div class="pw-plan ${p.highlight?'highlight':''} ${p.id===_selectedPlan.id?'selected':''}" data-plan="${p.id}">
              ${p.badge ? `<div class="pw-plan-badge">${p.badge}</div>` : ''}
              <div class="pw-plan-left">
                <div class="pw-plan-name">${p.label}</div>
                <div class="pw-plan-sub">${p.sublabel}</div>
              </div>
              <div class="pw-plan-right">
                <div class="pw-plan-price">${p.price}</div>
                <div class="pw-plan-period">${p.period}</div>
              </div>
            </div>`).join('')}
        </div>
        <button class="pw-btn" id="pw-buy-btn">立即订阅</button>
        <button class="pw-restore" id="pw-restore-btn">恢复购买记录</button>
        <div class="pw-msg" id="pw-msg"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('pw-close').addEventListener('click', closePaywall);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closePaywall(); });
    document.getElementById('pw-plans').addEventListener('click', function(e) {
      const card = e.target.closest('.pw-plan');
      if (!card) return;
      _selectedPlan = PLANS.find(p => p.id === card.dataset.plan);
      document.querySelectorAll('.pw-plan').forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');
    });
    document.getElementById('pw-buy-btn').addEventListener('click', handlePurchase);
    document.getElementById('pw-restore-btn').addEventListener('click', handleRestore);
  }

  function closePaywall() {
    const overlay = document.getElementById('pw-overlay');
    if (overlay) overlay.remove();
  }

  function setMsg(text, type) {
    const el = document.getElementById('pw-msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'pw-msg ' + (type || '');
  }

  function setBtnLoading(loading) {
    const btn = document.getElementById('pw-buy-btn');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? '处理中...' : '立即订阅';
  }

  async function handlePurchase() {
    setBtnLoading(true); setMsg('');
    try {
      await loadRCSDK();
      const Purchases = window.Purchases;
      if (!Purchases) throw new Error('RevenueCat SDK 未加载');
      Purchases.configure({ apiKey: RC_API_KEY });
      const userId = getUserId();
      if (userId) { try { await Purchases.logIn(userId); } catch(_) {} }
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) throw new Error('无法获取订阅套餐');
      const pkg = current.availablePackages.find(p => p.identifier === _selectedPlan.rcPackage);
      if (!pkg) throw new Error('找不到对应套餐，请稍后再试');
      const result = await Purchases.purchasePackage(pkg);
      if (result.customerInfo) {
        _premiumCache = null;
        await checkPremium(true);
        setMsg('✓ 订阅成功，感谢支持！', 'success');
        setTimeout(() => {
          closePaywall();
          if (typeof _onGrantedCallback === 'function') _onGrantedCallback();
        }, 1200);
      }
    } catch(err) {
      if (err && err.userCancelled) { setMsg('已取消', ''); }
      else { setMsg('❌ ' + (err && err.message ? err.message : String(err)).slice(0, 60), 'error'); }
    } finally { setBtnLoading(false); }
  }

  async function handleRestore() {
    const btn = document.getElementById('pw-restore-btn');
    if (btn) { btn.disabled = true; btn.textContent = '恢复中...'; }
    setMsg('');
    try {
      await loadRCSDK();
      const Purchases = window.Purchases;
      Purchases.configure({ apiKey: RC_API_KEY });
      const userId = getUserId();
      if (userId) { try { await Purchases.logIn(userId); } catch(_) {} }
      const customerInfo = await Purchases.restorePurchases();
      const entitlement = customerInfo.entitlements?.active?.['premium'];
      if (entitlement) {
        _premiumCache = null;
        await checkPremium(true);
        setMsg('✓ 购买记录已恢复', 'success');
        setTimeout(() => { closePaywall(); if (typeof _onGrantedCallback === 'function') _onGrantedCallback(); }, 1200);
      } else { setMsg('未找到有效的购买记录', ''); }
    } catch(err) {
      setMsg('❌ ' + (err && err.message ? err.message : String(err)).slice(0, 60), 'error');
    } finally { if (btn) { btn.disabled = false; btn.textContent = '恢复购买记录'; } }
  }

  let _rcLoaded = false;
  function loadRCSDK() {
    if (_rcLoaded && window.Purchases) return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (window.Purchases) { _rcLoaded = true; resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@revenuecat/purchases-js@latest/dist/index.js';
      script.onload = () => { _rcLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('RevenueCat SDK 加载失败'));
      document.head.appendChild(script);
    });
  }

  function getUserId() {
    try {
      const direct = localStorage.getItem('sb-ryoaxziysgdkjcjiuqti-auth-token');
      if (direct) {
        const val = JSON.parse(direct);
        const id = val?.user?.id || val?.session?.user?.id;
        if (id) return id;
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('sb-')) && key.includes('auth')) {
          const val = JSON.parse(localStorage.getItem(key));
          const id = val?.user?.id || val?.session?.user?.id;
          if (id) return id;
        }
      }
    } catch(_) {}
    return null;
  }

  window.FreedPaywall = { checkPremium, requirePremium, showPaywall, closePaywall };
  window.checkPremium = checkPremium;
  window.requirePremium = requirePremium;

})();
