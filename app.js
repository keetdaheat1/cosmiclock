"use strict";

/* ---------------------------
   Helpers
--------------------------- */
const $ = (id) => document.getElementById(id);

function pad2(n){ return String(n).padStart(2, "0"); }
function pad3(n){ return String(n).padStart(3, "0"); }

function fmtClock(d){
  const h = pad2(d.getHours());
  const m = pad2(d.getMinutes());
  const s = pad2(d.getSeconds());
  const ms = pad3(d.getMilliseconds());
  return `${h}:${m}:${s}:${ms}`;
}

function fmtMMSS(totalMs){
  const t = Math.max(0, Math.floor(totalMs));
  const totalSec = Math.floor(t / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

/* ---------------------------
   Background video
--------------------------- */
const bgVideo = $("bgVideo");
const cosmicSelect = $("cosmicSelect");

function setBgVideo(src){
  if (!bgVideo) return;
  bgVideo.src = src;
  bgVideo.load();
  bgVideo.play().catch(()=>{});
}

/* ---------------------------
   FX canvas (NO particle loop)
   Just flashes during alarm.
--------------------------- */
const fxCanvas = $("fxCanvas");
let fxCtx = null;
function resizeFx(){
  if (!fxCanvas) return;
  fxCanvas.width = window.innerWidth;
  fxCanvas.height = window.innerHeight;
  fxCtx = fxCanvas.getContext("2d");
}
window.addEventListener("resize", resizeFx);
resizeFx();

function flashFx(durationMs = 600){
  if (!fxCtx) return;
  const start = performance.now();
  function draw(now){
    const t = (now - start) / durationMs;
    fxCtx.clearRect(0,0,fxCanvas.width, fxCanvas.height);
    if (t >= 1) return;

    const a = 0.35 * (1 - t);
    fxCtx.fillStyle = `rgba(255,206,105,${a})`;
    fxCtx.fillRect(0,0,fxCanvas.width, fxCanvas.height);

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

/* ---------------------------
   YouTube IFrame API
--------------------------- */
let ytPlayer = null;
window.onYouTubeIframeAPIReady = () => {
  // created on-demand when user loads
};

function parseYouTubeId(url){
  try{
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")){
      return u.pathname.replace("/", "");
    }
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    // shorts
    if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/shorts/")[1]?.split("?")[0] ?? "";
    return "";
  }catch{
    return "";
  }
}

function loadYouTube(url){
  const id = parseYouTubeId(url);
  const host = $("ytEmbed");
  if (!host) return;

  if (!id){
    host.innerHTML = `<div class="muted">Invalid YouTube URL</div>`;
    return;
  }

  host.innerHTML = `<div id="ytPlayer"></div>`;

  ytPlayer = new YT.Player("ytPlayer", {
    videoId: id,
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onReady: () => {
        setYouTubeVolume(Number($("ytVol").value || 70));
      }
    }
  });
}

function setYouTubeVolume(v){
  const pct = Math.max(0, Math.min(100, v));
  $("ytVolPct").textContent = `${pct}%`;
  if (ytPlayer && typeof ytPlayer.setVolume === "function"){
    ytPlayer.setVolume(pct);
  }
}

/* ---------------------------
   Audio (WebAudio gentle alarms)
--------------------------- */
let audioCtx = null;
let masterGain = null;
let activeNodes = [];
let alarmPlaying = false;

function ensureAudio(){
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.6;
  masterGain.connect(audioCtx.destination);
}

function setAlarmVolume(pct){
  const p = Math.max(0, Math.min(100, pct));
  $("alarmVolPct").textContent = `${p}%`;

  // Make 100% louder: use a curved mapping (still safe)
  const g = Math.pow(p / 100, 0.6) * 1.4; // louder near top
  if (masterGain) masterGain.gain.value = g;
}

function stopAllTones(){
  for (const n of activeNodes){
    try{ n.stop?.(); }catch{}
    try{ n.disconnect?.(); }catch{}
  }
  activeNodes = [];
}

function playToneProfile(name){
  ensureAudio();
  if (!audioCtx) return;

  const now = audioCtx.currentTime;

  // Clear old
  stopAllTones();

  const profile = String(name || "chime");

  // shared helper
  const mkOsc = (type, freq, startAt, dur, gainStart, gainEnd) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    g.gain.setValueAtTime(gainStart, startAt);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainEnd), startAt + dur);

    osc.connect(g);
    g.connect(masterGain);

    osc.start(startAt);
    osc.stop(startAt + dur);

    activeNodes.push(osc, g);
  };

  // a gentle pad base
  const mkPad = (freq, startAt, dur) => {
    mkOsc("sine", freq, startAt, dur, 0.18, 0.0001);
    mkOsc("sine", freq * 2, startAt + 0.02, dur, 0.08, 0.0001);
  };

  // Patterns: 30 seconds repeating “soft” pulses
  // We'll schedule ~8 seconds and loop with JS interval while ringing
  const scheduleBlock = (t0) => {
    if (profile === "chime"){
      // layered chime: 3 notes + shimmer
      mkOsc("triangle", 523.25, t0 + 0.00, 1.2, 0.50, 0.001); // C5
      mkOsc("triangle", 659.25, t0 + 0.10, 1.1, 0.40, 0.001); // E5
      mkOsc("sine",     783.99, t0 + 0.18, 1.0, 0.22, 0.001); // G5
      mkPad(196.00, t0 + 0.00, 2.2);
    } else if (profile === "bells"){
      // warm bells: slightly detuned pairs
      mkOsc("sine", 440.00, t0 + 0.00, 1.4, 0.35, 0.001);
      mkOsc("sine", 442.20, t0 + 0.00, 1.4, 0.25, 0.001);
      mkOsc("triangle", 660.00, t0 + 0.12, 1.0, 0.28, 0.001);
      mkPad(220.00, t0 + 0.00, 2.4);
    } else if (profile === "crystal"){
      mkOsc("sine", 880.00, t0 + 0.00, 0.9, 0.25, 0.001);
      mkOsc("sine", 1320.0, t0 + 0.06, 0.8, 0.18, 0.001);
      mkOsc("triangle", 660.0, t0 + 0.12, 1.2, 0.22, 0.001);
      mkPad(174.61, t0 + 0.00, 2.0);
    } else if (profile === "dawn"){
      mkPad(146.83, t0 + 0.00, 3.0);
      mkOsc("triangle", 392.0, t0 + 0.25, 1.3, 0.24, 0.001);
      mkOsc("sine", 523.25, t0 + 0.38, 1.1, 0.18, 0.001);
    } else if (profile === "ocean"){
      mkPad(110.00, t0 + 0.00, 3.0);
      mkOsc("sine", 220.0, t0 + 0.20, 1.8, 0.15, 0.001);
      mkOsc("sine", 277.18, t0 + 0.45, 1.3, 0.12, 0.001);
    } else {
      // fallback
      mkOsc("triangle", 523.25, t0 + 0.00, 1.2, 0.40, 0.001);
      mkPad(196.00, t0 + 0.00, 2.2);
    }
  };

  // schedule first block immediately
  scheduleBlock(now);

  // Return a function to schedule future blocks
  return scheduleBlock;
}

let alarmLoopInterval = null;

function startAlarmRinging(){
  if (alarmPlaying) return;

  alarmPlaying = true;
  document.body.classList.add("alarm-ringing");
  $("sleepBtn").classList.add("show");

  // audio
  ensureAudio();
  setAlarmVolume(Number($("alarmVol").value || 80));
  const scheduler = playToneProfile($("alarmSound").value);

  // flash + reschedule patterns every ~2.2s
  flashFx(700);

  if (alarmLoopInterval) clearInterval(alarmLoopInterval);
  alarmLoopInterval = setInterval(() => {
    if (!alarmPlaying) return;
    const now = audioCtx ? audioCtx.currentTime : 0;
    try{
      scheduler?.(now);
    }catch{}
    flashFx(420);
  }, 2200);

  // auto stop after 30s unless slept
  setTimeout(() => {
    if (alarmPlaying) stopAlarmRinging();
  }, 30000);
}

function stopAlarmRinging(){
  alarmPlaying = false;
  document.body.classList.remove("alarm-ringing");
  $("sleepBtn").classList.remove("show");

  if (alarmLoopInterval){
    clearInterval(alarmLoopInterval);
    alarmLoopInterval = null;
  }
  stopAllTones();
}

/* ---------------------------
   Alarm target time
--------------------------- */
function getAlarmTargetToday(){
  const h = Number($("alarmHour").value || 0);
  const m = Number($("alarmMin").value || 0);
  const s = Number($("alarmSec").value || 0);
  const ms = Number($("alarmMs").value || 0);
  const now = new Date();
  const t = new Date(now);
  t.setHours(h, m, s, ms);
  return t;
}

function updateAlarmReadout(){
  const t = getAlarmTargetToday();
  $("alarmTargetReadout").textContent = `Target: ${fmtClock(t)}`;
}

/* ---------------------------
   Timer: auto-start 1:00
--------------------------- */
const pieCirc = 2 * Math.PI * 118; // r=118
const pieFg = $("pieFg");
pieFg.style.strokeDasharray = String(pieCirc);
pieFg.style.strokeDashoffset = String(pieCirc);

let timerTotalMs = 60000;
let timerRemainingMs = 60000;
let timerRunning = false;
let timerLastTick = 0;
let timerRaf = 0;

function setTimerUI(){
  // digits
  const totalSec = Math.ceil(timerRemainingMs / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  $("timerDisplay").textContent = `${pad2(mm)}:${pad2(ss)}`;

  // percent complete
  const done = 1 - (timerRemainingMs / timerTotalMs);
  const pct = Math.max(0, Math.min(1, done));
  $("piePct").textContent = `${Math.round(pct * 100)}%`;

  // pie ring
  const offset = pieCirc * (1 - pct);
  pieFg.style.strokeDashoffset = String(offset);

  // water fill
  const fill = $("fillLiquid");
  fill.style.height = `${Math.round(pct * 100)}%`;
}

function setTimerFromInputs(){
  const mm = Math.max(0, Number($("timerMin").value || 0));
  const ss = Math.max(0, Math.min(59, Number($("timerSec").value || 0)));
  timerTotalMs = (mm * 60 + ss) * 1000;
  if (timerTotalMs <= 0) timerTotalMs = 1000;
  timerRemainingMs = timerTotalMs;
  setTimerUI();
}

function startTimer(){
  if (timerRunning) return;
  timerRunning = true;
  timerLastTick = performance.now();
  tickTimer();
}

function pauseTimer(){
  timerRunning = false;
  if (timerRaf) cancelAnimationFrame(timerRaf);
  timerRaf = 0;
}

function resetTimer(){
  pauseTimer();
  setTimerFromInputs();
}

function tickTimer(){
  if (!timerRunning) return;
  const now = performance.now();
  const dt = now - timerLastTick;
  timerLastTick = now;

  timerRemainingMs -= dt;
  if (timerRemainingMs <= 0){
    timerRemainingMs = 0;
    setTimerUI();
    timerRunning = false;

    // trigger alarm-style ring
    startAlarmRinging();
    return;
  }

  setTimerUI();
  timerRaf = requestAnimationFrame(tickTimer);
}

/* ---------------------------
   Circle clock drawing
--------------------------- */
function buildTicks(){
  const g = $("clockTicks");
  if (!g) return;
  g.innerHTML = "";
  for (let i=0;i<60;i++){
    const a = (i/60) * Math.PI * 2;
    const r1 = (i % 5 === 0) ? 92 : 96;
    const r2 = 102;
    const x1 = 120 + Math.sin(a) * r1;
    const y1 = 120 - Math.cos(a) * r1;
    const x2 = 120 + Math.sin(a) * r2;
    const y2 = 120 - Math.cos(a) * r2;

    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1", x1); line.setAttribute("y1", y1);
    line.setAttribute("x2", x2); line.setAttribute("y2", y2);
    line.setAttribute("stroke", i%5===0 ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.14)");
    line.setAttribute("stroke-width", i%5===0 ? "2" : "1");
    line.setAttribute("stroke-linecap","round");
    g.appendChild(line);
  }
}

function setHand(id, deg){
  const el = $(id);
  if (!el) return;
  el.setAttribute("transform", `rotate(${deg} 120 120)`);
}

function updateCircleClock(now){
  const ms = now.getMilliseconds();
  const s = now.getSeconds() + ms/1000;
  const m = now.getMinutes() + s/60;
  const h = (now.getHours()%12) + m/60;

  setHand("handHour", (h/12)*360);
  setHand("handMin",  (m/60)*360);
  setHand("handSec",  (s/60)*360);
  setHand("handMs",   (ms/1000)*360);

  // alarm overlay hands (today target)
  const t = getAlarmTargetToday();
  const ams = t.getMilliseconds();
  const as = t.getSeconds() + ams/1000;
  const am = t.getMinutes() + as/60;
  const ah = (t.getHours()%12) + am/60;

  setHand("aHandHour", (ah/12)*360);
  setHand("aHandMin",  (am/60)*360);
  setHand("aHandSec",  (as/60)*360);
  setHand("aHandMs",   (ams/1000)*360);
}

/* ---------------------------
   Main clock loop (digital + alarm check)
--------------------------- */
let lastAlarmFireKey = "";

function clockLoop(){
  const now = new Date();
  $("clockTime").textContent = fmtClock(now);
  $("clockDate").textContent = now.toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  updateCircleClock(now);

  // alarm check (once per exact match)
  if ($("alarmEnabled").checked){
    const t = getAlarmTargetToday();

    const match =
      now.getHours() === t.getHours() &&
      now.getMinutes() === t.getMinutes() &&
      now.getSeconds() === t.getSeconds() &&
      now.getMilliseconds() === t.getMilliseconds();

    const key = `${t.getHours()}-${t.getMinutes()}-${t.getSeconds()}-${t.getMilliseconds()}-${now.toDateString()}`;
    if (match && lastAlarmFireKey !== key){
      lastAlarmFireKey = key;
      startAlarmRinging();
    }
  }

  requestAnimationFrame(clockLoop);
}

/* ---------------------------
   Steppers: iPad-safe scrollers
--------------------------- */
function stepInput(id, delta){
  const input = $(id);
  if (!input) return;

  const min = input.min === "" ? -Infinity : Number(input.min);
  const max = input.max === "" ? Infinity : Number(input.max);
  const step = input.step === "" ? 1 : Number(input.step);

  let val = input.value === "" ? 0 : Number(input.value);
  val = val + delta * step;

  if (val < min) val = min;
  if (val > max) val = max;

  input.value = String(val);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".stepBtn");
  if (!btn) return;

  const id = btn.dataset.target;
  const dir = btn.dataset.step;
  stepInput(id, dir === "up" ? 1 : -1);
});

/* ---------------------------
   Wire up UI
--------------------------- */
function init(){
  buildTicks();

  // cosmic background
  setBgVideo(cosmicSelect.value);
  cosmicSelect.addEventListener("change", () => setBgVideo(cosmicSelect.value));

  // alarm readout
  ["alarmHour","alarmMin","alarmSec","alarmMs"].forEach(id => {
    $(id).addEventListener("input", updateAlarmReadout);
    $(id).addEventListener("change", updateAlarmReadout);
    // mouse wheel convenience (desktop)
    $(id).addEventListener("wheel", (ev) => {
      ev.preventDefault();
      stepInput(id, ev.deltaY < 0 ? 1 : -1);
    }, { passive:false });
  });
  updateAlarmReadout();

  // alarm volume
  $("alarmVol").addEventListener("input", (e) => setAlarmVolume(Number(e.target.value)));
  setAlarmVolume(Number($("alarmVol").value || 80));

  // alarm buttons
  $("testAlarm").addEventListener("click", () => startAlarmRinging());
  $("stopAlarm").addEventListener("click", () => stopAlarmRinging());
  $("sleepBtn").addEventListener("click", () => stopAlarmRinging());

  // timer inputs/buttons
  $("timerMin").addEventListener("change", setTimerFromInputs);
  $("timerSec").addEventListener("change", setTimerFromInputs);

  $("timerStart").addEventListener("click", () => {
    if (!timerRunning){
      // if user changed inputs, respect them
      if (timerRemainingMs === timerTotalMs) setTimerFromInputs();
      startTimer();
    }
  });

  $("timerPause").addEventListener("click", pauseTimer);
  $("timerReset").addEventListener("click", resetTimer);

  // TIMER AUTO START at 1:00
  $("timerMin").value = "1";
  $("timerSec").value = "0";
  setTimerFromInputs();
  startTimer();

  // YouTube
  $("preset").addEventListener("change", (e) => {
    if (e.target.value){
      $("ytUrl").value = e.target.value;
    }
  });
  $("loadEmbed").addEventListener("click", () => loadYouTube($("ytUrl").value));

  $("ytVol").addEventListener("input", (e) => setYouTubeVolume(Number(e.target.value)));
  setYouTubeVolume(Number($("ytVol").value || 70));

  // start clock loop
  requestAnimationFrame(clockLoop);
}

window.addEventListener("DOMContentLoaded", init);
