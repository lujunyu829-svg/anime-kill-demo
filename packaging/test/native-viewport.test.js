import assert from "node:assert/strict";
import test from "node:test";

const viewportModule = await import("../runtime/native-viewport.js").catch(() => ({}));
const resolveNativeViewport = viewportModule.resolveNativeViewport || (() => null);
const installNativeViewport = viewportModule.installNativeViewport || (() => null);

test("真机布局优先使用 visualViewport 而不是较大的 CSS 布局视口", () => {
  const actual = resolveNativeViewport({
    innerWidth: 1440,
    innerHeight: 900,
    visualViewport: {
      width: 915.5,
      height: 412.25,
      offsetLeft: 22,
      offsetTop: 0
    }
  });

  assert.deepEqual(actual, {
    width: 915.5,
    height: 412.25,
    offsetLeft: 22,
    offsetTop: 0,
    landscape: true,
    short: true
  });
});

test("没有 visualViewport 时安全回退到窗口尺寸", () => {
  assert.deepEqual(resolveNativeViewport({ innerWidth: 1280, innerHeight: 720 }), {
    width: 1280,
    height: 720,
    offsetLeft: 0,
    offsetTop: 0,
    landscape: true,
    short: false
  });
});

test("安装后把真实可视区域写入根节点并随真机视口变化更新", () => {
  const classes = new Set();
  const properties = new Map();
  const visualListeners = new Map();
  const windowListeners = new Map();
  const visualViewport = {
    width: 915,
    height: 412,
    offsetLeft: 18,
    offsetTop: 0,
    addEventListener(type, listener) { visualListeners.set(type, listener); },
    removeEventListener(type) { visualListeners.delete(type); }
  };
  const windowLike = {
    innerWidth: 1440,
    innerHeight: 900,
    visualViewport,
    requestAnimationFrame(callback) { callback(); return 1; },
    cancelAnimationFrame() {},
    addEventListener(type, listener) { windowListeners.set(type, listener); },
    removeEventListener(type) { windowListeners.delete(type); }
  };
  const documentLike = {
    documentElement: {
      classList: {
        add(...tokens) { tokens.forEach(token => classes.add(token)); },
        toggle(token, enabled) { enabled ? classes.add(token) : classes.delete(token); }
      },
      style: { setProperty(name, value) { properties.set(name, value); } }
    }
  };

  const cleanup = installNativeViewport(windowLike, documentLike);

  assert.equal(classes.has("native-android"), true);
  assert.equal(classes.has("native-landscape"), true);
  assert.equal(classes.has("native-short"), true);
  assert.equal(properties.get("--native-viewport-width"), "915px");
  assert.equal(properties.get("--native-viewport-height"), "412px");
  assert.equal(properties.get("--native-viewport-left"), "18px");

  visualViewport.width = 880;
  visualListeners.get("resize")();
  assert.equal(properties.get("--native-viewport-width"), "880px");

  cleanup();
  assert.equal(visualListeners.size, 0);
  assert.equal(windowListeners.size, 0);
});
