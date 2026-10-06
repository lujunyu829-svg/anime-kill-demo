import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { transformIndexHtml } from "../transform-app.mjs";

const SAVE_KEY = "anime-kill.saved-match.v2";

async function boot(raw, { storageThrows = false, confirm = true } = {}) {
  const source = await readFile(new URL("../runtime/boot.js", import.meta.url), "utf8");
  const appended = [];
  const listeners = [];
  const document = {
    body: { appendChild(node) { appended.push(node); } },
    createElement(tag) { return { tagName: tag.toUpperCase(), children: [], style: {}, appendChild(child) { this.children.push(child); } }; },
    addEventListener(type, handler, capture) { listeners.push({ type, handler, capture }); }
  };
  let saved = raw;
  let removals = 0;
  const storage = {
    getItem(key) { assert.equal(key, SAVE_KEY); if (storageThrows) throw new Error("blocked"); return saved; },
    removeItem(key) { assert.equal(key, SAVE_KEY); saved = null; removals++; }
  };
  let reloads = 0;
  const alerts = [];
  const location = { reload() { reloads++; } };
  vm.runInNewContext(source, { document, localStorage: storage, location, window: { confirm: () => confirm, alert: message => alerts.push(message) } });
  return {
    appended, listeners, storage, alerts,
    script: appended.find(node => node.tagName === "SCRIPT"),
    get saved() { return saved; },
    get removals() { return removals; },
    get reloads() { return reloads; },
    click(id) {
      let stopped = false;
      const event = {
        target: { closest(selector) { return selector === "button" ? { id } : null; } },
        preventDefault() {},
        stopImmediatePropagation() { stopped = true; }
      };
      for (const listener of listeners.filter(item => item.type === "click")) listener.handler(event);
      return stopped;
    }
  };
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
  const error = state.appended.find(node => /加载失败/.test(node.textContent));
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

test("旧版大厅取消放弃或新开时保留存档", async () => {
  const raw = JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" });
  for (const id of ["startButton", "discardSaveButton"]) {
    const state = await boot(raw, { confirm: false });
    assert.equal(state.click(id), true);
    assert.equal(state.saved, raw);
    assert.equal(state.removals, 0);
    assert.equal(state.reloads, 0);
  }
});

test("旧版大厅确认放弃或新开时先清存档再刷新", async () => {
  const raw = JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" });
  for (const id of ["startButton", "discardSaveButton"]) {
    const state = await boot(raw);
    assert.equal(state.click(id), true);
    assert.equal(state.saved, null);
    assert.equal(state.removals, 1);
    assert.equal(state.reloads, 1);
  }
});

test("旧局终局按钮切换新版，战斗返回大厅不丢旧存档", async () => {
  const raw = JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" });
  const running = await boot(raw);
  assert.equal(running.click("backButton"), false);
  assert.equal(running.saved, raw);
  assert.equal(running.reloads, 0);
  for (const id of ["resultLobby", "rematchButton"]) {
    const state = await boot(raw);
    state.storage.removeItem(SAVE_KEY);
    assert.equal(state.click(id), true);
    assert.equal(state.reloads, 1);
  }
});

test("结果界面若仍有旧存档则不启动旧版新局", async () => {
  const raw = JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" });
  const state = await boot(raw);
  assert.equal(state.click("rematchButton"), true);
  assert.equal(state.saved, raw);
  assert.equal(state.reloads, 0);
  assert.match(state.alerts[0], /尚未完成/);
});

test("旧版对局显示规则版本提示且只安装一个捕获监听器", async () => {
  const old = await boot(JSON.stringify({ schemaVersion: 2, appVersion: "0.2.0" }));
  assert.ok(old.appended.some(node => /旧版规则/.test(node.textContent)));
  assert.equal(old.listeners.filter(item => item.type === "click" && item.capture).length, 1);
  const current = await boot(null);
  assert.equal(current.listeners.length, 0);
});

test("五类真实旧版存档都路由到冻结规则脚本", async () => {
  for (const name of ["response", "discard", "choice", "ai-turn", "nami"]) {
    const raw = await readFile(new URL(`./fixtures/v020-${name}.json`, import.meta.url), "utf8");
    assert.equal((await boot(raw)).script.src, "./legacy/v0.2.0/app.bundle.js", name);
  }
});
