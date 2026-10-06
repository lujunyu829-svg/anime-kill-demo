import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

test("桌面窗口允许自身首页刷新但仍禁止外部和相邻文件导航", async () => {
  const source = await readFile(new URL("../desktop/main.cjs", import.meta.url), "utf8");
  const desktopDir = fileURLToPath(new URL("../desktop/", import.meta.url));
  let webContents;
  class BrowserWindow {
    constructor() {
      const handlers = new Map();
      webContents = { on(name, handler) { handlers.set(name, handler); }, setWindowOpenHandler() {}, handlers };
      this.webContents = webContents;
    }
    loadFile() {}
    static getAllWindows() { return []; }
  }
  const app = { requestSingleInstanceLock: () => true, whenReady: () => Promise.resolve(), on() {} };
  vm.runInNewContext(source, { require: name => name === "electron" ? { app, BrowserWindow } : name === "node:path" ? path : { pathToFileURL }, __dirname: desktopDir, process: { argv: [] }, setTimeout });
  await new Promise(resolve => setImmediate(resolve));
  const navigate = webContents.handlers.get("will-navigate");
  assert.equal(typeof navigate, "function");
  const pageUrl = pathToFileURL(path.join(desktopDir, "..", "www", "index.html")).href;
  for (const [url, shouldBlock] of [[pageUrl, false], ["https://example.org", true], [pathToFileURL(path.join(desktopDir, "..", "www", "other.html")).href, true]]) {
    let blocked = false;
    navigate({ preventDefault() { blocked = true; } }, url);
    assert.equal(blocked, shouldBlock, url);
  }
});
