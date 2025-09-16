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

// Música y sincronización
const musicFile = document.getElementById("musicFile");
const musicPlayer = document.getElementById("musicPlayer");
const syncToggle = document.getElementById("syncToggle");
let bpmDetected = 120;

// ----------------- FUNCIONES DE LISTAS Y PASOS -----------------
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

// Agregar lista
addListBtn.addEventListener("click", () => {
  const name = listNameInput.value.trim();
  if (!name) return alert("Nombre inválido");
  lists.push({ name, steps: [] });
  listNameInput.value = "";
  saveLocal();
  renderLists();
});

// Renombrar lista
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

// Borrar lista
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

// Agregar paso
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

// Renderizar pasos
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

// ----------------- IMPORT / EXPORT CSV -----------------
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

// ----------------- MÚSICA / BPM -----------------
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

async function detectBPM(file) {
  return new Promise(resolve => {
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
      let threshold = peaks.reduce((a, b) => a + b, 0) / peaks.length * 1.2;
      let peakIndexes = peaks.map((v, i) => v > threshold ? i : null).filter(v => v !== null);
      let intervals = [];
      for (let i = 1; i < peakIndexes.length; i++) intervals.push((peakIndexes[i] - peakIndexes[i - 1]) * audioBuffer.duration / rawData.length);
      let avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      let bpm = Math.round(60 / avgInterval);
      resolve(bpm);
    };
    reader.readAsArrayBuffer(file);
  });
}

// ----------------- CONTROLES DE VELOCIDAD -----------------
speedSlider.addEventListener("input", () => { speedInput.value = speedSlider.value; });
speedInput.addEventListener("input", () => { speedSlider.value = speedInput.value; });

// ----------------- RANDOMIZER PRINCIPAL -----------------
async function startRandomizer() {
  if (listSelect.value === "") return alert("Selecciona una lista");
  const listIndex = parseInt(listSelect.value);
  if (lists[listIndex].steps.length === 0) return alert("La lista está vacía");

  const mode = modeSelect.value;
  if (mode === "normal" || mode === "loop") {
    if (usedSteps.length === 0) usedSteps = [...lists[listIndex].steps];
  }

  running = true;
  if (!musicPlayer.paused) musicPlayer.play();

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
      step = lists[listIndex].steps[Math.floor(Math.random() * lists[listIndex].steps.length)];
    } else if (mode === "choreo" || mode === "choreoLoop") {
      if (usedSteps.length === 0) usedSteps = [...lists[listIndex].steps];
      step = usedSteps.shift();
      if (!step) {
        if (mode === "choreoLoop") { usedSteps = [...lists[listIndex].steps]; step = usedSteps.shift(); }
        else { currentStep.textContent = "✅ Coreografía completada"; break; }
      }
    }

    // Ajuste velocidad si sincronización activada
    let speed = parseFloat(speedInput.value);
    if (syncToggle.checked && bpmDetected) speed = bpmDetected / 120;

    const duration = step.tiempos * (1 / speed);
    currentStep.textContent = step.name;
    sayText(step.name);
    await new Promise(res => setTimeout(res, duration * 1000));
  }
  running = false;
  releaseWakeLock();
}

// ----------------- VOZ -----------------
function sayText(text) {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.volume = parseFloat(volumeSlider.value);
    speechSynthesis.speak(utterance);
  }
}

// ----------------- WAKELOCK -----------------
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

// ----------------- BOTONES INICIO / STOP / RESET -----------------
startBtn.addEventListener("click", async () => {
  if (!running) {
    await requestWakeLock();
    startRandomizer();
    if (!musicPlayer.paused) musicPlayer.play();
  }
});

stopBtn.addEventListener("click", () => {
  running = false;
  releaseWakeLock();
  currentStep.textContent = "⏸ Pausado";
  musicPlayer.pause();
});

resetBtn.addEventListener("click", () => {
  running = false;
  releaseWakeLock();
  usedSteps = [];
  currentStep.textContent = "🔄 Reiniciado";
  musicPlayer.currentTime = 0;
});

saveBtn.addEventListener("click", () => { saveLocal(); alert("Listas guardadas en memoria"); });

renderLists();
