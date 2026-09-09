function finitePositive(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteOffset(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function resolveNativeViewport(windowLike) {
  const visual = windowLike?.visualViewport;
  const width = finitePositive(visual?.width, finitePositive(windowLike?.innerWidth, 1));
  const height = finitePositive(visual?.height, finitePositive(windowLike?.innerHeight, 1));

  return {
    width,
    height,
    offsetLeft: finiteOffset(visual?.offsetLeft),
    offsetTop: finiteOffset(visual?.offsetTop),
    landscape: width >= height,
    short: height <= 460
  };
}

export function installNativeViewport(windowLike, documentLike) {
  const root = documentLike.documentElement;
  const visual = windowLike.visualViewport;
  let animationFrame = 0;

  const apply = () => {
    animationFrame = 0;
    const viewport = resolveNativeViewport(windowLike);
    root.classList.add("native-android");
    root.classList.toggle("native-landscape", viewport.landscape);
    root.classList.toggle("native-portrait", !viewport.landscape);
    root.classList.toggle("native-short", viewport.short);
    root.style.setProperty("--native-viewport-width", `${viewport.width}px`);
    root.style.setProperty("--native-viewport-height", `${viewport.height}px`);
    root.style.setProperty("--native-viewport-left", `${viewport.offsetLeft}px`);
    root.style.setProperty("--native-viewport-top", `${viewport.offsetTop}px`);
  };

  const schedule = () => {
    if (animationFrame) windowLike.cancelAnimationFrame(animationFrame);
    animationFrame = windowLike.requestAnimationFrame(apply);
  };

  apply();
  visual?.addEventListener("resize", schedule);
  visual?.addEventListener("scroll", schedule);
  windowLike.addEventListener("resize", schedule);
  windowLike.addEventListener("orientationchange", schedule);

  return () => {
    if (animationFrame) windowLike.cancelAnimationFrame(animationFrame);
    visual?.removeEventListener("resize", schedule);
    visual?.removeEventListener("scroll", schedule);
    windowLike.removeEventListener("resize", schedule);
    windowLike.removeEventListener("orientationchange", schedule);
  };
}
