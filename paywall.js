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
  const FEATURES_PAID = [
    '识别即释放', '情绪欲望释放', '好处坏处释放',
    '财富释放', '人际关系释放', '身体健康释放',
    '释放助手（卡点释放 / 限制性信念释放 / 自我允许释放）',
    '目标表（无限）', '收获本',
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
        background: rgba(60,120,180,0.20);
        backdrop-filter: blur(12px);
        display: flex; align-items: flex-end; justify-content: center;
        animation: pwFadeIn 0.25s ease;
      }
      @keyframes pwFadeIn { from{opacity:0} to{opacity:1} }
      #pw-sheet {
        width: 100%; max-width: 480px;
        background: #fff;
        border-radius: 28px 28px 0 0;
        padding: 24px 20px 44px;
        max-height: 92vh; overflow-y: auto;
        animation: pwSlideUp 0.32s cubic-bezier(0.22,1,0.36,1);
        font-family: 'Noto Serif SC', serif;
        box-shadow: 0 -2px 24px rgba(0,80,160,0.10);
      }
      @keyframes pwSlideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      #pw-close {
        position: absolute; top: 16px; right: 18px;
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(180,210,240,0.45); border: none;
        color: #5a7aa0; font-size: 0.9rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
      }
      #pw-sheet h2 {
        text-align: center; font-size: 1.1rem; letter-spacing: 0.14em;
        color: #1a3a5c; margin-bottom: 4px;
      }
      #pw-sheet .pw-sub {
        text-align: center; font-size: 0.78rem; color: #6a8aaa;
        font-family: 'Noto Sans SC', sans-serif; margin-bottom: 18px; letter-spacing: 0.04em;
      }
      .pw-features { display: flex; gap: 10px; margin-bottom: 18px; }
      .pw-feat-col { flex: 1; border-radius: 16px; padding: 12px 10px; }
      .pw-feat-col.free {
        background: #f4f8fc;
        border: 1px solid rgba(160,200,235,0.5);
      }
      .pw-feat-col.paid {
        background: linear-gradient(160deg, #e8f4ff 0%, #ddeeff 100%);
        border: 1.5px solid rgba(74,159,212,0.45);
      }
      .pw-feat-title { font-size: 0.72rem; letter-spacing: 0.08em; margin-bottom: 8px; text-align: center; font-family: 'Noto Sans SC', sans-serif; }
      .pw-feat-col.free .pw-feat-title { color: #8aaac0; }
      .pw-feat-col.paid .pw-feat-title { color: #2a7abf; }
      .pw-feat-item { font-size: 0.72rem; font-family: 'Noto Sans SC', sans-serif; line-height: 2.0; padding-left: 2px; }
      .pw-feat-col.free .pw-feat-item { color: #8aaac0; }
      .pw-feat-col.paid .pw-feat-item { color: #2a5080; }
      .pw-plans { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
      .pw-plan {
        border-radius: 16px; padding: 14px 16px;
        border: 1.5px solid rgba(160,200,235,0.6);
        background: #f8fbff;
        cursor: pointer; transition: all 0.18s;
        display: flex; align-items: center; justify-content: space-between;
        position: relative;
      }
      .pw-plan:hover { background: #eaf4ff; border-color: rgba(74,159,212,0.5); }
      .pw-plan.selected { border-color: #4a9fd4; background: #e4f2ff; box-shadow: 0 2px 12px rgba(74,159,212,0.18); }
      .pw-plan.highlight { border-color: rgba(74,159,212,0.45); background: #eef7ff; }
      .pw-plan.highlight.selected { border-color: #4a9fd4; background: #e4f2ff; box-shadow: 0 2px 12px rgba(74,159,212,0.20); }
      .pw-plan-badge {
        position: absolute; top: -9px; right: 12px;
        background: linear-gradient(135deg, #4a9fd4, #2a7abf);
        color: #fff; font-size: 0.65rem; padding: 3px 10px;
        border-radius: 99px; letter-spacing: 0.06em; font-family: 'Noto Sans SC', sans-serif;
      }
      .pw-plan-left { display: flex; flex-direction: column; gap: 3px; }
      .pw-plan-name { font-size: 0.92rem; color: #1a3a5c; letter-spacing: 0.06em; }
      .pw-plan-sub { font-size: 0.7rem; color: #8aaac0; font-family:'Noto Sans SC',sans-serif; }
      .pw-plan-right { display: flex; align-items: baseline; gap: 3px; }
      .pw-plan-price { font-size: 1.35rem; color: #2a7abf; }
      .pw-plan-period { font-size: 0.72rem; color: #8aaac0; font-family:'Noto Sans SC',sans-serif; }
      .pw-btn {
        width: 100%; padding: 15px; border: none; border-radius: 16px;
        background: linear-gradient(135deg, #4a9fd4 0%, #2a7abf 100%);
        color: #fff; font-family: 'Noto Serif SC', serif;
        font-size: 1rem; letter-spacing: 0.1em; cursor: pointer;
        transition: opacity 0.2s, transform 0.15s; margin-bottom: 14px;
        box-shadow: 0 4px 18px rgba(42,122,191,0.32);
      }
      .pw-btn:hover { opacity: 0.88; transform: scale(1.02); }
      .pw-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
      .pw-restore {
        text-align: center; font-size: 0.75rem; color: #8aaac0;
        cursor: pointer; font-family: 'Noto Sans SC', sans-serif;
        letter-spacing: 0.04em; background: none; border: none; width: 100%;
      }
      .pw-restore:hover { color: #4a9fd4; }
      .pw-msg { text-align: center; font-size: 0.78rem; margin-top: 10px; font-family: 'Noto Sans SC', sans-serif; min-height: 20px; color: #8aaac0; }
      .pw-msg.error { color: #d05050; }
      .pw-msg.success { color: #4a9fd4; }
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
            ${FEATURES_PAID.map(f => `<div class="pw-feat-item">· ${f}</div>`).join('')}
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
