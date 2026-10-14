// Freed Supabase 双线路：先走 sb.freedreleasing.com（Cloudflare 转发），
// 连不上或超时自动改走 supabase.co 直连，并记住能用的那条，下次直接走它。
// 用法：createClient 时传 global: { fetch: window.freedFetch }；
//       手写请求把 fetch(SUPA_URL + ...) 换成 freedFetch(SUPA_URL + ...)。
// 登录记录名不变（sb-ryoaxziysgdkjcjiuqti-auth-token），老用户不会被登出。
(function () {
  var DIRECT = 'https://ryoaxziysgdkjcjiuqti.supabase.co';
  var PROXY  = 'https://sb.freedreleasing.com';
  var ROUTE_KEY = 'freed_sb_route';   // 'proxy' 或 'direct'
  var TIMEOUT_MS = 10000;
  var nativeFetch = window.fetch.bind(window);

  function getRoute() {
    try { return localStorage.getItem(ROUTE_KEY) === 'direct' ? 'direct' : 'proxy'; }
    catch (_) { return 'proxy'; }
  }
  function setRoute(r) {
    try { localStorage.setItem(ROUTE_KEY, r); } catch (_) {}
  }
  function swapBase(url, route) {
    var base = route === 'proxy' ? PROXY : DIRECT;
    if (url.indexOf(DIRECT) === 0) return base + url.slice(DIRECT.length);
    if (url.indexOf(PROXY) === 0)  return base + url.slice(PROXY.length);
    return null;
  }
  function attempt(url, init, withTimeout) {
    if (!withTimeout || (init && init.signal) || typeof AbortController === 'undefined') {
      return nativeFetch(url, init);
    }
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    var opts = Object.assign({}, init || {}, { signal: ctrl.signal });
    return nativeFetch(url, opts).then(
      function (res) { clearTimeout(timer); return res; },
      function (err) { clearTimeout(timer); throw err; }
    );
  }

  window.freedFetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    // 不是 Supabase 地址，或者传进来的是 Request 对象，原样请求
    if (typeof input !== 'string' && !(input instanceof URL)) return nativeFetch(input, init);
    var first = getRoute();
    var second = first === 'proxy' ? 'direct' : 'proxy';
    var firstUrl = swapBase(url, first);
    if (!firstUrl) return nativeFetch(input, init);

    // 请求体是流的话没法重发，只走一条线路
    var canRetry = !(init && init.body && typeof init.body.getReader === 'function');

    return attempt(firstUrl, init, canRetry).catch(function (err) {
      // 调用方自己取消的，不切换线路
      if (init && init.signal && init.signal.aborted) throw err;
      if (!canRetry) throw err;
      return attempt(swapBase(url, second), init, false).then(function (res) {
        setRoute(second);
        return res;
      });
    });
  };
})();
