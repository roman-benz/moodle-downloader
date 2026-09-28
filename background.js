/* background.js (Manifest V3 Service Worker) */
console.log("SW booted");

function sanitizeWindowsPathSegment(s) {
  let out = (s || "")
    .replace(/[\\/:*?"<>|]+/g, "_")     // Windows-verbotene Zeichen
    .replace(/\s+/g, " ")
    .trim();

  // Windows: darf nicht mit Punkt oder Leerzeichen enden
  out = out.replace(/[.\s]+$/g, "");

  // Reserved device names (CON, PRN, AUX, NUL, COM1.., LPT1..)
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reserved.test(out)) out = "_" + out;

  return out.slice(0, 120) || "Moodle-Kurs";
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").pop() || "");
    return last || "file";
  } catch {
    return "file";
  }
}

function withParam(url, key, value) {
  const u = new URL(url);
  if (!u.searchParams.has(key)) u.searchParams.set(key, value);
  return u.toString();
}

const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { credentials: "include", signal: ctrl.signal });
    // Body nicht laden – wir brauchen nur die finale URL nach den Redirects
    try { res.body?.cancel(); } catch {}
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function setProgress(patch) {
  const { mdlProgress = {} } = await chrome.storage.local.get("mdlProgress");
  await chrome.storage.local.set({ mdlProgress: { ...mdlProgress, ...patch, updatedAt: Date.now() } });
}

async function resolveToDownloadUrls(items) {
  const out = [];

  for (const [i, it] of items.entries()) {
    const url = it.url;
    await setProgress({ phase: "resolve", done: i, total: items.length });

    // Direkte Datei-URL
    if (url.includes("/pluginfile.php/")) {
      out.push({ url, title: it.title || "" });
      continue;
    }

    // Moodle Resource: redirect=1 führt typischerweise zur Datei (302 -> pluginfile.php)
    if (/\/mod\/resource\/view\.php\?id=\d+/.test(url)) {
      const direct = withParam(url, "redirect", "1");
      console.log("Resolving resource via redirect=1:", direct);

      try {
        // fetch folgt Redirects automatisch; final URL steht in res.url
        const res = await fetchWithTimeout(direct);
        console.log("Fetch status:", res.status, "final url:", res.url);

        if (res.url && res.url.includes("/pluginfile.php/")) {
          out.push({ url: res.url, title: it.title || "" });
        } else {
          // Fallback: chrome.downloads folgt Redirects i.d.R. auch
          out.push({ url: direct, title: it.title || "" });
        }
      } catch (e) {
        console.warn("Resolve failed, fallback to direct:", direct, e);
        out.push({ url: direct, title: it.title || "" });
      }
      continue;
    }

    // Moodle Folder (oder sonstige Links) – direkt probieren
    out.push({ url, title: it.title || "" });
  }

  // Dedupe by url
  const seen = new Set();
  return out.filter(x => (seen.has(x.url) ? false : seen.add(x.url)));
}

function ensureFilename(title, url) {
  let name = sanitizeWindowsPathSegment(title) || sanitizeWindowsPathSegment(filenameFromUrl(url));

  // Endung ergänzen, falls fehlt
  if (!/\.[A-Za-z0-9]{2,8}$/.test(name)) {
    const fromUrl = filenameFromUrl(url);
    const m = fromUrl.match(/(\.[A-Za-z0-9]{2,8})$/);
    if (m) name += m[1];
  }

  // Zur Sicherheit nochmal trimmen
  name = name.replace(/[.\s]+$/g, "");
  return name || "file";
}

async function downloadOne(url, folderName, title) {
  const folder = sanitizeWindowsPathSegment(folderName);
  const file = ensureFilename(title, url);
  const filename = `${folder}/${file}`;

  console.log("Downloading:", url, "->", filename);

  return chrome.downloads.download({
    url,
    filename,
    conflictAction: "uniquify",
    saveAs: false
  });
}

let running = false;

async function downloadAll(items, folderName) {
  // Hält den Service Worker während des Jobs wach (API-Aufrufe setzen den Idle-Timer zurück)
  const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(), 20000);
  try {
    console.log("Start downloadAll. items:", items.length, "folder:", folderName);
    await setProgress({ running: true, phase: "resolve", done: 0, total: items.length, ok: 0, error: null });

    const resolved = await resolveToDownloadUrls(items);
    console.log("Resolved total:", resolved.length);

    let ok = 0;
    for (const [i, it] of resolved.entries()) {
      await setProgress({ phase: "download", done: i, total: resolved.length, ok });
      try {
        await downloadOne(it.url, folderName, it.title);
        ok++;
        await new Promise(r => setTimeout(r, 250)); // Server schonen
      } catch (e) {
        console.warn("Download failed:", it.url, e);
      }
    }

    console.log("Done. ok:", ok, "of", resolved.length);
    await setProgress({ running: false, phase: "done", done: resolved.length, total: resolved.length, ok });
  } catch (e) {
    console.error("Fatal:", e);
    await setProgress({ running: false, phase: "error", error: String(e) });
  } finally {
    clearInterval(keepAlive);
    running = false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("SW got message:", msg);

  if (msg?.type !== "MDL_DOWNLOAD_ALL") return;

  if (running) {
    sendResponse({ ok: false, error: "Download läuft bereits" });
    return;
  }
  running = true;

  const items = msg.items || msg.links || [];
  const folderName = msg.folderName || "Moodle-Kurs";

  // Sofort antworten – Fortschritt läuft über chrome.storage
  sendResponse({ ok: true, started: true });
  downloadAll(items, folderName);
});
