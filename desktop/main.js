// Nadir Shop Gestion : l'administration de la boutique dans une application Mac / Windows.
// Le site (dossier « app ») est embarqué dans l'application et parle directement à la base Supabase de la boutique.
const { app, BrowserWindow, Menu, protocol, net, shell, session, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const DOSSIER = path.join(__dirname, "app");
const ACCUEIL = "app://nadir/admin";

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

let fenetre = null;
if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (fenetre) { if (fenetre.isMinimized()) fenetre.restore(); fenetre.focus(); } });

/** Sert les fichiers du site ; toute adresse sans fichier correspondant renvoie index.html (navigation interne). */
function servir(requete) {
  const url = new URL(requete.url);
  let chemin = path.normalize(path.join(DOSSIER, decodeURIComponent(url.pathname)));
  if (!chemin.startsWith(DOSSIER + path.sep) && chemin !== DOSSIER) return new Response("Interdit", { status: 403 });
  if (!fs.existsSync(chemin) || fs.statSync(chemin).isDirectory()) chemin = path.join(DOSSIER, "index.html");
  return net.fetch(pathToFileURL(chemin).toString());
}

const estInterne = (u) => { try { return new URL(u).protocol === "app:"; } catch { return false; } };
const ouvrirHorsApp = (u) => { if (/^(https?|mailto|tel):/i.test(u)) shell.openExternal(u); };

const DEPOT = "yassingithu/nadir-shop";
const plusRecent = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };

/** Vérifie s'il existe une version plus récente (publiée sur GitHub) et propose de la télécharger. */
async function verifierMiseAJour(manuel) {
  try {
    const rep = await net.fetch(`https://api.github.com/repos/${DEPOT}/releases/latest`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "nadir-shop-gestion" } });
    if (!rep.ok) throw new Error("HTTP " + rep.status);
    const r = await rep.json();
    const v = String(r.tag_name || "").replace(/^app-v/, "");
    if (!/^\d+\.\d+\.\d+$/.test(v) || !plusRecent(v, app.getVersion())) {
      if (manuel) dialog.showMessageBox(fenetre, { type: "info", message: "Vous avez la dernière version.", detail: `Version ${app.getVersion()}`, buttons: ["OK"] });
      return;
    }
    const cle = process.platform === "win32" ? "windows.exe" : process.arch === "arm64" ? "mac-arm64.dmg" : "mac-x64.dmg";
    const fichier = (r.assets || []).find((a) => a.name.endsWith(cle));
    const { response } = await dialog.showMessageBox(fenetre, { type: "info", message: `Une nouvelle version (${v}) est disponible.`, detail: "Cliquez sur « Télécharger », puis ouvrez le fichier pour installer : vos données ne sont pas touchées.", buttons: ["Télécharger", "Plus tard"], defaultId: 0, cancelId: 1 });
    if (response === 0) shell.openExternal(fichier ? fichier.browser_download_url : r.html_url);
  } catch (e) {
    if (manuel) dialog.showMessageBox(fenetre, { type: "warning", message: "Impossible de vérifier les mises à jour.", detail: "Vérifiez la connexion Internet, puis réessayez.", buttons: ["OK"] });
  }
}

function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1360, height: 900, minWidth: 960, minHeight: 640,
    title: "Nadir Shop Gestion", backgroundColor: "#ffffff", show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  fenetre.once("ready-to-show", () => fenetre.show());
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("blob:") || url.startsWith("about:")) return { action: "allow" };
    if (estInterne(url)) { fenetre.loadURL(url); return { action: "deny" }; }
    ouvrirHorsApp(url); return { action: "deny" };
  });
  fenetre.webContents.on("will-navigate", (e, url) => { if (!estInterne(url)) { e.preventDefault(); ouvrirHorsApp(url); } });
  fenetre.loadURL(ACCUEIL);
}

function construireMenu() {
  const mac = process.platform === "darwin";
  const modele = [
    ...(mac ? [{ role: "appMenu" }] : []),
    { role: "editMenu", label: "Édition" },
    { label: "Aide", submenu: [{ label: "Rechercher une mise à jour…", click: () => void verifierMiseAJour(true) }] },
    { label: "Aller", submenu: [
      { label: "Administration", accelerator: "CmdOrCtrl+1", click: () => fenetre?.loadURL(ACCUEIL) },
      { label: "Voir la boutique", click: () => fenetre?.loadURL("app://nadir/") },
      { type: "separator" },
      { label: "Précédent", accelerator: "CmdOrCtrl+[", click: () => fenetre?.webContents.navigationHistory.goBack() },
      { label: "Suivant", accelerator: "CmdOrCtrl+]", click: () => fenetre?.webContents.navigationHistory.goForward() },
    ] },
    { label: "Présentation", submenu: [{ role: "reload", label: "Actualiser" }, { type: "separator" }, { role: "resetZoom", label: "Taille réelle" }, { role: "zoomIn", label: "Agrandir" }, { role: "zoomOut", label: "Réduire" }, { type: "separator" }, { role: "togglefullscreen", label: "Plein écran" }] },
    { role: "windowMenu", label: "Fenêtre" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(modele));
}

app.whenReady().then(() => {
  app.setName("Nadir Shop Gestion");
  protocol.handle("app", servir);
  // Téléchargements (export Excel) : enregistrés dans « Téléchargements », sans fenêtre de choix
  session.defaultSession.on("will-download", (_e, item) => {
    const nom = item.getFilename() || "export.csv", ext = path.extname(nom), base = path.basename(nom, ext);
    let cible = path.join(app.getPath("downloads"), nom);
    for (let i = 1; fs.existsSync(cible); i++) cible = path.join(app.getPath("downloads"), `${base} (${i})${ext}`);
    item.setSavePath(cible);
    item.once("done", (_ev, etat) => { if (etat === "completed") shell.showItemInFolder(cible); });
  });
  construireMenu();
  creerFenetre();
  setTimeout(() => void verifierMiseAJour(false), 6000);
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) creerFenetre(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
