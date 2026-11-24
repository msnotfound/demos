/* SoundPlus Unified Web Player Engine (Live Real Songs via SoundPlus API + YouTube IFrame API)
   Zero Freesound URLs, zero cache-purge reloads, zero letterboxed black bars, zero layout collisions */

(function () {
  "use strict";

  // YouTube Content ID blocks licensed music embeds on raw numeric IP 127.0.0.1,
  // while allowing localhost and HTTPS domains cleanly.
  if (location.hostname === "127.0.0.1") {
    location.replace(location.href.replace("://127.0.0.1", "://localhost"));
    return;
  }

  const API_BASE = "https://music.graphikrafts.com/webplayer/api/search.php";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Studio 1:1 album cover cache (hydrated via Apple iTunes Search API -> 600x600bb.jpg)
  const ART_CACHE_KEY = "sp_art_cache_v1";
  let artCache = {};
  try { artCache = JSON.parse(localStorage.getItem(ART_CACHE_KEY) || "{}") || {}; } catch (_) { artCache = {}; }
  const artPending = new Set();

  function saveArtCache() {
    try { localStorage.setItem(ART_CACHE_KEY, JSON.stringify(artCache)); } catch (_) {}
  }

  function cleanTrackQuery(item) {
    let t = String((item && item.title) || "")
      .replace(/\s*[\(\[](?:official|lyric|audio|music\s*video|hd|4k|visualizer|live|full\s*song|video\s*song|feat\.?[^\)\]]*|ft\.?[^\)\]]*)[^\)\]]*[\)\]]/gi, "")
      .replace(/\s*\b(?:ft\.?|feat\.?)\s+.*$/i, "")
      .replace(/\s*[-\u2013\u2014|]\s*(?:hd|4k|lyrics?|official.*|audio.*)$/i, "")
      .replace(/\s*\|.*$/, "")
      .trim();
    const artist = String((item && item.artist) || "").replace(/\s*-\s*Topic$/i, "").trim();
    if (/[-\u2013\u2014]/.test(t)) {
      const q = t.replace(/\s*[-\u2013\u2014]\s*/g, " ").trim();
      return { title: t, artist, q };
    }
    return { title: t, artist, q: `${artist} ${t}`.trim() };
  }

  async function hydrateAlbumArt(item) {
    if (!item || !item.id) return;
    if (state.podcasts && state.podcasts.some((p) => p.id === item.id)) return;
    if (artCache[item.id] !== undefined || artPending.has(item.id)) return;
    artPending.add(item.id);
    const { q } = cleanTrackQuery(item);
    if (!q) { artPending.delete(item.id); return; }
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=3`);
      if (!res.ok) throw new Error("iTunes HTTP " + res.status);
      const data = await res.json();
      const hit = Array.isArray(data.results) && data.results.find((r) => r && r.artworkUrl100);
      if (hit && hit.artworkUrl100) {
        const hiRes = hit.artworkUrl100.replace(/100x100bb/i, "600x600bb");
        artCache[item.id] = hiRes;
        saveArtCache();
        document.querySelectorAll(`img[data-art-id="${CSS.escape(item.id)}"]`).forEach((imgEl) => {
          imgEl.src = hiRes;
          imgEl.classList.add("is-square-art");
        });
      } else {
        artCache[item.id] = "";
      }
    } catch (_) {
      // keep YT fallback cleanly
    } finally {
      artPending.delete(item.id);
    }
  }

  function hydrateVisibleArt(tracks) {
    const list = (tracks || []).slice(0, 8);
    list.forEach((t, idx) => {
      if (t && t.id && artCache[t.id] === undefined) {
        setTimeout(() => hydrateAlbumArt(t), idx * 240);
      }
    });
  }

  // Fallback thumbnail helper: prefer HD maxresdefault -> mqdefault (ZERO 4:3 black bars)
  function cleanThumb(url, id) {
    if (id && artCache[id]) return artCache[id];
    if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
      return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
    }
    if (!url) return "";
    return url.replace("/hqdefault.jpg", "/mqdefault.jpg");
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function artMarkup(item, fallbackGradient) {
    const id = item && item.id ? String(item.id) : "";
    const cachedSquare = id && artCache[id];
    const src = cleanThumb(item && item.thumbnailUrl, id);
    if (src) {
      const cls = cachedSquare ? ' class="is-square-art"' : "";
      const fallbackUrl = /^[a-zA-Z0-9_-]{11}$/.test(id)
        ? `https://i.ytimg.com/vi/${escHtml(id)}/mqdefault.jpg`
        : "";
      const onloadAttr = !cachedSquare && fallbackUrl
        ? ` onload="if(this.naturalWidth<=120&&this.src.indexOf('maxresdefault')!==-1){this.src='${fallbackUrl}';}"`
        : "";
      const onerrorAttr = fallbackUrl
        ? ` onerror="this.onerror=null;this.src='${fallbackUrl}'"`
        : "";
      return `<img data-art-id="${escHtml(id)}"${cls} src="${escHtml(src)}" alt="${escHtml(item.title || item.name)}" loading="lazy"${onloadAttr}${onerrorAttr} />`;
    }
    const bg = fallbackGradient || "linear-gradient(135deg, #312e81, #6366f1)";
    return `<div style="width:100%;height:100%;background:${bg};display:flex;align-items:flex-end;padding:12px;color:#fff;font-family:var(--font-mono);font-size:0.72rem;">${escHtml((item.title || "SOUNDPLUS").slice(0, 18))}</div>`;
  }

  // Verified live seed tracks from feed=home so first paint is instant before live API hydration completes
  const SEED_TRACKS = [
    { id: "Sv5yCzPCkv8", title: "SZA - Snooze", artist: "SZA", duration: 204, genre: "Trending", thumbnailUrl: "https://i.ytimg.com/vi/Sv5yCzPCkv8/mqdefault.jpg" },
    { id: "qCTMq7xvdXU", title: "Billie Eilish - everything i wanted", artist: "Billie Eilish", duration: 247, genre: "Pop", thumbnailUrl: "https://i.ytimg.com/vi/qCTMq7xvdXU/mqdefault.jpg" },
    { id: "ZAz3rnLGthg", title: "Flashing Lights", artist: "Kanye West", duration: 238, genre: "Hip-Hop", thumbnailUrl: "https://i.ytimg.com/vi/ZAz3rnLGthg/mqdefault.jpg" },
    { id: "5sgc8RJezrE", title: "Dom Dolla - Saving Up", artist: "Dom Dolla", duration: 208, genre: "Dance", thumbnailUrl: "https://i.ytimg.com/vi/5sgc8RJezrE/mqdefault.jpg" },
    { id: "YykjpeuMNEk", title: "Coldplay - Hymn For The Weekend", artist: "Coldplay", duration: 261, genre: "Pop", thumbnailUrl: "https://i.ytimg.com/vi/YykjpeuMNEk/mqdefault.jpg" },
    { id: "1G4isv_Fylg", title: "Coldplay - Paradise", artist: "Coldplay", duration: 261, genre: "Rock", thumbnailUrl: "https://i.ytimg.com/vi/1G4isv_Fylg/mqdefault.jpg" },
    { id: "MOQV__Z55eE", title: "Foo Fighters - Learn to Fly", artist: "Foo Fighters", duration: 236, genre: "Rock", thumbnailUrl: "https://i.ytimg.com/vi/MOQV__Z55eE/mqdefault.jpg" },
    { id: "yGHEis32s2Y", title: "Steve Lacy - oh yeah?", artist: "Steve Lacy", duration: 170, genre: "Chill", thumbnailUrl: "https://i.ytimg.com/vi/yGHEis32s2Y/mqdefault.jpg" }
  ];

  const SEED_MIXES = [
    { id: "top_hits", title: "Today's Top Hits", subtitle: "Sabrina Carpenter, Billie Eilish, Post Malone", badge: "GLOBAL CHARTS", gradient: "linear-gradient(135deg, #2563eb, #0d9488)", seedArtist: "Sabrina Carpenter Espresso" },
    { id: "hiphop_hype", title: "Hip-Hop & Rap", subtitle: "Travis Scott, Kendrick Lamar, Kanye West", badge: "HOTLIST", gradient: "linear-gradient(135deg, #c2410c, #db2777)", seedArtist: "Kendrick Lamar" },
    { id: "hindi_unplugged", title: "Bollywood Acoustic", subtitle: "Arijit Singh, Pritam, Shreya Ghoshal", badge: "INDIA HUB", gradient: "linear-gradient(135deg, #7c3aed, #2563eb)", seedArtist: "Arijit Singh" },
    { id: "late_chill", title: "Late Night Chill", subtitle: "SZA, Steve Lacy, Frank Ocean", badge: "AFTER HOURS", gradient: "linear-gradient(135deg, #0f766e, #334155)", seedArtist: "SZA chill" }
  ];

  const USER_PLAYLISTS = [
    { id: "pl-trending", name: "Trending Now", desc: "Live SoundPlus chart rotation", trackIds: ["Sv5yCzPCkv8", "qCTMq7xvdXU", "ZAz3rnLGthg", "5sgc8RJezrE"], gradient: "linear-gradient(135deg, #312e81, #6366f1)" },
    { id: "pl-chill", name: "Focus & Chill", desc: "Smooth melodies & late-night grooves", trackIds: ["qCTMq7xvdXU", "yGHEis32s2Y", "YykjpeuMNEk"], gradient: "linear-gradient(135deg, #134e4a, #0d9488)" },
    { id: "pl-rock", name: "Anthems & Rock", desc: "High-energy classics & festival hits", trackIds: ["1G4isv_Fylg", "MOQV__Z55eE", "ZAz3rnLGthg"], gradient: "linear-gradient(135deg, #7c2d12, #ea580c)" }
  ];

  const EQ_PRESETS = {
    flat: { gains: [0, 0, 0, 0, 0], bass: 0 },
    bass: { gains: [7, 4, 0, 1, 2], bass: 35 },
    vocal: { gains: [-2, 1, 5, 4, 1], bass: 10 },
    night: { gains: [4, 2, -1, -3, -4], bass: 20 }
  };
  const EQ_FREQS = [60, 230, 910, 3600, 14000];
  const EQ_LABELS = ["60Hz", "230Hz", "910Hz", "3.6kHz", "14kHz"];

  function loadSet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set(fallback);
    } catch (_) {
      return new Set(fallback);
    }
  }

  const catalogById = new Map();
  function registerItems(list) {
    list.forEach((raw) => {
      if (!raw || !raw.id) return;
      const item = {
        id: raw.id,
        title: raw.title || "Untitled Track",
        artist: raw.artist || raw.showTitle || "SoundPlus Artist",
        duration: Number(raw.durationSeconds || raw.duration || 210),
        genre: raw.genre || (raw.showTitle ? "Podcast" : "Trending"),
        category: raw.showTitle || raw.genre || "Podcast",
        thumbnailUrl: cleanThumb(raw.thumbnailUrl, raw.id),
        publishedDate: raw.publishedDate || "",
        desc: raw.description || ""
      };
      catalogById.set(item.id, item);
    });
  }
  registerItems(SEED_TRACKS);

  const state = {
    view: "home",
    tracks: [...SEED_TRACKS],
    mixes: [...SEED_MIXES],
    podcasts: [],
    artists: [],
    searchResults: [],
    searchLoading: false,
    genreFilter: "All",
    podFilter: "All",
    searchScope: "all",
    searchQuery: "",
    activeLibraryId: "likes",
    queue: SEED_TRACKS.map((t) => t.id),
    currentId: SEED_TRACKS[0].id,
    reelIdx: 0,
    isPlaying: false,
    isTestBeat: false,
    showVideo: false,
    elapsed: 0,
    duration: SEED_TRACKS[0].duration,
    volume: 80,
    muted: false,
    shuffle: false,
    repeat: "off",
    sleepMins: 0,
    simOffline: false,
    liked: loadSet("sp_liked_live_v1", ["Sv5yCzPCkv8", "qCTMq7xvdXU"]),
    offline: loadSet("sp_saved_live_v1", ["Sv5yCzPCkv8", "YykjpeuMNEk"]),
    eqGains: [...EQ_PRESETS.bass.gains],
    bassBoost: EQ_PRESETS.bass.bass
  };

  function getItem(id) {
    return catalogById.get(id) || state.tracks[0] || SEED_TRACKS[0];
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function persist() {
    try {
      localStorage.setItem("sp_liked_live_v1", JSON.stringify([...state.liked]));
      localStorage.setItem("sp_saved_live_v1", JSON.stringify([...state.offline]));
    } catch (_) {}
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-show"), 2600);
  }

  // ==========================================================
  // REAL YOUTUBE IFRAME PLAYER ENGINE (Plays actual tracks!)
  // ==========================================================
  let ytPlayer = null;
  let ytReady = false;
  let pendingPlayId = null;
  let pollTimer = null;
  let sleepTimeout = null;
  let consecutiveErrors = 0;

  function initYT() {
    if (ytPlayer || !window.YT || !window.YT.Player) return;
    const pVars = {
      autoplay: 0,
      controls: 1,
      enablejsapi: 1,
      playsinline: 1,
      rel: 0,
      modestbranding: 1,
      origin: window.location.origin
    };

    ytPlayer = new window.YT.Player("yt-player-host", {
      height: "158",
      width: "280",
      playerVars: pVars,
      events: {
        onReady: () => {
          ytReady = true;
          ytPlayer.setVolume(state.volume);
          if (pendingPlayId) {
            const id = pendingPlayId;
            pendingPlayId = null;
            ytPlayer.loadVideoById(id);
            ytPlayer.playVideo();
          }
        },
        onStateChange: (ev) => {
          const YTState = window.YT.PlayerState;
          if (ev.data === YTState.PLAYING) {
            consecutiveErrors = 0;
            state.isPlaying = true;
            const d = ytPlayer.getDuration();
            if (d && d > 1) state.duration = d;
            startPolling();
            renderTransport();
            renderTrackRows();
          } else if (ev.data === YTState.PAUSED) {
            state.isPlaying = false;
            renderTransport();
            renderTrackRows();
          } else if (ev.data === YTState.ENDED) {
            if (state.sleepMode === "eot") {
              state.sleepMode = "off";
              state.isPlaying = false;
              const sv = document.getElementById("sleepVal");
              const sb = document.getElementById("sleepBtn");
              if (sv) sv.textContent = "Off";
              if (sb) sb.classList.remove("is-active");
              showToast("Sleep timer paused at end of track");
              renderTransport();
              return;
            }
            if (state.repeat === "one") {
              ytPlayer.seekTo(0, true);
              ytPlayer.playVideo();
            } else {
              nextTrack(true);
            }
          }
        },
        onError: () => {
          if (!state.isPlaying) return;
          consecutiveErrors++;
          if (consecutiveErrors <= 3) {
            showToast("Track restricted by label for web embed; skipping to next track");
            nextTrack(false);
          } else {
            state.isPlaying = false;
            consecutiveErrors = 0;
            showToast("Multiple tracks restricted by YouTube embed; try another track");
            renderTransport();
          }
        }
      }
    });
  }

  window.onYouTubeIframeAPIReady = initYT;
  if (window.YT && window.YT.Player) initYT();

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (!ytPlayer || !ytReady || !state.isPlaying) return;
      try {
        const cur = ytPlayer.getCurrentTime();
        const dur = ytPlayer.getDuration();
        if (!Number.isNaN(cur)) state.elapsed = cur;
        if (dur && dur > 1) state.duration = dur;
        updateScrubber();
      } catch (_) {}
    }, 300);
  }

  // ==========================================================
  // BUILT-IN 5-BAND WEB AUDIO STUDIO TEST BEAT (Zero Freesound URLs!)
  // ==========================================================
  let audioCtx = null, eqNodes = [], bassNode = null, beatMaster = null, analyser = null, freqBins = null;
  let beatTimer = null, beatStep = 0, vizRaf = null;

  function ensureEqAudio() {
    if (audioCtx) {
      if (audioCtx.state === "suspended") audioCtx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
    const types = ["lowshelf", "peaking", "peaking", "peaking", "highshelf"];
    eqNodes = EQ_FREQS.map((freq, i) => {
      const f = audioCtx.createBiquadFilter();
      f.type = types[i];
      f.frequency.value = freq;
      f.Q.value = 1.1;
      f.gain.value = state.eqGains[i];
      return f;
    });
    bassNode = audioCtx.createBiquadFilter();
    bassNode.type = "lowshelf";
    bassNode.frequency.value = 85;
    bassNode.gain.value = (state.bassBoost / 100) * 10;

    beatMaster = audioCtx.createGain();
    beatMaster.gain.value = state.muted ? 0 : (state.volume / 100) * 0.42;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    freqBins = new Uint8Array(analyser.frequencyBinCount);

    for (let i = 0; i < eqNodes.length - 1; i++) eqNodes[i].connect(eqNodes[i + 1]);
    eqNodes[4].connect(bassNode);
    bassNode.connect(beatMaster);
    beatMaster.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  function applyEqParams() {
    if (!audioCtx) return;
    eqNodes.forEach((f, i) => f.gain.setTargetAtTime(state.eqGains[i], audioCtx.currentTime, 0.03));
    if (bassNode) bassNode.gain.setTargetAtTime((state.bassBoost / 100) * 10, audioCtx.currentTime, 0.03);
    if (beatMaster) beatMaster.gain.setTargetAtTime(state.muted ? 0 : (state.volume / 100) * 0.42, audioCtx.currentTime, 0.03);
  }

  function triggerBeatStep() {
    if (!audioCtx || audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    const b = beatStep % 4;
    // Kick
    if (b === 0 || b === 2) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(140, now);
      o.frequency.exponentialRampToValueAtTime(42, now + 0.13);
      g.gain.setValueAtTime(0.68, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      o.connect(g); g.connect(eqNodes[0]);
      o.start(now); o.stop(now + 0.25);
    }
    // Hi-hat
    const bufLen = Math.floor(audioCtx.sampleRate * 0.04);
    const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.28));
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const hp = audioCtx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 6400;
    const hg = audioCtx.createGain();
    hg.gain.setValueAtTime(b % 2 === 1 ? 0.16 : 0.06, now);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    src.connect(hp); hp.connect(hg); hg.connect(eqNodes[0]);
    src.start(now);
    // Warm chord on downbeat
    if (b === 0) {
      const chords = [[220, 261.63, 329.63], [174.61, 220, 261.63], [196, 246.94, 293.66], [164.81, 196, 246.94]];
      const chord = chords[Math.floor(beatStep / 4) % chords.length];
      chord.forEach((f) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = "triangle"; o.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.08, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        o.connect(g); g.connect(eqNodes[0]);
        o.start(now); o.stop(now + 0.95);
      });
    }
    beatStep++;
  }

  function stopTestBeat() {
    state.isTestBeat = false;
    clearInterval(beatTimer);
    beatTimer = null;
    const btn = document.getElementById("eqTestBeatBtn");
    if (btn) btn.textContent = "Play Beat";
  }

  function startVisualizer() {
    cancelAnimationFrame(vizRaf);
    const specSpans = Array.from(document.querySelectorAll("#eqSpecBars span"));
    const reelCanvas = document.getElementById("reelViz");
    const rCtx = reelCanvas ? reelCanvas.getContext("2d") : null;
    let phase = 0;

    function frame() {
      phase += 0.11;
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#6366f1";
      if (analyser && state.isTestBeat) analyser.getByteFrequencyData(freqBins);

      specSpans.forEach((sp, i) => {
        let v = 0.08;
        if (state.isTestBeat && freqBins) {
          v = freqBins[i % freqBins.length] / 255;
        } else if (state.isPlaying) {
          const bandGain = state.eqGains[Math.min(4, Math.floor((i / specSpans.length) * 5))];
          const boost = 1 + bandGain / 24;
          v = Math.min(1, Math.max(0.12, (0.35 + 0.35 * Math.sin(phase + i * 0.55) + 0.2 * Math.cos(phase * 1.4 - i * 0.3)) * boost));
        }
        sp.style.height = `${Math.max(4, Math.round(v * 32))}px`;
      });

      if (rCtx && reelCanvas) {
        const w = reelCanvas.width, h = reelCanvas.height;
        rCtx.clearRect(0, 0, w, h);
        const count = 32;
        const barW = (w - 24) / count;
        rCtx.fillStyle = accent;
        for (let i = 0; i < count; i++) {
          let val = 0.14 + Math.sin(i * 0.5) * 0.05;
          if (state.isTestBeat && freqBins) val = freqBins[i % freqBins.length] / 255;
          else if (state.isPlaying) val = 0.25 + 0.45 * Math.abs(Math.sin(phase * 0.8 + i * 0.45));
          const bh = Math.max(4, val * (h - 14));
          rCtx.globalAlpha = (state.isPlaying || state.isTestBeat) ? 0.85 : 0.35;
          rCtx.fillRect(12 + i * barW + 2, (h - bh) / 2, Math.max(3, barW - 4), bh);
        }
        rCtx.globalAlpha = 1;
      }

      if (state.isPlaying || state.isTestBeat) {
        vizRaf = requestAnimationFrame(frame);
      }
    }
    vizRaf = requestAnimationFrame(frame);
  }

  // ==========================================================
  // PLAYBACK CONTROLS (Wired to Real YouTube IFrame Player)
  // ==========================================================
  function playTrack(id, autoPlay = true) {
    if (state.simOffline && !state.offline.has(id)) {
      showToast("Saved-only filter active: pick a saved track or disable filter");
      return;
    }
    stopTestBeat();
    const item = getItem(id);
    state.currentId = item.id;
    state.elapsed = 0;
    state.duration = item.duration || 210;
    if (!state.queue.includes(item.id)) state.queue.unshift(item.id);

    if (autoPlay) {
      state.isPlaying = true;
      if (ytReady && ytPlayer) {
        ytPlayer.loadVideoById(item.id);
        ytPlayer.setVolume(state.muted ? 0 : state.volume);
        ytPlayer.playVideo();
      } else {
        pendingPlayId = item.id;
        initYT();
      }
      startPolling();
      startVisualizer();
    }
    updateMediaSession();
    renderAll();
  }

  function togglePlay() {
    stopTestBeat();
    if (state.isPlaying) {
      state.isPlaying = false;
      if (ytReady && ytPlayer) ytPlayer.pauseVideo();
    } else {
      state.isPlaying = true;
      if (ytReady && ytPlayer) {
        const curData = ytPlayer.getVideoData ? ytPlayer.getVideoData() : null;
        if (!curData || curData.video_id !== state.currentId) {
          ytPlayer.loadVideoById(state.currentId);
        }
        ytPlayer.playVideo();
      } else {
        pendingPlayId = state.currentId;
        initYT();
      }
      startPolling();
      startVisualizer();
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
          renderTransport();
          return;
        }
        idx = 0;
      }
    }
    playTrack(q[idx], true);
  }

  function prevTrack() {
    if (state.elapsed > 4 && ytReady && ytPlayer) {
      ytPlayer.seekTo(0, true);
      state.elapsed = 0;
      updateScrubber();
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
      showToast("Added to Liked Songs");
    }
    persist();
    renderAll();
  }

  function toggleOffline(id) {
    const item = getItem(id);
    if (state.offline.has(id)) {
      state.offline.delete(id);
      showToast(`Removed "${item.title}" from Downloaded Songs`);
    } else {
      state.offline.add(id);
      showToast(`Downloaded "${item.title}" to Downloaded Songs`);
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
        album: "SoundPlus",
        artwork: [{ src: cleanThumb(item.thumbnailUrl, item.id), sizes: "320x180", type: "image/jpeg" }]
      });
      navigator.mediaSession.setActionHandler("play", () => { if (!state.isPlaying) togglePlay(); });
      navigator.mediaSession.setActionHandler("pause", () => { if (state.isPlaying) togglePlay(); });
      navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack(false));
    } catch (_) {}
  }

  // ==========================================================
  // LIVE SOUNDPLUS API HYDRATION (Home, Podcasts, Artists, Search)
  // ==========================================================
  async function loadLiveFeeds() {
    try {
      const [homeRes, podRes, artRes] = await Promise.all([
        fetch(`${API_BASE}?feed=home`),
        fetch(`${API_BASE}?feed=podcasts`),
        fetch(`${API_BASE}?feed=artists`)
      ]);

      if (homeRes.ok) {
        const home = await homeRes.json();
        const buckets = [
          ["Trending", home.trending],
          ["Pop", home.pop],
          ["Hip-Hop", home.hiphop],
          ["Dance", home.dance],
          ["Latin", home.latin],
          ["Rock", home.rock],
          ["Country", home.country],
          ["Chill", home.chill]
        ];
        const merged = [];
        const seen = new Set();
        buckets.forEach(([label, arr]) => {
          if (!Array.isArray(arr)) return;
          arr.forEach((t) => {
            if (!t.id || seen.has(t.id)) return;
            seen.add(t.id);
            merged.push({ ...t, genre: label });
          });
        });
        if (merged.length) {
          registerItems(merged);
          state.tracks = merged.map((t) => getItem(t.id));
          if (!state.isPlaying) {
            state.currentId = state.tracks[0].id;
            state.duration = state.tracks[0].duration;
            state.queue = state.tracks.slice(0, 20).map((t) => t.id);
          }
          // Hydrate starter playlists with live track IDs
          USER_PLAYLISTS[0].trackIds = state.tracks.filter((t) => t.genre === "Trending").slice(0, 6).map((t) => t.id);
          USER_PLAYLISTS[1].trackIds = state.tracks.filter((t) => t.genre === "Chill" || t.genre === "Pop").slice(0, 6).map((t) => t.id);
          USER_PLAYLISTS[2].trackIds = state.tracks.filter((t) => t.genre === "Rock" || t.genre === "Hip-Hop").slice(0, 6).map((t) => t.id);
        }
        if (Array.isArray(home.mixes) && home.mixes.length) {
          state.mixes = home.mixes.slice(0, 4);
        }
      }

      if (podRes.ok) {
        const pods = await podRes.json();
        if (Array.isArray(pods) && pods.length) {
          registerItems(pods);
          state.podcasts = pods.slice(0, 12).map((p) => getItem(p.id));
        }
      }

      if (artRes.ok) {
        const arts = await artRes.json();
        if (Array.isArray(arts) && arts.length) {
          state.artists = arts.slice(0, 12);
        }
      }

      renderAll();
      hydrateVisibleArt(state.tracks);
    } catch (_) {
      // Fallback seed catalog already rendered cleanly
    }
  }

  let searchDebounce = null;
  async function runLiveSearch(query, autoPlayFirst = false) {
    const q = query.trim();
    if (!q) {
      state.searchResults = [];
      state.searchLoading = false;
      renderSearch();
      return;
    }
    state.searchLoading = true;
    renderSearch();
    try {
      const res = await fetch(`${API_BASE}?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          registerItems(list);
          state.searchResults = list.map((x) => getItem(x.id));
          if (autoPlayFirst && state.searchResults.length) {
            state.queue = state.searchResults.map((x) => x.id);
            playTrack(state.searchResults[0].id, true);
          }
        }
      }
    } catch (_) {
      state.searchResults = state.tracks.filter((t) => `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(q.toLowerCase()));
    } finally {
      state.searchLoading = false;
      renderSearch();
    }
  }

  // ==========================================================
  // SMOOTH CIRCULAR-RIPPLE LIGHT/DARK MODE + PALETTE SWITCHER
  // ==========================================================
  const swatchBtns = Array.from(document.querySelectorAll(".swatch-btn"));
  const paletteLabel = document.getElementById("paletteLabel");
  const modeToggleBtn = document.getElementById("modeToggleBtn");
  const modeIconSvg = document.getElementById("modeIconSvg");
  let isDarkMode = false;

  function applyMode(dark) {
    isDarkMode = !!dark;
    if (isDarkMode) document.documentElement.setAttribute("data-mode", "dark");
    else document.documentElement.removeAttribute("data-mode");
    modeToggleBtn.setAttribute("aria-pressed", String(isDarkMode));
    modeIconSvg.innerHTML = isDarkMode
      ? '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    try { localStorage.setItem("sp_player_mode", isDarkMode ? "dark" : "light"); } catch (_) {}
  }

  try {
    if (localStorage.getItem("sp_player_mode") === "dark") applyMode(true);
  } catch (_) {}

  modeToggleBtn.addEventListener("click", () => {
    const r = modeToggleBtn.getBoundingClientRect();
    document.documentElement.style.setProperty("--vt-x", `${Math.round(r.left + r.width / 2)}px`);
    document.documentElement.style.setProperty("--vt-y", `${Math.round(r.top + r.height / 2)}px`);
    if (document.startViewTransition && !reducedMotion) {
      document.startViewTransition(() => applyMode(!isDarkMode));
    } else {
      applyMode(!isDarkMode);
    }
  });

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
  // REAL URL HASH ROUTING
  // ==========================================================
  const VALID_VIEWS = ["home", "reels", "search", "podcasts", "library", "offline"];

  function navigate(view, pushHash = true) {
    if (!VALID_VIEWS.includes(view)) view = "home";
    state.view = view;
    document.querySelectorAll(".view-panel").forEach((p) => p.classList.toggle("is-active", p.id === `view-${view}`));
    document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-current", b.dataset.view === view ? "page" : "false"));
    if (pushHash && location.hash !== `#${view}`) history.pushState(null, "", `#${view}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (view === "reels") renderReel();
  }

  function handleHash() {
    const h = (location.hash || "#home").slice(1);
    if (h.startsWith("track=")) {
      const id = h.slice(6);
      if (catalogById.has(id)) {
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
  document.querySelectorAll("[data-view]").forEach((btn) => btn.addEventListener("click", () => navigate(btn.dataset.view)));

  // ==========================================================
  // RENDERERS
  // ==========================================================
  function renderTrackRowsMarkup(items) {
    if (!items.length) {
      return `<div class="empty-state">No tracks found for this filter yet.</div>`;
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
        <div class="track-thumb" data-play="${escHtml(t.id)}" style="cursor:pointer;">${artMarkup(t)}</div>
        <div class="track-info" data-play="${escHtml(t.id)}">
          <div class="track-title">${escHtml(t.title)}</div>
          <div class="track-artist">${escHtml(t.artist)}</div>
        </div>
        <div class="track-genre">${escHtml(t.genre || t.category)}</div>
        <button type="button" class="icon-btn ${liked ? "is-liked" : ""}" data-like="${escHtml(t.id)}" title="${liked ? "Unlike" : "Like"}" aria-label="Toggle like for ${escHtml(t.title)}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="${liked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-9-9a5.4 5.4 0 0 1 9-5.7A5.4 5.4 0 0 1 21 12c-2 4.5-9 9-9 9z"/></svg>
        </button>
        <button type="button" class="icon-btn ${saved ? "is-saved" : ""}" data-offline="${escHtml(t.id)}" title="${saved ? "Saved to vault" : "Save to vault"}" aria-label="Toggle saved vault for ${escHtml(t.title)}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${saved ? '<path d="M20 6L9 17l-5-5"/>' : '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 20h16"/>'}</svg>
        </button>
        <div class="track-dur">${fmtTime(t.duration)}</div>
      </div>`;
    }).join("")}</div>`;
  }

  function renderHome() {
    const hero = state.tracks[0] || SEED_TRACKS[0];
    document.getElementById("spotlightCard").innerHTML = `
      <div class="cover-art">${artMarkup(hero)}</div>
      <div>
        <div class="eyebrow">Daily Spotlight &middot; Live SoundPlus Catalog</div>
        <h1>${escHtml(hero.title)}</h1>
        <p class="spotlight-sub">${escHtml(hero.artist)} &middot; Streaming live from the SoundPlus catalog with full-bleed artwork, zero cache-purge reloads, instant search, and unified light palettes.</p>
        <div class="btn-row">
          <button type="button" class="btn-primary" data-play="${escHtml(hero.id)}">${state.currentId === hero.id && state.isPlaying ? "Pause Track" : "Play Now"}</button>
          <button type="button" class="btn-secondary" data-offline="${escHtml(hero.id)}">${state.offline.has(hero.id) ? "Downloaded" : "Download"}</button>
          <button type="button" class="btn-secondary" id="spotEqBtn">Open 5-Band EQ</button>
        </div>
      </div>`;
    document.getElementById("spotEqBtn").addEventListener("click", () => openDrawer("eq"));

    const genres = ["All", ...new Set(state.tracks.map((t) => t.genre))];
    document.getElementById("genreFilterRow").innerHTML = genres.map((g) =>
      `<button type="button" class="filter-chip" data-genre="${escHtml(g)}" aria-pressed="${state.genreFilter === g}">${escHtml(g)}</button>`
    ).join("");

    document.getElementById("mixGrid").innerHTML = state.mixes.map((m) => `
      <button type="button" class="mix-card" data-seed-mix="${escHtml(m.seedArtist || m.title)}" data-mix-name="${escHtml(m.title)}">
        <div class="cover-art">
          <div style="width:100%;height:100%;background:${escHtml(m.gradient || "linear-gradient(135deg,#3b82f6,#10b981)")};padding:14px;display:flex;flex-direction:column;justify-content:space-between;color:#fff;">
            <span class="mono" style="font-size:0.66rem;opacity:0.88;">${escHtml(m.badge || "CURATED MIX")}</span>
            <strong style="font-size:1.08rem;line-height:1.15;letter-spacing:-0.02em;">${escHtml(m.title)}</strong>
          </div>
        </div>
        <div class="mix-card-title">${escHtml(m.title)}</div>
        <div class="mix-card-meta">${escHtml(m.subtitle || "")}</div>
      </button>
    `).join("");

    const filtered = state.genreFilter === "All"
      ? state.tracks.slice(0, 18)
      : state.tracks.filter((t) => t.genre === state.genreFilter);
    document.getElementById("homeTracksTitle").textContent = state.genreFilter === "All" ? "Live SoundPlus Catalog" : `${state.genreFilter} Tracks`;
    document.getElementById("homeTracksCount").textContent = `${filtered.length} tracks`;
    document.getElementById("homeTrackList").innerHTML = renderTrackRowsMarkup(filtered);
  }

  function renderReel() {
    const list = state.tracks.length ? state.tracks : SEED_TRACKS;
    const t = list[state.reelIdx % list.length];
    hydrateAlbumArt(t);
    document.getElementById("reelGenreBadge").textContent = (t.genre || "TRENDING").toUpperCase();
    document.getElementById("reelCounter").textContent = `${String((state.reelIdx % list.length) + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}`;
    document.getElementById("reelCover").innerHTML = artMarkup(t);
    document.getElementById("reelTitle").textContent = t.title;
    document.getElementById("reelArtist").textContent = t.artist;
    document.getElementById("reelLikeBtn").classList.toggle("is-liked", state.liked.has(t.id));
    document.getElementById("reelSaveBtn").classList.toggle("is-saved", state.offline.has(t.id));
    document.getElementById("reelPlayBtn").textContent = (state.currentId === t.id && state.isPlaying) ? "Pause Track" : "Play Full Track";
  }

  function renderSearch() {
    const q = state.searchQuery.trim();
    const wrap = document.getElementById("searchResultsWrap");
    const status = document.getElementById("searchStatus");

    document.querySelectorAll("#searchScopeRow .filter-chip").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.scope === state.searchScope))
    );

    if (!q) {
      status.textContent = "Search any song, artist, or podcast live";
      wrap.innerHTML = "";
    } else if (state.searchLoading) {
      status.textContent = `Searching SoundPlus catalog for "${q}"...`;
      wrap.innerHTML = `<div class="empty-state">Fetching live results for "${escHtml(q)}"...</div>`;
    } else {
      let items = state.searchResults;
      if (state.searchScope === "podcasts") {
        items = state.podcasts.filter((p) => `${p.title} ${p.artist}`.toLowerCase().includes(q.toLowerCase()));
      } else if (state.searchScope === "artists") {
        items = state.searchResults.filter((t) => t.artist.toLowerCase().includes(q.toLowerCase()));
        if (!items.length) items = state.searchResults;
      }
      status.textContent = `${items.length} live result${items.length === 1 ? "" : "s"} for "${q}"`;
      wrap.innerHTML = items.length
        ? renderTrackRowsMarkup(items)
        : `<div class="empty-state"><strong>No matches for "${escHtml(q)}"</strong><div style="margin-top:8px;font-size:0.84rem;">Try Arijit Singh, Coldplay, SZA, The Weeknd, or Daft Punk.</div></div>`;
    }

    const genreCounts = {};
    state.tracks.forEach((t) => { genreCounts[t.genre] = (genreCounts[t.genre] || 0) + 1; });
    document.getElementById("searchGenreGrid").innerHTML = Object.entries(genreCounts).map(([g, c]) => `
      <button type="button" class="genre-tile" data-quick-search="${escHtml(g)} music">
        <strong>${escHtml(g)}</strong>
        <span>${c} live tracks</span>
      </button>
    `).join("");

    const artGrid = document.getElementById("searchArtistGrid");
    if (artGrid) {
      artGrid.innerHTML = state.artists.length
        ? state.artists.map((a) => `
          <button type="button" class="artist-card" data-quick-search="${escHtml(a.name)}">
            <img src="${escHtml(a.avatarUrl)}" alt="${escHtml(a.name)}" referrerpolicy="no-referrer" loading="lazy" />
            <strong>${escHtml(a.name)}</strong>
            <span>${escHtml(a.subscribers || "Artist")}</span>
          </button>
        `).join("")
        : `<div style="color:var(--muted);font-size:0.86rem;">Loading live artists...</div>`;
    }
  }

  function renderPodcasts() {
    const pods = state.podcasts;
    const cats = ["All", ...new Set(pods.map((p) => p.category))].slice(0, 6);
    document.getElementById("podFilterRow").innerHTML = cats.map((c) =>
      `<button type="button" class="filter-chip" data-pod-cat="${escHtml(c)}" aria-pressed="${state.podFilter === c}">${escHtml(c)}</button>`
    ).join("");

    const list = state.podFilter === "All" ? pods : pods.filter((p) => p.category === state.podFilter);
    document.getElementById("podcastGrid").innerHTML = list.length
      ? list.map((p) => `
        <article class="podcast-card">
          <div class="cover-art">${artMarkup(p)}</div>
          <div>
            <div class="eyebrow" style="margin-bottom:4px;">${escHtml(p.category)}</div>
            <strong style="font-size:0.95rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escHtml(p.title)}</strong>
            <div style="font-size:0.8rem;color:var(--muted);margin-top:5px;">${escHtml(p.artist)} &middot; ${fmtTime(p.duration)}${p.publishedDate ? " &middot; " + escHtml(p.publishedDate) : ""}</div>
          </div>
          <div class="btn-row" style="margin-top:auto;">
            <button type="button" class="btn-primary" style="height:36px;padding:0 14px;font-size:0.82rem;" data-play="${escHtml(p.id)}">
              ${state.currentId === p.id && state.isPlaying ? "Pause" : "Listen"}
            </button>
            <button type="button" class="btn-secondary" style="height:36px;padding:0 12px;font-size:0.8rem;" data-offline="${escHtml(p.id)}">
              ${state.offline.has(p.id) ? "Saved" : "Save"}
            </button>
          </div>
        </article>
      `).join("")
      : `<div class="empty-state">Loading live SoundPlus podcasts...</div>`;
  }

  function renderLibrary() {
    document.getElementById("sideLikesCount").textContent = state.liked.size;
    document.getElementById("sidebarPlaylists").innerHTML = USER_PLAYLISTS.map((pl) => `
      <button type="button" class="playlist-mini-btn" data-select-lib="${escHtml(pl.id)}">
        <span>${escHtml(pl.name)}</span>
        <span class="mono" style="font-size:0.72rem;color:var(--muted);">${pl.trackIds.length}</span>
      </button>
    `).join("");

    const cards = [
      { id: "likes", name: "Liked Songs", desc: `${state.liked.size} saved favorites`, gradient: "linear-gradient(135deg, #881337, #e11d48)" },
      ...USER_PLAYLISTS.map((p) => ({ id: p.id, name: p.name, desc: `${p.trackIds.length} tracks`, gradient: p.gradient }))
    ];
    document.getElementById("libraryPlaylistsGrid").innerHTML = cards.map((c) => `
      <button type="button" class="mix-card" data-select-lib="${escHtml(c.id)}" style="${state.activeLibraryId === c.id ? "border-color:var(--accent);" : ""}">
        <div class="cover-art">
          <div style="width:100%;height:100%;background:${escHtml(c.gradient)};padding:14px;display:flex;align-items:flex-end;color:#fff;font-weight:700;font-size:1rem;">${escHtml(c.name)}</div>
        </div>
        <div class="mix-card-title">${escHtml(c.name)}</div>
        <div class="mix-card-meta">${escHtml(c.desc)}</div>
      </button>
    `).join("");

    let items = [];
    let title = "Liked Songs";
    if (state.activeLibraryId === "likes") {
      items = [...state.liked].map(getItem).filter(Boolean);
    } else {
      const pl = USER_PLAYLISTS.find((p) => p.id === state.activeLibraryId);
      if (pl) {
        title = pl.name;
        items = pl.trackIds.map(getItem).filter(Boolean);
      }
    }
    document.getElementById("libActiveTitle").textContent = title;
    document.getElementById("libActiveCount").textContent = `${items.length} tracks`;
    document.getElementById("libraryTracksWrap").innerHTML = renderTrackRowsMarkup(items);
  }

  function renderOffline() {
    const items = [...state.offline].map(getItem).filter(Boolean);
    document.getElementById("sideOfflineCount").textContent = items.length;
    document.getElementById("offlineBannerText").textContent = items.length
      ? `${items.length} downloaded track${items.length === 1 ? "" : "s"} in your SoundPlus library, styled in the exact same design system.`
      : "No downloaded songs yet. Click the download icon on any track to save it here.";
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

    document.getElementById("dockCover").innerHTML = artMarkup(item);
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
    document.getElementById("repeatBtn").dataset.repeat = state.repeat;
    document.getElementById("videoToggleBtn").classList.toggle("is-saved", state.showVideo);
    document.getElementById("videoToggleBtn").setAttribute("aria-pressed", String(state.showVideo));

    // Spotify-Style Now Playing Lounge sync
    hydrateAlbumArt(item);
    document.getElementById("npCover").innerHTML = artMarkup(item);
    document.getElementById("npGenre").textContent = (item.genre || "NOW PLAYING").toUpperCase();
    document.getElementById("npTitle").textContent = item.title;
    document.getElementById("npArtist").textContent = item.artist;
    document.getElementById("npPlaySvg").innerHTML = playSvg;

    const isSaved = state.offline.has(item.id);
    const npOffBtn = document.getElementById("npOfflineBtn");
    npOffBtn.setAttribute("aria-pressed", String(isSaved));
    npOffBtn.title = isSaved ? "Saved in downloads (click to remove)" : "Save to downloads";
    npOffBtn.innerHTML = isSaved
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    const npVidBtn = document.getElementById("npVideoBtn");
    npVidBtn.classList.toggle("is-active", state.showVideo);
    npVidBtn.setAttribute("aria-pressed", String(state.showVideo));
    npVidBtn.title = state.showVideo ? "Hide video preview" : "Watch video preview";

    const npLike = document.getElementById("npLikeBtn");
    npLike.classList.toggle("is-liked", liked);
    npLike.querySelector("svg").setAttribute("fill", liked ? "currentColor" : "none");
    document.getElementById("npShuffleBtn").classList.toggle("is-saved", state.shuffle);
    document.getElementById("npRepeatBtn").classList.toggle("is-saved", state.repeat !== "off");
    document.getElementById("npRepeatBtn").dataset.repeat = state.repeat;

    const curIdx = state.queue.indexOf(item.id);
    const nextId = state.queue[(curIdx + 1) % Math.max(1, state.queue.length)];
    const nextItem = getItem(nextId);
    const upNext = document.getElementById("npUpNextCard");
    if (upNext && nextItem) {
      upNext.innerHTML = `
        <div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex:none;">${artMarkup(nextItem)}</div>
        <div style="min-width:0;flex:1;">
          <div class="mono" style="font-size:0.66rem;color:var(--accent);">UP NEXT</div>
          <div style="font-weight:600;font-size:0.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(nextItem.title)}</div>
          <div style="font-size:0.76rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(nextItem.artist)}</div>
        </div>
        <span class="mono" style="font-size:0.74rem;color:var(--muted);flex:none;">${fmtTime(nextItem.duration)}</span>
      `;
    }

    if (lyricsTrackId !== item.id) {
      lyricsTrackId = item.id;
      activeLyricIdx = -1;
      if (npSubpanel === "lyrics") loadSyncedLyrics(item);
    }

    updateScrubber();
    renderQueue();
  }

  function setSliderFill(el, pct) {
    if (!el) return;
    const clamped = Math.max(0, Math.min(100, pct));
    el.style.setProperty("--fill", `${clamped.toFixed(2)}%`);
  }

  function updateScrubber() {
    const dur = Math.max(1, state.duration || 210);
    const ratio = Math.max(0, Math.min(1, state.elapsed / dur));
    const pct1000 = Math.round(ratio * 1000);
    const pct100 = ratio * 100;
    const seekEl = document.getElementById("seekSlider");
    if (seekEl) {
      seekEl.value = pct1000;
      setSliderFill(seekEl, pct100);
    }
    document.getElementById("timeElapsed").textContent = fmtTime(state.elapsed);
    document.getElementById("timeDuration").textContent = fmtTime(dur);
    const npSeek = document.getElementById("npSeekSlider");
    if (npSeek) {
      npSeek.value = pct1000;
      setSliderFill(npSeek, pct100);
    }
    const dockEl = document.querySelector(".player-dock");
    if (dockEl) dockEl.style.setProperty("--dock-fill", `${pct100.toFixed(2)}%`);
    const npEl = document.getElementById("npElapsed");
    if (npEl) npEl.textContent = fmtTime(state.elapsed);
    const npDur = document.getElementById("npDuration");
    if (npDur) npDur.textContent = fmtTime(dur);
    syncActiveLyricLine();
  }

  // ==========================================================
  // SYNCED LYRICS ENGINE (LRCLIB.NET LRC + CLICK-TO-SEEK)
  // ==========================================================
  const lyricsCache = new Map();
  let lyricsTrackId = null;
  let currentLyrics = null; // { mode: "synced"|"plain"|"empty", lines: [{time,text}], source }
  let activeLyricIdx = -1;

  function parseLrc(lrcText) {
    const out = [];
    const lines = String(lrcText || "").split(/\r?\n/);
    const rx = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
    for (const raw of lines) {
      const times = [];
      let m;
      rx.lastIndex = 0;
      while ((m = rx.exec(raw)) !== null) {
        const min = Number(m[1]);
        const sec = Number(m[2]);
        const ms = m[3] ? Number(m[3].padEnd(3, "0")) / 1000 : 0;
        times.push(min * 60 + sec + ms);
      }
      const text = raw.replace(rx, "").trim();
      if (!times.length || !text) continue;
      for (const t of times) out.push({ time: t, text });
    }
    out.sort((a, b) => a.time - b.time);
    return out;
  }

  function cleanLyricsQuery(item) {
    return cleanTrackQuery(item);
  }

  async function loadSyncedLyrics(item) {
    if (!item) return;
    const statusEl = document.getElementById("npLyricsStatus");
    const listEl = document.getElementById("npLyricsList");
    if (!statusEl || !listEl) return;

    if (lyricsCache.has(item.id)) {
      currentLyrics = lyricsCache.get(item.id);
      renderLyricsList();
      return;
    }

    currentLyrics = null;
    activeLyricIdx = -1;
    statusEl.textContent = "FETCHING SYNCED LYRICS...";
    listEl.innerHTML = `<div style="padding:20px 6px;color:var(--muted);font-size:0.88rem;">Looking up timed lyrics for ${escHtml(item.title)}...</div>`;

    const { title, artist, q } = cleanLyricsQuery(item);
    try {
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let hits = await res.json();
      if ((!Array.isArray(hits) || !hits.length) && title) {
        const res2 = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}`);
        if (res2.ok) hits = await res2.json();
      }
      const arr = Array.isArray(hits) ? hits : [];
      const syncedHit = arr.find((h) => h && h.syncedLyrics && h.syncedLyrics.trim().length > 20);
      const plainHit = arr.find((h) => h && h.plainLyrics && h.plainLyrics.trim().length > 20);

      let data;
      if (syncedHit) {
        const parsed = parseLrc(syncedHit.syncedLyrics);
        data = parsed.length
          ? { mode: "synced", lines: parsed, source: `${syncedHit.artistName || artist} - ${syncedHit.trackName || title}` }
          : { mode: "plain", lines: syncedHit.plainLyrics.split(/\r?\n/).filter(Boolean).map((text) => ({ time: -1, text })), source: syncedHit.trackName || title };
      } else if (plainHit) {
        data = {
          mode: "plain",
          lines: plainHit.plainLyrics.split(/\r?\n/).filter((l) => l.trim()).map((text) => ({ time: -1, text: text.trim() })),
          source: `${plainHit.artistName || artist} - ${plainHit.trackName || title}`
        };
      } else {
        data = { mode: "empty", lines: [], source: "" };
      }

      lyricsCache.set(item.id, data);
      if (state.currentId === item.id) {
        currentLyrics = data;
        renderLyricsList();
      }
    } catch (_) {
      if (state.currentId === item.id) {
        currentLyrics = { mode: "empty", lines: [], source: "" };
        renderLyricsList();
      }
    }
  }

  function renderLyricsList() {
    const statusEl = document.getElementById("npLyricsStatus");
    const listEl = document.getElementById("npLyricsList");
    if (!statusEl || !listEl || !currentLyrics) return;

    if (currentLyrics.mode === "synced") {
      statusEl.textContent = "SYNCED LYRICS (TAP ANY LINE TO SEEK)";
      listEl.innerHTML = currentLyrics.lines.map((line, i) =>
        `<button type="button" class="np-lyric-line is-synced" data-lyric-idx="${i}" data-lyric-time="${line.time.toFixed(2)}">${escHtml(line.text)}</button>`
      ).join("");
      activeLyricIdx = -1;
      syncActiveLyricLine(true);
    } else if (currentLyrics.mode === "plain") {
      statusEl.textContent = "LYRICS (UNSYNCED)";
      listEl.innerHTML = currentLyrics.lines.map((line) =>
        `<div class="np-lyric-line is-past">${escHtml(line.text)}</div>`
      ).join("");
    } else {
      statusEl.textContent = "LYRICS UNAVAILABLE";
      listEl.innerHTML = `<div style="padding:24px 8px;color:var(--muted);font-size:0.88rem;line-height:1.55;">No timed lyrics were found for this track yet. Switch to <strong>Up Next</strong> or try another song from the catalog.</div>`;
    }
  }

  function syncActiveLyricLine(forceScroll = false) {
    if (!currentLyrics || currentLyrics.mode !== "synced" || npSubpanel !== "lyrics") return;
    const lines = currentLyrics.lines;
    if (!lines.length) return;
    const t = state.elapsed + 0.25;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= t) idx = i;
      else break;
    }
    if (idx === activeLyricIdx && !forceScroll) return;
    activeLyricIdx = idx;
    const nodes = document.querySelectorAll("#npLyricsList .np-lyric-line");
    nodes.forEach((node, i) => {
      node.classList.toggle("is-active", i === idx);
      node.classList.toggle("is-past", idx >= 0 && i < idx);
    });
    if (idx >= 0 && nodes[idx]) {
      nodes[idx].scrollIntoView({ block: "center", behavior: forceScroll ? "auto" : "smooth" });
    }
  }

  function renderQueueMarkup() {
    const curIdx = Math.max(0, state.queue.indexOf(state.currentId));
    const ordered = [
      ...state.queue.slice(curIdx),
      ...state.queue.slice(0, curIdx)
    ].slice(0, 20);
    return ordered.map((id, idx) => {
      const t = getItem(id);
      const isCur = idx === 0 && id === state.currentId;
      const head = idx === 0
        ? `<div class="np-q-label">NOW PLAYING</div>`
        : idx === 1 ? `<div class="np-q-label" style="margin-top:8px;">NEXT IN QUEUE</div>` : "";
      return `${head}<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:${isCur ? "var(--accent-soft)" : "var(--paper)"};border:1px solid ${isCur ? "color-mix(in oklch, var(--accent) 30%, transparent)" : "var(--line)"};">
        <span class="mono" style="font-size:0.72rem;color:${isCur ? "var(--accent)" : "var(--muted)"};width:18px;text-align:center;">${isCur ? "▶" : idx}</span>
        <div style="width:36px;height:36px;border-radius:8px;overflow:hidden;flex:none;cursor:pointer;" data-play="${escHtml(id)}">${artMarkup(t)}</div>
        <div style="min-width:0;flex:1;cursor:pointer;" data-play="${escHtml(id)}">
          <div style="font-weight:600;font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(t.title)}</div>
          <div style="font-size:0.75rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(t.artist)}</div>
        </div>
        <span class="mono" style="font-size:0.72rem;color:var(--muted);flex:none;">${fmtTime(t.duration)}</span>
      </div>`;
    }).join("");
  }

  function renderQueue() {
    const markup = renderQueueMarkup();
    const body = document.getElementById("queueListBody");
    if (body) body.innerHTML = markup;
    const npBody = document.getElementById("npQueueBody");
    if (npBody) npBody.innerHTML = markup;
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
  // EQUALIZER UI
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
      applyEqParams();
    });

    document.querySelectorAll("[data-eq-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = EQ_PRESETS[btn.dataset.eqPreset];
        state.eqGains = [...p.gains];
        state.bassBoost = p.bass;
        document.querySelectorAll("[data-eq-preset]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        p.gains.forEach((g, i) => {
          const inp = grid.querySelector(`[data-eq-band="${i}"]`);
          if (inp) inp.value = g;
          document.getElementById(`eqVal${i}`).textContent = `${g >= 0 ? "+" : ""}${g}dB`;
        });
        const bassEl = document.getElementById("bassBoostSlider");
        bassEl.value = p.bass;
        setSliderFill(bassEl, p.bass);
        document.getElementById("bassBoostLabel").textContent = `${p.bass}%`;
        drawEqCurve();
        applyEqParams();
      });
    });

    const bassSlider = document.getElementById("bassBoostSlider");
    setSliderFill(bassSlider, Number(bassSlider.value));
    bassSlider.addEventListener("input", (e) => {
      state.bassBoost = Number(e.target.value);
      setSliderFill(bassSlider, state.bassBoost);
      document.getElementById("bassBoostLabel").textContent = `${state.bassBoost}%`;
      applyEqParams();
    });

    document.getElementById("eqTestBeatBtn").addEventListener("click", () => {
      if (state.isTestBeat) {
        stopTestBeat();
      } else {
        if (state.isPlaying && ytReady && ytPlayer) {
          ytPlayer.pauseVideo();
          state.isPlaying = false;
        }
        ensureEqAudio();
        applyEqParams();
        state.isTestBeat = true;
        triggerBeatStep();
        beatTimer = setInterval(triggerBeatStep, 260);
        document.getElementById("eqTestBeatBtn").textContent = "Stop Beat";
        startVisualizer();
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
  // DRAWERS & IN-LOUNGE NOW PLAYING SUBPANELS
  // ==========================================================
  let activeDrawer = null;
  let npSubpanel = null; // null | "lyrics" | "queue"
  let eqOverNp = false;

  function setNpSubpanel(tab) {
    const npSheet = document.getElementById("drawer-lyrics");
    const sidePanel = document.getElementById("npSidePanel");
    const paneLyrics = document.getElementById("npPaneLyrics");
    const paneQueue = document.getElementById("npPaneQueue");
    const btnLyrics = document.getElementById("npLyricsBtn");
    const btnQueue = document.getElementById("npQueueBtn");
    const tabLyrics = document.getElementById("npTabLyrics");
    const tabQueue = document.getElementById("npTabQueue");

    npSubpanel = tab;
    const isOpen = Boolean(tab);
    npSheet.classList.toggle("has-sidepanel", isOpen);
    sidePanel.setAttribute("aria-hidden", String(!isOpen));

    paneLyrics.hidden = tab !== "lyrics";
    paneQueue.hidden = tab !== "queue";
    btnLyrics.setAttribute("aria-pressed", String(tab === "lyrics"));
    btnQueue.setAttribute("aria-pressed", String(tab === "queue"));
    tabLyrics.setAttribute("aria-selected", String(tab === "lyrics"));
    tabQueue.setAttribute("aria-selected", String(tab === "queue"));

    if (tab === "lyrics") {
      loadSyncedLyrics(getItem(state.currentId));
    } else if (tab === "queue") {
      renderQueue();
    }
  }

  function openDrawer(name, opts = {}) {
    if (name === "eq" && activeDrawer === "lyrics") {
      // Keep Now Playing open underneath when opening EQ from inside Now Playing
      eqOverNp = true;
      const backdrop = document.getElementById("drawerBackdrop");
      const eqEl = document.getElementById("drawer-eq");
      backdrop.classList.add("is-open", "is-over-np");
      eqEl.classList.add("is-open", "is-over-np");
      document.getElementById("topEqBtn").classList.add("is-active");
      return;
    }
    closeDrawers();
    const el = document.getElementById(`drawer-${name}`);
    if (!el) return;
    activeDrawer = name;
    document.getElementById("drawerBackdrop").classList.add("is-open");
    el.classList.add("is-open");
    document.getElementById("topEqBtn").classList.toggle("is-active", name === "eq");
    if (name === "lyrics" && opts.subpanel) {
      setNpSubpanel(opts.subpanel);
    }
  }

  function closeEqOverlay() {
    eqOverNp = false;
    document.getElementById("drawerBackdrop").classList.remove("is-over-np");
    document.getElementById("drawer-eq").classList.remove("is-open", "is-over-np");
    document.getElementById("topEqBtn").classList.remove("is-active");
  }

  function closeDrawers() {
    if (eqOverNp) {
      closeEqOverlay();
      return;
    }
    activeDrawer = null;
    setNpSubpanel(null);
    document.getElementById("drawerBackdrop").classList.remove("is-open", "is-over-np");
    document.querySelectorAll(".drawer-panel").forEach((p) => p.classList.remove("is-open", "is-over-np"));
    document.getElementById("topEqBtn").classList.remove("is-active");
  }

  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawers);
  document.querySelectorAll("[data-close-drawer]").forEach((b) => b.addEventListener("click", closeDrawers));
  document.getElementById("npSideCloseBtn").addEventListener("click", () => setNpSubpanel(null));
  document.querySelectorAll("[data-np-tab]").forEach((btn) => {
    btn.addEventListener("click", () => setNpSubpanel(btn.dataset.npTab));
  });
  document.getElementById("npLyricsList").addEventListener("click", (e) => {
    const lineBtn = e.target.closest("[data-lyric-time]");
    if (!lineBtn) return;
    const t = Number(lineBtn.dataset.lyricTime);
    if (!Number.isFinite(t) || t < 0) return;
    state.elapsed = Math.min(state.duration || 210, t);
    if (ytReady && ytPlayer) ytPlayer.seekTo(state.elapsed, true);
    if (!state.isPlaying) togglePlay();
    updateScrubber();
  });

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

    const quickEl = e.target.closest("[data-quick-search]");
    if (quickEl) {
      const q = quickEl.dataset.quickSearch;
      state.searchQuery = q;
      document.getElementById("globalSearch").value = q;
      navigate("search");
      runLiveSearch(q, false);
      return;
    }

    const mixEl = e.target.closest("[data-seed-mix]");
    if (mixEl) {
      const q = mixEl.dataset.seedMix;
      const name = mixEl.dataset.mixName;
      showToast(`Loading live mix: ${name}...`);
      state.searchQuery = q;
      document.getElementById("globalSearch").value = q;
      navigate("search");
      runLiveSearch(q, true);
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

  // Live Debounced Search Input
  const searchInput = document.getElementById("globalSearch");
  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value;
    if (state.view !== "search" && state.searchQuery.trim().length > 0) navigate("search");
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => runLiveSearch(state.searchQuery, false), 280);
  });

  // Transport controls (Dock + Immersive Now Playing Screen)
  document.getElementById("playBtn").addEventListener("click", togglePlay);
  document.getElementById("mobilePlayBtn").addEventListener("click", togglePlay);
  document.getElementById("npPlayBtn").addEventListener("click", togglePlay);
  document.getElementById("nextBtn").addEventListener("click", () => nextTrack(false));
  document.getElementById("npNextBtn").addEventListener("click", () => nextTrack(false));
  document.getElementById("prevBtn").addEventListener("click", prevTrack);
  document.getElementById("npPrevBtn").addEventListener("click", prevTrack);
  document.getElementById("dockLikeBtn").addEventListener("click", () => toggleLike(state.currentId));
  document.getElementById("npLikeBtn").addEventListener("click", () => toggleLike(state.currentId));
  document.querySelector(".player-dock").addEventListener("click", (e) => {
    if (e.target.closest("button, input, a, .scrub-row, .vol-wrap")) return;
    openDrawer("lyrics");
  });
  document.getElementById("npEqBtn").addEventListener("click", () => openDrawer("eq"));
  document.getElementById("npLyricsBtn").addEventListener("click", () => setNpSubpanel(npSubpanel === "lyrics" ? null : "lyrics"));
  document.getElementById("npQueueBtn").addEventListener("click", () => setNpSubpanel(npSubpanel === "queue" ? null : "queue"));
  document.getElementById("npUpNextCard").addEventListener("click", () => setNpSubpanel(npSubpanel === "queue" ? null : "queue"));
  document.getElementById("npVideoBtn").addEventListener("click", () => document.getElementById("videoToggleBtn").click());
  document.getElementById("npShuffleBtn").addEventListener("click", () => document.getElementById("shuffleBtn").click());
  document.getElementById("npRepeatBtn").addEventListener("click", () => document.getElementById("repeatBtn").click());
  document.getElementById("npSeekSlider").addEventListener("input", (e) => {
    const target = (Number(e.target.value) / 1000) * Math.max(1, state.duration);
    state.elapsed = target;
    if (ytReady && ytPlayer) ytPlayer.seekTo(target, true);
    updateScrubber();
  });

  document.getElementById("videoToggleBtn").addEventListener("click", () => {
    state.showVideo = !state.showVideo;
    document.getElementById("ytPip").classList.toggle("is-visible", state.showVideo);
    renderTransport();
  });
  document.getElementById("closeYtPip").addEventListener("click", () => {
    state.showVideo = false;
    document.getElementById("ytPip").classList.remove("is-visible");
    renderTransport();
  });

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
    const target = (Number(e.target.value) / 1000) * Math.max(1, state.duration);
    state.elapsed = target;
    if (ytReady && ytPlayer) ytPlayer.seekTo(target, true);
    updateScrubber();
  });

  const volSliderEl = document.getElementById("volSlider");
  setSliderFill(volSliderEl, state.muted ? 0 : state.volume);
  volSliderEl.addEventListener("input", (e) => {
    state.volume = Number(e.target.value);
    state.muted = state.volume === 0;
    setSliderFill(volSliderEl, state.volume);
    if (ytReady && ytPlayer) {
      ytPlayer.unMute();
      ytPlayer.setVolume(state.volume);
    }
    applyEqParams();
  });

  document.getElementById("muteBtn").addEventListener("click", () => {
    state.muted = !state.muted;
    if (ytReady && ytPlayer) {
      if (state.muted) ytPlayer.mute();
      else { ytPlayer.unMute(); ytPlayer.setVolume(state.volume); }
    }
    const v = state.muted ? 0 : state.volume;
    volSliderEl.value = v;
    setSliderFill(volSliderEl, v);
    applyEqParams();
    showToast(state.muted ? "Audio muted" : "Audio unmuted");
  });

  // Drawers
  document.getElementById("topEqBtn").addEventListener("click", () => activeDrawer === "eq" ? closeDrawers() : openDrawer("eq"));
  document.getElementById("eqDrawerBtn").addEventListener("click", () => activeDrawer === "eq" ? closeDrawers() : openDrawer("eq"));
  document.getElementById("lyricsDrawerBtn").addEventListener("click", () => {
    if (activeDrawer === "lyrics" && npSubpanel === "lyrics") closeDrawers();
    else openDrawer("lyrics", { subpanel: "lyrics" });
  });
  document.getElementById("queueDrawerBtn").addEventListener("click", () => {
    if (activeDrawer === "lyrics") setNpSubpanel(npSubpanel === "queue" ? null : "queue");
    else activeDrawer === "queue" ? closeDrawers() : openDrawer("queue");
  });
  document.getElementById("openImportBtn").addEventListener("click", () => openDrawer("import"));
  document.getElementById("libImportBtn").addEventListener("click", () => openDrawer("import"));

  // SoundReel controls
  document.getElementById("reelPrevBtn").addEventListener("click", () => {
    const n = state.tracks.length || SEED_TRACKS.length;
    state.reelIdx = (state.reelIdx - 1 + n) % n;
    renderReel();
  });
  document.getElementById("reelNextBtn").addEventListener("click", () => {
    const n = state.tracks.length || SEED_TRACKS.length;
    state.reelIdx = (state.reelIdx + 1) % n;
    renderReel();
  });
  document.getElementById("reelPlayBtn").addEventListener("click", () => {
    const list = state.tracks.length ? state.tracks : SEED_TRACKS;
    const t = list[state.reelIdx % list.length];
    if (state.currentId === t.id && state.isPlaying) togglePlay();
    else playTrack(t.id, true);
  });
  document.getElementById("reelLikeBtn").addEventListener("click", () => {
    const list = state.tracks.length ? state.tracks : SEED_TRACKS;
    toggleLike(list[state.reelIdx % list.length].id);
  });
  document.getElementById("reelSaveBtn").addEventListener("click", () => {
    const list = state.tracks.length ? state.tracks : SEED_TRACKS;
    toggleOffline(list[state.reelIdx % list.length].id);
  });
  document.getElementById("reelLyricsBtn").addEventListener("click", () => openDrawer("lyrics", { subpanel: "lyrics" }));
  document.getElementById("reelEqBtn").addEventListener("click", () => openDrawer("eq"));
  document.getElementById("reelDetailsBtn").addEventListener("click", () => openDrawer("lyrics"));

  document.getElementById("npOfflineBtn").addEventListener("click", () => toggleOffline(state.currentId));
  document.getElementById("npShareBtn").addEventListener("click", () => {
    const url = `${location.origin}${location.pathname}#track=${state.currentId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast("Copied deep link for current track");
  });

  // Sleep Timer (Off / End of track / 15m / 30m / 60m with live countdown)
  const sleepCycle = ["off", "eot", 15, 30, 60];
  state.sleepMode = "off";
  let sleepInterval = null;
  document.getElementById("sleepBtn").addEventListener("click", () => {
    const nextIdx = (sleepCycle.indexOf(state.sleepMode) + 1) % sleepCycle.length;
    state.sleepMode = sleepCycle[nextIdx];
    clearTimeout(sleepTimeout);
    clearInterval(sleepInterval);
    const valEl = document.getElementById("sleepVal");
    const btnEl = document.getElementById("sleepBtn");

    if (state.sleepMode === "off") {
      valEl.textContent = "Off";
      btnEl.classList.remove("is-active");
      showToast("Sleep timer off");
    } else if (state.sleepMode === "eot") {
      valEl.textContent = "End of track";
      btnEl.classList.add("is-active");
      showToast("Playback will pause at end of current track");
    } else {
      let remMins = state.sleepMode;
      valEl.textContent = `${remMins}m`;
      btnEl.classList.add("is-active");
      sleepInterval = setInterval(() => {
        remMins = Math.max(0, remMins - 1);
        valEl.textContent = remMins > 0 ? `${remMins}m` : "Off";
      }, 60000);
      sleepTimeout = setTimeout(() => {
        clearInterval(sleepInterval);
        state.sleepMode = "off";
        valEl.textContent = "Off";
        btnEl.classList.remove("is-active");
        if (state.isPlaying) togglePlay();
        showToast("Sleep timer paused playback");
      }, state.sleepMode * 60000);
      showToast(`Sleep timer set for ${state.sleepMode} minutes`);
    }
  });

  // Saved-only filter
  document.getElementById("simOfflineBtn").addEventListener("click", () => {
    state.simOffline = !state.simOffline;
    showToast(state.simOffline ? "Filtered to saved tracks only" : "Full catalog unlocked");
    renderAll();
  });

  // Import Playlist
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
    USER_PLAYLISTS.push({
      id,
      name: niceName,
      desc: "Imported public playlist",
      trackIds: state.tracks.slice(0, 4).map((t) => t.id),
      gradient: "linear-gradient(135deg, #1d4ed8, #4f46e5)"
    });
    state.activeLibraryId = id;
    document.getElementById("importUrlInput").value = "";
    closeDrawers();
    navigate("library");
    renderAll();
    showToast(`Imported "${niceName}"`);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "Escape") {
      if (eqOverNp) closeEqOverlay();
      else if (activeDrawer === "lyrics" && npSubpanel) setNpSubpanel(null);
      else closeDrawers();
      return;
    }
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
  loadLiveFeeds();
})();
