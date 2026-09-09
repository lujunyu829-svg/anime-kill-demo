import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const packagingDir = path.dirname(fileURLToPath(import.meta.url));
const androidDir = path.join(packagingDir, "android");
const capacitorCli = path.join(packagingDir, "node_modules", "@capacitor", "cli", "bin", "capacitor");

async function exists(target) {
  try { await access(target); return true; }
  catch { return false; }
}

async function runNpx(args) {
  const { stdout, stderr } = await run(process.execPath, [capacitorCli, ...args], { cwd: packagingDir, windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

if (!await exists(androidDir)) await runNpx(["add", "android"]);
await runNpx(["sync", "android"]);

const iconSource = path.join(packagingDir, "assets", "icon-only.png");
const splashSource = path.join(packagingDir, "assets", "splash.png");
const resDir = path.join(androidDir, "app", "src", "main", "res");
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(densities)) {
  const target = path.join(resDir, `mipmap-${density}`);
  await mkdir(target, { recursive: true });
  await sharp(iconSource).resize(size, size).png().toFile(path.join(target, "ic_launcher.png"));
  await sharp(iconSource).resize(size, size).png().toFile(path.join(target, "ic_launcher_round.png"));
  await sharp(iconSource).resize(Math.round(size * 2.25), Math.round(size * 2.25)).png().toFile(path.join(target, "ic_launcher_foreground.png"));
}
for (const [density, width] of Object.entries({ mdpi: 480, hdpi: 720, xhdpi: 960, xxhdpi: 1440, xxxhdpi: 1920 })) {
  const target = path.join(resDir, `drawable-${density}`);
  await mkdir(target, { recursive: true });
  await sharp(splashSource).resize(width, width).png().toFile(path.join(target, "splash.png"));
}

const manifestPath = path.join(androidDir, "app", "src", "main", "AndroidManifest.xml");
let manifest = await readFile(manifestPath, "utf8");
manifest = manifest.replace(/\s*<uses-permission android:name="android\.permission\.INTERNET"\s*\/?>/g, "");
if (!manifest.includes("android:screenOrientation=")) manifest = manifest.replace(/(<activity\b[^>]*)(>)/, '$1 android:screenOrientation="landscape"$2');
await writeFile(manifestPath, manifest, "utf8");

const variablesPath = path.join(androidDir, "variables.gradle");
let variables = await readFile(variablesPath, "utf8");
variables = variables
  .replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 24")
  .replace(/compileSdkVersion\s*=\s*\d+/, "compileSdkVersion = 36")
  .replace(/targetSdkVersion\s*=\s*\d+/, "targetSdkVersion = 36");
await writeFile(variablesPath, variables, "utf8");

const appGradlePath = path.join(androidDir, "app", "build.gradle");
let appGradle = await readFile(appGradlePath, "utf8");
appGradle = appGradle
  .replace(/versionCode\s+\d+/, "versionCode 3")
  .replace(/versionName\s+"[^"]+"/, 'versionName "0.2.0"');
await writeFile(appGradlePath, appGradle, "utf8");

const stylesPath = path.join(resDir, "values", "styles.xml");
let styles = await readFile(stylesPath, "utf8");
if (!styles.includes("android:navigationBarColor")) {
  const systemBarItems = `
        <item name="android:statusBarColor">#090B17</item>
        <item name="android:navigationBarColor">#090B17</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:windowLightNavigationBar">false</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>`;
  styles = styles
    .replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, `$1${systemBarItems}`)
    .replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, `$1${systemBarItems}`);
  await writeFile(stylesPath, styles, "utf8");
}

console.log("Android 工程已同步：v0.2.0、API 24+、横屏、深色系统栏、无网络权限");
