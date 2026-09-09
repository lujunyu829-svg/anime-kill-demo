import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("网页版构建产物包含海贼王扩展的状态初始化实现", async () => {
  const bundle = await readFile(new URL("../dist/app.bundle.js", import.meta.url), "utf8");
  assert.match(bundle, /function\s+initializeOnePieceState\s*\(/);
  assert.match(bundle, /function\s+handleOnePieceEvent\s*\(/);
  assert.match(bundle, /const\s+onePieceSignatureCost\s*=\s*signatureCost/);
});
