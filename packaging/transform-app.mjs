function replaceOnce(source, search, replacement, label) {
  const index = source.indexOf(search);
  if (index < 0) throw new Error(`无法注入${label}：上游源码结构已变化`);
  return source.slice(0, index) + replacement + source.slice(index + search.length);
}

export function transformAppSource(original) {
  original = original.replace(/\r\n/g, "\n");
  let source = `import { App as CapacitorApp } from "@capacitor/app";\nimport { Capacitor } from "@capacitor/core";\nimport { GameSession, discardSavedMatch, inspectSavedMatch, restoreSavedMatch } from "../packaging/runtime/persistence.js";\nimport { installNativeViewport } from "../packaging/runtime/native-viewport.js";\nif (Capacitor.isNativePlatform()) installNativeViewport(window, document);\n${original}`;

  source = replaceOnce(source, "let engine = null;", "let engine = null;\nlet gameSession = null;", "会话变量");
  source = replaceOnce(source, "  renderCharacterPreview(selectedCharacter);\n}", "  renderCharacterPreview(selectedCharacter);\n  renderResumePanel();\n}", "大厅存档入口");
  source = replaceOnce(source, "seriesFilters.addEventListener(\"click\", event => {", `function renderResumePanel() {
  const panel = $("#resumePanel"), copy = $("#resumeCopy"), continueButton = $("#continueGameButton");
  if (!panel || !copy || !continueButton) return;
  const inspected = inspectSavedMatch();
  panel.hidden = !inspected.exists;
  if (!inspected.exists) return;
  continueButton.disabled = !inspected.valid;
  if (!inspected.valid) { copy.textContent = \`存档无法读取：\${inspected.reason || "内容已损坏"}\`; return; }
  const { save } = inspected;
  const mode = modes.find(item => item.id === save.config.modeId);
  const character = getCharacter(save.config.humanCharacterId);
  const when = save.savedAt ? new Date(save.savedAt).toLocaleString("zh-CN", { hour12: false }) : "未知时间";
  copy.textContent = \`\${mode?.name || save.config.modeId} · \${character?.name || save.config.humanCharacterId} · 第\${save.stateDigest?.round || 1}轮 · \${when}\`;
}

seriesFilters.addEventListener("click", event => {`, "存档摘要");

  source = replaceOnce(source, "$(\"#startButton\").addEventListener(\"click\", startGame);", "$(\"#startButton\").addEventListener(\"click\", () => startGame());", "新对局按钮");
  source = replaceOnce(source, "$(\"#backButton\").addEventListener(\"click\", returnLobby);", `$("#backButton").addEventListener("click", returnLobby);
$("#continueGameButton").addEventListener("click", continueSavedGame);
$("#discardSaveButton").addEventListener("click", () => {
  if (!window.confirm("确定放弃这场未结束的对局吗？此操作无法撤销。")) return;
  discardSavedMatch();
  renderResumePanel();
});`, "存档按钮事件");

  source = replaceOnce(source, "function startGame() {\n  clearTimeout(aiTimer);", `function startGame(force = false) {
  if (!force && inspectSavedMatch().exists && !window.confirm("开始新对局会覆盖现有存档，是否继续？")) return;
  clearTimeout(aiTimer);
  discardSavedMatch();`, "新对局覆盖确认");
  source = replaceOnce(source, "  engine = new GameEngine(lastMode).setup();", "  gameSession = new GameSession({ config: lastMode });\n  engine = gameSession.engine;\n  gameSession.saveNow();", "确定性会话初始化");
  source = replaceOnce(source, "function returnLobby() {", `function continueSavedGame() {
  clearTimeout(aiTimer);
  try {
    const restored = restoreSavedMatch();
    gameSession = restored.session;
    engine = gameSession.engine;
    lastMode = { ...restored.save.config };
    selectedMode = lastMode.modeId;
    selectedCharacter = lastMode.humanCharacterId;
    identityPredictions = new Map(restored.save.ui?.identityPredictions || []);
    previousHp = new Map(engine.players.map(player => [player.id, player.hp]));
    selectedCard = null; selectingSignature = false; selectingActive = false;
    discardSelection = new Set(); activeDiscardPromptId = null;
    lobby.classList.add("hidden"); game.classList.remove("hidden");
    renderGame(); continueFlow(320);
  } catch (error) {
    window.alert(\`无法恢复对局：\${error?.message || "未知错误"}\`);
    renderResumePanel();
  }
}

function returnLobby() {`, "继续对局流程");
  source = replaceOnce(source, "  engine = null;\n  previousHp", "  engine = null;\n  gameSession = null;\n  previousHp", "退出会话");
  source = replaceOnce(source, "  lobby.classList.remove(\"hidden\");\n}", "  lobby.classList.remove(\"hidden\");\n  renderLobby();\n}", "返回大厅刷新");
  source = replaceOnce(source, "function continueFlow(delay = 520) {", `function runGameCommand(method, ...args) {
  if (!gameSession) return engine?.[method]?.(...args);
  const result = gameSession.execute(method, ...args);
  if (gameSession.engine.winner) gameSession.clear();
  return result;
}

function saveUiState() {
  gameSession?.updateUi({ identityPredictions: [...identityPredictions.entries()] });
}

function continueFlow(delay = 520) {`, "命令日志入口");

  const commandReplacements = [
    ["engine.advancePastEliminatedCurrent()", "runGameCommand(\"advancePastEliminatedCurrent\")"],
    ["engine.aiStep(current.id)", "runGameCommand(\"aiStep\", current.id)"],
    ["engine.endTurn(current.id)", "runGameCommand(\"endTurn\", current.id)"],
    ["engine.playCard(human.id, selectedCard, targetId)", "runGameCommand(\"playCard\", human.id, selectedCard, targetId)"],
    ["engine.useSignature(human.id, targetId)", "runGameCommand(\"useSignature\", human.id, targetId)"],
    ["engine.useActiveSkill(human.id, targetId)", "runGameCommand(\"useActiveSkill\", human.id, targetId)"],
    ["engine.revealRole(human.id)", "runGameCommand(\"revealRole\", human.id)"],
    ["engine.endTurn(human.id)", "runGameCommand(\"endTurn\", human.id)"],
    ["engine.confirmDiscard(pending.playerId, [...discardSelection])", "runGameCommand(\"confirmDiscard\", pending.playerId, [...discardSelection])"],
    ["engine.resolveChoice(pending.playerId, button.dataset.choiceValue)", "runGameCommand(\"resolveChoice\", pending.playerId, button.dataset.choiceValue)"],
    ["engine.respond(useCard)", "runGameCommand(\"respond\", useCard)"]
  ];
  for (const [search, replacement] of commandReplacements) source = replaceOnce(source, search, replacement, `操作记录 ${search}`);

  source = replaceOnce(source, "  else if (predictionRoleIds.includes(roleId)) identityPredictions.set(player.id, roleId);", "  else if (predictionRoleIds.includes(roleId)) identityPredictions.set(player.id, roleId);\n  saveUiState();", "身份预测存档");
  source = replaceOnce(source, "  $(\"#resultCopy\").textContent = `${engine.winner.label} · 对局进行至第 ${engine.round} 轮。`;", "  $(\"#resultCopy\").textContent = `${engine.winner.label} · 对局进行至第 ${engine.round} 轮。`;\n  gameSession?.clear();", "结束后清理存档");
  source = replaceOnce(source, "startGame(); });", "startGame(true); });", "重新对局");
  source = replaceOnce(source, "function showToast(message) {", `function closeTopLayerOrNavigateBack() {
  const openDialog = [...document.querySelectorAll("dialog[open]")].pop();
  if (openDialog && ![responseDialog, discardDialog, choiceDialog].includes(openDialog)) { openDialog.close(); return true; }
  if ($(".intel-panel")?.classList.contains("open")) { toggleIntel(false); return true; }
  if (!game.classList.contains("hidden")) { returnLobby(); return true; }
  return false;
}

if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener("backButton", () => {
    if (!closeTopLayerOrNavigateBack()) CapacitorApp.exitApp();
  });
}

window.addEventListener("beforeunload", saveUiState);

function showToast(message) {`, "Android 返回键");
  return source;
}

export function transformIndexHtml(original) {
  original = original.replace(/\r\n/g, "\n");
  let html = original;
  html = replaceOnce(html, "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />", "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, viewport-fit=cover\" />", "安卓安全区视口");
  html = replaceOnce(html, "  <meta name=\"theme-color\" content=\"#090b17\" />", `  <meta name="theme-color" content="#090b17" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: capacitor:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: capacitor:; font-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" />
  <link rel="icon" href="./assets/app-icon.png" />`, "安全策略");
  html = replaceOnce(html, "  <link rel=\"stylesheet\" href=\"./styles.css\" />", "  <link rel=\"stylesheet\" href=\"./styles.css\" />\n  <link rel=\"stylesheet\" href=\"./mobile.css\" />", "封装样式");
  html = replaceOnce(html, `        </div>
      </section>
    </section>

    <section id="game"`, `        </div>
        <section id="resumePanel" class="resume-panel" hidden>
          <div><span>LOCAL SAVE</span><h3>继续未完成的对局</h3><p id="resumeCopy"></p></div>
          <div class="resume-actions"><button id="discardSaveButton" class="ghost-button" type="button">放弃存档</button><button id="continueGameButton" class="primary-button" type="button">继续对局 <span>→</span></button></div>
        </section>
      </section>
    </section>

    <section id="game"`, "继续对局面板");
  return html.replace("<title>动漫杀 · 战术演示版</title>", "<title>动漫杀 Demo</title>");
}
