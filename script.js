// JavaScript principal
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
const volumeInput = document.getElementById("volumeInput");
const volumeSlider = document.getElementById("volumeSlider");
const modeSelect = document.getElementById("modeSelect");

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
  if (!stepName || isNaN(tiempos)) return alert("Datos inválidos");
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
      if (newName && !isNaN(newTiempos)) {
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

startBtn.addEventListener("click", async () => {
  if (!running) {
    await requestWakeLock();
    startRandomizer();
  }
});

stopBtn.addEventListener("click", () => {
  running = false;
  releaseWakeLock();
  currentStep.textContent = "⏸ Pausado";
});

resetBtn.addEventListener("click", () => {
  running = false;
  releaseWakeLock();
  usedSteps = [];
  currentStep.textContent = "🔄 Reiniciado";
});

saveBtn.addEventListener("click", () => {
  saveLocal();
  alert("Listas guardadas en memoria");
});

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
      const [listName, stepName, tiempos] = line.split(",").map(s => s.trim());
      if (!listName || !stepName || isNaN(parseInt(tiempos))) return;
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

async function startRandomizer() {
  if (listSelect.value === "") return alert("Selecciona una lista");
  const listIndex = parseInt(listSelect.value);
  if (lists[listIndex].steps.length === 0) return alert("La lista está vacía");

  const mode = modeSelect.value;
  if (mode === "normal" || mode === "loop") {
    if (usedSteps.length === 0) {
      usedSteps = [...lists[listIndex].steps];
    }
  }

  running = true;
  while (running) {
    let step;
    if (mode === "normal" || mode === "loop") {
      if (usedSteps.length === 0) {
        if (mode === "loop") {
          usedSteps = [...lists[listIndex].steps];
        } else {
          currentStep.textContent = "✅ Lista completada";
          break;
        }
      }
      const stepIndex = Math.floor(Math.random() * usedSteps.length);
      step = usedSteps.splice(stepIndex, 1)[0];
    } else if (mode === "random") {
      const stepIndex = Math.floor(Math.random() * lists[listIndex].steps.length);
      step = lists[listIndex].steps[stepIndex];
    } else if (mode === "choreo" || mode === "choreoLoop") {
      if (usedSteps.length === 0) {
        usedSteps = [...lists[listIndex].steps];
      }
      step = usedSteps.shift();
      if (!step) {
        if (mode === "choreoLoop") {
          usedSteps = [...lists[listIndex].steps];
          step = usedSteps.shift();
        } else {
          currentStep.textContent = "✅ Coreografía completada";
          break;
        }
      }
    }

    const speed = parseFloat(speedInput.value);
    const duration = step.tiempos * (1 / speed);
    currentStep.textContent = step.name;
    sayText(step.name);
    await new Promise(res => setTimeout(res, duration * 1000));
  }
  running = false;
  releaseWakeLock();
}

function sayText(text) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.volume = parseInt(volumeSlider.value) / 100;
    speechSynthesis.speak(utterance);
  }
}

// Sincronización velocidad
speedSlider.addEventListener("input", () => {
  speedInput.value = speedSlider.value;
});
speedInput.addEventListener("input", () => {
  let val = Math.min(5, Math.max(0.01, parseFloat(speedInput.value)));
  speedSlider.value = val;
  speedInput.value = val;
});

// Sincronización volumen
volumeSlider.addEventListener("input", () => {
  volumeInput.value = volumeSlider.value;
});
volumeInput.addEventListener("input", () => {
  let val = Math.min(100, Math.max(0, parseInt(volumeInput.value)));
  volumeSlider.value = val;
  volumeInput.value = val;
});

async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (err) {
    console.error("WakeLock error:", err);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

renderLists();