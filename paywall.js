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
        background: rgba(4,18,45,0.55);
        backdrop-filter: blur(2px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: pwFadeIn 0.22s ease;
      }
      @keyframes pwFadeIn { from{opacity:0} to{opacity:1} }
      #pw-sheet {
        width: 100%; max-width: 420px;
        background: rgba(8,28,70,0.82);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-radius: 24px;
        padding: 24px 18px 28px;
        max-height: 88vh; overflow-y: auto;
        animation: pwPopIn 0.28s cubic-bezier(0.34,1.56,0.64,1);
        font-family: 'Noto Serif SC', serif;
        border: 1px solid rgba(120,180,255,0.18);
        box-shadow: 0 8px 48px rgba(0,20,60,0.55), inset 0 1px 0 rgba(255,255,255,0.08);
        position: relative;
      }
      @keyframes pwPopIn { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      #pw-close {
        position: absolute; top: 14px; right: 16px;
        width: 28px; height: 28px; border-radius: 50%;
        background: rgba(255,255,255,0.10); border: none;
        color: rgba(255,255,255,0.55); font-size: 0.9rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      #pw-close:hover { background: rgba(255,255,255,0.18); }
      #pw-sheet h2 {
        text-align: center; font-size: 1.08rem; letter-spacing: 0.14em;
        color: rgba(220,240,255,0.95); margin-bottom: 4px;
      }
      #pw-sheet .pw-sub {
        text-align: center; font-size: 0.76rem; color: rgba(160,200,240,0.65);
        font-family: 'Noto Sans SC', sans-serif; margin-bottom: 16px; letter-spacing: 0.04em;
      }
      .pw-features { display: flex; gap: 8px; margin-bottom: 16px; }
      .pw-feat-col {
        flex: 1; border-radius: 14px; padding: 11px 9px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(150,200,255,0.14);
        backdrop-filter: blur(8px);
      }
      .pw-feat-col.paid {
        background: rgba(74,159,212,0.12);
        border: 1px solid rgba(74,159,212,0.28);
      }
      .pw-feat-title { font-size: 0.70rem; letter-spacing: 0.08em; margin-bottom: 7px; text-align: center; font-family: 'Noto Sans SC', sans-serif; }
      .pw-feat-col.free .pw-feat-title { color: rgba(160,200,240,0.55); }
      .pw-feat-col.paid .pw-feat-title { color: rgba(120,200,255,0.90); }
      .pw-feat-item { font-size: 0.70rem; font-family: 'Noto Sans SC', sans-serif; line-height: 1.95; padding-left: 2px; }
      .pw-feat-col.free .pw-feat-item { color: rgba(160,200,240,0.55); }
      .pw-feat-col.paid .pw-feat-item { color: rgba(200,230,255,0.85); }
      .pw-plans { display: flex; flex-direction: column; gap: 9px; margin-bottom: 16px; }
      .pw-plan {
        border-radius: 14px; padding: 13px 15px;
        border: 1px solid rgba(150,200,255,0.18);
        background: rgba(255,255,255,0.06);
        backdrop-filter: blur(8px);
        cursor: pointer; transition: all 0.18s;
        display: flex; align-items: center; justify-content: space-between;
        position: relative;
      }
      .pw-plan:hover { background: rgba(74,159,212,0.14); border-color: rgba(74,159,212,0.35); }
      .pw-plan.selected { border-color: rgba(74,159,212,0.70); background: rgba(74,159,212,0.18); box-shadow: 0 0 16px rgba(74,159,212,0.20); }
      .pw-plan.highlight { border-color: rgba(74,159,212,0.28); background: rgba(74,159,212,0.09); }
      .pw-plan.highlight.selected { border-color: rgba(74,159,212,0.72); background: rgba(74,159,212,0.20); }
      .pw-plan-badge {
        position: absolute; top: -9px; right: 12px;
        background: linear-gradient(135deg, #4a9fd4, #2a7abf);
        color: #fff; font-size: 0.63rem; padding: 2px 10px;
        border-radius: 99px; letter-spacing: 0.06em; font-family: 'Noto Sans SC', sans-serif;
      }
      .pw-plan-left { display: flex; flex-direction: column; gap: 3px; }
      .pw-plan-name { font-size: 0.90rem; color: rgba(220,240,255,0.92); letter-spacing: 0.06em; }
      .pw-plan-sub { font-size: 0.68rem; color: rgba(140,190,240,0.55); font-family:'Noto Sans SC',sans-serif; }
      .pw-plan-right { display: flex; align-items: baseline; gap: 3px; }
      .pw-plan-price { font-size: 1.32rem; color: rgba(160,220,255,0.95); }
      .pw-plan-period { font-size: 0.70rem; color: rgba(140,190,240,0.60); font-family:'Noto Sans SC',sans-serif; }
      .pw-btn {
        width: 100%; padding: 14px; border: none; border-radius: 14px;
        background: linear-gradient(135deg, rgba(74,159,212,0.90) 0%, rgba(42,122,191,0.90) 100%);
        color: #fff; font-family: 'Noto Serif SC', serif;
        font-size: 0.98rem; letter-spacing: 0.1em; cursor: pointer;
        transition: opacity 0.2s, transform 0.15s; margin-bottom: 12px;
        box-shadow: 0 4px 20px rgba(42,122,191,0.40);
        border: 1px solid rgba(120,180,255,0.25);
      }
      .pw-btn:hover { opacity: 0.88; transform: scale(1.02); }
      .pw-btn:disabled { opacity: 0.40; cursor: not-allowed; transform: none; }
      .pw-restore {
        text-align: center; font-size: 0.73rem; color: rgba(140,190,240,0.50);
        cursor: pointer; font-family: 'Noto Sans SC', sans-serif;
        letter-spacing: 0.04em; background: none; border: none; width: 100%;
      }
      .pw-restore:hover { color: rgba(140,190,240,0.85); }
      .pw-msg { text-align: center; font-size: 0.76rem; margin-top: 10px; font-family: 'Noto Sans SC', sans-serif; min-height: 20px; color: rgba(140,190,240,0.60); }
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
