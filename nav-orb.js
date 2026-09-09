(function() {

// ── FONT ──
const style = document.createElement('style');
style.textContent = `
  #nav-orb-btn {
    position: fixed;
    top: 18px; left: 18px;
    width: 68px; height: 68px;
    border-radius: 50%;
    z-index: 9999;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Josefin Sans', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    letter-spacing: 0.05em;
    color: rgba(255,255,255,0.92);
    text-shadow: 0 1px 8px rgba(0,60,120,0.4);
    background: radial-gradient(circle at 28% 12%,
      rgba(255,255,255,0.82) 0%,
      rgba(255,255,255,0.30) 8%,
      rgba(255,255,255,0.04) 22%,
      rgba(140,210,255,0.08) 55%,
      rgba(100,180,240,0.12) 85%,
      rgba(100,180,240,0) 100%
    );
    border: 1px solid rgba(255,255,255,0.60);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.45),
      0 4px 20px rgba(60,140,220,0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: navOrbBob 3.5s ease-in-out infinite;
    user-select: none;
    transition: transform 0.2s;
  }
  #nav-orb-btn:active { transform: scale(0.92); }

  @keyframes navOrbBob {
    0%,100% { margin-top: 0px; }
    50%      { margin-top: -5px; }
  }

  #nav-orb-layer {
    position: fixed; inset: 0;
    z-index: 9998;
    pointer-events: none;
    display: none;
  }
  #nav-orb-layer.open {
    display: block;
    pointer-events: auto;
  }

  .nav-orb-bubble {
    position: fixed;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    text-align: center;
    cursor: pointer;
    font-family: 'Josefin Sans', sans-serif;
    font-weight: 500;
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    line-height: 1.3;
    color: rgba(220,245,255,0.92);
    text-shadow: 0 1px 6px rgba(0,60,120,0.4);
    transform: translate(-50%,-50%) scale(0);
    transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s;
    opacity: 0;
    user-select: none;
    border: none;
  }
  .nav-orb-bubble.visible {
    transform: translate(-50%,-50%) scale(1);
    opacity: 1;
    animation: navBubbleBob var(--bob-dur, 3.5s) ease-in-out infinite;
    animation-delay: var(--bob-delay, 0s);
  }
  .nav-orb-bubble:active { transform: translate(-50%,-50%) scale(0.92) !important; }

  @keyframes navBubbleBob {
    0%,100% { margin-top: 0px; }
    50%      { margin-top: -8px; }
  }

  #nav-orb-backdrop {
    position: fixed; inset: 0;
    z-index: -1;
  }
`;
document.head.appendChild(style);

// ── COLORS ──
const MAIN_COLORS = {
  'orb-tools': 'rgba(80,150,255,0.55)',
  'orb-ai':    'rgba(60,200,120,0.50)',
  'orb-goals': 'rgba(220,80,80,0.48)',
  'orb-gains': 'rgba(220,170,20,0.48)',
};

const TOOL_COLORS = {
  'orb-emotions':     'rgba(190,140,255,0.35)',
  'orb-desire':       'rgba(80,150,255,0.55)',
  'orb-whole':        'rgba(255,165,100,0.42)',
  'orb-sedona':       'rgba(20,195,190,0.55)',
  'orb-doublesides':  'rgba(240,220,180,0.55)',
  'orb-financial':    'rgba(225,195,80,0.35)',
  'orb-relationship': 'rgba(255,130,155,0.40)',
  'orb-body':         'rgba(40,190,140,0.55)',
};

function applyBubbleStyle(el, colorKey, colors) {
  const glow = colors[colorKey] || 'rgba(80,150,255,0.35)';
  const g = (op) => glow.replace(/[0-9.]+\)$/, op + ')');
  el.style.background = [
    'radial-gradient(circle at 32% 28%,',
    '  rgba(255,255,255,0.60) 0%,',
    '  rgba(220,225,230,0.45) 22%,',
    '  ' + g('0.30') + ' 50%,',
    '  ' + g('0.22') + ' 75%,',
    '  ' + g('0.10') + ' 100%)',
  ].join('');
  el.style.boxShadow = [
    'inset 0 0 35px ' + g('0.75'),
    'inset 0 0 14px ' + g('0.65'),
    '0 4px 22px ' + g('0.80'),
    '0 0 32px ' + g('0.45'),
  ].join(', ');
}

// ── BUILD DOM ──
const btn = document.createElement('div');
btn.id = 'nav-orb-btn';
btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40.90 70.00" style="display:block;width:20px;height:auto"><path d="M26.2 0.0H40.9V19.599999999999994H27.3Q21.8 19.599999999999994 21.8 28.099999999999994H40.9V46.099999999999994H21.8V70.0H0.0V27.099999999999994Q0.0 9.599999999999994 9.0 3.799999999999997Q14.8 0.0 26.2 0.0Z" fill="rgba(255,255,255,0.92)"/></svg>';
document.body.appendChild(btn);

const layer = document.createElement('div');
layer.id = 'nav-orb-layer';
layer.innerHTML = `
  <div id="nav-orb-backdrop"></div>
  <div id="nav-orb-main">
    <div class="nav-orb-bubble" id="orb-tools" style="--bob-dur:3.2s;--bob-delay:0.0s;width:72px;height:72px;left:30%;top:38%;">释放<br>工具</div>
    <div class="nav-orb-bubble" id="orb-ai"    style="--bob-dur:3.8s;--bob-delay:0.5s;width:72px;height:72px;left:70%;top:38%;">释放<br>助手</div>
    <div class="nav-orb-bubble" id="orb-goals" style="--bob-dur:3.5s;--bob-delay:1.0s;width:72px;height:72px;left:30%;top:60%;">目标表</div>
    <div class="nav-orb-bubble" id="orb-gains" style="--bob-dur:4.1s;--bob-delay:0.3s;width:72px;height:72px;left:70%;top:60%;">收获本</div>
  </div>
  <div id="nav-orb-tools" style="display:none;">
    <div class="nav-orb-bubble" id="orb-emotions"     data-href="Emotions.html"            style="--bob-dur:4.0s;--bob-delay:0.0s;width:68px;height:68px;left:30%;top:20%;">情绪<br>释放</div>
    <div class="nav-orb-bubble" id="orb-desire"       data-href="desire.html"               style="--bob-dur:3.4s;--bob-delay:0.3s;width:68px;height:68px;left:70%;top:20%;">欲望<br>释放</div>
    <div class="nav-orb-bubble" id="orb-whole"        data-href="Sedona2.html"       style="--bob-dur:3.5s;--bob-delay:0.6s;width:68px;height:68px;left:30%;top:38%;">识别即<br>释放</div>
    <div class="nav-orb-bubble" id="orb-sedona"       data-href="Whole_process.html"             style="--bob-dur:3.7s;--bob-delay:0.9s;width:68px;height:68px;left:70%;top:38%;">情绪欲望<br>释放</div>
    <div class="nav-orb-bubble" id="orb-doublesides"  data-href="Doublesides.html"         style="--bob-dur:3.9s;--bob-delay:0.2s;width:68px;height:68px;left:30%;top:56%;">好处坏处<br>释放</div>
    <div class="nav-orb-bubble" id="orb-financial"    data-href="financial-freedom.html"   style="--bob-dur:4.2s;--bob-delay:0.7s;width:68px;height:68px;left:70%;top:56%;">财富<br>释放</div>
    <div class="nav-orb-bubble" id="orb-relationship" data-href="Relationship.html"        style="--bob-dur:3.6s;--bob-delay:0.4s;width:68px;height:68px;left:30%;top:74%;">人际关系<br>释放</div>
    <div class="nav-orb-bubble" id="orb-body"         data-href="body_release.html"        style="--bob-dur:3.3s;--bob-delay:1.0s;width:68px;height:68px;left:70%;top:74%;">身体健康<br>释放</div>
  </div>
`;
document.body.appendChild(layer);

// Apply colors
Object.keys(MAIN_COLORS).forEach(id => {
  const el = document.getElementById(id);
  if (el) applyBubbleStyle(el, id, MAIN_COLORS);
});
Object.keys(TOOL_COLORS).forEach(id => {
  const el = document.getElementById(id);
  if (el) applyBubbleStyle(el, id, TOOL_COLORS);
});

// ── STATE ──
let navState = 'closed';

function openMain() {
  navState = 'main';
  layer.classList.add('open');
  document.getElementById('nav-orb-main').style.display = 'block';
  document.getElementById('nav-orb-tools').style.display = 'none';
  setTimeout(() => {
    document.querySelectorAll('#nav-orb-main .nav-orb-bubble').forEach((b, i) => {
      setTimeout(() => b.classList.add('visible'), i * 60);
    });
  }, 50);
}

function openTools() {
  navState = 'tools';
  document.querySelectorAll('#nav-orb-main .nav-orb-bubble').forEach(b => b.classList.remove('visible'));
  setTimeout(() => {
    document.getElementById('nav-orb-main').style.display = 'none';
    document.getElementById('nav-orb-tools').style.display = 'block';
    setTimeout(() => {
      document.querySelectorAll('#nav-orb-tools .nav-orb-bubble').forEach((b, i) => {
        setTimeout(() => b.classList.add('visible'), i * 50);
      });
    }, 50);
  }, 300);
}

function closeNav() {
  navState = 'closed';
  document.querySelectorAll('.nav-orb-bubble').forEach(b => b.classList.remove('visible'));
  setTimeout(() => {
    layer.classList.remove('open');
    document.getElementById('nav-orb-main').style.display = 'block';
    document.getElementById('nav-orb-tools').style.display = 'none';
  }, 400);
}

// ── EVENTS ──
btn.addEventListener('click', () => {
  if (navState === 'closed') {
    openMain();
  } else {
    closeNav();
  }
});

document.getElementById('orb-tools').addEventListener('click', openTools);
document.getElementById('orb-ai').addEventListener('click', () => { window.location.href='assistant.html'; });
document.getElementById('orb-goals').addEventListener('click', () => { window.location.href='goals.html'; });
document.getElementById('orb-gains').addEventListener('click', () => { window.location.href='gains.html'; });

document.querySelectorAll('#nav-orb-tools .nav-orb-bubble[data-href]').forEach(b => {
  b.addEventListener('click', () => { window.location.href = b.dataset.href; });
});

document.getElementById('nav-orb-backdrop').addEventListener('click', closeNav);

})();
