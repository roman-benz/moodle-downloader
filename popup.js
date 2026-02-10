let state = { links: [], folderName: "Moodle-Kurs" };

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById("scan").addEventListener("click", async () => {
  const tab = await getActiveTab();
  const res = await chrome.tabs.sendMessage(tab.id, { type: "MDL_SCAN" });

  state.links = res?.links || [];
  state.folderName = res?.folderName || "Moodle-Kurs";

  document.getElementById("status").textContent = `${state.links.length} gefunden`;
  document.getElementById("download").disabled = state.links.length === 0;
});

document.getElementById("download").addEventListener("click", async () => {
  document.getElementById("status").textContent = "Starte…";

  const res = await chrome.runtime.sendMessage({
    type: "MDL_DOWNLOAD_ALL",
    items: state.links,       // <-- wichtig: items
    folderName: state.folderName
  });

  document.getElementById("status").textContent =
    res?.ok ? `OK: ${res.okCount}/${res.total}` : `Fehler: ${res?.error || "?"}`;
});
