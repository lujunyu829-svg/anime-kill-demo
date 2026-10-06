import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformIndexHtml } from "../transform-app.mjs";

const SAVE_KEY = "anime-kill.saved-match.v2";

async function boot(raw, { storageThrows = false } = {}) {
  const source = await readFile(new URL("../runtime/boot.js", import.meta.url), "utf8");
  const appended = [];
  const document = {
    body: { appendChild(node) { appended.push(node); } },
    createElement(tag) { return { tagName: tag.toUpperCase(), children: [], appendChild(child) { this.children.push(child); } }; }
  };
  const storage = { getItem(key) { assert.equal(key, SAVE_KEY); if (storageThrows) throw new Error("blocked"); return raw; } };
  let reloads = 0;
  const location = { reload() { reloads++; } };
  vm.runInNewContext(source, { document, localStorage: storage, location });
  return { appended, script: appended.find(node => node.tagName === "SCRIPT"), get reloads() { return reloads; } };
}

test("只有 schema 2 的 v0.2.0 存档加载旧版脚本", async () => {
  const old = await boot(JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" }));
  assert.equal(old.script.src, "./legacy/v0.2.0/app.bundle.js");
  for (const raw of [
    null,
    JSON.stringify({ schemaVersion: 2, appVersion: "0.2.1" }),
    JSON.stringify({ schemaVersion: 2, appVersion: "0.3.0" }),
    JSON.stringify({ schemaVersion: 1, appVersion: "0.2.0" }),
    "{broken"
  ]) {
    assert.equal((await boot(raw)).script.src, "./dist/app.bundle.js");
  }
  assert.equal((await boot(null, { storageThrows: true })).script.src, "./dist/app.bundle.js");
});

test("脚本加载失败时显示重试且不动存档", async () => {
  const state = await boot(JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" }));
  state.script.onerror();
  const error = state.appended.find(node => node.tagName === "DIV");
  assert.match(error.textContent, /加载失败/);
  const retry = error.children.find(node => node.tagName === "BUTTON");
  retry.onclick();
  assert.equal(state.reloads, 1);
});

test("仅封装页面使用启动脚本，根网页版入口保持原样", async () => {
  const original = await readFile(new URL("../../index.html", import.meta.url), "utf8");
  assert.match(original, /<script src="\.\/dist\/app\.bundle\.js"><\/script>/);
  const packaged = transformIndexHtml(original);
  assert.match(packaged, /<script src="\.\/boot\.js"><\/script>/);
  assert.doesNotMatch(packaged, /<script src="\.\/dist\/app\.bundle\.js"><\/script>/);
});
