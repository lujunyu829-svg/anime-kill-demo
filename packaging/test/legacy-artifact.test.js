import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformIndexHtml } from "../transform-app.mjs";
import { SAVE_KEY, inspectSavedMatch } from "../runtime/persistence.js";

const legacyScript = new URL("../legacy/v0.2.0/app.bundle.js", import.meta.url);
const checksumFile = new URL("../legacy/v0.2.0/SHA256.txt", import.meta.url);
const v021Script = new URL("../legacy/v0.2.1/app.bundle.js", import.meta.url);
const v021Checksum = new URL("../legacy/v0.2.1/SHA256.txt", import.meta.url);

test("冻结的 v0.2.1 封装脚本与登记的 SHA-256 一致", async () => {
  const [bytes, registered] = await Promise.all([readFile(v021Script), readFile(v021Checksum, "utf8")]);
  assert.match(registered.trim(), /^[a-f0-9]{64}$/);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), registered.trim());
  const source = bytes.toString("utf8");
  assert.match(source, /anime-kill\.saved-match\.v2/);
  assert.match(source, /0\.2\.1/);
});

test("冻结的 v0.2.0 封装脚本与登记的 SHA-256 一致", async () => {
  const [bytes, registered] = await Promise.all([readFile(legacyScript), readFile(checksumFile, "utf8")]);
  assert.match(registered.trim(), /^[a-f0-9]{64}$/);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), registered.trim());
  const source = bytes.toString("utf8");
  assert.match(source, /anime-kill\.saved-match\.v2/);
  assert.match(source, /0\.2\.0/);
});

test("旧版脚本直接查询的元素在新版封装页面仍存在", async () => {
  const [source, originalHtml] = await Promise.all([
    readFile(legacyScript, "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8")
  ]);
  const html = transformIndexHtml(originalHtml);
  const queriedIds = [...source.matchAll(/\$\(["']#([A-Za-z][\w-]*)["']\)/g)].map(match => match[1]);
  assert.ok(queriedIds.length > 20, "应实际扫描到旧版页面选择器");
  for (const id of new Set(queriedIds)) assert.match(html, new RegExp(`id="${id}"`), `缺少旧版元素 #${id}`);
});

test("Windows Git 重新检出旧版脚本后 SHA-256 仍一致", async () => {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const temp = await mkdtemp(path.join(tmpdir(), "anime-kill-legacy-checkout-"));
  try {
    execFileSync("git", ["-c", "core.autocrlf=true", "-c", "core.eol=crlf", "checkout-index", `--prefix=${temp}${path.sep}`, "--", "packaging/legacy/v0.2.0/app.bundle.js"], { cwd: root });
    const bytes = await readFile(path.join(temp, "packaging", "legacy", "v0.2.0", "app.bundle.js"));
    const registered = (await readFile(checksumFile, "utf8")).trim();
    assert.equal(createHash("sha256").update(bytes).digest("hex"), registered);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("Windows Git 重新检出 v0.2.1 脚本后 SHA-256 仍一致", async () => {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const temp = await mkdtemp(path.join(tmpdir(), "anime-kill-v021-checkout-"));
  try {
    execFileSync("git", ["-c", "core.autocrlf=true", "-c", "core.eol=crlf", "checkout-index", `--prefix=${temp}${path.sep}`, "--", "packaging/legacy/v0.2.1/app.bundle.js"], { cwd: root });
    const bytes = await readFile(path.join(temp, "packaging", "legacy", "v0.2.1", "app.bundle.js"));
    const registered = (await readFile(v021Checksum, "utf8")).trim();
    assert.equal(createHash("sha256").update(bytes).digest("hex"), registered);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test("五类 v0.2.0 真实存档保留版本与待处理窗口，当前引擎拒绝误恢复", async () => {
  for (const [name, pendingKind] of [
    ["response", "response"], ["discard", "discard"], ["choice", "choice"],
    ["ai-turn", null], ["nami", "choice"]
  ]) {
    const raw = await readFile(new URL(`./fixtures/v020-${name}.json`, import.meta.url), "utf8");
    const save = JSON.parse(raw);
    assert.equal(save.schemaVersion, 2, name);
    assert.equal(save.appVersion, "0.2.0", name);
    assert.equal(save.stateDigest.pendingKind, pendingKind, name);
    assert.ok(save.seed > 0 && Array.isArray(save.commands), name);
    const inspected = inspectSavedMatch({ getItem(key) { assert.equal(key, SAVE_KEY); return raw; } });
    assert.equal(inspected.exists, true, name);
    assert.equal(inspected.valid, false, name);
  }
});

test("v0.2.1 真实响应窗口存档保留命令日志，当前引擎拒绝误恢复", async () => {
  const raw = await readFile(new URL("./fixtures/v021-response.json", import.meta.url), "utf8");
  const save = JSON.parse(raw);
  assert.equal(save.schemaVersion, 2);
  assert.equal(save.appVersion, "0.2.1");
  assert.equal(save.stateDigest.pendingKind, "response");
  assert.ok(save.seed > 0 && save.commands.length > 0);
  const inspected = inspectSavedMatch({ getItem(key) { assert.equal(key, SAVE_KEY); return raw; } });
  assert.equal(inspected.exists, true);
  assert.equal(inspected.valid, false);
});
