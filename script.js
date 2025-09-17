// script.js completo — Listas + CSV + Reproductor mp3 + detección y seguimiento BPM

// -------------------- Estado global --------------------
let lists = JSON.parse(localStorage.getItem("lists")) || [];
let usedSteps = [];
let running = false;
let wakeLock = null;

// Referencias DOM
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

// Música / BPM
const musicFile = document.getElementById("musicFile");
const musicPlayer = document.getElementById("musicPlayer");
const syncToggle = document.getElementById("syncToggle");

// Datos de audio / detección
let audioBufferGlobal = null;      // AudioBuffer decodificado
let onsetTimes = [];               // array de instantes (s) donde hay onsets detectados
let globalBPM = 120;               // BPM global detectado
let bpmDetected = 120;             // BPM actual (suavizada)
let bpmFollowInterval = null;      // id del interval que sigue el BPM local
const BPM_SMOOTHING_ALPHA = 0.85;  // mayor = más suave (0..1) - usa para EMA

// -------------------- Funciones listas y render --------------------
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

addListBtn.addEventListener("click", () => {
  const name = listNameInput.value.trim();
  if (!name) return alert("Nombre inválido");
  lists.push({ name, steps: [] });
  listNameInput.value = "";
  saveLocal();
  renderLists();
});

editListBtn.addEventListener("click", () => {
  if (listSelect.value === "") return alert("Selecciona una lista");
  const listIndex = parseInt(listSelect.value);
  const newName = prompt("Nuevo nombre de la lista:", lists[listIndex].name);
  if (newName) {
    lists[listIndex].name = newName;
    saveLocal();
    renderLists();
  }
});

deleteListBtn.addEventListener("click", () => {
  if (listSelect.value === "") return alert("Selecciona una lista");
  const listIndex = parseInt(listSelect.value);
  if (confirm("¿Seguro que quieres borrar esta lista?")) {
    lists.splice(listIndex, 1);
    saveLocal();
    renderLists();
  }
});

listSelect.addEventListener("change", renderSteps);

addStepBtn.addEventListener("click", () => {
  if (listSelect.value === "") return alert("Selecciona una lista");
  const stepName = nameInput.value.trim();
  const tiempos = parseInt(timeInput.value);
  if (!stepName || isNaN(tiempos) || tiempos <= 0) return alert("Datos inválidos");
  const listIndex = parseInt(listSelect.value);
  lists[listIndex].steps.push({ name: stepName, tiempos });
  nameInput.value = "";
  timeInput.value = "";
  saveLocal();
  renderSteps();
});

function renderSteps() {
  stepsList.innerHTML = "";
  if (listSelect.value === "") return;
  const listIndex = parseInt(listSelect.value);
  const steps = lists[listIndex].steps;
  steps.forEach((step, i) => {
    const li = document.createElement("li");
    li.textContent = `${step.name} (${step.tiempos})`;

    const controls = document.createElement("span");
    controls.className = "step-controls";

    const upBtn = document.createElement("button");
    upBtn.textContent = "⬆️";
    upBtn.addEventListener("click", () => {
      if (i > 0) {
        [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
        saveLocal();
        renderSteps();
      }
    });

    const downBtn = document.createElement("button");
    downBtn.textContent = "⬇️";
    downBtn.addEventListener("click", () => {
      if (i < steps.length - 1) {
        [steps[i + 1], steps[i]] = [steps[i], steps[i + 1]];
        saveLocal();
        renderSteps();
      }
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => {
      const newName = prompt("Nuevo nombre:", step.name);
      const newTiempos = parseInt(prompt("Nuevos tiempos:", step.tiempos));
      if (newName && !isNaN(newTiempos) && newTiempos > 0) {
        steps[i] = { name: newName, tiempos: newTiempos };
        saveLocal();
        renderSteps();
      }
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.addEventListener("click", () => {
      steps.splice(i, 1);
      saveLocal();
      renderSteps();
    });

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
    controls.appendChild(editBtn);
    controls.appendChild(deleteBtn);
    li.appendChild(controls);
    stepsList.appendChild(li);
  });
}

// -------------------- Export / Import CSV (igual que antes) --------------------
exportBtn.addEventListener("click", () => {
  let csv = "Lista,Nombre,Tiempos\n";
  lists.forEach(list => {
    list.steps.forEach(step => {
      csv += `${list.name},${step.name},${step.tiempos}\n`;
    });
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "listas.csv";
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const lines = text.trim().split("\n");
    lists = [];
    lines.slice(1).forEach(line => {
      const [listName, stepName, tiempos] = line.split(",");
      let list = lists.find(l => l.name === listName);
      if (!list) {
        list = { name: listName, steps: [] };
        lists.push(list);
      }
      list.steps.push({ name: stepName, tiempos: parseInt(tiempos) });
    });
    saveLocal();
    renderLists();
    currentStep.textContent = "📂 Listas importadas";
  };
  reader.readAsText(file);
});

// -------------------- DETECCIÓN DE ONSETS / BPM (completa) --------------------
/*
  Algoritmo:
  - Decodifica el archivo a AudioBuffer.
  - Calcula energía por frames (frameSize/hop).
  - Obtiene la diferencia positiva (novelty), suaviza y detecta picos (onsets).
  - Calcula BPM global (mediana de IOIs).
  - Luego, mientras suena la canción, calcula BPM local tomando onsets en ventana pasada (ej. 8s).
*/

async function analyzeFileForBeats(file) {
  // decodificar el archivo
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext || window.AudioContext)(1, 1, 44100);
  // Usamos AudioContext normal para decodeAudioData
  const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  // keep global buffer
  audioBufferGlobal = audioBuffer;

  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.numberOfChannels > 0 ? audioBuffer.getChannelData(0) : audioBuffer.getChannelData(0);

  // parámetros
  const frameSize = 2048;
  const hop = 512;
  const energies = [];
  for (let i = 0; i + frameSize < channelData.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < frameSize; j++) {
      const v = channelData[i + j];
      sum += v * v;
    }
    energies.push(sum / frameSize);
  }
  // novelty (positive difference)
  const novelty = [];
  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    novelty.push(Math.max(0, diff));
  }
  // suavizado simple (moving average)
  const smooth = [];
  const win = 3;
  for (let i = 0; i < novelty.length; i++) {
    let s = 0;
    let count = 0;
    for (let k = -Math.floor(win/2); k <= Math.floor(win/2); k++) {
      const idx = i + k;
      if (idx >= 0 && idx < novelty.length) { s += novelty[idx]; count++; }
    }
    smooth.push(s / count);
  }
  // umbral adaptativo
  const mean = smooth.reduce((a,b)=>a+b,0) / smooth.length;
  const std = Math.sqrt(smooth.map(v=>Math.pow(v-mean,2)).reduce((a,b)=>a+b,0)/smooth.length);
  const threshold = mean + 0.5 * std; // factor empírico

  // detección de picos locales
  const peaks = [];
  for (let i = 1; i < smooth.length - 1; i++) {
    if (smooth[i] > threshold && smooth[i] > smooth[i-1] && smooth[i] > smooth[i+1]) {
      peaks.push(i);
    }
  }

  // convertir índices de frame a tiempos (s)
  onsetTimes = peaks.map(p => (p * hop) / sampleRate);

  // calcular IOIs (intervalos entre onsets) y BPM global (mediana)
  const IOIs = [];
  for (let i = 1; i < onsetTimes.length; i++) {
    const dt = onsetTimes[i] - onsetTimes[i-1];
    if (dt > 0.05 && dt < 2.0) IOIs.push(dt); // filtrar extremos
  }
  function median(arr) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    if (s.length % 2 === 0) return (s[m-1]+s[m])/2;
    return s[m];
  }
  const medIOI = median(IOIs) || (60/120); // fallback
  globalBPM = Math.round(60 / medIOI);
  bpmDetected = globalBPM; // inicializamos
  console.log("análisis completado: onsets:", onsetTimes.length, "globalBPM:", globalBPM);
  return { audioBuffer, onsetTimes, globalBPM };
}

// Calcula BPM local alrededor de timeSec usando onsets precomputados
function computeLocalBPMAt(timeSec, windowSec = 8) {
  if (!onsetTimes || onsetTimes.length < 2) return globalBPM;
  const start = Math.max(0, timeSec - windowSec);
  // consideramos onsets en (start, timeSec] (ventana pasada) — más robusto
  const localOnsets = onsetTimes.filter(t => t >= start && t <= timeSec);
  if (localOnsets.length < 2) {
    // intentamos ampliar la ventana si hay pocos onsets
    const wider = onsetTimes.filter(t => t >= Math.max(0, timeSec - windowSec*2) && t <= timeSec + 1);
    if (wider.length < 2) return globalBPM;
    const iois = [];
    for (let i = 1; i < wider.length; i++) iois.push(wider[i] - wider[i-1]);
    const med = median(iois);
    return Math.round(60 / med);
  } else {
    const iois = [];
    for (let i = 1; i < localOnsets.length; i++) iois.push(localOnsets[i] - localOnsets[i-1]);
    const med = median(iois);
    return Math.round(60 / med);
  }

  function median(arr) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a,b)=>a-b);
    const m = Math.floor(s.length/2);
    return s.length % 2 === 0 ? (s[m-1]+s[m])/2 : s[m];
  }
}

// Inicia seguimiento periódico del BPM (mientras suena)
function startBpmFollow() {
  stopBpmFollow();
  // actualizar inmediatamente
  if (!audioBufferGlobal || onsetTimes.length < 2) return;
  bpmDetected = globalBPM;
  // cada segundo calculamos BPM local en torno al currentTime
  bpmFollowInterval = setInterval(() => {
    if (musicPlayer.paused) return;
    const t = musicPlayer.currentTime;
    const localBPM = computeLocalBPMAt(t, 8) || globalBPM;
    // suavizado exponencial
    bpmDetected = Math.round((BPM_SMOOTHING_ALPHA * bpmDetected) + ((1 - BPM_SMOOTHING_ALPHA) * localBPM));
    // convertir BPM -> velocidad (según tu semántica: velocidad = BPM / 60)
    if (syncToggle.checked) {
      const speed = (bpmDetected / 60);
      // actualizar controles visuales y mantenerlos deshabilitados
      speedInput.value = speed.toFixed(2);
      speedSlider.value = speedInput.value;
    }
  }, 1000);
}

function stopBpmFollow() {
  if (bpmFollowInterval) {
    clearInterval(bpmFollowInterval);
    bpmFollowInterval = null;
  }
}

// -------------------- Handlers: carga/uso del mp3 --------------------
musicFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  musicPlayer.src = URL.createObjectURL(file);

  // analizamos el archivo para detectar onsets y BPM global
  try {
    await analyzeFileForBeats(file);
    // si el usuario tiene sync ON, fijamos la velocidad inicial
    if (syncToggle.checked) {
      const speed = (globalBPM / 60);
      speedInput.value = speed.toFixed(2);
      speedSlider.value = speedInput.value;
      // desactivar inputs para que el usuario no los cambie mientras sincroniza
      speedInput.disabled = true;
      speedSlider.disabled = true;
    } else {
      speedInput.disabled = false;
      speedSlider.disabled = false;
    }
  } catch (err) {
    console.error("Error analizando audio:", err);
  }
});

musicPlayer.addEventListener('play', () => {
  // si ya hemos analizado, iniciamos seguimiento; si no, intentamos analizar el archivo cargado
  if (audioBufferGlobal && onsetTimes.length >= 2) {
    startBpmFollow();
  } else if (musicFile.files[0]) {
    analyzeFileForBeats(musicFile.files[0]).then(() => startBpmFollow()).catch(()=>{});
  }
});

musicPlayer.addEventListener('pause', () => stopBpmFollow());
musicPlayer.addEventListener('ended', () => stopBpmFollow());

syncToggle.addEventListener("change", () => {
  if (syncToggle.checked) {
    // activar sincronización -> deshabilitar inputs y actualizar según BPM actual
    speedInput.disabled = true;
    speedSlider.disabled = true;
    if (audioBufferGlobal && onsetTimes.length >= 2) {
      // calcula bpm local ahora mismo
      const t = musicPlayer.currentTime;
      const local = computeLocalBPMAt(t, 8) || globalBPM;
      bpmDetected = local;
      const speed = (bpmDetected / 60);
      speedInput.value = speed.toFixed(2);
      speedSlider.value = speedInput.value;
    } else if (musicFile.files[0]) {
      // si no hemos analizado aún, analizamos
      analyzeFileForBeats(musicFile.files[0]).then(() => {
        const speed = (globalBPM / 60);
        speedInput.value = speed.toFixed(2);
        speedSlider.value = speedInput.value;
      }).catch(()=>{});
    }
  } else {
    // desactivar sincronización -> reactivar inputs
    speedInput.disabled = false;
    speedSlider.disabled = false;
  }
});

// -------------------- Controles velocidad (manual) --------------------
speedSlider.addEventListener("input", () => { speedInput.value = speedSlider.value; });
speedInput.addEventListener("input", () => { speedSlider.value = speedInput.value; });

// -------------------- Randomizer principal (usa velocidad actual) --------------------
async function startRandomizer() {
  if (listSelect.value === "") return alert("Selecciona una lista");
  const listIndex = parseInt(listSelect.value);
  if (lists[listIndex].steps.length === 0) return alert("La lista está vacía");

  const mode = modeSelect.value;
  if (mode === "normal" || mode === "loop") {
    if (usedSteps.length === 0) usedSteps = [...lists[listIndex].steps];
  }

  running = true;
  // si la música está cargada, intentamos reproducirla (no forzamos si está en pausa)
  // musicPlayer.play(); // dejamos al usuario controlar reproducción si quiere

  while (running) {
    let step;
    if (mode === "normal" || mode === "loop") {
      if (usedSteps.length === 0) {
        if (mode === "loop") usedSteps = [...lists[listIndex].steps];
        else { currentStep.textContent = "✅ Lista completada"; break; }
      }
      const stepIndex = Math.floor(Math.random() * usedSteps.length);
      step = usedSteps.splice(stepIndex, 1)[0];
    } else if (mode === "random") {
      const stepIndex = Math.floor(Math.random() * lists[listIndex].steps.length);
      step = lists[listIndex].steps[stepIndex];
    } else if (mode === "choreo" || mode === "choreoLoop") {
      if (usedSteps.length === 0) usedSteps = [...lists[listIndex].steps];
      step = usedSteps.shift();
      if (!step) {
        if (mode === "choreoLoop") { usedSteps = [...lists[listIndex].steps]; step = usedSteps.shift(); }
        else { currentStep.textContent = "✅ Coreografía completada"; break; }
      }
    }

    // calcular velocidad efectiva
    let speed = parseFloat(speedInput.value) || 1;
    if (syncToggle.checked && bpmDetected) {
      // acorde a la semántica: velocidad = BPM / 60
      speed = (bpmDetected / 60);
    }
    // duración en segundos: tiempos * (1 / velocidad)
    const duration = step.tiempos * (1 / speed);

    currentStep.textContent = step.name;
    sayText(step.name);

    // esperar
    await new Promise(res => setTimeout(res, duration * 1000));
  }

  running = false;
  releaseWakeLock();
}

// -------------------- Voz --------------------
function sayText(text) {
  if ("speechSynthesis" in window) {
    // cancelamos solo si queremos evitar solapamientos de la misma app (puedes quitar cancel si prefieres que se acumulen)
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.volume = parseFloat(volumeSlider.value);
    speechSynthesis.speak(utterance);
  }
}

// -------------------- WakeLock --------------------
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) { console.error("WakeLock error:", err); }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// -------------------- Botones inicio/stop/reset --------------------
startBtn.addEventListener("click", async () => {
  if (!running) {
    await requestWakeLock();
    startRandomizer();
    // si la música está cargada y se desea que empiece, el usuario puede pulsar play en el audio; no forzamos auto-play.
    if (!musicPlayer.paused) {
      // si ya está sonando, iniciamos seguimiento
      startBpmFollow();
    }
  }
});

stopBtn.addEventListener("click", () => {
  running = false;
  releaseWakeLock();
  currentStep.textContent = "⏸ Pausado";
  musicPlayer.pause();
  stopBpmFollow();
});

resetBtn.addEventListener("click", () => {
  running = false;
  releaseWakeLock();
  usedSteps = [];
  currentStep.textContent = "🔄 Reiniciado";
  musicPlayer.currentTime = 0;
  stopBpmFollow();
});

saveBtn.addEventListener("click", () => {
  saveLocal();
  alert("Listas guardadas en memoria");
});

// -------------------- Inicialización UI --------------------
(function init() {
  renderLists();
  // desactivar inputs si sync por defecto está ON
  if (syncToggle.checked) {
    speedInput.disabled = true;
    speedSlider.disabled = true;
  }
})();

