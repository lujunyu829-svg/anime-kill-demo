import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { transformIndexHtml } from "../transform-app.mjs";

const legacyScript = new URL("../legacy/v0.2.0/app.bundle.js", import.meta.url);
const checksumFile = new URL("../legacy/v0.2.0/SHA256.txt", import.meta.url);

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
