import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileCss = await readFile(new URL("../runtime/mobile.css", import.meta.url), "utf8");
const transformSource = await readFile(new URL("../transform-app.mjs", import.meta.url), "utf8");
const androidSource = await readFile(new URL("../prepare-android.mjs", import.meta.url), "utf8");

test("安卓横屏覆盖桌面最小高度并保留底部操作区", () => {
  assert.match(mobileCss, /orientation:landscape[^}]*max-height:700px/);
  assert.match(mobileCss, /\.screen,\.game\{height:100%;min-height:0/);
  assert.match(mobileCss, /\.game-layout\{height:calc\(100% - 52px\);min-height:0/);
  assert.match(mobileCss, /\.player-area\{[^}]*height:166px/);
  assert.match(mobileCss, /\.intel-panel\{position:fixed/);
});

test("封装页面与安卓主题覆盖刘海和深色系统栏", () => {
  assert.match(transformSource, /viewport-fit=cover/);
  assert.match(androidSource, /android:navigationBarColor/);
  assert.match(androidSource, /android:windowLayoutInDisplayCutoutMode/);
});
