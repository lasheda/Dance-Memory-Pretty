// JavaScript principal con reproductor y sincronización BPM
let lists = JSON.parse(localStorage.getItem("lists")) || [];
let usedSteps = [];
let running = false;
let wakeLock = null;

// Referencias
const listNameInput = document.getElementById("listNameInput");
const addListBtn = document.getElementById("addListBtn");
const editListBtn = document.getElementById("editListBtn");
const deleteListBtn = document.getElementById("deleteListBtn");
const listSelect = document.getElementById("listSelect");
const nameInput = document.getElementById("nameInput");
const timeInput = document.getElementById("timeInput");
const addStepBtn = document.getElementById("addStepBtn");
const stepsList = document.getElementById("stepsList");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");
const currentStep = document.getElementById("currentStep");
const speedInput = document.getElementById("speedInput");
const speedSlider = document.getElementById("speedSlider");
const volumeSlider = document.getElementById("volumeSlider");
const modeSelect = document.getElementById("modeSelect");

// Música
const musicFile = document.getElementById("musicFile");
const musicPlayer = document.getElementById("musicPlayer");
const syncToggle = document.getElementById("syncToggle");
let bpmDetected = 120;

// --- Funciones básicas de listas, render y almacenamiento ---
function saveLocal() {
  localStorage.setItem("lists", JSON.stringify(lists));
}

function renderLists() {
  listSelect.innerHTML = "";
  lists.forEach((list, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = list.name;
    listSelect.appendChild(opt);
  });
  renderSteps();
}

// Aquí va todo el código de renderSteps, agregar/editar/eliminar pasos y listas
// (igual que tu código original)

// --- Funciones de sincronización de música y BPM ---
musicFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  musicPlayer.src = URL.createObjectURL(file);

  if (syncToggle.checked) {
    bpmDetected = await detectBPM(file);
    speedInput.value = (bpmDetected / 120).toFixed(2);
    speedSlider.value = speedInput.value;
  }
});

syncToggle.addEventListener("change", () => {
  if (syncToggle.checked && musicFile.files[0]) {
    detectBPM(musicFile.files[0]).then(bpm => {
      bpmDetected = bpm;
      speedInput.value = (bpmDetected / 120).toFixed(2);
      speedSlider.value = speedInput.value;
    });
  }
});

// --- Función simple de detección BPM ---
async function detectBPM(file) {
  return new Promise((resolve) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const arrayBuffer = ev.target.result;
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const rawData = audioBuffer.getChannelData(0);
      const samples = 10000;
      const blockSize = Math.floor(rawData.length / samples);
      let peaks = [];
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) sum += Math.abs(rawData[i * blockSize + j]);
        peaks.push(sum / blockSize);
      }
      let threshold = peaks.reduce((a,b) => a+b)/peaks.length * 1.2;
      let peakIndexes = peaks.map((v,i)=>v>threshold? i:null).filter(v=>v!==null);
      let intervals = [];
      for (let i=1;i<peakIndexes.length;i++) intervals.push((peakIndexes[i]-peakIndexes[i-1])*audioBuffer.duration/rawData.length);
      let avgInterval = intervals.reduce((a,b)=>a+b,0)/intervals.length;
      let bpm = Math.round(60/avgInterval);
      resolve(bpm);
    };
    reader.readAsArrayBuffer(file);
  });
}

// --- Controles de velocidad ---
speedSlider.addEventListener("input", () => { speedInput.value = speedSlider.value; });
speedInput.addEventListener("input", () => { speedSlider.value = speedInput.value; });

// --- Randomizer principal con sincronización ---
async function startRandomizer() {
  // (similar a tu código original)
  // Si syncToggle.checked, velocidad = bpmDetected / 120
}

// --- Función de voz ---
function sayText(text) {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.volume = parseFloat(volumeSlider.value);
    speechSynthesis.speak(utterance);
  }
}

// --- WakeLock ---
async function requestWakeLock() {
  try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }
  catch(err) { console.error("WakeLock error:", err); }
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }

renderLists();
