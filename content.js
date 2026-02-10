/**
 * Content script: scannt die aktuelle Moodle-Seite nach Datei-Links.
 * Fokus: pluginfile.php (typische Moodle-Datei-URLs).
 * Zusätzlich: mod/resource/view.php und mod/folder/view.php als "indirekte" Quellen.
 */

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (!seen.has(k)) { seen.add(k); out.push(x); }
  }
  return out;
}

function sanitizeSegment(s) {
  return (s || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function getCourseFolderName() {
  // z.B. "Kurs: TSA25/TSL25 - Digitaltech"
  const title = document.title || "Moodle-Kurs";
  const cleaned = title.replace(/\s*-\s*Moodle\s*$/i, "").trim();
  return sanitizeSegment(cleaned || "Moodle-Kurs");
}

function guessTitleFromAnchor(a) {
  // Moodle zeigt Dateiname oft im Linktext oder in aria-label / title
  const t = (a.textContent || "").trim();
  if (t) return t;
  const aria = a.getAttribute("aria-label");
  if (aria) return aria.trim();
  const ttl = a.getAttribute("title");
  if (ttl) return ttl.trim();
  return "";
}

function collectLinks() {
  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const items = anchors.map(a => {
    const href = a.href;
    return {
      url: href,
      title: guessTitleFromAnchor(a)
    };
  }).filter(x => x.url);

  const pluginfiles = items.filter(x => x.url.includes("/pluginfile.php/"));

  const indirect = items.filter(x =>
    /\/mod\/(resource|folder)\/view\.php\?id=\d+/.test(x.url)
  );

  // Auch direkte Dateiendungen (manchmal ohne pluginfile, je nach Setup)
  const ext = items.filter(x =>
    /\.(pdf|docx?|pptx?|xlsx?|zip|rar|7z|png|jpe?g|gif|mp4|mp3|txt)(\?|#|$)/i.test(x.url)
  );

  const all = uniqBy([...pluginfiles, ...indirect, ...ext], x => x.url);

  // Entferne offensichtliche Nicht-Datei-Links (Navigation)
  const filtered = all.filter(x => {
    const u = x.url;
    // Kurs-/Sektion-Links raus
    if (/\/course\/(view|section)\.php\?id=\d+/.test(u)) return false;
    // "Als erledigt kennzeichnen" etc.
    if (u.includes("completion")) return false;
    return true;
  });

  return filtered;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "MDL_SCAN") {
    try {
      const links = collectLinks();
      sendResponse({
        ok: true,
        links,
        folderName: getCourseFolderName(),
        pageUrl: location.href
      });
    } catch (e) {
      sendResponse({ ok: false, error: String(e) });
    }
  }
});
