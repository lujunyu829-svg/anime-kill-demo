import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mobileCss = await readFile(new URL("../runtime/mobile.css", import.meta.url), "utf8");
const transformSource = await readFile(new URL("../transform-app.mjs", import.meta.url), "utf8");
const androidSource = await readFile(new URL("../prepare-android.mjs", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../../index.html", import.meta.url), "utf8");
const appSource = await readFile(new URL("../../src/app.js", import.meta.url), "utf8");

test("安卓横屏由真机视口类驱动并保留可滑动区域", () => {
  assert.match(mobileCss, /html\.native-android,html\.native-android body\{width:var\(--native-viewport-width/);
  assert.match(mobileCss, /html\.native-android \.lobby\{[^}]*overflow-y:auto[^}]*touch-action:pan-y/);
  assert.match(mobileCss, /html\.native-android \.hand\{[^}]*touch-action:pan-x/);
  assert.match(mobileCss, /native-landscape \.game-layout\{height:calc\(100% - 52px\);min-height:0/);
  assert.match(mobileCss, /native-landscape \.player-area\{[^}]*height:166px/);
  assert.match(mobileCss, /native-landscape \.intel-panel\{position:fixed/);
  assert.match(transformSource, /installNativeViewport\(window, document\)/);
});

test("封装页面与安卓主题覆盖刘海和深色系统栏", () => {
  assert.match(transformSource, /viewport-fit=cover/);
  assert.match(androidSource, /android:navigationBarColor/);
  assert.match(androidSource, /android:windowLayoutInDisplayCutoutMode/);
});

test("安卓横屏始终显示可用的结束回合按钮并复用结束逻辑", () => {
  assert.match(indexSource, /id="compactEndTurnButton"[^>]*>结束回合</);
  assert.match(mobileCss, /native-landscape \.compact-end-turn\{display:block/);
  assert.match(appSource, /compactEndTurnButton/);
  assert.match(appSource, /endHumanTurn\(\)/);
});
