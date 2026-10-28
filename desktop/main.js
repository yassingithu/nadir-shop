// Nadir Shop Gestion : l'administration de la boutique dans une application Mac / Windows.
// Le site (dossier « app ») est embarqué dans l'application et parle directement à la base Supabase de la boutique.
const { app, BrowserWindow, Menu, protocol, net, shell, session } = require("electron");
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
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) creerFenetre(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
