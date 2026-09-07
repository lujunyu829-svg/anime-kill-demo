import { build } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { transformAppSource, transformIndexHtml } from "./transform-app.mjs";

const packagingDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(packagingDir);
const webDir = path.join(root, "www");
const appDir = path.join(packagingDir, "app");
const sourceApp = path.join(root, "src", "app.js");

async function copyWebpTree(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyWebpTree(from, to);
    else if (entry.name.endsWith(".webp")) await cp(from, to);
  }
}

const resolvedWeb = path.resolve(webDir);
if (resolvedWeb !== path.resolve(root, "www")) throw new Error("发布目录校验失败");
await rm(webDir, { recursive: true, force: true });
await rm(appDir, { recursive: true, force: true });
await mkdir(path.join(webDir, "dist"), { recursive: true });

await build({
  entryPoints: [sourceApp],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  outfile: path.join(webDir, "dist", "app.bundle.js"),
  nodePaths: [path.join(packagingDir, "node_modules")],
  banner: { js: "/* Generated packaged bundle. Edit src/ and packaging/runtime/, then rebuild. */" },
  plugins: [{
    name: "anime-kill-packaged-runtime",
    setup(context) {
      context.onLoad({ filter: /src[\\/]app\.js$/ }, async args => ({ contents: transformAppSource(await readFile(args.path, "utf8")), loader: "js" }));
    }
  }]
});

const [indexHtml, baseCss, mobileCss] = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "styles.css"), "utf8"),
  readFile(path.join(packagingDir, "runtime", "mobile.css"), "utf8")
]);
await writeFile(path.join(webDir, "index.html"), transformIndexHtml(indexHtml), "utf8");
await writeFile(path.join(webDir, "styles.css"), baseCss, "utf8");
await writeFile(path.join(webDir, "mobile.css"), mobileCss, "utf8");
await copyWebpTree(path.join(root, "assets"), path.join(webDir, "assets"));

const svg = path.join(packagingDir, "assets", "icon.svg");
const iconPng = path.join(packagingDir, "assets", "icon-only.png");
const splashPng = path.join(packagingDir, "assets", "splash.png");
await sharp(svg).resize(1024, 1024).png().toFile(iconPng);
await sharp({ create: { width: 2732, height: 2732, channels: 4, background: "#090b17" } }).composite([{ input: await sharp(svg).resize(1180, 1180).png().toBuffer(), gravity: "center" }]).png().toFile(splashPng);
await cp(iconPng, path.join(webDir, "assets", "app-icon.png"));

await mkdir(path.join(appDir, "desktop"), { recursive: true });
await cp(path.join(packagingDir, "desktop", "main.cjs"), path.join(appDir, "desktop", "main.cjs"));
await cp(webDir, path.join(appDir, "www"), { recursive: true });
await writeFile(path.join(appDir, "package.json"), JSON.stringify({ name: "anime-kill-demo", version: "0.1.1", private: true, main: "desktop/main.cjs" }, null, 2), "utf8");

const size = (await stat(path.join(webDir, "dist", "app.bundle.js"))).size;
console.log(`已生成共享离线版本 www/（脚本 ${Math.round(size / 1024)} KiB）`);
