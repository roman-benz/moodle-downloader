let state = { links: [], folderName: "Moodle-Kurs" };

const statusCard = document.getElementById("statusCard");
const statusEl = document.getElementById("status");
const bar = document.getElementById("bar");
const barFill = document.getElementById("barFill");
const listEl = document.getElementById("list");
const folderInput = document.getElementById("folder");
const scanBtn = document.getElementById("scan");
const downloadBtn = document.getElementById("download");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(text, kind = "") {
  statusCard.hidden = false;
  statusEl.textContent = text;
  statusEl.className = kind;
}

function setBar(done, total) {
  if (total == null) { bar.hidden = true; return; }
  bar.hidden = false;
  barFill.style.width = total ? `${Math.round((done / total) * 100)}%` : "0%";
}

function renderList(links) {
  listEl.replaceChildren(...links.map(l => {
    const li = document.createElement("li");
    li.textContent = l.title || decodeURIComponent(l.url.split("/").pop().split("?")[0]) || l.url;
    li.title = l.url;
    return li;
  }));
}

function renderProgress(p) {
  if (!p) return;
  if (p.phase === "resolve") { setStatus(`Links auflösen… ${p.done}/${p.total}`); setBar(p.done, p.total * 2); }
  else if (p.phase === "download") { setStatus(`Lade herunter… ${p.done}/${p.total}`); setBar(p.total + p.done, p.total * 2); }
  else if (p.phase === "done") { setStatus(`Fertig: ${p.ok}/${p.total} Dateien geladen`, "ok"); setBar(1, 1); }
  else if (p.phase === "error") { setStatus(`Fehler: ${p.error || "?"}`, "err"); setBar(null); }
  downloadBtn.disabled = !!p.running || state.links.length === 0;
  scanBtn.disabled = !!p.running;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.mdlProgress) renderProgress(changes.mdlProgress.newValue);
});

// Beim Öffnen des Popups laufenden Fortschritt anzeigen
chrome.storage.local.get("mdlProgress").then(({ mdlProgress }) => {
  if (mdlProgress?.running) renderProgress(mdlProgress);
});

scanBtn.addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();
    const res = await chrome.tabs.sendMessage(tab.id, { type: "MDL_SCAN" });

    state.links = res?.links || [];
    state.folderName = res?.folderName || "Moodle-Kurs";
    if (!folderInput.value.trim()) folderInput.value = state.folderName;

    setStatus(
      state.links.length ? `${state.links.length} Dateien gefunden` : "Keine Dateien auf dieser Seite gefunden",
      state.links.length ? "" : "err"
    );
    setBar(null);
    renderList(state.links);
    downloadBtn.disabled = state.links.length === 0;
  } catch (e) {
    setStatus(`Scan fehlgeschlagen – bist du auf einer Moodle-Kursseite? Ggf. Seite neu laden.`, "err");
    setBar(null);
  }
});

downloadBtn.addEventListener("click", async () => {
  setStatus("Starte…");
  setBar(0, 1);
  downloadBtn.disabled = true;

  try {
    const res = await chrome.runtime.sendMessage({
      type: "MDL_DOWNLOAD_ALL",
      items: state.links,
      folderName: folderInput.value.trim() || state.folderName
    });
    if (!res?.ok) {
      setStatus(`Fehler: ${res?.error || "keine Antwort vom Hintergrundskript"}`, "err");
      downloadBtn.disabled = false;
    }
  } catch (e) {
    setStatus(`Fehler: ${e.message || e}`, "err");
    downloadBtn.disabled = false;
  }
});
