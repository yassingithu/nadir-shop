// Signature « ad hoc » : obligatoire pour qu'une app non notarisée démarre sur les Mac Apple Silicon (M1, M2, M3…)
const { execSync } = require("child_process");
const path = require("path");
exports.default = async function (context) {
  if (context.electronPlatformName !== "darwin") return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: "inherit" });
  execSync(`codesign --verify --deep --strict "${app}"`, { stdio: "inherit" });
};
