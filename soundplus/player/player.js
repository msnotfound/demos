/* SoundPlus Unified Web Player Engine
   Real 5-Band Web Audio Synth + EQ Chain, Hash Routing, Offline Vault, Zero External Dependencies */

(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let sleeveSeq = 0;

  // Bespoke 1:1 square studio sleeve artwork generator (unique gradient ID per instance)
  function makeSleeve(c1, c2, accent, shape, label) {
    const uid = `sg-${++sleeveSeq}`;
    const geom = {
      rings: `<circle cx="110" cy="110" r="78" fill="none" stroke="${accent}" stroke-width="2" opacity="0.55"/><circle cx="110" cy="110" r="52" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.55"/><circle cx="110" cy="110" r="22" fill="${accent}" opacity="0.88"/>`,
      bars: `<rect x="44" y="88" width="14" height="62" rx="7" fill="#ffffff" opacity="0.82"/><rect x="70" y="54" width="14" height="96" rx="7" fill="${accent}" opacity="0.92"/><rect x="96" y="72" width="14" height="78" rx="7" fill="#ffffff" opacity="0.72"/><rect x="122" y="42" width="14" height="108" rx="7" fill="${accent}" opacity="0.85"/><rect x="148" y="80" width="14" height="70" rx="7" fill="#ffffff" opacity="0.68"/>`,
      arc: `<path d="M24 166 Q110 24 196 166" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.72"/><path d="M48 166 Q110 66 172 166" fill="none" stroke="${accent}" stroke-width="5" opacity="0.9"/><circle cx="110" cy="112" r="18" fill="#ffffff" opacity="0.86"/>`,
      grid: `<rect x="44" y="44" width="58" height="58" rx="14" fill="#ffffff" opacity="0.22"/><rect x="114" y="44" width="58" height="58" rx="14" fill="${accent}" opacity="0.82"/><rect x="44" y="114" width="58" height="58" rx="29" fill="${accent}" opacity="0.65"/><rect x="114" y="114" width="58" height="58" rx="14" fill="#ffffff" opacity="0.34"/>`,
      wave: `<path d="M18 112 C56 54, 88 164, 126 106 C154 64, 180 128, 204 94" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity="0.85"/><path d="M18 134 C56 76, 88 186, 126 128 C154 86, 180 150, 204 116" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity="0.8"/>`
    }[shape] || "";
    return `<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">
      <defs>
        <linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="220" height="220" fill="url(#${uid})" />
      ${geom}
      <text x="18" y="200" fill="#ffffff" opacity="0.72" font-family="monospace" font-size="11" letter-spacing="1.5">${label.toUpperCase().slice(0, 14)}</text>
    </svg>`;
  }

  // Rich Catalog (Every track has real chord progression, BPM, bassline, synced lyrics, and file size for Offline Vault)
  const TRACKS = [
    {
      id: "midnight-telemetry",
      title: "Midnight Telemetry",
      artist: "Kora & Velvet",
      genre: "Synthwave",
      duration: 204,
      mb: 5.8,
      bpm: 112,
      chords: [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 196, 246.94]],
      bass: [55, 43.65, 49, 41.2],
      art: ["#1f2447", "#5948a8", "#a5b4fc", "rings"],
      lyrics: [
        [0, "City lights hum low across the wet asphalt"],
        [14, "Signal locking clean at sixty hertz below"],
        [28, "No interruptions when the screen fades out"],
        [44, "Midnight telemetry guiding every mile home"],
        [62, "Warm analog air through open studio cans"],
        [80, "Hold the frequency until the skyline clears"]
      ]
    },
    {
      id: "monsoon-veranda",
      title: "Monsoon Veranda",
      artist: "Aarav Sen",
      genre: "Bollywood",
      duration: 218,
      mb: 5.6,
      bpm: 96,
      chords: [[261.63, 329.63, 392], [220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66]],
      bass: [65.4, 55, 43.65, 49],
      art: ["#4a231c", "#b85639", "#fed7aa", "arc"],
      lyrics: [
        [0, "First rain tapping slow on the terracotta roof"],
        [16, "Warm chai steam rising by the open grille"],
        [32, "Acoustic chords drifting down the quiet lane"],
        [50, "Stay a little longer while the clouds roll in"]
      ]
    },
    {
      id: "paper-lantern-lofi",
      title: "Paper Lantern Study",
      artist: "Mina Sato",
      genre: "Lo-Fi",
      duration: 186,
      mb: 4.9,
      bpm: 84,
      chords: [[196, 246.94, 293.66, 369.99], [164.81, 196, 246.94, 293.66], [146.83, 185, 220, 261.63], [196, 246.94, 293.66, 329.63]],
      bass: [49, 41.2, 36.7, 49],
      art: ["#1d3a36", "#3f7d6e", "#a7f3d0", "grid"],
      lyrics: [
        [0, "Soft vinyl grain over late-night desk lamps"],
        [15, "Keystrokes falling right inside the pocket"],
        [31, "Zero ad breaks, zero clutter on the screen"],
        [48, "Keep the tape rolling through the midnight build"]
      ]
    },
    {
      id: "glass-harbor",
      title: "Glass Harbor",
      artist: "Northline Collective",
      genre: "Ambient",
      duration: 242,
      mb: 6.4,
      bpm: 78,
      chords: [[246.94, 293.66, 369.99], [220, 277.18, 329.63], [196, 246.94, 293.66], [185, 220, 277.18]],
      bass: [61.7, 55, 49, 46.25],
      art: ["#162d47", "#3668a6", "#bfdbfe", "wave"],
      lyrics: [
        [0, "Still water holding pale morning reflections"],
        [18, "Wide stereo field breathing in slow motion"],
        [36, "Every overtone balanced with clean headroom"],
        [56, "Drift out past the breakwater before sunrise"]
      ]
    },
    {
      id: "kinetic-pulse",
      title: "Kinetic Pulse 124",
      artist: "Rohan & Vera",
      genre: "Deep House",
      duration: 198,
      mb: 5.3,
      bpm: 124,
      chords: [[233.08, 277.18, 349.23], [207.65, 261.63, 311.13], [174.61, 207.65, 261.63], [196, 233.08, 293.66]],
      bass: [58.27, 51.91, 43.65, 49],
      art: ["#2f1d45", "#8045a8", "#f5d0fe", "bars"],
      lyrics: [
        [0, "Four on the floor with tight sub-bass control"],
        [14, "Clean transient snap on every open hat"],
        [28, "Dial the 60 hertz shelf to feel the room move"],
        [46, "Lock into the groove until the final bar"]
      ]
    },
    {
      id: "sunlit-transit",
      title: "Sunlit Transit",
      artist: "Clara & The Pines",
      genre: "Indie Pop",
      duration: 192,
      mb: 5.1,
      bpm: 108,
      chords: [[293.66, 369.99, 440], [246.94, 293.66, 369.99], [196, 246.94, 293.66], [220, 277.18, 329.63]],
      bass: [73.42, 61.74, 49, 55],
      art: ["#4a3217", "#b87f35", "#fde68a", "rings"],
      lyrics: [
        [0, "Window seat eastbound through the golden hour"],
        [15, "Headphones on, offline vault ready for tunnels"],
        [30, "Bright guitar harmonics cutting through the hum"],
        [47, "Every station feels closer than yesterday"]
      ]
    },
    {
      id: "deccan-dusk",
      title: "Deccan Dusk (Unplugged)",
      artist: "Meera Kulkarni",
      genre: "Bollywood",
      duration: 226,
      mb: 6.0,
      bpm: 90,
      chords: [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [164.81, 207.65, 246.94]],
      bass: [55, 49, 43.65, 41.2],
      art: ["#47202e", "#9e3f5c", "#fbcfe8", "arc"],
      lyrics: [
        [0, "Warm amber dusk settling across the terrace"],
        [16, "Soft vocal focus tuned at 910 hertz"],
        [34, "Strings answering slow in the evening breeze"],
        [52, "Hold the melody long after the chorus ends"]
      ]
    },
    {
      id: "tokyo-overpass",
      title: "Tokyo Overpass",
      artist: "Kenji Wave",
      genre: "Synthwave",
      duration: 210,
      mb: 5.5,
      bpm: 118,
      chords: [[261.63, 311.13, 392], [233.08, 293.66, 349.23], [207.65, 261.63, 311.13], [196, 246.94, 293.66]],
      bass: [65.41, 58.27, 51.91, 49],
      art: ["#1a2238", "#3e548a", "#93c5fd", "bars"],
      lyrics: [
        [0, "Sodium lamps streaking past the expressway"],
        [15, "Arpeggiated chords pulsing crisp in stereo"],
        [32, "Zero buffering, instant seek on every track"],
        [48, "Keep driving straight into the cobalt night"]
      ]
    },
    {
      id: "ceramic-rain",
      title: "Ceramic Rain",
      artist: "Mina Sato",
      genre: "Lo-Fi",
      duration: 174,
      mb: 4.6,
      bpm: 82,
      chords: [[174.61, 220, 261.63, 329.63], [196, 246.94, 293.66, 349.23], [164.81, 196, 246.94, 293.66], [220, 261.63, 329.63, 392]],
      bass: [43.65, 49, 41.2, 55],
      art: ["#26362b", "#54785e", "#bbf7d0", "wave"],
      lyrics: [
        [0, "Quiet studio afternoon with rain on glass"],
        [15, "Gentle felt keys floating over brushed snares"],
        [30, "Zero popups breaking your deep work session"],
        [45, "Loop seamlessly while the afternoon unfolds"]
      ]
    },
    {
      id: "subterranean-bloom",
      title: "Subterranean Bloom",
      artist: "Rohan & Vera",
      genre: "Deep House",
      duration: 215,
      mb: 5.7,
      bpm: 122,
      chords: [[196, 233.08, 293.66], [174.61, 207.65, 261.63], [155.56, 196, 233.08], [174.61, 220, 261.63]],
      bass: [49, 43.65, 38.89, 43.65],
      art: ["#222831", "#4b5a6e", "#cbd5e1", "grid"],
      lyrics: [
        [0, "Deep resonant filter opening step by step"],
        [15, "Clean bass headroom without distortion"],
        [30, "Every transition built for real headphones"],
        [48, "Stay inside the rhythm past midnight"]
      ]
    }
  ];

  const PODCASTS = [
    {
      id: "pod-dsp-craft",
      title: "Designing Zero-Latency Mobile Audio Engines",
      artist: "Signal & Craft Podcast",
      category: "Audio Engineering",
      duration: 1840,
      mb: 16.2,
      bpm: 72,
      chords: [[196, 246.94, 293.66], [174.61, 220, 261.63]],
      bass: [49, 43.65],
      art: ["#1f2a44", "#455e96", "#c7d2fe", "wave"],
      desc: "Why native Media3 pipelines beat nested WebViews on battery life, lock-screen stability, and true hardware EQ."
    },
    {
      id: "pod-design-systems",
      title: "One Token System Across Web & Native Apps",
      artist: "Interface Notes",
      category: "Design & Craft",
      duration: 1420,
      mb: 12.8,
      bpm: 74,
      chords: [[220, 261.63, 329.63], [196, 246.94, 293.66]],
      bass: [55, 49],
      art: ["#3d261e", "#8f543e", "#fed7aa", "grid"],
      desc: "How unifying marketing sites, web players, and offline vaults eliminates visual drift and speeds up releases."
    },
    {
      id: "pod-indie-scale",
      title: "Turning a Side-Project APK into a Durable Product",
      artist: "Founders in Production",
      category: "Indie Founders",
      duration: 2110,
      mb: 18.4,
      bpm: 76,
      chords: [[174.61, 220, 261.63], [164.81, 196, 246.94]],
      bass: [43.65, 41.2],
      art: ["#1d362f", "#3d7061", "#a7f3d0", "rings"],
      desc: "Real lessons from migrating legacy PHP sites, protecting organic SEO URLs, and shipping signed builds users trust."
    }
  ];

  const PLAYLISTS = [
    { id: "pl-drive", name: "Late Night Drive", desc: "Synthwave & Deep House for midnight roads", trackIds: ["midnight-telemetry", "tokyo-overpass", "kinetic-pulse", "subterranean-bloom"], art: ["#1f2447", "#5948a8", "#a5b4fc", "rings"] },
    { id: "pl-code", name: "Coding Flow", desc: "Zero-distraction Lo-Fi & Ambient focus", trackIds: ["paper-lantern-lofi", "glass-harbor", "ceramic-rain", "sunlit-transit"], art: ["#1d3a36", "#3f7d6e", "#a7f3d0", "grid"] },
    { id: "pl-bollywood", name: "Bollywood Acoustic", desc: "Warm unplugged Hindi & indie sessions", trackIds: ["monsoon-veranda", "deccan-dusk", "sunlit-transit"], art: ["#4a231c", "#b85639", "#fed7aa", "arc"] },
    { id: "pl-workout", name: "Workout Energy", desc: "High-tempo 120+ BPM studio beats", trackIds: ["kinetic-pulse", "tokyo-overpass", "subterranean-bloom"], art: ["#2f1d45", "#8045a8", "#f5d0fe", "bars"] }
  ];

  const EQ_PRESETS = {
    flat: { gains: [0, 0, 0, 0, 0], bass: 0 },
    bass: { gains: [7, 4, 0, 1, 2], bass: 35 },
    vocal: { gains: [-2, 1, 5, 4, 1], bass: 10 },
    night: { gains: [4, 2, -1, -3, -4], bass: 20 }
  };
  const EQ_FREQS = [60, 230, 910, 3600, 14000];
  const EQ_LABELS = ["60Hz", "230Hz", "910Hz", "3.6kHz", "14kHz"];

  // Persistent State
  function loadSet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set(fallback);
    } catch (_) {
      return new Set(fallback);
    }
  }

  const state = {
    view: "home",
    genreFilter: "All",
    podFilter: "All",
    searchScope: "all",
    searchQuery: "",
    activeLibraryId: "likes",
    queue: TRACKS.map((t) => t.id),
    currentId: TRACKS[0].id,
    reelIdx: 0,
    isPlaying: false,
    isTestBeat: false,
    elapsed: 0,
    volume: 0.8,
    muted: false,
    shuffle: false,
    repeat: "off", // off | all | one
    sleepMins: 0,
    simOffline: false,
    liked: loadSet("sp_liked_v2", ["midnight-telemetry", "paper-lantern-lofi"]),
    offline: loadSet("sp_offline_v2", ["midnight-telemetry", "monsoon-veranda"]),
    eqGains: [...EQ_PRESETS.bass.gains],
    bassBoost: EQ_PRESETS.bass.bass
  };

  function allAudioItems() { return [...TRACKS, ...PODCASTS]; }
  function getItem(id) { return allAudioItems().find((x) => x.id === id) || TRACKS[0]; }
  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function persist() {
    try {
      localStorage.setItem("sp_liked_v2", JSON.stringify([...state.liked]));
      localStorage.setItem("sp_offline_v2", JSON.stringify([...state.offline]));
    } catch (_) {}
  }

  // Toast helper
  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-show"), 2400);
  }

  // ==========================================================
  // REAL 5-BAND WEB AUDIO ENGINE (Zero external MP3 404s!)
  // ==========================================================
  let ctx = null, eqNodes = [], bassNode = null, masterGain = null, analyser = null, freqBins = null;
  let stepTimer = null, tickTimer = null, stepCount = 0, vizRaf = null;

  function ensureAudio() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const types = ["lowshelf", "peaking", "peaking", "peaking", "highshelf"];
    eqNodes = EQ_FREQS.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = types[i];
      f.frequency.value = freq;
      f.Q.value = 1.1;
      f.gain.value = state.eqGains[i];
      return f;
    });
    bassNode = ctx.createBiquadFilter();
    bassNode.type = "lowshelf";
    bassNode.frequency.value = 85;
    bassNode.gain.value = (state.bassBoost / 100) * 10;

    masterGain = ctx.createGain();
    masterGain.gain.value = state.muted ? 0 : state.volume * 0.42;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    freqBins = new Uint8Array(analyser.frequencyBinCount);

    for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
    eqNodes[4].connect(bassNode);
    bassNode.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
  }

  function applyAudioParams() {
    if (!ctx) return;
    eqNodes.forEach((f, i) => f.gain.setTargetAtTime(state.eqGains[i], ctx.currentTime, 0.03));
    if (bassNode) bassNode.gain.setTargetAtTime((state.bassBoost / 100) * 10, ctx.currentTime, 0.03);
    if (masterGain) masterGain.gain.setTargetAtTime(state.muted ? 0 : state.volume * 0.42, ctx.currentTime, 0.03);
  }

  function triggerStep(item) {
    if (!ctx || ctx.state !== "running") return;
    const now = ctx.currentTime;
    const barIdx = Math.floor(stepCount / 4) % item.chords.length;
    const beatInBar = stepCount % 4;

    // Kick drum on beats 0 and 2 (or all 4 for Deep House / Test Beat)
    const kickBeats = state.isTestBeat || item.genre === "Deep House" ? [0, 1, 2, 3] : [0, 2];
    if (kickBeats.includes(beatInBar)) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.exponentialRampToValueAtTime(42, now + 0.13);
      g.gain.setValueAtTime(0.65, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(g);
      g.connect(eqNodes[0]);
      osc.start(now);
      osc.stop(now + 0.25);
    }

    // Crisp Hi-Hat on off-steps
    if (beatInBar % 2 === 1 || state.isTestBeat) {
      const bufSize = Math.floor(ctx.sampleRate * 0.045);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.28));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 6200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      src.connect(hp);
      hp.connect(g);
      g.connect(eqNodes[0]);
      src.start(now);
    }

    // Warm Sub-Bass & Chord Pad on downbeat of each bar
    if (beatInBar === 0) {
      const bassFreq = item.bass[barIdx] || 55;
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = "triangle";
      bOsc.frequency.setValueAtTime(bassFreq, now);
      bGain.gain.setValueAtTime(0.001, now);
      bGain.gain.linearRampToValueAtTime(0.28, now + 0.04);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
      bOsc.connect(bGain);
      bGain.connect(eqNodes[0]);
      bOsc.start(now);
      bOsc.stop(now + 1.4);

      const chord = item.chords[barIdx];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = state.isTestBeat ? "sawtooth" : "sine";
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(state.isTestBeat ? 0.045 : 0.075, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        osc.connect(g);
        g.connect(eqNodes[0]);
        osc.start(now);
        osc.stop(now + 1.5);
      });
    }

    // Gentle melodic pluck on beat 2
    if (beatInBar === 2) {
      const chord = item.chords[barIdx];
      const note = chord[(stepCount >> 1) % chord.length] * 2;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.07, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(g);
      g.connect(eqNodes[0]);
      osc.start(now);
      osc.stop(now + 0.45);
    }

    stepCount++;
  }

  function startAudioLoop() {
    stopAudioLoop();
    ensureAudio();
    const item = getItem(state.currentId);
    const bpm = state.isTestBeat ? 116 : (item.bpm || 100);
    const stepMs = Math.round((60000 / bpm) / 2);
    triggerStep(item);
    stepTimer = setInterval(() => triggerStep(getItem(state.currentId)), stepMs);

    if (state.isPlaying) {
      tickTimer = setInterval(() => {
        const cur = getItem(state.currentId);
        state.elapsed += 0.5;
        if (state.elapsed >= cur.duration) {
          if (state.repeat === "one") {
            state.elapsed = 0;
          } else {
            nextTrack(true);
          }
        }
        updateScrubberAndLyrics();
      }, 500);
    }
    startVisualizer();
  }

  function stopAudioLoop() {
    clearInterval(stepTimer);
    clearInterval(tickTimer);
    stepTimer = null;
    tickTimer = null;
  }

  function startVisualizer() {
    cancelAnimationFrame(vizRaf);
    const specSpans = Array.from(document.querySelectorAll("#eqSpecBars span"));
    const reelCanvas = document.getElementById("reelViz");
    const rCtx = reelCanvas ? reelCanvas.getContext("2d") : null;

    function frame() {
      const active = state.isPlaying || state.isTestBeat;
      if (analyser && active) {
        analyser.getByteFrequencyData(freqBins);
      }
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6366f1";

      // Update EQ Drawer spectrum
      specSpans.forEach((sp, i) => {
        const v = active && freqBins ? freqBins[i % freqBins.length] / 255 : 0.08;
        sp.style.height = `${Math.max(4, Math.round(v * 32))}px`;
      });

      // Update SoundReel canvas spectrum
      if (rCtx && reelCanvas) {
        const w = reelCanvas.width, h = reelCanvas.height;
        rCtx.clearRect(0, 0, w, h);
        const count = 32;
        const barW = (w - 24) / count;
        rCtx.fillStyle = accentColor;
        for (let i = 0; i < count; i++) {
          const val = active && freqBins ? freqBins[i % freqBins.length] / 255 : 0.12 + Math.sin(i * 0.5) * 0.06;
          const bh = Math.max(4, val * (h - 14));
          const x = 12 + i * barW + 2;
          const y = (h - bh) / 2;
          rCtx.globalAlpha = active ? 0.85 : 0.35;
          rCtx.fillRect(x, y, Math.max(3, barW - 4), bh);
        }
        rCtx.globalAlpha = 1;
      }

      if (active) vizRaf = requestAnimationFrame(frame);
    }
    vizRaf = requestAnimationFrame(frame);
  }

  // ==========================================================
  // PLAYBACK CONTROLS
  // ==========================================================
  function playTrack(id, autoPlay = true) {
    if (state.simOffline && !state.offline.has(id)) {
      showToast("Airplane mode active: play a track saved in Offline Vault");
      return;
    }
    state.currentId = id;
    state.elapsed = 0;
    state.isTestBeat = false;
    document.getElementById("eqTestBeatBtn").textContent = "Play Beat";
    if (!state.queue.includes(id)) state.queue.unshift(id);
    if (autoPlay) {
      state.isPlaying = true;
      startAudioLoop();
    }
    updateMediaSession();
    renderAll();
  }

  function togglePlay() {
    state.isTestBeat = false;
    document.getElementById("eqTestBeatBtn").textContent = "Play Beat";
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
      startAudioLoop();
    } else {
      stopAudioLoop();
    }
    renderTransport();
    renderTrackRows();
  }

  function nextTrack(fromEnd = false) {
    const q = state.simOffline ? state.queue.filter((id) => state.offline.has(id)) : state.queue;
    if (!q.length) return;
    let idx = q.indexOf(state.currentId);
    if (state.shuffle && q.length > 1) {
      let n = idx;
      while (n === idx) n = Math.floor(Math.random() * q.length);
      idx = n;
    } else {
      idx = idx + 1;
      if (idx >= q.length) {
        if (fromEnd && state.repeat === "off") {
          state.isPlaying = false;
          state.elapsed = 0;
          stopAudioLoop();
          renderTransport();
          return;
        }
        idx = 0;
      }
    }
    playTrack(q[idx], true);
  }

  function prevTrack() {
    if (state.elapsed > 4) {
      state.elapsed = 0;
      updateScrubberAndLyrics();
      return;
    }
    const q = state.simOffline ? state.queue.filter((id) => state.offline.has(id)) : state.queue;
    if (!q.length) return;
    const idx = (q.indexOf(state.currentId) - 1 + q.length) % q.length;
    playTrack(q[idx], true);
  }

  function toggleLike(id) {
    if (state.liked.has(id)) {
      state.liked.delete(id);
      showToast("Removed from Liked Songs");
    } else {
      state.liked.add(id);
      showToast("Saved to Liked Songs");
    }
    persist();
    renderAll();
  }

  function toggleOffline(id) {
    const item = getItem(id);
    if (state.offline.has(id)) {
      state.offline.delete(id);
      showToast(`Removed "${item.title}" from Offline Vault`);
    } else {
      state.offline.add(id);
      showToast(`Cached "${item.title}" (${item.mb} MB) offline`);
    }
    persist();
    renderAll();
  }

  function updateMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const item = getItem(state.currentId);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.artist,
        album: "SoundPlus Studio"
      });
      navigator.mediaSession.setActionHandler("play", () => { if (!state.isPlaying) togglePlay(); });
      navigator.mediaSession.setActionHandler("pause", () => { if (state.isPlaying) togglePlay(); });
      navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack(false));
    } catch (_) {}
  }

  // ==========================================================
  // SMOOTH CIRCULAR-RIPPLE LIGHT PALETTE SWITCHER (Synced with landing page)
  // ==========================================================
  const swatchBtns = Array.from(document.querySelectorAll(".swatch-btn"));
  const paletteLabel = document.getElementById("paletteLabel");

  function applyPalette(pal, label) {
    if (!pal || pal === "violet") {
      document.documentElement.removeAttribute("data-palette");
      pal = "violet";
      label = "Violet";
    } else {
      document.documentElement.setAttribute("data-palette", pal);
    }
    paletteLabel.textContent = label;
    swatchBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.palette === pal)));
    try { localStorage.setItem("sp_palette", pal); } catch (_) {}
  }

  try {
    const savedPal = localStorage.getItem("sp_palette");
    if (savedPal) {
      const btn = swatchBtns.find((b) => b.dataset.palette === savedPal);
      if (btn) applyPalette(btn.dataset.palette, btn.dataset.label);
    }
  } catch (_) {}

  swatchBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = btn.getBoundingClientRect();
      document.documentElement.style.setProperty("--vt-x", `${Math.round(r.left + r.width / 2)}px`);
      document.documentElement.style.setProperty("--vt-y", `${Math.round(r.top + r.height / 2)}px`);
      if (document.startViewTransition && !reducedMotion) {
        document.startViewTransition(() => applyPalette(btn.dataset.palette, btn.dataset.label));
      } else {
        applyPalette(btn.dataset.palette, btn.dataset.label);
      }
    });
  });

  // ==========================================================
  // REAL URL HASH ROUTING (Browser Back/Forward + Deep Links)
  // ==========================================================
  const VALID_VIEWS = ["home", "reels", "search", "podcasts", "library", "offline"];

  function navigate(view, pushHash = true) {
    if (!VALID_VIEWS.includes(view)) view = "home";
    state.view = view;
    document.querySelectorAll(".view-panel").forEach((p) => p.classList.toggle("is-active", p.id === `view-${view}`));
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false"));
    if (pushHash && location.hash !== `#${view}`) {
      history.pushState(null, "", `#${view}`);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (view === "reels") renderReel();
  }

  function handleHash() {
    const h = (location.hash || "#home").slice(1);
    if (h.startsWith("track=")) {
      const id = h.slice(6);
      if (allAudioItems().some((t) => t.id === id)) {
        state.currentId = id;
        renderAll();
        openDrawer("lyrics");
      }
      navigate("home", false);
      return;
    }
    navigate(VALID_VIEWS.includes(h) ? h : "home", false);
  }

  window.addEventListener("hashchange", handleHash);

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.dataset.view));
  });

  // ==========================================================
  // RENDERING HELPERS
  // ==========================================================
  function renderTrackRowsMarkup(items) {
    if (!items.length) {
      return `<div class="empty-state">No tracks match this filter yet.</div>`;
    }
    return `<div class="track-list">${items.map((t, idx) => {
      const active = t.id === state.currentId;
      const liked = state.liked.has(t.id);
      const saved = state.offline.has(t.id);
      const locked = state.simOffline && !saved;
      return `<div class="track-row ${active ? "is-playing" : ""}" style="${locked ? "opacity:0.45;" : ""}">
        <div class="track-idx">
          ${active
            ? `<span class="eq-bars-mini ${state.isPlaying ? "" : "is-paused"}"><i></i><i></i><i></i></span>`
            : String(idx + 1).padStart(2, "0")}
        </div>
        <div class="track-thumb" data-play="${t.id}" style="cursor:pointer;">${makeSleeve(...t.art, t.title)}</div>
        <div class="track-info" data-play="${t.id}">
          <div class="track-title">${t.title}</div>
          <div class="track-artist">${t.artist}</div>
        </div>
        <div class="track-genre">${t.genre || t.category}</div>
        <button type="button" class="icon-btn ${liked ? "is-liked" : ""}" data-like="${t.id}" title="${liked ? "Unlike" : "Like"}" aria-label="Toggle like for ${t.title}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="${liked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9-9a5.4 5.4 0 0 1 9-5.7A5.4 5.4 0 0 1 21 12c-2 4.5-9 9-9 9z"/></svg>
        </button>
        <button type="button" class="icon-btn ${saved ? "is-saved" : ""}" data-offline="${t.id}" title="${saved ? "Saved offline" : "Save offline"}" aria-label="Toggle offline cache for ${t.title}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${saved ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>'}</svg>
        </button>
        <div class="track-dur">${fmtTime(t.duration)}</div>
      </div>`;
    }).join("")}</div>`;
  }

  function renderHome() {
    const hero = TRACKS[0];
    document.getElementById("spotlightCard").innerHTML = `
      <div class="cover-art">${makeSleeve(...hero.art, hero.title)}</div>
      <div>
        <div class="eyebrow">Daily Spotlight &middot; Unified Studio Web v2.0</div>
        <h1>${hero.title}</h1>
        <p class="spotlight-sub">${hero.artist} &middot; Crisp square artwork, real 5-band Web Audio equalizer, zero cache-purge reloads, and instant offline vault caching.</p>
        <div class="btn-row">
          <button type="button" class="btn-primary" data-play="${hero.id}">Play Now</button>
          <button type="button" class="btn-secondary" data-offline="${hero.id}">${state.offline.has(hero.id) ? "Saved Offline" : "Save Offline"}</button>
          <button type="button" class="btn-secondary" id="spotEqBtn">Open 5-Band EQ</button>
        </div>
      </div>`;
    document.getElementById("spotEqBtn").addEventListener("click", () => openDrawer("eq"));

    const genres = ["All", ...new Set(TRACKS.map((t) => t.genre))];
    document.getElementById("genreFilterRow").innerHTML = genres.map((g) =>
      `<button type="button" class="filter-chip" data-genre="${g}" aria-pressed="${state.genreFilter === g}">${g}</button>`
    ).join("");

    document.getElementById("mixGrid").innerHTML = PLAYLISTS.map((pl) => `
      <button type="button" class="mix-card" data-open-pl="${pl.id}">
        <div class="cover-art">${makeSleeve(...pl.art, pl.name)}</div>
        <div class="mix-card-title">${pl.name}</div>
        <div class="mix-card-meta">${pl.desc} (${pl.trackIds.length} tracks)</div>
      </button>
    `).join("");

    const filtered = state.genreFilter === "All" ? TRACKS : TRACKS.filter((t) => t.genre === state.genreFilter);
    document.getElementById("homeTracksTitle").textContent = state.genreFilter === "All" ? "Studio Catalog" : `${state.genreFilter} Tracks`;
    document.getElementById("homeTracksCount").textContent = `${filtered.length} tracks`;
    document.getElementById("homeTrackList").innerHTML = renderTrackRowsMarkup(filtered);
  }

  function renderReel() {
    const t = TRACKS[state.reelIdx % TRACKS.length];
    document.getElementById("reelGenreBadge").textContent = t.genre.toUpperCase();
    document.getElementById("reelCounter").textContent = `${String(state.reelIdx + 1).padStart(2, "0")} / ${String(TRACKS.length).padStart(2, "0")}`;
    document.getElementById("reelCover").innerHTML = makeSleeve(...t.art, t.title);
    document.getElementById("reelTitle").textContent = t.title;
    document.getElementById("reelArtist").textContent = t.artist;
    document.getElementById("reelLikeBtn").classList.toggle("is-liked", state.liked.has(t.id));
    document.getElementById("reelSaveBtn").classList.toggle("is-saved", state.offline.has(t.id));
    document.getElementById("reelPlayBtn").textContent = (state.currentId === t.id && state.isPlaying) ? "Pause Track" : "Play Full Track";
  }

  function renderSearch() {
    const q = state.searchQuery.trim().toLowerCase();
    const wrap = document.getElementById("searchResultsWrap");
    const status = document.getElementById("searchStatus");

    document.querySelectorAll("#searchScopeRow .filter-chip").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.scope === state.searchScope))
    );

    if (!q) {
      status.textContent = "Type above or choose a genre";
      wrap.innerHTML = "";
    } else {
      const songMatches = TRACKS.filter((t) => `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(q));
      const podMatches = PODCASTS.filter((p) => `${p.title} ${p.artist} ${p.category}`.toLowerCase().includes(q));
      const artists = [...new Set(TRACKS.filter((t) => t.artist.toLowerCase().includes(q)).map((t) => t.artist))];

      let items = [];
      if (state.searchScope === "songs") items = songMatches;
      else if (state.searchScope === "podcasts") items = podMatches;
      else if (state.searchScope === "artists") items = TRACKS.filter((t) => artists.includes(t.artist));
      else items = [...songMatches, ...podMatches];

      status.textContent = `${items.length} result${items.length === 1 ? "" : "s"} for "${state.searchQuery.trim()}"`;
      if (!items.length) {
        wrap.innerHTML = `<div class="empty-state">
          <strong>No matches for "${state.searchQuery.trim()}"</strong>
          <div style="margin-top:8px;font-size:0.84rem;">Try searching for Synthwave, Lo-Fi, Bollywood, or Podcasts.</div>
        </div>`;
      } else {
        wrap.innerHTML = renderTrackRowsMarkup(items);
      }
    }

    const genreCounts = {};
    TRACKS.forEach((t) => { genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1; });
    document.getElementById("searchGenreGrid").innerHTML = Object.entries(genreCounts).map(([g, c]) => `
      <button type="button" class="genre-tile" data-quick-search="${g}">
        <strong>${g}</strong>
        <span>${c} studio tracks</span>
      </button>
    `).join("");
  }

  function renderPodcasts() {
    const cats = ["All", ...new Set(PODCASTS.map((p) => p.category))];
    document.getElementById("podFilterRow").innerHTML = cats.map((c) =>
      `<button type="button" class="filter-chip" data-pod-cat="${c}" aria-pressed="${state.podFilter === c}">${c}</button>`
    ).join("");

    const list = state.podFilter === "All" ? PODCASTS : PODCASTS.filter((p) => p.category === state.podFilter);
    document.getElementById("podcastGrid").innerHTML = list.map((p) => `
      <article class="podcast-card">
        <div class="cover-art">${makeSleeve(...p.art, p.artist)}</div>
        <div>
          <div class="eyebrow" style="margin-bottom:4px;">${p.category}</div>
          <strong style="font-size:0.98rem;line-height:1.3;display:block;">${p.title}</strong>
          <div style="font-size:0.82rem;color:var(--muted);margin-top:4px;">${p.artist} &middot; ${Math.round(p.duration / 60)} min</div>
        </div>
        <p style="margin:0;font-size:0.84rem;color:var(--ink-2);line-height:1.5;">${p.desc}</p>
        <div class="btn-row" style="margin-top:auto;">
          <button type="button" class="btn-primary" style="height:36px;padding:0 14px;font-size:0.82rem;" data-play="${p.id}">
            ${state.currentId === p.id && state.isPlaying ? "Playing" : "Listen"}
          </button>
          <button type="button" class="btn-secondary" style="height:36px;padding:0 12px;font-size:0.8rem;" data-offline="${p.id}">
            ${state.offline.has(p.id) ? "Saved" : "Save Offline"}
          </button>
        </div>
      </article>
    `).join("");
  }

  function renderLibrary() {
    document.getElementById("sideLikesCount").textContent = state.liked.size;
    document.getElementById("sidebarPlaylists").innerHTML = PLAYLISTS.map((pl) => `
      <button type="button" class="playlist-mini-btn" data-select-lib="${pl.id}">
        <span>${pl.name}</span>
        <span class="mono" style="font-size:0.72rem;color:var(--muted);">${pl.trackIds.length}</span>
      </button>
    `).join("");

    const cards = [
      { id: "likes", name: "Liked Songs", desc: `${state.liked.size} saved favorites`, art: ["#47202e", "#9e3f5c", "#fbcfe8", "rings"] },
      ...PLAYLISTS.map((p) => ({ id: p.id, name: p.name, desc: `${p.trackIds.length} tracks`, art: p.art }))
    ];
    document.getElementById("libraryPlaylistsGrid").innerHTML = cards.map((c) => `
      <button type="button" class="mix-card" data-select-lib="${c.id}" style="${state.activeLibraryId === c.id ? "border-color:var(--accent);" : ""}">
        <div class="cover-art">${makeSleeve(...c.art, c.name)}</div>
        <div class="mix-card-title">${c.name}</div>
        <div class="mix-card-meta">${c.desc}</div>
      </button>
    `).join("");

    let items = [];
    let title = "Liked Songs";
    if (state.activeLibraryId === "likes") {
      items = allAudioItems().filter((t) => state.liked.has(t.id));
    } else {
      const pl = PLAYLISTS.find((p) => p.id === state.activeLibraryId);
      if (pl) {
        title = pl.name;
        items = pl.trackIds.map(getItem);
      }
    }
    document.getElementById("libActiveTitle").textContent = title;
    document.getElementById("libActiveCount").textContent = `${items.length} tracks`;
    document.getElementById("libraryTracksWrap").innerHTML = renderTrackRowsMarkup(items);
  }

  function renderOffline() {
    const items = allAudioItems().filter((t) => state.offline.has(t.id));
    const totalMb = items.reduce((sum, t) => sum + (t.mb || 5), 0);
    document.getElementById("sideOfflineCount").textContent = items.length;
    document.getElementById("vaultMbLabel").textContent = `${totalMb.toFixed(1)} MB`;
    document.getElementById("vaultFill").style.width = `${Math.min(100, Math.round((totalMb / 50) * 100))}%`;
    document.getElementById("vaultSubLabel").textContent = `${items.length} track${items.length === 1 ? "" : "s"} cached locally`;
    document.getElementById("offlineBannerText").textContent = items.length
      ? `${items.length} tracks saved offline (${totalMb.toFixed(1)} MB). Plays cleanly with zero network access.`
      : "No tracks cached yet. Click the download icon on any track to save it locally.";
    document.getElementById("simOfflineBtn").setAttribute("aria-pressed", String(state.simOffline));
    document.getElementById("simOfflineState").textContent = state.simOffline ? "On" : "Off";
    document.getElementById("offlineTracksWrap").innerHTML = renderTrackRowsMarkup(items);
  }

  function renderTransport() {
    const item = getItem(state.currentId);
    const playSvg = state.isPlaying
      ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
      : '<polygon points="6 4 20 12 6 20 6 4"/>';
    document.getElementById("playIconSvg").innerHTML = playSvg;
    document.getElementById("mobilePlaySvg").innerHTML = playSvg;
    document.getElementById("mobilePlayBtn").style.display = window.innerWidth <= 960 ? "inline-flex" : "none";

    document.getElementById("dockCover").innerHTML = makeSleeve(...item.art, item.title);
    document.getElementById("dockTitle").textContent = item.title;
    document.getElementById("dockArtist").textContent = item.artist;
    const dockLike = document.getElementById("dockLikeBtn");
    const liked = state.liked.has(item.id);
    dockLike.classList.toggle("is-liked", liked);
    dockLike.querySelector("svg").setAttribute("fill", liked ? "currentColor" : "none");

    document.getElementById("shuffleBtn").classList.toggle("is-saved", state.shuffle);
    document.getElementById("shuffleBtn").setAttribute("aria-pressed", String(state.shuffle));
    document.getElementById("repeatBtn").classList.toggle("is-saved", state.repeat !== "off");
    document.getElementById("repeatBtn").setAttribute("aria-pressed", String(state.repeat !== "off"));
    document.getElementById("repeatBtn").title = `Repeat: ${state.repeat}`;

    // Now Playing Drawer sync
    document.getElementById("npCover").innerHTML = makeSleeve(...item.art, item.title);
    document.getElementById("npGenre").textContent = (item.genre || item.category || "AUDIO").toUpperCase();
    document.getElementById("npTitle").textContent = item.title;
    document.getElementById("npArtist").textContent = item.artist;
    document.getElementById("npOfflineBtn").textContent = state.offline.has(item.id) ? "Saved Offline" : "Save Offline";

    updateScrubberAndLyrics();
    renderQueue();
  }

  function updateScrubberAndLyrics() {
    const item = getItem(state.currentId);
    const pct = Math.min(1000, Math.round((state.elapsed / item.duration) * 1000));
    document.getElementById("seekSlider").value = pct;
    document.getElementById("timeElapsed").textContent = fmtTime(state.elapsed);
    document.getElementById("timeDuration").textContent = fmtTime(item.duration);

    const lyrics = item.lyrics || [[0, item.desc || "Instrumental acoustic stream playing cleanly through 5-band EQ."]];
    let activeIdx = 0;
    lyrics.forEach(([t], i) => { if (state.elapsed >= t) activeIdx = i; });
    document.getElementById("lyricsList").innerHTML = lyrics.map(([t, line], i) => `
      <div class="lyric-line ${i === activeIdx ? "is-active" : ""}">
        <span class="mono" style="font-size:0.7rem;margin-right:8px;opacity:0.65;">${fmtTime(t)}</span>${line}
      </div>
    `).join("");
  }

  function renderQueue() {
    const body = document.getElementById("queueListBody");
    body.innerHTML = state.queue.map((id, idx) => {
      const t = getItem(id);
      const isCur = id === state.currentId;
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:${isCur ? "var(--accent-soft)" : "var(--paper)"};border:1px solid var(--line);">
        <span class="mono" style="font-size:0.72rem;color:var(--muted);width:20px;">${idx + 1}</span>
        <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex:none;cursor:pointer;" data-play="${id}">${makeSleeve(...t.art, t.title)}</div>
        <div style="min-width:0;flex:1;cursor:pointer;" data-play="${id}">
          <div style="font-weight:600;font-size:0.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.title}</div>
          <div style="font-size:0.76rem;color:var(--muted);">${t.artist}</div>
        </div>
        <span class="mono" style="font-size:0.72rem;color:var(--muted);">${fmtTime(t.duration)}</span>
      </div>`;
    }).join("");
  }

  function renderTrackRows() {
    renderHome();
    if (state.view === "search") renderSearch();
    if (state.view === "library") renderLibrary();
    if (state.view === "offline") renderOffline();
    if (state.view === "reels") renderReel();
  }

  function renderAll() {
    renderHome();
    renderReel();
    renderSearch();
    renderPodcasts();
    renderLibrary();
    renderOffline();
    renderTransport();
  }

  // ==========================================================
  // EQUALIZER UI & CURVE RENDERING
  // ==========================================================
  function initEqUi() {
    const grid = document.getElementById("eqSlidersGrid");
    grid.innerHTML = EQ_LABELS.map((lbl, i) => `
      <div class="eq-col">
        <span class="mono" style="font-size:0.72rem;color:var(--accent);" id="eqVal${i}">${state.eqGains[i] >= 0 ? "+" : ""}${state.eqGains[i]}dB</span>
        <input type="range" min="-12" max="12" step="1" value="${state.eqGains[i]}" data-eq-band="${i}" aria-label="${lbl} equalizer band" />
        <span class="mono" style="font-size:0.7rem;color:var(--muted);">${lbl}</span>
      </div>
    `).join("");

    const bars = document.getElementById("eqSpecBars");
    bars.innerHTML = Array.from({ length: 24 }, () => `<span style="height:6px;"></span>`).join("");

    grid.addEventListener("input", (e) => {
      const idx = Number(e.target.dataset.eqBand);
      if (Number.isNaN(idx)) return;
      const v = Number(e.target.value);
      state.eqGains[idx] = v;
      document.getElementById(`eqVal${idx}`).textContent = `${v >= 0 ? "+" : ""}${v}dB`;
      drawEqCurve();
      applyAudioParams();
    });

    document.querySelectorAll("[data-eq-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.eqPreset;
        const p = EQ_PRESETS[key];
        state.eqGains = [...p.gains];
        state.bassBoost = p.bass;
        document.querySelectorAll("[data-eq-preset]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        p.gains.forEach((g, i) => {
          const inp = grid.querySelector(`[data-eq-band="${i}"]`);
          if (inp) inp.value = g;
          document.getElementById(`eqVal${i}`).textContent = `${g >= 0 ? "+" : ""}${g}dB`;
        });
        document.getElementById("bassBoostSlider").value = p.bass;
        document.getElementById("bassBoostLabel").textContent = `${p.bass}%`;
        drawEqCurve();
        applyAudioParams();
      });
    });

    document.getElementById("bassBoostSlider").addEventListener("input", (e) => {
      state.bassBoost = Number(e.target.value);
      document.getElementById("bassBoostLabel").textContent = `${state.bassBoost}%`;
      applyAudioParams();
    });

    document.getElementById("eqTestBeatBtn").addEventListener("click", () => {
      if (state.isTestBeat) {
        state.isTestBeat = false;
        if (!state.isPlaying) stopAudioLoop();
        document.getElementById("eqTestBeatBtn").textContent = "Play Beat";
      } else {
        state.isPlaying = false;
        state.isTestBeat = true;
        startAudioLoop();
        document.getElementById("eqTestBeatBtn").textContent = "Stop Beat";
        renderTransport();
      }
    });

    drawEqCurve();
  }

  function drawEqCurve() {
    const xs = [32, 116, 200, 284, 368];
    const pts = state.eqGains.map((g, i) => [xs[i], 50 - (g / 12) * 34]);
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      d += ` Q ${pts[i][0]} ${pts[i][1]}, ${mx} ${(pts[i][1] + pts[i + 1][1]) / 2}`;
    }
    const last = pts[pts.length - 1];
    d += ` T ${last[0]} ${last[1]}`;
    document.getElementById("eqCurveLine").setAttribute("d", d);
    document.getElementById("eqCurveFill").setAttribute("d", `${d} L ${last[0]} 96 L ${pts[0][0]} 96 Z`);
  }

  // ==========================================================
  // DRAWERS & MODALS
  // ==========================================================
  let activeDrawer = null;
  function openDrawer(name) {
    closeDrawers();
    const el = document.getElementById(`drawer-${name}`);
    if (!el) return;
    activeDrawer = name;
    document.getElementById("drawerBackdrop").classList.add("is-open");
    el.classList.add("is-open");
    document.getElementById("topEqBtn").classList.toggle("is-active", name === "eq");
  }

  function closeDrawers() {
    activeDrawer = null;
    document.getElementById("drawerBackdrop").classList.remove("is-open");
    document.querySelectorAll(".drawer-panel").forEach((p) => p.classList.remove("is-open"));
    document.getElementById("topEqBtn").classList.remove("is-active");
  }

  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawers);
  document.querySelectorAll("[data-close-drawer]").forEach((b) => b.addEventListener("click", closeDrawers));

  // ==========================================================
  // GLOBAL EVENT DELEGATION & CONTROLS
  // ==========================================================
  document.addEventListener("click", (e) => {
    const playEl = e.target.closest("[data-play]");
    if (playEl) {
      const id = playEl.dataset.play;
      if (state.currentId === id && state.isPlaying) togglePlay();
      else playTrack(id, true);
      return;
    }

    const likeEl = e.target.closest("[data-like]");
    if (likeEl) { toggleLike(likeEl.dataset.like); return; }

    const offEl = e.target.closest("[data-offline]");
    if (offEl) { toggleOffline(offEl.dataset.offline); return; }

    const genEl = e.target.closest("[data-genre]");
    if (genEl) { state.genreFilter = genEl.dataset.genre; renderHome(); return; }

    const podEl = e.target.closest("[data-pod-cat]");
    if (podEl) { state.podFilter = podEl.dataset.podCat; renderPodcasts(); return; }

    const scopeEl = e.target.closest("[data-scope]");
    if (scopeEl) { state.searchScope = scopeEl.dataset.scope; renderSearch(); return; }

    const quickSearchEl = e.target.closest("[data-quick-search]");
    if (quickSearchEl) {
      state.searchQuery = quickSearchEl.dataset.quickSearch;
      document.getElementById("globalSearch").value = state.searchQuery;
      renderSearch();
      return;
    }

    const plEl = e.target.closest("[data-open-pl]");
    if (plEl) {
      const pl = PLAYLISTS.find((p) => p.id === plEl.dataset.openPl);
      if (pl && pl.trackIds.length) {
        state.queue = [...pl.trackIds];
        playTrack(pl.trackIds[0], true);
        showToast(`Loaded "${pl.name}" (${pl.trackIds.length} tracks)`);
      }
      return;
    }

    const libEl = e.target.closest("[data-select-lib]");
    if (libEl) {
      state.activeLibraryId = libEl.dataset.selectLib;
      navigate("library");
      renderLibrary();
      return;
    }
  });

  // Search Input
  const searchInput = document.getElementById("globalSearch");
  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    if (state.view !== "search" && state.searchQuery.trim().length > 0) navigate("search");
    renderSearch();
  });

  // Transport buttons
  document.getElementById("playBtn").addEventListener("click", togglePlay);
  document.getElementById("mobilePlayBtn").addEventListener("click", togglePlay);
  document.getElementById("nextBtn").addEventListener("click", () => nextTrack(false));
  document.getElementById("prevBtn").addEventListener("click", prevTrack);
  document.getElementById("dockLikeBtn").addEventListener("click", () => toggleLike(state.currentId));
  document.getElementById("dockCover").addEventListener("click", () => openDrawer("lyrics"));
  document.getElementById("dockMeta").addEventListener("click", () => openDrawer("lyrics"));

  document.getElementById("shuffleBtn").addEventListener("click", () => {
    state.shuffle = !state.shuffle;
    showToast(state.shuffle ? "Shuffle enabled" : "Shuffle off");
    renderTransport();
  });

  document.getElementById("repeatBtn").addEventListener("click", () => {
    const order = ["off", "all", "one"];
    state.repeat = order[(order.indexOf(state.repeat) + 1) % order.length];
    showToast(`Repeat: ${state.repeat}`);
    renderTransport();
  });

  document.getElementById("seekSlider").addEventListener("input", (e) => {
    const cur = getItem(state.currentId);
    state.elapsed = (Number(e.target.value) / 1000) * cur.duration;
    updateScrubberAndLyrics();
  });

  document.getElementById("volSlider").addEventListener("input", (e) => {
    state.volume = Number(e.target.value) / 100;
    state.muted = state.volume === 0;
    applyAudioParams();
  });

  document.getElementById("muteBtn").addEventListener("click", () => {
    state.muted = !state.muted;
    document.getElementById("volSlider").value = state.muted ? 0 : Math.round(state.volume * 100);
    applyAudioParams();
    showToast(state.muted ? "Audio muted" : "Audio unmuted");
  });

  // Drawers triggers
  document.getElementById("topEqBtn").addEventListener("click", () => activeDrawer === "eq" ? closeDrawers() : openDrawer("eq"));
  document.getElementById("eqDrawerBtn").addEventListener("click", () => activeDrawer === "eq" ? closeDrawers() : openDrawer("eq"));
  document.getElementById("lyricsDrawerBtn").addEventListener("click", () => activeDrawer === "lyrics" ? closeDrawers() : openDrawer("lyrics"));
  document.getElementById("queueDrawerBtn").addEventListener("click", () => activeDrawer === "queue" ? closeDrawers() : openDrawer("queue"));
  document.getElementById("openImportBtn").addEventListener("click", () => openDrawer("import"));
  document.getElementById("libImportBtn").addEventListener("click", () => openDrawer("import"));

  // SoundReel controls
  document.getElementById("reelPrevBtn").addEventListener("click", () => {
    state.reelIdx = (state.reelIdx - 1 + TRACKS.length) % TRACKS.length;
    renderReel();
  });
  document.getElementById("reelNextBtn").addEventListener("click", () => {
    state.reelIdx = (state.reelIdx + 1) % TRACKS.length;
    renderReel();
  });
  document.getElementById("reelPlayBtn").addEventListener("click", () => {
    const t = TRACKS[state.reelIdx % TRACKS.length];
    if (state.currentId === t.id && state.isPlaying) togglePlay();
    else playTrack(t.id, true);
  });
  document.getElementById("reelLikeBtn").addEventListener("click", () => toggleLike(TRACKS[state.reelIdx % TRACKS.length].id));
  document.getElementById("reelSaveBtn").addEventListener("click", () => toggleOffline(TRACKS[state.reelIdx % TRACKS.length].id));
  document.getElementById("reelLyricsBtn").addEventListener("click", () => openDrawer("lyrics"));
  document.getElementById("reelEqBtn").addEventListener("click", () => openDrawer("eq"));
  document.getElementById("reelDetailsBtn").addEventListener("click", () => openDrawer("lyrics"));

  // Now Playing drawer buttons
  document.getElementById("npOfflineBtn").addEventListener("click", () => toggleOffline(state.currentId));
  document.getElementById("npShareBtn").addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}#track=${state.currentId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast("Copied deep link for current track");
  });

  // Sleep Timer
  const sleepCycle = [0, 15, 30, 60];
  document.getElementById("sleepBtn").addEventListener("click", () => {
    state.sleepMins = sleepCycle[(sleepCycle.indexOf(state.sleepMins) + 1) % sleepCycle.length];
    document.getElementById("sleepVal").textContent = state.sleepMins ? `${state.sleepMins}m` : "Off";
    document.getElementById("sleepBtn").classList.toggle("is-active", state.sleepMins > 0);
    showToast(state.sleepMins ? `Sleep timer set for ${state.sleepMins} minutes` : "Sleep timer off");
  });

  // Offline Airplane Mode Simulator
  document.getElementById("simOfflineBtn").addEventListener("click", () => {
    state.simOffline = !state.simOffline;
    showToast(state.simOffline ? "Airplane mode ON: only Offline Vault tracks playable" : "Back online: full catalog unlocked");
    renderAll();
  });

  // Import Playlist validation & mock mapping
  document.getElementById("fillSampleUrl").addEventListener("click", () => {
    document.getElementById("importUrlInput").value = "https://open.spotify.com/playlist/late-night-focus";
    document.getElementById("importError").textContent = "";
  });

  document.getElementById("importForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const val = document.getElementById("importUrlInput").value.trim();
    const errEl = document.getElementById("importError");
    if (!/^https:\/\/(open\.spotify\.com\/playlist\/|music\.youtube\.com\/playlist\?list=)/i.test(val)) {
      errEl.textContent = "Please paste a valid public Spotify or YouTube Music playlist URL.";
      return;
    }
    errEl.textContent = "";
    const slug = val.split("/").pop().replace(/[^a-z0-9-]/gi, " ").trim() || "Imported Mix";
    const niceName = slug.split(/[\s-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const id = `pl-imp-${Date.now()}`;
    PLAYLISTS.push({
      id,
      name: niceName,
      desc: "Imported public playlist",
      trackIds: ["midnight-telemetry", "paper-lantern-lofi", "sunlit-transit"],
      art: ["#162d47", "#3668a6", "#bfdbfe", "wave"]
    });
    state.activeLibraryId = id;
    document.getElementById("importUrlInput").value = "";
    closeDrawers();
    navigate("library");
    renderAll();
    showToast(`Imported "${niceName}" (3 matched tracks)`);
  });

  // Keyboard shortcuts (Space, M, N, P, /, Escape)
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "Escape") { closeDrawers(); return; }
    if (tag === "input" || tag === "textarea") return;
    if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
    else if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (e.key.toLowerCase() === "m") { document.getElementById("muteBtn").click(); }
    else if (e.key.toLowerCase() === "n") { nextTrack(false); }
    else if (e.key.toLowerCase() === "p") { prevTrack(); }
  });

  window.addEventListener("resize", () => {
    document.getElementById("mobilePlayBtn").style.display = window.innerWidth <= 960 ? "inline-flex" : "none";
  });

  // Boot
  initEqUi();
  renderAll();
  handleHash();
  startVisualizer();
})();
