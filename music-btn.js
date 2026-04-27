// ── VARIABLES ──
let audioCtx     = null;
let masterGain   = null;
let currentTrack = null;
let musicStopFns = [];
let musicPlaying = false;
let musicPanelOpen = false;

// ── INJECT CSS ──
const _musicStyle = document.createElement('style');
_musicStyle.textContent = `
  /* ── MUSIC BUTTON & PANEL ── */
  .music-btn {
    position: fixed; top: 16px; right: 16px; z-index: 9997;
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(255,255,255,0.2); backdrop-filter: blur(12px);
    border: 1.5px solid rgba(255,255,255,0.35);
    color: #fff; font-size: 1rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 14px rgba(0,40,100,0.18);
    transition: transform 0.2s, background 0.2s;
  }
  .music-btn:hover { transform: scale(1.1); background: rgba(255,255,255,0.32); }
  .music-btn.playing {
    background: rgba(100,190,255,0.28);
    border-color: rgba(160,225,255,0.55);
  }
  .music-btn.playing .music-icon {
    display: inline-block;
    animation: musicRotate 4s linear infinite;
  }
  @keyframes musicRotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .music-panel {
    position: fixed; top: 64px; right: 12px; z-index: 9996;
    width: min(390px, 90vw);
    background: rgba(22,48,100,0.93); backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 20px;
    box-shadow: 0 12px 40px rgba(0,20,70,0.55);
    padding: 16px 14px 14px;
    max-height: min(75vh, 560px); overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    opacity: 0; pointer-events: none; visibility: hidden;
    transform: translateY(-8px) scale(0.97);
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
  }
  .music-panel.open { opacity: 1; pointer-events: auto; visibility: visible; transform: translateY(0) scale(1); }
  .music-panel-title {
    display: block;
    font-family: 'Noto Serif SC', serif; font-size: 0.8rem;
    color: rgba(200,220,255,0.65); letter-spacing: 0.22em;
    text-align: center; margin-bottom: 12px;
  }
  .music-tracks { display: flex; flex-direction: column; gap: 8px; }
  .music-track {
    display: flex; align-items: center; gap: 14px;
    padding: 13px 14px; border-radius: 12px; cursor: pointer;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    transition: background 0.18s, border-color 0.18s;
  }
  .music-track:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.18); }
  .music-track.active { background: rgba(60,120,220,0.3); border-color: rgba(120,180,255,0.4); }
  .music-track-icon { font-size: 1.5rem; width: 36px; text-align: center; flex-shrink: 0; }
  .music-track-info { flex: 1; min-width: 0; }
  .music-play-btn {
    flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; border: none;
    background: rgba(255,255,255,0.14); color: rgba(220,240,255,0.9);
    font-size: 0.8rem; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.18s, transform 0.12s;
  }
  .music-play-btn:hover { background: rgba(255,255,255,0.26); transform: scale(1.1); }
  .music-play-btn.playing { background: rgba(60,120,220,0.55); color: rgba(200,230,255,1); }
  .music-track-name {
    font-family: 'Noto Sans SC', sans-serif; font-size: 0.9rem;
    font-weight: 400; color: rgba(230,245,255,0.95);
    letter-spacing: 0.03em;
  }
  .music-track-desc {
    display: block; font-size: 0.68rem;
    color: rgba(170,200,255,0.55); margin-top: 2px; letter-spacing: 0.02em;
  }
  .music-playing-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: rgba(140,220,255,0.9);
    animation: dotPulse 1.4s ease-in-out infinite; flex-shrink: 0;
  }
  @keyframes dotPulse {
    0%,100% { opacity: 0.3; transform: scale(0.8); }
    50%      { opacity: 1;   transform: scale(1.2); }
  }
  .music-volume-row {
    display: flex; align-items: center; gap: 10px;
    margin-top: 12px; padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,0.12);
  }
  .music-vol-icon { font-size: 1.1rem; color: rgba(180,220,255,0.6); }
  .music-volume {
    flex: 1; -webkit-appearance: none; appearance: none;
    height: 3px; border-radius: 2px; outline: none; cursor: pointer;
    background: rgba(255,255,255,0.2);
  }
  .music-volume::-webkit-slider-thumb {
    -webkit-appearance: none; width: 13px; height: 13px;
    border-radius: 50%; background: rgba(220,240,255,0.9);
    box-shadow: 0 1px 5px rgba(0,40,100,0.35); cursor: pointer;
  }


`;
document.head.appendChild(_musicStyle);

// ── INJECT HTML ──
(function() {
  // Music button
  const btn = document.createElement('button');
  btn.className = 'music-btn';
  btn.id = 'musicBtn';
  btn.title = '背景音乐';
  btn.innerHTML = '<svg class="music-icon" viewBox="0 0 20 22" width="16" height="18" fill="rgba(255,255,255,0.78)"><path d="M7 17.5c0 1.38-1.12 2.5-2.5 2.5S2 18.88 2 17.5 3.12 15 4.5 15c.56 0 1.08.19 1.5.5V6.5l9-2v8.5c-.42-.31-.94-.5-1.5-.5-1.38 0-2.5 1.12-2.5 2.5S12.12 17 13.5 17 16 15.88 16 14.5V3L7 5.2V17.5z"/></svg>';
  btn.addEventListener('click', function() {
    if (!audioCtx) {
      try {
        audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.45;
        masterGain.connect(audioCtx.destination);
      } catch(e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    musicPanelOpen = !musicPanelOpen;
    const panel = document.getElementById('musicPanel');
    if (panel) panel.classList.toggle('open', musicPanelOpen);
  });
  document.body.appendChild(btn);

  // Music panel - use fetch from template
  const panel = document.createElement('div');
  panel.id = 'musicPanel';
  panel.className = 'music-panel';
  panel.innerHTML = [
    '<div class="music-panel-title">背 景 音 乐</div>',
    '<div class="music-source-tabs">',
    '  <button class="music-source-tab active" id="msrc-builtin" onclick="switchMusicSource(\'builtin\')">🎵 App内置</button>',
    '  <button class="music-source-tab" id="msrc-import" onclick="switchMusicSource(\'import\')">📁 本地导入</button>',
    '</div>',
    '<div class="music-source-panel active" id="mpanel-builtin">',
    '<div class="music-tracks">',
    '<div class="music-track" data-track="bowl"><span class="music-track-icon">🔔</span><div class="music-track-info"><div class="music-track-name">冥想钵</div><span class="music-track-desc">396Hz · 释放恐惧</span></div><button class="music-play-btn" onclick="selectTrack(\'bowl\')">▶</button></div>',
    '<div class="music-track" data-track="deepbowl"><span class="music-track-icon">🎐</span><div class="music-track-info"><div class="music-track-name">颂钵冥想</div><span class="music-track-desc">三钵共鸣 · 深度放松</span></div><button class="music-play-btn" onclick="selectTrack(\'deepbowl\')">▶</button></div>',
    '<div class="music-track" data-track="hz528"><span class="music-track-icon">💚</span><div class="music-track-info"><div class="music-track-name">528Hz 疗愈</div><span class="music-track-desc">爱的频率 · DNA修复</span></div><button class="music-play-btn" onclick="selectTrack(\'hz528\')">▶</button></div>',
    '<div class="music-track" data-track="awaken"><span class="music-track-icon">✨</span><div class="music-track-info"><div class="music-track-name">963Hz 觉醒</div><span class="music-track-desc">松果体 · 灵性连接</span></div><button class="music-play-btn" onclick="selectTrack(\'awaken\')">▶</button></div>',
    '<div class="music-track" data-track="schumann"><span class="music-track-icon">🌍</span><div class="music-track-info"><div class="music-track-name">舒曼共振</div><span class="music-track-desc">7.83Hz · 地球脑波</span></div><button class="music-play-btn" onclick="selectTrack(\'schumann\')">▶</button></div>',
    '<div class="music-track" data-track="deep"><span class="music-track-icon">🌌</span><div class="music-track-info"><div class="music-track-name">432Hz 深空</div><span class="music-track-desc">自然律 · 宇宙共鸣</span></div><button class="music-play-btn" onclick="selectTrack(\'deep\')">▶</button></div>',
    '<div class="music-track" data-track="piano"><span class="music-track-icon">🎹</span><div class="music-track-info"><div class="music-track-name">528调式钢琴</div><span class="music-track-desc">五声音阶 · 宁静</span></div><button class="music-play-btn" onclick="selectTrack(\'piano\')">▶</button></div>',
    '<div class="music-track" data-track="rain"><span class="music-track-icon">🌧️</span><div class="music-track-info"><div class="music-track-name">夜雨</div><span class="music-track-desc">细密雨声 · 静谧</span></div><button class="music-play-btn" onclick="selectTrack(\'rain\')">▶</button></div>',
    '<div class="music-track" data-track="ocean"><span class="music-track-icon">🌊</span><div class="music-track-info"><div class="music-track-name">海浪</div><span class="music-track-desc">潮汐呼吸 · 放松</span></div><button class="music-play-btn" onclick="selectTrack(\'ocean\')">▶</button></div>',
    '<div class="music-track" data-track="water"><span class="music-track-icon">💧</span><div class="music-track-info"><div class="music-track-name">山涧流水</div><span class="music-track-desc">溪流 · 清澈</span></div><button class="music-play-btn" onclick="selectTrack(\'water\')">▶</button></div>',
    '</div></div>',
    '<div class="music-source-panel" id="mpanel-import">',
    '<div class="music-import-zone" id="importDropZone" onclick="document.getElementById(\'importFileInput\').click()">',
    '<div class="music-import-icon">🎵</div>',
    '<div class="music-import-text">点击选择音乐文件</div>',
    '</div>',
    '<input type="file" id="importFileInput" accept="audio/*" multiple style="display:none" onchange="handleImportFile(this.files)">',
    '<div class="music-imported-list" id="importedList"><div id="importEmptyHint">还没有导入的音乐</div></div>',
    '</div>',
    '<div class="music-volume-row">',
    '<span class="music-vol-icon">🔈</span>',
    '<input type="range" class="music-volume" id="musicVolume" min="0" max="100" value="45" oninput="setMusicVolume(this.value)">',
    '<span class="music-vol-icon">🔊</span>',
    '</div>',
  ].join('\n');
  document.body.appendChild(panel);

  // Close panel on outside click
  document.addEventListener('click', function(e) {
    if (typeof musicPanelOpen !== 'undefined' && musicPanelOpen &&
        !e.target.closest('#musicPanel') && !e.target.closest('#musicBtn')) {
      musicPanelOpen = false;
      panel.classList.remove('open');
    }
  });
})();

// ── MUSIC SYSTEM ──

function unlockAudio() {
  if (!audioCtx) return;
  // iOS Safari: must start a real (even silent) buffer in the click handler
  const buf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  src.connect(audioCtx.destination);
  src.start(0);
}

function stopAllMusic() {
  musicStopFns.forEach(fn => { try { fn(); } catch(_){} });
  musicStopFns = [];
  musicPlaying = false;
  const btn = document.getElementById('musicBtn');
  if (btn) btn.classList.remove('playing');
  document.querySelectorAll('.music-track').forEach(t => {
    t.classList.remove('active');
    const pb2 = t.querySelector('.music-play-btn');
    if (pb2) { pb2.textContent = '▶'; pb2.classList.remove('playing'); }
  });
}

function setMusicVolume(v) {
  if (masterGain && audioCtx) masterGain.gain.setTargetAtTime(v / 100, audioCtx.currentTime, 0.05);
  const slider = document.getElementById('musicVolume');
  if (slider) slider.style.background = `linear-gradient(to right,rgba(140,210,255,0.85) 0%,rgba(140,210,255,0.85) ${v}%,rgba(255,255,255,0.18) ${v}%)`;
}

// ── 宇宙频率常量（Solfeggio + Schumann）──
// 所有音轨经过 DynamicsCompressor 统一响度
function makeMasterChain(ctx, dest, preGain) {
  // preGain: per-track normalisation factor (default 1.0)
  const pre = ctx.createGain();
  pre.gain.value = preGain || 1.0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value      = 10;
  comp.ratio.value     = 6;
  comp.attack.value    = 0.003;
  comp.release.value   = 0.3;
  const g = ctx.createGain();
  g.gain.value = 0.65;
  pre.connect(comp); comp.connect(g); g.connect(dest);
  return pre; // everything connects to pre
}

// ── Track 1: 冥想钵 396Hz（Solfeggio · 释放恐惧）──
function playBowl() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 1.2);
  // Solfeggio 396 基频及其八度
  const freqs = [99, 132, 198, 264, 396, 528, 396*1.5];
  let stopped = false, idx = 0;
  const timers = [];
  function strike(freq) {
    const now = ctx.currentTime;
    [[1,0.42],[2.756,0.12],[5.04,0.04]].forEach(([mult,vol]) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq * mult;
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (mult===1 ? 7 : mult<3 ? 4 : 2));
      osc.connect(g); g.connect(chain);
      osc.start(now); osc.stop(now + (mult===1 ? 7.2 : 4.5));
    });
  }
  function schedule() {
    if (stopped) return;
    strike(freqs[idx++ % freqs.length]);
    timers.push(setTimeout(schedule, 3800 + Math.random() * 2200));
  }
  schedule();
  musicStopFns.push(() => { stopped=true; timers.forEach(clearTimeout); try{chain.disconnect();}catch(_){} });
}

// ── Track 2: 528Hz 爱与疗愈（Solfeggio · DNA修复频率）──
function play528() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.55);
  const nodes = [];
  // 528Hz 基频 + 纯五度 + 泛音
  [[528,0.28],[1056,0.08],[264,0.12],[792,0.06]].forEach(([freq,vol]) => {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    g.gain.value = vol;
    // 极缓LFO造成轻微颤动感
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.type='sine'; lfo.frequency.value = 0.06 + Math.random()*0.04;
    lfoG.gain.value = vol * 0.12;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start(); osc.start();
    osc.connect(g); g.connect(chain);
    nodes.push(osc,g,lfo,lfoG);
  });
  musicStopFns.push(() => {
    nodes.forEach(n=>{try{if(n.stop)n.stop();}catch(_){} try{n.disconnect();}catch(_){}});
    try{chain.disconnect();}catch(_){}
  });
}

// ── Track 3: 流水声（粉噪声 + 高频泛音）──
function playWater() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 1.0);
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(2, sr*4, sr);
  for (let ch=0; ch<2; ch++) {
    const d = buf.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i=0; i<d.length; i++) {
      const w = Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.18;
      b6 = w*0.115926;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer=buf; src.loop=true;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2800;
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=220;
  src.connect(lp); lp.connect(hp); hp.connect(chain);
  src.start();
  musicStopFns.push(()=>{ try{src.stop();}catch(_){} try{chain.disconnect();}catch(_){} });
}

// ── Track 4: 轻柔钢琴（五声音阶 + Solfeggio调式）──
function playPiano() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.8);
  // 以 528Hz 为中心的五声音阶
  const scales = [
    [264,330,396,528,660],
    [220,275,330,440,550],
    [198,247.5,297,396,495],
    [176,220,264,352,440],
  ];
  let stopped=false, ci=0;
  const timers=[];
  function playChord() {
    if (stopped) return;
    const now = ctx.currentTime;
    const notes = scales[ci++ % scales.length];
    // 只弹 2-3 个音，稀疏感
    const pick = notes.filter((_,i)=>[0,2,4].includes(i));
    pick.forEach((freq,i) => {
      const osc=ctx.createOscillator(), g=ctx.createGain();
      osc.type='triangle'; osc.frequency.value=freq;
      const t = now + i*0.4;
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(0.3,t+0.25);
      g.gain.exponentialRampToValueAtTime(0.0001,t+7);
      osc.connect(g); g.connect(chain);
      osc.start(t); osc.stop(t+7.5);
    });
    timers.push(setTimeout(playChord, 8000+Math.random()*3000));
  }
  playChord();
  musicStopFns.push(()=>{ stopped=true; timers.forEach(clearTimeout); try{chain.disconnect();}catch(_){} });
}

// ── Track 5: 地球共振 7.83Hz Schumann（脑波同步·θ波）──
function playSchumann() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.65);
  const nodes = [];
  // 二进制节拍：左耳 200Hz，右耳 207.83Hz → 差频 7.83Hz（Schumann共振）
  // 用立体声buffer模拟
  const sr = ctx.sampleRate, dur = 30;
  const buf = ctx.createBuffer(2, sr*dur, sr);
  const freqL=200, freqR=207.83;
  for (let i=0; i<sr*dur; i++) {
    buf.getChannelData(0)[i] = Math.sin(2*Math.PI*freqL*i/sr) * 0.32;
    buf.getChannelData(1)[i] = Math.sin(2*Math.PI*freqR*i/sr) * 0.32;
  }
  const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
  // 低频包络 LFO at 7.83Hz 叠加质感
  const lfoOsc=ctx.createOscillator(), lfoG=ctx.createGain();
  lfoOsc.type='sine'; lfoOsc.frequency.value=7.83;
  lfoG.gain.value=0.08;
  lfoOsc.connect(lfoG);
  const mainG=ctx.createGain(); mainG.gain.value=0.55;
  lfoG.connect(mainG.gain);
  src.connect(mainG); mainG.connect(chain);
  src.start(); lfoOsc.start();
  nodes.push(lfoOsc,lfoG,mainG);
  musicStopFns.push(()=>{
    try{src.stop();}catch(_){}
    nodes.forEach(n=>{try{if(n.stop)n.stop();}catch(_){} try{n.disconnect();}catch(_){}});
    try{chain.disconnect();}catch(_){}
  });
}

// ── Track 6: 宇宙深空（低频嗡鸣 432Hz·自然音）──
function playDeep() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.42);
  const nodes = [];
  // 432Hz（自然律 A音）及其泛音列
  [[432,0.22],[216,0.16],[108,0.12],[864,0.06],[54,0.08]].forEach(([freq,vol],i)=>{
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type='sine'; osc.frequency.value=freq;
    g.gain.value=vol;
    const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
    lfo.type='sine'; lfo.frequency.value=0.04+i*0.015;
    lfoG.gain.value=vol*0.15;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start(); osc.start();
    osc.connect(g); g.connect(chain);
    nodes.push(osc,g,lfo,lfoG);
  });
  // 细噪声层增加质感
  const sr=ctx.sampleRate;
  const nbuf=ctx.createBuffer(1,sr*3,sr);
  const nd=nbuf.getChannelData(0);
  for(let i=0;i<nd.length;i++) nd[i]=(Math.random()*2-1);
  const nsrc=ctx.createBufferSource(); nsrc.buffer=nbuf; nsrc.loop=true;
  const nf=ctx.createBiquadFilter(); nf.type='lowpass'; nf.frequency.value=180; nf.Q.value=4;
  const ng=ctx.createGain(); ng.gain.value=0.08;
  nsrc.connect(nf); nf.connect(ng); ng.connect(chain); nsrc.start();
  nodes.push(nsrc,nf,ng);
  musicStopFns.push(()=>{
    nodes.forEach(n=>{try{if(n.stop)n.stop();}catch(_){} try{n.disconnect();}catch(_){}});
    try{chain.disconnect();}catch(_){}
  });
}

// ── Track 7: 963Hz 觉醒（Solfeggio · 松果体激活）──
function playAwaken() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.58);
  const nodes=[];
  [[963,0.18],[481.5,0.14],[1926,0.05],[321,0.10]].forEach(([freq,vol])=>{
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type='sine'; osc.frequency.value=freq;
    g.gain.value=vol;
    const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
    lfo.type='sine'; lfo.frequency.value=0.05+Math.random()*0.05;
    lfoG.gain.value=vol*0.1;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    lfo.start(); osc.start();
    osc.connect(g); g.connect(chain);
    nodes.push(osc,g,lfo,lfoG);
  });
  // 轻柔钵声点缀
  let stopped=false; const timers=[];
  function ding() {
    if(stopped) return;
    const now=ctx.currentTime;
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type='sine'; osc.frequency.value=963*(1+Math.random()*0.01);
    g.gain.setValueAtTime(0,now);
    g.gain.linearRampToValueAtTime(0.22,now+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,now+5);
    osc.connect(g); g.connect(chain);
    osc.start(now); osc.stop(now+5.5);
    timers.push(setTimeout(ding,5000+Math.random()*4000));
  }
  ding();
  musicStopFns.push(()=>{
    stopped=true; timers.forEach(clearTimeout);
    nodes.forEach(n=>{try{if(n.stop)n.stop();}catch(_){} try{n.disconnect();}catch(_){}});
    try{chain.disconnect();}catch(_){}
  });
}

// ── 自然声音（真实录音，用 <audio> 元素）──
// 使用多个备用URL，任何一个能加载即可
// ── Track 10: 夜雨（细密雨声+偶尔雷声远鸣）──
function playRain() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.95);
  const nodes = [];
  const timers = [];
  let stopped = false;

  // 主雨声：两层滤波粉噪声叠加，形成丰富质感
  function makeRainLayer(bufDur, lowpassFreq, highpassFreq, vol) {
    const sr=ctx.sampleRate;
    const buf=ctx.createBuffer(2,sr*bufDur,sr);
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch);
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for(let i=0;i<d.length;i++){
        const w=Math.random()*2-1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.22;
        b6=w*0.115926;
      }
    }
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=lowpassFreq;
    const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=highpassFreq;
    const g=ctx.createGain(); g.gain.value=vol;
    src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(chain);
    src.start();
    nodes.push(src,lp,hp,g);
  }
  makeRainLayer(5, 4000, 400, 0.55);  // 细雨
  makeRainLayer(7, 1200, 150, 0.3);   // 底层低频雨声

  // 水滴声：个别大雨滴
  function raindrop() {
    if(stopped) return;
    const now=ctx.currentTime;
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type='sine'; osc.frequency.value=600+Math.random()*400;
    osc.frequency.exponentialRampToValueAtTime(200+Math.random()*100, now+0.08);
    g.gain.setValueAtTime(0,now);
    g.gain.linearRampToValueAtTime(0.12+Math.random()*0.08,now+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001,now+0.12);
    osc.connect(g); g.connect(chain);
    osc.start(now); osc.stop(now+0.14);
    timers.push(setTimeout(raindrop,200+Math.random()*800));
  }
  timers.push(setTimeout(raindrop,Math.random()*500));

  musicStopFns.push(()=>{
    stopped=true; timers.forEach(clearTimeout);
    nodes.forEach(n=>{try{if(n.stop)n.stop();}catch(_){} try{n.disconnect();}catch(_){}});
    try{chain.disconnect();}catch(_){}
  });
}

// ── Track 11: 海浪（缓慢潮汐，深呼吸节奏）──
function playOcean() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.9);
  const nodes = [];

  // 低频浪潮：带通滤波粉噪声，LFO调制模拟涨退
  const sr=ctx.sampleRate;
  const buf=ctx.createBuffer(2,sr*8,sr);
  for(let ch=0;ch<2;ch++){
    const d=buf.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<d.length;i++){
      const w=Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.28;
      b6=w*0.115926;
    }
  }
  const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=800;
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=60;
  const g=ctx.createGain(); g.gain.value=0.5;

  // 海浪涨退 LFO（约8秒一个周期，模拟深呼吸）
  const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
  lfo.type='sine'; lfo.frequency.value=0.12; // ~8秒一浪
  lfoG.gain.value=0.38;
  lfo.connect(lfoG); lfoG.connect(g.gain);
  lfo.start();

  src.connect(lp); lp.connect(hp); hp.connect(g); g.connect(chain);
  src.start();
  nodes.push(src,lp,hp,g,lfo,lfoG);

  // 细碎浪花高频层
  const buf2=ctx.createBuffer(1,sr*3,sr);
  const d2=buf2.getChannelData(0);
  for(let i=0;i<d2.length;i++) d2[i]=(Math.random()*2-1)*0.18;
  const src2=ctx.createBufferSource(); src2.buffer=buf2; src2.loop=true;
  const hp2=ctx.createBiquadFilter(); hp2.type='highpass'; hp2.frequency.value=2000;
  const lp2=ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=6000;
  const g2=ctx.createGain(); g2.gain.value=0.18;
  const lfo2=ctx.createOscillator(), lfo2G=ctx.createGain();
  lfo2.type='sine'; lfo2.frequency.value=0.12;
  lfo2G.gain.value=0.15;
  lfo2.connect(lfo2G); lfo2G.connect(g2.gain);
  lfo2.start();
  src2.connect(hp2); hp2.connect(lp2); lp2.connect(g2); g2.connect(chain);
  src2.start();
  nodes.push(src2,hp2,lp2,g2,lfo2,lfo2G);

  musicStopFns.push(()=>{
    nodes.forEach(n=>{try{if(n.stop)n.stop();}catch(_){} try{n.disconnect();}catch(_){}});
    try{chain.disconnect();}catch(_){}
  });
}

// ── Track 12: 颂钵冥想（长泛音·深度放松）──
function playDeepBowl() {
  const ctx = audioCtx;
  const chain = makeMasterChain(ctx, masterGain, 0.78);
  const nodes = [];
  const timers = [];
  let stopped = false;

  // 三个钵同时响，音程为纯五度+大三度（自然泛音列）
  const sets = [
    [174.61, 261.63, 392.00],  // F · C · G
    [194.18, 291.00, 436.00],  // 接近G调
    [220.00, 330.00, 440.00],  // A · E · A
  ];
  let setIdx = 0;

  function strikeSet() {
    if (stopped) return;
    const freqs = sets[setIdx++ % sets.length];
    const now = ctx.currentTime;

    freqs.forEach((freq, fi) => {
      [[1,0.36],[2.756,0.10],[4.07,0.04],[5.04,0.02]].forEach(([mult,vol],hi) => {
        const osc=ctx.createOscillator(), g=ctx.createGain();
        osc.type='sine'; osc.frequency.value=freq*mult;
        const t = now + fi*0.6; // 三个钵依次敲
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(vol,t+0.015);
        g.gain.exponentialRampToValueAtTime(0.0001,t+(hi===0?10:hi===1?6:3));
        osc.connect(g); g.connect(chain);
        osc.start(t); osc.stop(t+(hi===0?10.5:6.5));
      });
    });

    timers.push(setTimeout(strikeSet, 12000+Math.random()*4000));
  }

  strikeSet();
  musicStopFns.push(()=>{
    stopped=true; timers.forEach(clearTimeout);
    try{chain.disconnect();}catch(_){}
  });
}

const TRACKS = {
  bowl:playBowl, hz528:play528, water:playWater, piano:playPiano,
  schumann:playSchumann, deep:playDeep, awaken:playAwaken,
  rain:playRain, ocean:playOcean, deepbowl:playDeepBowl
};



function selectTrack(id) {
  if (!audioCtx) {
    try {
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.45;
      masterGain.connect(audioCtx.destination);
    } catch(e) { showToast('❌ 浏览器不支持Web Audio'); return; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  unlockAudio(); // iOS Safari unlock

  if (currentTrack === id && musicPlaying) {
    stopAllMusic(); currentTrack = null; return;
  }
  stopAllMusic();
  currentTrack = id; musicPlaying = true;

  TRACKS[id]();
  const vol = document.getElementById('musicVolume').value;
  masterGain.gain.value = vol / 100;
  setMusicVolume(vol);

  document.getElementById('musicBtn').classList.add('playing');
  document.querySelectorAll('.music-track').forEach(t => {
    t.classList.remove('active');
    const pb = t.querySelector('.music-play-btn');
    if (pb) { pb.textContent = '▶'; pb.classList.remove('playing'); }
    if (t.dataset.track === id) {
      t.classList.add('active');
      if (pb) { pb.textContent = '⏹'; pb.classList.add('playing'); }
    }
  });
}

function toggleMusicPanel() {
  if (!audioCtx) {
    try {
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.45;
      masterGain.connect(audioCtx.destination);
    } catch(e) {}
  }
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    unlockAudio();
  }
  musicPanelOpen = !musicPanelOpen;
  document.getElementById('musicPanel').classList.toggle('open', musicPanelOpen);
}

document.addEventListener('click', e => {
  if (musicPanelOpen && !e.target.closest('#musicPanel') && !e.target.closest('#musicBtn')) {
    musicPanelOpen = false;
    document.getElementById('musicPanel').classList.remove('open');
  }
});

// init volume slider
(function(){
  const s = document.getElementById('musicVolume');
  if (s) s.style.background = 'linear-gradient(to right,rgba(140,210,255,0.85) 0%,rgba(140,210,255,0.85) 50%,rgba(255,255,255,0.18) 50%)';
})();

// ═══════════════════════════════════════════════════
//  MUSIC SOURCE TABS
// ═══════════════════════════════════════════════════
let currentMusicSource = 'builtin';

function switchMusicSource(src) {
  currentMusicSource = src;
  ['builtin','import','record'].forEach(s => {
    document.getElementById('msrc-' + s).classList.toggle('active', s === src);
    document.getElementById('mpanel-' + s).classList.toggle('active', s === src);
  });
  // Init waveform bars on first visit
  if (src === 'record') initRecordWaveform();
}

// ═══════════════════════════════════════════════════
//  LOCAL IMPORT — file + URL
// ═══════════════════════════════════════════════════
// importedTracks: [{id, name, src, objectUrl?}]
const importedTracks = [];
let importAudioEl    = null; // single <audio> element for imported/recorded playback
let currentImportId  = null;

function ensureImportAudio() {
  if (!importAudioEl) {
    importAudioEl = new Audio();
    importAudioEl.loop = true;
  }
  return importAudioEl;
}

function handleImportDragOver(e) {
  e.preventDefault();
  document.getElementById('importDropZone').classList.add('dragover');
}
function handleImportDragLeave(e) {
  document.getElementById('importDropZone').classList.remove('dragover');
}
function handleImportDrop(e) {
  e.preventDefault();
  document.getElementById('importDropZone').classList.remove('dragover');
  handleImportFile(e.dataTransfer.files);
}

function handleImportFile(files) {
  if (!files || !files.length) return;
  for (const file of files) {
    if (!file.type.startsWith('audio/')) { showToast('❌ 请选择音频文件'); continue; }
    const url = URL.createObjectURL(file);
    const id  = 'import-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
    importedTracks.push({ id, name: file.name.replace(/\.[^.]+$/,''), src: url, objectUrl: url });
    renderImportedList();
  }
  // reset input
  document.getElementById('importFileInput').value = '';
}

function handleImportUrl() {
  const input = document.getElementById('importUrlInput');
  const url   = input.value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) { showToast('❌ 请输入 http/https 开头的链接'); return; }
  const name = url.split('/').pop().split('?')[0].replace(/\.[^.]*$/,'') || '链接音乐';
  const id   = 'import-' + Date.now();
  importedTracks.push({ id, name, src: url });
  renderImportedList();
  input.value = '';
}

function renderImportedList() {
  const list = document.getElementById('importedList');
  if (!importedTracks.length) {
    list.innerHTML = '<div class="music-import-empty" id="importEmptyHint">还没有导入的音乐</div>';
    return;
  }
  list.innerHTML = importedTracks.map(track => `
    <div class="music-imported-item ${currentImportId===track.id?'active':''}"
         id="itrack-${track.id}" onclick="selectImportTrack('${track.id}')">
      <span style="font-size:1.1rem;flex-shrink:0;">${currentImportId===track.id ? '▶' : '🎵'}</span>
      <span class="music-imported-name" title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</span>
      <button class="music-imported-del" onclick="deleteImportTrack(event,'${track.id}')">✕</button>
    </div>
  `).join('');
}

function selectImportTrack(id) {
  ensureImportAudio();
  if (currentImportId === id && musicPlaying && currentTrack === '__import__') {
    // toggle off
    stopAllMusic();
    currentImportId = null;
    renderImportedList();
    return;
  }
  stopAllMusic();
  const track = importedTracks.find(t => t.id === id);
  if (!track) return;
  currentImportId = id;
  currentTrack    = '__import__';
  musicPlaying    = true;

  importAudioEl.src = track.src;
  // sync volume
  const vol = document.getElementById('musicVolume').value;
  importAudioEl.volume = vol / 100;
  importAudioEl.play().catch(e => { showToast('❌ 无法播放：' + e.message.slice(0,40)); });

  // Override stopAllMusic to also pause importAudioEl
  musicStopFns.push(() => {
    importAudioEl.pause();
    importAudioEl.src = '';
  });

  document.getElementById('musicBtn').classList.add('playing');
  renderImportedList();
}

function deleteImportTrack(e, id) {
  e.stopPropagation();
  const idx = importedTracks.findIndex(t => t.id === id);
  if (idx === -1) return;
  if (currentImportId === id) { stopAllMusic(); currentImportId = null; }
  const track = importedTracks[idx];
  if (track.objectUrl) URL.revokeObjectURL(track.objectUrl);
  importedTracks.splice(idx, 1);
  renderImportedList();
}

// Patch setMusicVolume to also update importAudioEl
const _origSetMusicVolume = setMusicVolume;
setMusicVolume = function(v) {
  _origSetMusicVolume(v);
  if (importAudioEl) importAudioEl.volume = v / 100;
};

// ═══════════════════════════════════════════════════
//  MICROPHONE RECORDING (with background mix)
// ═══════════════════════════════════════════════════
let mediaRecorder    = null;
let recordChunks     = [];
let recordingActive  = false;
let recordBlob       = null;
let recordObjectUrl  = null;
let recordTimerSec   = 0;
let recordTimerInt   = null;
let recordAnalyser   = null;
let recordAnimFrame  = null;
let recordMicStream  = null;
let recordBgTrack    = '';       // currently selected bg track key
let recordBgGainNode = null;     // gain for bg track during recording
let recordBgStopFn   = null;     // stop fn for bg track nodes

// Select background track for recording
function selectRecordBg(btn, trackKey) {
  document.querySelectorAll('.record-bg-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  recordBgTrack = trackKey;
  const volRow = document.getElementById('recordBgVolRow');
  volRow.style.display = trackKey ? 'flex' : 'none';
}

function updateRecordBgVol(v) {
  document.getElementById('recordBgVolNum').textContent = v + '%';
  if (recordBgGainNode && audioCtx) {
    recordBgGainNode.gain.setTargetAtTime(v / 100, audioCtx.currentTime, 0.05);
  }
}

// Spawn waveform bars
function initRecordWaveform() {
  const wf = document.getElementById('recordWaveform');
  if (wf.children.length > 0) return;
  for (let i = 0; i < 28; i++) {
    const bar = document.createElement('div');
    bar.className = 'record-wave-bar';
    bar.style.height = '4px';
    wf.appendChild(bar);
  }
}

function updateRecordTimer() {
  recordTimerSec++;
  const m = String(Math.floor(recordTimerSec / 60)).padStart(2,'0');
  const s = String(recordTimerSec % 60).padStart(2,'0');
  document.getElementById('recordTimer').textContent = m + ':' + s;
  if (recordTimerSec >= 300) stopRecord();
}

function animateWaveform() {
  if (!recordAnalyser) return;
  const data = new Uint8Array(recordAnalyser.frequencyBinCount);
  recordAnalyser.getByteFrequencyData(data);
  const bars = document.querySelectorAll('.record-wave-bar');
  const step = Math.floor(data.length / bars.length);
  bars.forEach((bar, i) => {
    const v = data[i * step] || 0;
    const h = 3 + (v / 255) * 34;
    bar.style.height = h + 'px';
    bar.style.background = v > 100 ? 'rgba(255,120,120,0.8)' : 'rgba(100,180,255,0.5)';
  });
  recordAnimFrame = requestAnimationFrame(animateWaveform);
}

async function toggleRecord() {
  if (recordingActive) { stopRecord(); } else { await startRecord(); }
}

async function startRecord() {
  // Ensure AudioContext
  if (!audioCtx) {
    try {
      audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = document.getElementById('musicVolume').value / 100;
      masterGain.connect(audioCtx.destination);
    } catch(e) { showToast('❌ 浏览器不支持Web Audio'); return; }
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  // Get mic
  try {
    recordMicStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch(e) {
    showToast('❌ 无法访问麦克风：' + (e.message || '权限被拒绝'));
    return;
  }

  // Reset state
  recordChunks = [];
  recordBlob = null;
  if (recordObjectUrl) { URL.revokeObjectURL(recordObjectUrl); recordObjectUrl = null; }
  recordTimerSec = 0;
  document.getElementById('recordTimer').textContent = '00:00';
  document.getElementById('recordTimer').classList.add('active');
  document.getElementById('recordActions').style.display = 'none';

  // ── Build mix graph ──
  // mixDest: MediaStreamDestination — all audio goes here for recording
  const mixDest = audioCtx.createMediaStreamDestination();

  // Mic path: mic → analyser (for waveform viz) → micGain → mixDest
  const micSource = audioCtx.createMediaStreamSource(recordMicStream);
  recordAnalyser  = audioCtx.createAnalyser();
  recordAnalyser.fftSize = 64;
  const micGain   = audioCtx.createGain();
  micGain.gain.value = 1.0;
  micSource.connect(recordAnalyser);
  micSource.connect(micGain);
  micGain.connect(mixDest);

  // Background path (if selected)
  recordBgGainNode = null;
  recordBgStopFn   = null;
  if (recordBgTrack && TRACKS[recordBgTrack]) {
    // Create a dedicated gain node for the bg track going into mixDest
    recordBgGainNode = audioCtx.createGain();
    const bgVol = document.getElementById('recordBgVol').value / 100;
    recordBgGainNode.gain.value = bgVol;
    recordBgGainNode.connect(mixDest);
    // Also connect bg to masterGain so user can hear it
    recordBgGainNode.connect(masterGain);

    // We need the bg track to write into recordBgGainNode instead of masterGain.
    // Strategy: temporarily redirect makeMasterChain output.
    // We patch by running the track fn with a custom dest.
    const _origMakeMasterChain = makeMasterChain;
    // Override makeMasterChain just for this one call
    const patchedChain = (ctx, dest, preGain) => {
      // Build same chain but output to recordBgGainNode
      const pre  = ctx.createGain(); pre.gain.value = preGain || 1.0;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value=-20; comp.knee.value=10; comp.ratio.value=6;
      comp.attack.value=0.003; comp.release.value=0.3;
      const g = ctx.createGain(); g.gain.value = 0.65;
      pre.connect(comp); comp.connect(g); g.connect(recordBgGainNode);
      return pre;
    };
    // Temporarily replace
    window._savedMakeMasterChain = makeMasterChain;
    makeMasterChain = patchedChain;
    // Capture stop fns before
    const stopsBefore = musicStopFns.length;
    TRACKS[recordBgTrack]();
    // Restore
    makeMasterChain = window._savedMakeMasterChain;
    // The newly added stop fns are for this bg track
    const bgStops = musicStopFns.splice(stopsBefore);
    recordBgStopFn = () => bgStops.forEach(fn => { try { fn(); } catch(_){} });
  }

  // Start MediaRecorder on the mix stream
  let mimeType = '';
  ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg'].forEach(mt => {
    if (!mimeType && MediaRecorder.isTypeSupported(mt)) mimeType = mt;
  });
  mediaRecorder = mimeType
    ? new MediaRecorder(mixDest.stream, { mimeType })
    : new MediaRecorder(mixDest.stream);
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordChunks.push(e.data); };
  mediaRecorder.onstop = onRecordStop;
  mediaRecorder.start(100);

  recordingActive = true;
  recordTimerInt  = setInterval(updateRecordTimer, 1000);
  animateWaveform();

  const btn = document.getElementById('recordBtn');
  btn.classList.add('recording');
  btn.textContent = '⏹';
  const bgName = recordBgTrack
    ? document.querySelector(`.record-bg-item[data-track="${recordBgTrack}"] .record-bg-name`)?.textContent
    : '';
  document.getElementById('recordStatus').textContent = recordBgTrack
    ? `录制中（混音：${bgName}）… 再次点击停止`
    : '录制中… 再次点击停止';
}

function stopRecord() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  mediaRecorder.stop();
  if (recordMicStream) recordMicStream.getTracks().forEach(t => t.stop());
  if (recordBgStopFn) { recordBgStopFn(); recordBgStopFn = null; }
  clearInterval(recordTimerInt);
  cancelAnimationFrame(recordAnimFrame);
  recordAnimFrame  = null;
  recordingActive  = false;
  recordBgGainNode = null;

  const btn = document.getElementById('recordBtn');
  btn.classList.remove('recording');
  btn.textContent = '🎙️';
  document.getElementById('recordTimer').classList.remove('active');
  document.querySelectorAll('.record-wave-bar').forEach(b => {
    b.style.height = '4px'; b.style.background = 'rgba(100,180,255,0.3)';
  });
}

function onRecordStop() {
  const mimeType = mediaRecorder.mimeType || 'audio/webm';
  recordBlob = new Blob(recordChunks, { type: mimeType });
  recordObjectUrl = URL.createObjectURL(recordBlob);
  document.getElementById('recordBtn').classList.add('has-recording');
  document.getElementById('recordStatus').textContent = '录制完成！可以试听或保存使用';
  document.getElementById('recordActions').style.display = 'flex';
}

let recordPreviewEl = null;

function playRecording() {
  if (!recordObjectUrl) return;
  if (!recordPreviewEl) recordPreviewEl = new Audio();
  if (!recordPreviewEl.paused) {
    recordPreviewEl.pause();
    recordPreviewEl.currentTime = 0;
    return;
  }
  recordPreviewEl.src = recordObjectUrl;
  recordPreviewEl.play().catch(() => {});
}

function saveRecording() {
  if (!recordObjectUrl) return;
  const id  = 'rec-' + Date.now();
  const dur = String(Math.floor(recordTimerSec/60)).padStart(2,'0') + ':' + String(recordTimerSec%60).padStart(2,'0');
  const bgName = recordBgTrack
    ? document.querySelector(`.record-bg-item[data-track="${recordBgTrack}"] .record-bg-name`)?.textContent
    : '';
  const name = bgName ? `🎙️ 录音+${bgName} ${dur}` : `🎙️ 我的录音 ${dur}`;
  importedTracks.push({ id, name, src: recordObjectUrl });
  switchMusicSource('import');
  renderImportedList();
  selectImportTrack(id);

  // Reset record UI
  document.getElementById('recordBtn').classList.remove('has-recording');
  document.getElementById('recordActions').style.display = 'none';
  document.getElementById('recordStatus').textContent = '已保存，正在播放混音';
  document.getElementById('recordTimer').textContent = '00:00';
  recordTimerSec = 0;
  showToast('🎙️ 混音已保存并开始播放');
}

function discardRecording() {
  if (recordObjectUrl) { URL.revokeObjectURL(recordObjectUrl); recordObjectUrl = null; }
  recordBlob = null; recordChunks = [];
  document.getElementById('recordBtn').classList.remove('has-recording');
  document.getElementById('recordActions').style.display = 'none';
  document.getElementById('recordStatus').textContent = '选好背景后点击开始录制';
  document.getElementById('recordTimer').textContent = '00:00';
  recordTimerSec = 0;
}


