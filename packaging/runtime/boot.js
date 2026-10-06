(function () {
  const saveKey = "anime-kill.saved-match.v2";
  let legacy = false;
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) {
      const save = JSON.parse(raw);
      legacy = save?.schemaVersion === 2 && save?.appVersion === "0.2.0";
    }
  } catch { /* 交由当前版存档入口报告损坏或存储错误。 */ }

  const script = document.createElement("script");
  script.src = legacy ? "./legacy/v0.2.0/app.bundle.js" : "./dist/app.bundle.js";
  script.onerror = () => {
    const error = document.createElement("div");
    error.textContent = "游戏脚本加载失败，请重试。存档仍保留在本机。";
    const retry = document.createElement("button");
    retry.textContent = "重试";
    retry.onclick = () => location.reload();
    error.appendChild(retry);
    document.body.appendChild(error);
  };
  document.body.appendChild(script);
})();
