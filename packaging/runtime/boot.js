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

  if (legacy) {
    const notice = document.createElement("div");
    notice.textContent = "正在继续 v0.2.0 旧版规则对局；结束后返回新版。";
    Object.assign(notice.style, {
      position: "fixed", left: "8px", bottom: "8px", zIndex: "1000",
      padding: "5px 9px", borderRadius: "6px", color: "#fff",
      background: "#263452", fontSize: "12px", pointerEvents: "none"
    });
    document.body.appendChild(notice);

    document.addEventListener("click", event => {
      const id = event.target.closest("button")?.id;
      if (["startButton", "discardSaveButton"].includes(id)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!window.confirm("放弃 v0.2.0 未完成对局并切换到新版？此操作无法撤销。")) return;
        try { localStorage.removeItem(saveKey); }
        catch { window.alert("无法删除旧存档，请检查设备存储后重试。"); return; }
        location.reload();
      } else if (["resultLobby", "rematchButton"].includes(id)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          if (localStorage.getItem(saveKey)) { window.alert("旧对局尚未完成，无法切换新版。"); return; }
        } catch { window.alert("无法检查旧存档，请重试。"); return; }
        location.reload();
      }
    }, true);
  }

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
