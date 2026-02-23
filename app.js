/* =========================
   Cosmiclock — app.js
   Big Bang +3m included
   ========================= */

const $ = (id) => document.getElementById(id);
const STORE_KEY = "sns_softnstreamalarm_final_live_v6";

/* ---------- Helpers ---------- */
function must(id){
  const el = document.getElementById(id);
  if (!el) console.warn("Missing element:", id);
  return el;
}
function pad2(n){ return String(n).padStart(2, "0"); }
function pad3(n){ return String(n).padStart(3, "0"); }
function clampInt(v, min, max, fallback){
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
function formatTimer(secTotal){
  const m = Math.floor(secTotal / 60);
  const s = secTotal % 60;
  return `${pad2(m)}:${pad2(s)}`;
}
function parseMMSS(text){
  const m = String(text || "").trim().match(/^(\d{1,3}):([0-5]\d)$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/* ---------- Alarm time steppers (iPad-safe) ---------- */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".stepBtn");
  if (!btn) return;

  const id = btn.dataset.target;
  const dir = btn.dataset.step; // "up" or "down"
  const input = document.getElementById(id);
  if (!input) return;

  const min = input.min === "" ? -Infinity : Number(input.min);
  const max = input.max === "" ?  Infinity : Number(input.max);
  const step = input.step === "" ? 1 : Number(input.step || 1);

  let val = input.value === "" ? 0 : Number(input.value);
  val = dir === "up" ? val + step : val - step;

  if (val < min) val = min;
  if (val > max) val = max;

  input.value = String(val);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});

/* ---------- Alarm display HH:MM:SS:MMM ---------- */
function formatAlarmFromInputs(){
  const h  = clampInt($("alarmHour").value, 0, 23, 7);
  const m  = clampInt($("alarmMin").value,  0, 59, 30);
  const s  = clampInt($("alarmSec").value,  0, 59, 0);
  const ms = clampInt($("alarmMs").value,   0, 999, 0);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}:${pad3(ms)}`;
}
function renderAlarmCenter(){
  const el = $("alarmCenterValue");
  if (el) el.textContent = formatAlarmFromInputs();
}

/* ---------- State ---------- */
function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  }catch{ return {}; }
}
function saveState(state){
  try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch{}
}
function snapshotState(){
  return {
    bigBangAfter3: $("bigBangAfter3") ? $("bigBangAfter3").checked : false,
    cosmic: $("cosmicSelect").value,

    alarmEnabled: $("alarmEnabled").checked,
    alarmSound: $("alarmSound").value,
    alarmHour: clampInt($("alarmHour").value, 0, 23, 7),
    alarmMin:  clampInt($("alarmMin").value,  0, 59, 30),
    alarmSec:  clampInt($("alarmSec").value,  0, 59, 0),
    alarmMs:   clampInt($("alarmMs").value,   0, 999, 0),
    alarmVol:  clampInt($("alarmVol").value,  0, 100, 80),

    ytUrl: $("ytUrl").value,
    ytVol: clampInt($("ytVol").value, 0, 100, 70),

    timerMin: clampInt($("timerMin").value, 0, 999, 5),
    timerSec: clampInt($("timerSec").value, 0, 59, 0),

    swAlarmAt: $("swAlarmAt").value,
    swAlarmOn: $("swAlarmOn").checked
  };
}

const DEFAULT_PRESET_URL = "https://www.youtube.com/watch?v=IvfolR9QOEc";

function applyState(st){
  if ($("bigBangAfter3") && typeof st.bigBangAfter3 === "boolean") {
    $("bigBangAfter3").checked = st.bigBangAfter3;
  }

  const allowedCosmic = new Set([
    "starfield-drift.mp4",
    "nebula-glow.mp4",
    "galaxy-spiral.mp4",
    "space-warp.mp4",
    "aurora-space.mp4",
  ]);
  if (st.cosmic && allowedCosmic.has(st.cosmic)) $("cosmicSelect").value = st.cosmic;

  if (typeof st.alarmEnabled === "boolean") $("alarmEnabled").checked = st.alarmEnabled;
  if (st.alarmSound) $("alarmSound").value = st.alarmSound;
  if (typeof st.alarmHour === "number") $("alarmHour").value = String(st.alarmHour);
  if (typeof st.alarmMin === "number")  $("alarmMin").value  = String(st.alarmMin);
  if (typeof st.alarmSec === "number")  $("alarmSec").value  = String(st.alarmSec);
  if (typeof st.alarmMs === "number")   $("alarmMs").value   = String(st.alarmMs);
  if (typeof st.alarmVol === "number")  $("alarmVol").value  = String(st.alarmVol);

  if (typeof st.ytUrl === "string") $("ytUrl").value = st.ytUrl;
  if (typeof st.ytVol === "number") $("ytVol").value = String(st.ytVol);

  if (typeof st.timerMin === "number") $("timerMin").value = String(st.timerMin);
  if (typeof st.timerSec === "number") $("timerSec").value = String(st.timerSec);

  if (typeof st.swAlarmAt === "string") $("swAlarmAt").value = st.swAlarmAt;
  if (typeof st.swAlarmOn === "boolean") $("swAlarmOn").checked = st.swAlarmOn;
}
applyState(loadState());

/* Preload one preset if none */
if (!$("ytUrl").value || !$("ytUrl").value.trim()){
  $("ytUrl").value = DEFAULT_PRESET_URL;
}
if ($("preset")){
  $("preset").value = DEFAULT_PRESET_URL;
}

/* Sync middle enable toggle with left enable */
const centerToggle = $("alarmEnabledCenter");
if (centerToggle){
  centerToggle.checked = $("alarmEnabled").checked;
  centerToggle.addEventListener("change", () => {
    $("alarmEnabled").checked = centerToggle.checked;
    saveState(snapshotState());
  });
  $("alarmEnabled").addEventListener("change", () => {
    centerToggle.checked = $("alarmEnabled").checked;
    saveState(snapshotState());
  });
}

/* ---------- Analog clock ticks ---------- */
function buildClockTicks(){
  const g = $("clockTicks");
  if (!g) return;
  g.innerHTML = "";

  const cx = 120, cy = 120;
  const rOuter = 96;
  for (let i=0;i<60;i++){
    const a = (i / 60) * Math.PI * 2;
    const isMajor = (i % 5 === 0);

    const len = isMajor ? 12 : 6;
    const r1 = rOuter - len;
    const r2 = rOuter;

    const x1 = cx + Math.sin(a) * r1;
    const y1 = cy - Math.cos(a) * r1;
    const x2 = cx + Math.sin(a) * r2;
    const y2 = cy - Math.cos(a) * r2;

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1.toFixed(2));
    line.setAttribute("y1", y1.toFixed(2));
    line.setAttribute("x2", x2.toFixed(2));
    line.setAttribute("y2", y2.toFixed(2));
    line.setAttribute("class", isMajor ? "tickMajor" : "tickMinor");
    g.appendChild(line);
  }
}
buildClockTicks();

function setHandRotation(el, deg){
  if (!el) return;
  el.style.transform = `rotate(${deg}deg)`;
}
function updateAnalogClock(now){
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  const hourDeg = ((h % 12) + m/60 + s/3600 + ms/3600000) * 30;
  const minDeg  = (m + s/60 + ms/60000) * 6;
  const secDeg  = (s + ms/1000) * 6;
  const msDeg   = (ms / 1000) * 360;

  setHandRotation($("handHour"), hourDeg);
  setHandRotation($("handMin"),  minDeg);
  setHandRotation($("handSec"),  secDeg);
  setHandRotation($("handMs"),   msDeg);

  const ah  = clampInt($("alarmHour").value, 0, 23, 7);
  const am  = clampInt($("alarmMin").value,  0, 59, 30);
  const as  = clampInt($("alarmSec").value,  0, 59, 0);
  const ams = clampInt($("alarmMs").value,   0, 999, 0);

  const aHourDeg = ((ah % 12) + am/60 + as/3600 + ams/3600000) * 30;
  const aMinDeg  = (am + as/60 + ams/60000) * 6;
  const aSecDeg  = (as + ams/1000) * 6;
  const aMsDeg   = (ams / 1000) * 360;

  setHandRotation($("aHandHour"), aHourDeg);
  setHandRotation($("aHandMin"),  aMinDeg);
  setHandRotation($("aHandSec"),  aSecDeg);
  setHandRotation($("aHandMs"),   aMsDeg);
}

/* ---------- Clock (digital) ---------- */
function tickClock(){
  const now = new Date();
  $("clockTime").textContent =
    `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}:${pad3(now.getMilliseconds())}`;
  const opts = { weekday:"short", year:"numeric", month:"short", day:"2-digit" };
  $("clockDate").textContent = now.toLocaleDateString(undefined, opts);
  renderAlarmCenter();
  updateAnalogClock(now);
}
setInterval(tickClock, 33);
tickClock();
["alarmHour","alarmMin","alarmSec","alarmMs"].forEach(id => {
  $(id).addEventListener("input", () => { renderAlarmCenter(); saveState(snapshotState()); });
});
renderAlarmCenter();

/* ---------- Cosmic mp4 background selector ---------- */
function setCosmicVideo(filename){
  const v = $("bgVideo");
  if (!v) return;
  v.src = filename;
  v.load();
  const p = v.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}
$("cosmicSelect").addEventListener("change", () => {
  setCosmicVideo($("cosmicSelect").value);
  saveState(snapshotState());
});
setCosmicVideo($("cosmicSelect").value);

/* ---------- WebAudio: alarm volume ---------- */
let audioCtx = null;
let masterGain = null;
let alarmGain = null;

function uiCurve(x01){ return Math.pow(Math.max(0, Math.min(1, x01)), 1.55); }
function alarmUISliderToGain(vPct){
  const x = Math.max(0, Math.min(100, vPct)) / 100;
  const shaped = uiCurve(x);
  return Math.max(0.0001, shaped * 1.75);
}
function ensureAudio(){
  if (!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(audioCtx.destination);

    alarmGain = audioCtx.createGain();
    alarmGain.gain.value = alarmUISliderToGain(clampInt($("alarmVol").value, 0, 100, 80));
    alarmGain.connect(masterGain);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}
function syncAlarmVolumeUI(){
  const v = clampInt($("alarmVol").value, 0, 100, 80);
  $("alarmVolPct").textContent = `${v}%`;
  if (alarmGain) alarmGain.gain.value = alarmUISliderToGain(v);
}
$("alarmVol").addEventListener("input", () => { syncAlarmVolumeUI(); saveState(snapshotState()); });
syncAlarmVolumeUI();

/* ---------- Alarm synth ---------- */
let activeNodes = [];
let alarmPlaying = false;

function stopSound(){
  alarmPlaying = false;
  for (const n of activeNodes){
    try { n.stop?.(); } catch {}
    try { n.disconnect?.(); } catch {}
  }
  activeNodes = [];
}

function playToneProfile(profile){
  ensureAudio();
  stopSound();
  alarmPlaying = true;

  const tNow = audioCtx.currentTime;
  const uiV = clampInt($("alarmVol").value, 0, 100, 80);
  const base = alarmUISliderToGain(uiV);

  alarmGain.gain.cancelScheduledValues(tNow);
  alarmGain.gain.setValueAtTime(Math.max(0.0001, base * 0.18), tNow);
  alarmGain.gain.exponentialRampToValueAtTime(base, tNow + 0.18);

  const delay = audioCtx.createDelay(0.8);
  delay.delayTime.value = 0.20;
  const fb = audioCtx.createGain();
  fb.gain.value = 0.18;
  const wet = audioCtx.createGain();
  wet.gain.value = 0.34;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(alarmGain);

  const chorusDelay = audioCtx.createDelay(0.05);
  chorusDelay.delayTime.value = 0.012;
  const chorusWet = audioCtx.createGain();
  chorusWet.gain.value = 0.24;

  const lfo = audioCtx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.28;
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 0.006;
  lfo.connect(lfoGain).connect(chorusDelay.delayTime);
  lfo.start();

  chorusDelay.connect(chorusWet).connect(alarmGain);
  activeNodes.push(delay, fb, wet, chorusDelay, chorusWet, lfo, lfoGain);

  const sendToDelay = (node, amount=0.14) => {
    const s = audioCtx.createGain();
    s.gain.value = amount;
    node.connect(s).connect(delay);
    activeNodes.push(s);
  };
  const sendToChorus = (node, amount=0.14) => {
    const s = audioCtx.createGain();
    s.gain.value = amount;
    node.connect(s).connect(chorusDelay);
    activeNodes.push(s);
  };

  const mkOsc = (type, freq, start, dur, gain, detune=0) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    o.detune.setValueAtTime(detune, start);

    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    o.connect(g).connect(alarmGain);
    sendToDelay(g, 0.14);
    sendToChorus(g, 0.14);

    o.start(start);
    o.stop(start + dur + 0.05);
    activeNodes.push(o, g);
  };

  const mkNoise = (start, dur, gain) => {
    const bufferSize = Math.floor(audioCtx.sampleRate * dur);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2 - 1) * 0.20;

    const src = audioCtx.createBufferSource();
    src.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, start);

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.10);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(filter).connect(g).connect(alarmGain);
    sendToDelay(g, 0.10);

    src.start(start);
    src.stop(start + dur + 0.05);

    activeNodes.push(src, filter, g);
  };

  const scheduleBlock = (t0) => {
    if (!alarmPlaying) return;

    if (profile === "chime"){
      mkOsc("sine", 880,   t0 + 0.00, 0.95, 0.18);
      mkOsc("sine", 1320,  t0 + 0.03, 0.85, 0.11);
      mkOsc("triangle", 660, t0 + 1.05, 1.05, 0.14);
      mkOsc("sine", 990,   t0 + 1.12, 0.85, 0.085);
      mkOsc("sine", 1760,  t0 + 0.02, 0.55, 0.034, +4);
      mkOsc("sine", 2640,  t0 + 0.05, 0.42, 0.020, -3);
      mkOsc("sine", 3520,  t0 + 0.06, 0.30, 0.010, +2);
      mkNoise(t0 + 0.08, 0.35, 0.030);
    }
    if (profile === "bells"){
      mkOsc("sine", 523.25, t0 + 0.00, 1.25, 0.16);
      mkOsc("sine", 784.88, t0 + 0.02, 1.15, 0.10);
      mkOsc("sine", 1046.5, t0 + 0.05, 1.00, 0.065);
      mkOsc("sine", 1567.98, t0 + 0.06, 0.75, 0.026, +5);
      mkOsc("sine", 2093.00, t0 + 0.09, 0.60, 0.018, -4);
      mkOsc("sine", 2793.00, t0 + 0.10, 0.50, 0.012, +2);
      mkOsc("sine", 659.25, t0 + 1.25, 1.10, 0.12);
      mkOsc("sine", 988.0,  t0 + 1.30, 1.00, 0.065);
    }
    if (profile === "ocean"){
      mkNoise(t0 + 0.00, 2.2, 0.12);
      mkOsc("sine", 110, t0 + 0.00, 2.2, 0.05);
      mkOsc("sine", 165, t0 + 0.00, 2.2, 0.020);
      mkNoise(t0 + 2.0, 2.0, 0.10);
    }
    if (profile === "dawn"){
      mkOsc("sine", 220,    t0 + 0.00, 3.8, 0.055);
      mkOsc("sine", 277.18, t0 + 0.00, 3.8, 0.050);
      mkOsc("sine", 329.63, t0 + 0.00, 3.8, 0.045);
      mkOsc("triangle", 440, t0 + 0.25, 2.8, 0.032);
      mkOsc("sine", 660, t0 + 0.40, 2.2, 0.016);
    }
    if (profile === "goldBells"){
      mkOsc("sine", 440, t0 + 0.00, 1.35, 0.10, -6);
      mkOsc("sine", 440, t0 + 0.00, 1.35, 0.10, +6);
      mkOsc("sine", 660, t0 + 0.03, 1.10, 0.060);
      mkOsc("sine", 880, t0 + 0.05, 0.95, 0.042);
      mkOsc("sine", 1320, t0 + 0.07, 0.70, 0.022);
      mkOsc("sine", 1760, t0 + 0.09, 0.55, 0.016);
      mkOsc("sine", 2640, t0 + 0.11, 0.45, 0.010);
      mkOsc("triangle", 330, t0 + 1.40, 1.25, 0.085);
      mkOsc("sine", 495, t0 + 1.44, 1.05, 0.050);
    }
    if (profile === "crystal"){
      mkOsc("sine", 1174.66, t0 + 0.00, 1.05, 0.10);
      mkOsc("sine", 1567.98, t0 + 0.02, 0.95, 0.058);
      mkOsc("sine", 2349.32, t0 + 0.06, 0.65, 0.022);
      mkNoise(t0 + 0.08, 0.35, 0.030);
      mkOsc("sine", 987.77,  t0 + 1.05, 1.10, 0.082);
      mkOsc("sine", 1318.51, t0 + 1.08, 1.00, 0.052);
      mkOsc("sine", 1760.00, t0 + 2.20, 0.95, 0.050);
    }
    if (profile === "harp"){
      mkOsc("triangle", 392.00, t0 + 0.00, 1.25, 0.10);
      mkOsc("sine",     784.00, t0 + 0.02, 1.05, 0.040);
      mkOsc("triangle", 329.63, t0 + 1.18, 1.25, 0.095);
      mkOsc("sine",     659.25, t0 + 1.20, 1.00, 0.035);
      mkOsc("triangle", 440.00, t0 + 2.35, 1.15, 0.090);
      mkOsc("sine",     880.00, t0 + 2.37, 0.95, 0.030);
      mkOsc("sine",     1320.0, t0 + 0.04, 0.60, 0.018);
    }

    setTimeout(() => scheduleBlock(t0 + 4.0), 3500);
  };

  scheduleBlock(tNow);
}

/* =========================================================
   BIG BANG +3m (NEW)
   - scheduled when alarm triggers if checkbox enabled
   - cancelled on stop/sleep
   - plays impact + bass + flash + extra burst
   ========================================================= */
let bigBangTimeout = null;
let bigBangFired = false;

function cancelBigBang(){
  if (bigBangTimeout) clearTimeout(bigBangTimeout);
  bigBangTimeout = null;
  bigBangFired = false;
  document.body.classList.remove("bigbang");
}

function triggerBigBangNow(){
  if (bigBangFired) return;
  bigBangFired = true;

  // Only if we’re still ringing / playing
  if (!alarmPlaying || !document.body.classList.contains("alarm-ringing")) return;

  ensureAudio();

  // Visual flash + particles
  document.body.classList.add("bigbang");
  setTimeout(() => document.body.classList.remove("bigbang"), 650);

  fxBoost = 1.0;
  spawnAlarmBurst();
  spawnAlarmBurst(); // double burst feels more “impact”
  spawnAlarmBurst();

  // Audio “impact”
  const t0 = audioCtx.currentTime;
  const uiV = clampInt($("alarmVol").value, 0, 100, 80);
  const base = alarmUISliderToGain(uiV);

  // Dedicated bang bus so we don’t destroy current alarm synth mix
  const bangGain = audioCtx.createGain();
  bangGain.gain.setValueAtTime(Math.max(0.0001, base * 1.15), t0);
  bangGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
  bangGain.connect(alarmGain);
  activeNodes.push(bangGain);

  // Sub-bass drop
  const sub = audioCtx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(72, t0);
  sub.frequency.exponentialRampToValueAtTime(24, t0 + 0.55);

  const subG = audioCtx.createGain();
  subG.gain.setValueAtTime(0.0001, t0);
  subG.gain.exponentialRampToValueAtTime(base * 0.95, t0 + 0.03);
  subG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.85);

  sub.connect(subG).connect(bangGain);
  sub.start(t0);
  sub.stop(t0 + 0.95);
  activeNodes.push(sub, subG);

  // Crack / impact noise
  const dur = 0.38;
  const bufferSize = Math.floor(audioCtx.sampleRate * dur);
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<bufferSize;i++){
    // sharper at start
    const env = Math.pow(1 - i / bufferSize, 2.2);
    data[i] = (Math.random()*2 - 1) * env;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;

  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.setValueAtTime(420, t0);

  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4200, t0);

  const nG = audioCtx.createGain();
  nG.gain.setValueAtTime(0.0001, t0);
  nG.gain.exponentialRampToValueAtTime(base * 0.75, t0 + 0.01);
  nG.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.40);

  src.connect(hp).connect(lp).connect(nG).connect(bangGain);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
  activeNodes.push(src, hp, lp, nG);
}

function scheduleBigBangIfEnabled(){
  cancelBigBang();
  if (!$("bigBangAfter3") || !$("bigBangAfter3").checked) return;

  // schedule for +180s after alarm begins
  bigBangTimeout = setTimeout(() => {
    triggerBigBangNow();
  }, 180000);
}

/* ---------- FX Canvas: idle + alarm “ALL effects” ---------- */
const canvas = $("fxCanvas");
const ctx = canvas.getContext("2d");

let fxStart = performance.now();
let stars = [];
let streaks = [];
let comets = [];
let bursts = [];
let fxBoost = 0;
let fxAllMode = false;

function resizeCanvas(){
  canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
  canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  initFx();
}
window.addEventListener("resize", resizeCanvas);

function initFx(){
  const W = canvas.width, H = canvas.height;

  const starCount = Math.min(4200, Math.floor((W*H)/(190000)));
  stars = [];
  for (let i=0;i<starCount;i++){
    stars.push({
      x: Math.random()*W,
      y: Math.random()*H,
      r: (Math.random()*2.0 + 0.35) * devicePixelRatio,
      a: Math.random()*0.95 + 0.05,
      tw: Math.random()*3.0 + 0.6
    });
  }

  const streakCount = Math.min(360, Math.floor((W*H)/(1700000)));
  streaks = [];
  for (let i=0;i<streakCount;i++){
    streaks.push({
      x: Math.random()*W,
      y: Math.random()*H,
      len: (Math.random()*200 + 70) * devicePixelRatio,
      sp: (Math.random()*1000 + 380) * devicePixelRatio,
      a: Math.random()*0.42 + 0.10
    });
  }

  const cometCount = Math.min(70, Math.floor((W*H)/(4500000)));
  comets = [];
  for (let i=0;i<cometCount;i++){
    comets.push({
      x: Math.random()*W,
      y: Math.random()*H,
      vx: (Math.random()*0.8 + 0.25) * devicePixelRatio,
      vy: (Math.random()*2.2 + 0.8) * devicePixelRatio,
      len: (Math.random()*220 + 120) * devicePixelRatio,
      a: Math.random()*0.45 + 0.10
    });
  }
}
resizeCanvas();

function spawnAlarmBurst(){
  const W = canvas.width, H = canvas.height;
  const cx = W*0.5, cy = H*0.45;

  fxBoost = 1.0;

  const count = 480;
  for (let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2;
    const sp = (Math.random()*10.0 + 2.0) * devicePixelRatio;
    bursts.push({
      x: cx, y: cy,
      vx: Math.cos(ang)*sp,
      vy: Math.sin(ang)*sp,
      life: 1.0,
      r: (Math.random()*2.8 + 1.0) * devicePixelRatio
    });
  }
}

function nebulaCloud(t, alphaMul){
  const W = canvas.width, H = canvas.height;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = (0.52 + fxBoost*0.20) * alphaMul;

  const cx = W*(0.5 + 0.06*Math.sin(t*0.22));
  const cy = H*(0.35 + 0.06*Math.cos(t*0.18));
  const r = Math.max(W,H)*0.70;

  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0.00, "rgba(175,110,255,0.30)");
  g.addColorStop(0.32, "rgba(255,206,105,0.18)");
  g.addColorStop(0.58, "rgba(120,70,200,0.16)");
  g.addColorStop(1.00, "rgba(0,0,0,0.00)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  const g2 = ctx.createRadialGradient(W*0.65, H*0.55, 0, W*0.65, H*0.55, r*0.85);
  g2.addColorStop(0.00, "rgba(255,206,105,0.22)");
  g2.addColorStop(0.38, "rgba(175,110,255,0.20)");
  g2.addColorStop(1.00, "rgba(0,0,0,0.00)");
  ctx.fillStyle = g2;
  ctx.fillRect(0,0,W,H);

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function aurora(t, alphaMul){
  const W = canvas.width, H = canvas.height;
  ctx.globalCompositeOperation = "screen";
  for (let i=0;i<3;i++){
    const y0 = H*(0.14 + i*0.16);
    const amp = (105 + i*34) * devicePixelRatio * (1.0 + fxBoost*0.30);
    const speed = 0.9 + i*0.28;

    const grad = ctx.createLinearGradient(0, y0-amp, 0, y0+amp);
    grad.addColorStop(0, "rgba(175,110,255,0.0)");
    grad.addColorStop(0.25, "rgba(175,110,255,0.55)");
    grad.addColorStop(0.58, "rgba(255,206,105,0.44)");
    grad.addColorStop(1, "rgba(175,110,255,0.0)");
    ctx.fillStyle = grad;

    ctx.globalAlpha = (0.48 + fxBoost*0.18) * alphaMul;
    ctx.beginPath();
    ctx.moveTo(0, y0);
    for (let x=0; x<=W; x += W/26){
      const yy = y0 + Math.sin((x/W)*Math.PI*2 + t*speed) * amp;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(W, y0 + amp*2);
    ctx.lineTo(0, y0 + amp*2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function ripples(t, alphaMul){
  const W = canvas.width, H = canvas.height;
  const cx = W*0.5, cy = H*0.58;
  const Rmax = Math.min(W,H)*0.70;

  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 2.2 * devicePixelRatio;

  for (let i=0;i<10;i++){
    const r = (t*160*devicePixelRatio + i*100*devicePixelRatio) % Rmax;
    ctx.globalAlpha = (0.40 + fxBoost*0.14) * (1 - r/Rmax) * alphaMul;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function vignettePulse(t, alphaMul){
  const W = canvas.width, H = canvas.height;
  const a = (0.32 + 0.14*Math.sin(t*1.25)) + fxBoost*0.10;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = a * alphaMul;
  const g = ctx.createRadialGradient(W*0.5, H*0.45, 0, W*0.5, H*0.45, Math.max(W,H)*0.90);
  g.addColorStop(0, "rgba(255,206,105,0.26)");
  g.addColorStop(0.46, "rgba(175,110,255,0.20)");
  g.addColorStop(1, "rgba(0,0,0,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawStars(t, alphaMul){
  ctx.globalCompositeOperation = "screen";
  for (const s of stars){
    const tw = 0.35 + 0.65*Math.sin(t*s.tw + s.x*0.0009 + s.y*0.0007);
    ctx.globalAlpha = s.a * tw * (0.66 + fxBoost*0.16) * alphaMul;
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawWarp(alphaMul){
  const W = canvas.width, H = canvas.height;
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(255,206,105,0.60)";
  ctx.lineWidth = 1.5 * devicePixelRatio;

  const speedMul = 1.0 + fxBoost*0.30;

  for (const st of streaks){
    st.y += st.sp * 0.016 * speedMul;
    if (st.y > H + 60) { st.y = -60; st.x = Math.random()*W; }
    ctx.globalAlpha = st.a * (1.0 + fxBoost*0.30) * alphaMul;
    ctx.beginPath();
    ctx.moveTo(st.x, st.y);
    ctx.lineTo(st.x, st.y - st.len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawComets(alphaMul){
  const W = canvas.width, H = canvas.height;
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(175,110,255,0.55)";
  ctx.lineWidth = 1.9 * devicePixelRatio;

  const speedMul = 1.0 + fxBoost*0.40;

  for (const c of comets){
    c.x += c.vx * 60 * 0.016 * speedMul;
    c.y += c.vy * 60 * 0.016 * speedMul;
    if (c.y > H + 80 || c.x > W + 80){
      c.x = -80;
      c.y = Math.random()*H*0.7;
    }
    ctx.globalAlpha = c.a * (0.58 + fxBoost*0.30) * alphaMul;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x - c.len*0.16, c.y - c.len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawGlitter(t, alphaMul){
  const W = canvas.width, H = canvas.height;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = (0.22 + fxBoost*0.08) * alphaMul;
  ctx.fillStyle = "rgba(255,206,105,1)";
  const count = 46;
  for (let i=0;i<count;i++){
    const x = (Math.sin(t*0.85 + i)*0.5+0.5)*W;
    const y = (Math.cos(t*1.10 + i*1.25)*0.5+0.5)*H;
    ctx.beginPath();
    ctx.arc(x, y, (Math.random()*2.4+0.9)*devicePixelRatio, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawBursts(){
  if (bursts.length === 0) return;
  ctx.globalCompositeOperation = "screen";
  for (const b of bursts){
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= 0.985;
    b.vy *= 0.985;
    b.life -= 0.012;

    ctx.globalAlpha = Math.max(0, b.life) * (0.95 + fxBoost*0.18);
    ctx.fillStyle = "rgba(255,206,105,1)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }
  bursts = bursts.filter(b => b.life > 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function renderFx(ts){
  const t = (ts - fxStart) / 1000;
  fxBoost = Math.max(0, fxBoost - 0.006);

  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  const idleAlpha = 0.70;
  drawStars(t, idleAlpha);
  vignettePulse(t, idleAlpha);
  nebulaCloud(t, 0.55);

  if (fxAllMode){
    drawStars(t, 1.0);
    vignettePulse(t, 1.0);
    nebulaCloud(t, 1.0);
    aurora(t, 1.0);
    drawWarp(1.0);
    ripples(t, 1.0);
    drawGlitter(t, 1.0);
    drawComets(1.0);
  }

  drawBursts();
  requestAnimationFrame(renderFx);
}
requestAnimationFrame(renderFx);

/* ---------- YouTube IFrame API ---------- */
let ytPlayer = null;
let pendingYTVideoId = null;

function parseYouTubeId(url){
  try{
    const u = new URL(String(url).trim());
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx+1]) return parts[embedIdx+1];
    }
    return null;
  }catch{ return null; }
}

function createYTPlayer(videoId, autoplay){
  const v = clampInt($("ytVol").value, 0, 100, 70);
  ytPlayer = new YT.Player("ytPlayer", {
    videoId,
    playerVars: { autoplay: autoplay ? 1 : 0, rel: 0, modestbranding: 1 },
    events: {
      onReady: () => {
        try{ ytPlayer.setVolume(v); }catch{}
        $("ytVolPct").textContent = `${v}%`;
      }
    }
  });
}

window.onYouTubeIframeAPIReady = function(){
  if (pendingYTVideoId) createYTPlayer(pendingYTVideoId, false);
};

function setYouTubeEmbed(url, { autoplay=false } = {}){
  const wrap = $("ytEmbed");
  const id = parseYouTubeId(url || "");
  if (!id){
    wrap.innerHTML = `<div>Paste a valid YouTube URL to embed</div>`;
    pendingYTVideoId = null;
    ytPlayer = null;
    return;
  }
  wrap.innerHTML = `<div id="ytPlayer"></div>`;
  pendingYTVideoId = id;
  if (window.YT && YT.Player) createYTPlayer(id, autoplay);
}

function syncYTVolumeUI(){
  const v = clampInt($("ytVol").value, 0, 100, 70);
  $("ytVolPct").textContent = `${v}%`;
  if (ytPlayer && typeof ytPlayer.setVolume === "function"){
    try{ ytPlayer.setVolume(v); }catch{}
  }
}
$("ytVol").addEventListener("input", () => { syncYTVolumeUI(); saveState(snapshotState()); });
syncYTVolumeUI();

$("preset").addEventListener("change", (e) => {
  const v = e.target.value || "";
  if (!v) return;
  $("ytUrl").value = v;
  saveState(snapshotState());
  setYouTubeEmbed(v, { autoplay: false });
});
$("loadEmbed").addEventListener("click", () => {
  const v = $("ytUrl").value || "";
  setYouTubeEmbed(v, { autoplay: false });
  saveState(snapshotState());
});

/* Preloaded embed */
$("ytEmbed").innerHTML = `<div>Paste a valid YouTube URL to embed</div>`;
if ($("ytUrl").value && parseYouTubeId($("ytUrl").value)){
  setYouTubeEmbed($("ytUrl").value, { autoplay: false });
}

/* ---------- Alarm ringing UX (Sleep button + shake 30s) ---------- */
let ringTimeout = null;

function startRingingUX(){
  document.body.classList.add("alarm-ringing");
  fxAllMode = true;
  fxBoost = 1.0;

  const btn = $("sleepBtn");
  if (btn) btn.classList.add("show");

  if (ringTimeout) clearTimeout(ringTimeout);
  ringTimeout = setTimeout(() => {
    document.body.classList.remove("alarm-ringing");
    fxAllMode = false;
    const b = $("sleepBtn");
    if (b) b.classList.remove("show");
  }, 30000);
}

function stopRingingUX(){
  if (ringTimeout) clearTimeout(ringTimeout);
  ringTimeout = null;
  document.body.classList.remove("alarm-ringing");
  fxAllMode = false;
  const btn = $("sleepBtn");
  if (btn) btn.classList.remove("show");
}

function stopAlarmEverywhere(){
  cancelBigBang();
  stopSound();
  stopRingingUX();
}

$("sleepBtn").addEventListener("click", stopAlarmEverywhere);

/* ---------- Alarm trigger + scheduled alarm ---------- */
function getAlarmTargetFromInputs(){
  return {
    hour: clampInt($("alarmHour").value, 0, 23, 7),
    min:  clampInt($("alarmMin").value, 0, 59, 30),
    sec:  clampInt($("alarmSec").value, 0, 59, 0),
    ms:   clampInt($("alarmMs").value,  0, 999, 0)
  };
}

function triggerAlarm({ autoplayVideo=true } = {}){
  if (!$("alarmEnabled").checked) return;
  ensureAudio();

  cancelBigBang();              // reset previous
  spawnAlarmBurst();
  startRingingUX();
  playToneProfile($("alarmSound").value);

  // schedule Big Bang +3m if enabled
  scheduleBigBangIfEnabled();

  const url = $("ytUrl").value;
  if (url && url.trim()){
    setYouTubeEmbed(url, { autoplay: autoplayVideo });
  }
}

$("testAlarm").addEventListener("click", () => triggerAlarm({ autoplayVideo: false }));
$("stopAlarm").addEventListener("click", stopAlarmEverywhere);

let scheduledToken = null;
function checkScheduledAlarm(){
  if (!$("alarmEnabled").checked) return;

  const t = getAlarmTargetFromInputs();
  const now = new Date();

  const match =
    now.getHours() === t.hour &&
    now.getMinutes() === t.min &&
    now.getSeconds() === t.sec &&
    Math.abs(now.getMilliseconds() - t.ms) <= 35;

  if (!match) return;

  const token = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${t.hour}:${t.min}:${t.sec}:${t.ms}`;
  if (scheduledToken === token) return;
  scheduledToken = token;

  triggerAlarm({ autoplayVideo: true });
}
setInterval(checkScheduledAlarm, 25);

/* ---------- Timer ---------- */
let timerInterval = null;
let timerRemaining = 0;
let timerTotal = 0;
let timerRunning = false;

function getPieCircumference(){
  const fg = must("pieFg");
  const r = Number.parseFloat(fg.getAttribute("r") || "0");
  return 2 * Math.PI * r;
}
function setPieProgress(pct){
  const clamped = Math.max(0, Math.min(1, pct));
  const fg = must("pieFg");
  const C = getPieCircumference();
  fg.style.strokeDasharray = String(C);
  fg.style.strokeDashoffset = String(C * (1 - clamped));
  $("piePct").textContent = `${Math.round(clamped * 100)}%`;
  const liquid = $("fillLiquid");
  if (liquid) liquid.style.height = `${Math.round(clamped * 100)}%`;
}
function syncTimerDisplay(){
  $("timerDisplay").textContent = formatTimer(timerRemaining);
  if (timerTotal > 0){
    const done = (timerTotal - timerRemaining) / timerTotal;
    setPieProgress(done);
  } else setPieProgress(0);
}
function loadTimerFromInputs(){
  const m = clampInt($("timerMin").value, 0, 999, 5);
  const s = clampInt($("timerSec").value, 0, 59, 0);
  timerRemaining = m * 60 + s;
  timerTotal = timerRemaining;
  syncTimerDisplay();
  saveState(snapshotState());
}
function stopTimerInterval(){
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerRunning = false;
}
$("timerStart").addEventListener("click", () => {
  ensureAudio();
  if (timerRunning) return;
  if (timerRemaining <= 0) loadTimerFromInputs();
  if (timerRemaining <= 0) return;

  timerRunning = true;
  syncTimerDisplay();

  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    if (timerRemaining <= 0){
      timerRemaining = 0;
      syncTimerDisplay();
      stopTimerInterval();
      triggerAlarm({ autoplayVideo: true });
      return;
    }
    syncTimerDisplay();
  }, 1000);
});
$("timerPause").addEventListener("click", stopTimerInterval);
$("timerReset").addEventListener("click", () => { stopTimerInterval(); loadTimerFromInputs(); });
$("timerMin").addEventListener("change", loadTimerFromInputs);
$("timerSec").addEventListener("change", loadTimerFromInputs);
loadTimerFromInputs();

/* ---------- Stopwatch + hex flower ---------- */
let swInterval = null;
let swRunning = false;
let swStartTs = 0;
let swElapsed = 0;
let lapCount = 0;
let swAlarmFired = false;

function formatStopwatch(ms){
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSec = Math.floor(totalTenths / 10);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  return `${pad2(min)}:${pad2(sec)}.${tenths}`;
}
function buildHexFlowerPath(cx, cy, innerR, outerR){
  const pts = [];
  for (let i = 0; i < 12; i++){
    const ang = (Math.PI * 2) * (i / 12);
    const r = (i % 2 === 0) ? outerR : innerR;
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
  for (let i=1;i<pts.length;i++) d += `L ${pts[i][0].toFixed(2)} ${pts[i][1].toFixed(2)} `;
  return d + "Z";
}
function setPathStrokeProgress(pathEl, pct01){
  const p = Math.max(0, Math.min(1, pct01));
  const len = pathEl.getTotalLength();
  pathEl.style.strokeDasharray = String(len);
  pathEl.style.strokeDashoffset = String(len * (1 - p));
}
(function initStopwatchFlower(){
  const bg = $("swFlowerBg");
  const fg = $("swFlowerFg");
  const d = buildHexFlowerPath(110, 110, 62, 86);
  bg.setAttribute("d", d);
  fg.setAttribute("d", d);
  setPathStrokeProgress(fg, 0);
})();
function setFlowerRotationDegrees(deg){
  const svg = document.querySelector(".swFlowerSvg");
  if (!svg) return;
  svg.style.transform = `rotate(${deg}deg)`;
}
function renderStopwatch(){
  $("swDisplay").textContent = formatStopwatch(swElapsed);

  const targetSec = parseMMSS($("swAlarmAt").value);
  const shouldUseTarget = $("swAlarmOn").checked && targetSec !== null && targetSec > 0;

  let pct = 0;
  if (shouldUseTarget){
    pct = Math.max(0, Math.min(1, (swElapsed/1000) / targetSec));
  } else {
    pct = ((swElapsed/1000) % 60) / 60;
  }

  setPathStrokeProgress($("swFlowerFg"), pct);
  $("swFlowerPct").textContent = `${Math.round(pct * 100)}%`;

  const base = -90 + (pct * 360);
  const gentleSpin = swRunning ? ((swElapsed / 1000) * 8) : 0;
  setFlowerRotationDegrees(base + gentleSpin);

  if (shouldUseTarget && !swAlarmFired){
    if (Math.floor(swElapsed / 1000) >= targetSec){
      swAlarmFired = true;
      triggerAlarm({ autoplayVideo: true });
    }
  }
}
$("swStart").addEventListener("click", () => {
  ensureAudio();
  if (!swRunning){
    swRunning = true;
    $("swStart").textContent = "Pause";
    swStartTs = performance.now() - swElapsed;
    swInterval = setInterval(() => {
      swElapsed = performance.now() - swStartTs;
      renderStopwatch();
    }, 100);
  } else {
    swRunning = false;
    $("swStart").textContent = "Start";
    clearInterval(swInterval);
    renderStopwatch();
  }
});
$("swLap").addEventListener("click", () => {
  if (!swRunning) return;
  lapCount += 1;
  const li = document.createElement("li");
  li.textContent = `Lap ${lapCount}: ${formatStopwatch(swElapsed)}`;
  $("lapList").prepend(li);
});
$("swReset").addEventListener("click", () => {
  swRunning = false;
  $("swStart").textContent = "Start";
  clearInterval(swInterval);
  swElapsed = 0;
  lapCount = 0;
  swAlarmFired = false;
  $("lapList").innerHTML = "";
  renderStopwatch();
});
$("swAlarmAt").addEventListener("change", () => { swAlarmFired = false; saveState(snapshotState()); });
$("swAlarmOn").addEventListener("change", () => { swAlarmFired = false; saveState(snapshotState()); });
renderStopwatch();

/* ---------- Save on input ---------- */
[
  "bigBangAfter3",
  "cosmicSelect",
  "alarmEnabled","alarmSound","alarmHour","alarmMin","alarmSec","alarmMs","alarmVol",
  "ytUrl","preset","ytVol",
  "timerMin","timerSec",
  "swAlarmAt","swAlarmOn"
].forEach(id => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", () => saveState(snapshotState()));
});

/* ---------- Final UI sync ---------- */
syncAlarmVolumeUI();
syncYTVolumeUI();
renderAlarmCenter();