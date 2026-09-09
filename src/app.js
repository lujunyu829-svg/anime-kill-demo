import { GameEngine } from "./engine.js";
import { activeSkills, cardArtPath, cardDefinitions, characters, deckProfiles, modes, roles, getCharacter, portraitPath, tableSeatPosition } from "./data.js";

const $ = selector => document.querySelector(selector);
const lobby = $("#lobby"), game = $("#game");
const modeList = $("#modeList"), characterList = $("#characterList"), seriesFilters = $("#seriesFilters");
const characterPreview = $("#characterPreview");
const rulesDialog = $("#rulesDialog"), cardCodexDialog = $("#cardCodexDialog"), playerDetailDialog = $("#playerDetailDialog"), cardDetailDialog = $("#cardDetailDialog"), responseDialog = $("#responseDialog"), discardDialog = $("#discardDialog"), choiceDialog = $("#choiceDialog"), resultDialog = $("#resultDialog");

let selectedMode = "classic8";
let selectedCharacter = "naruto";
let selectedSeries = "火影忍者";
let engine = null;
let selectedCard = null;
let selectingSignature = false;
let selectingActive = false;
let aiTimer = null;
let toastTimer = null;
let lastMode = null;
let codexFilter = "all";
let selectedCodexCard = "attack";
let discardSelection = new Set();
let activeDiscardPromptId = null;
let inspectedPlayerId = null;
let inspectedCardUid = null;
let identityPredictions = new Map();
let previousHp = new Map();

const cardTypeLabels = { basic: "基础牌", strategy: "策略牌", equipment: "装备牌" };
const cardColorMap = { red: "#ff667f", blue: "#6ecdf2", green: "#65dda3", gold: "#f5c66a", violet: "#9d7df2", cyan: "#6be1ea", orange: "#f29a5b" };
const targetLabels = { self: "自身", enemy: "敌方", ally: "友方", marked: "棋子目标", illusion: "幻象目标", swapMarked: "天手力标记", scouted: "白眼锁定" };
const slotLabels = { weapon: "武器槽", armor: "防具槽", charm: "饰品槽" };
const strategyKindLabels = { instant: "即时策略", plot: "暗置伏笔", response: "响应策略" };
const predictionRoleIds = ["loyal", "rebel", "lone"];

function artMarkup(card, className, alt = "") {
  const path = cardArtPath(card.id);
  return path ? `<span class="${className}"><img src="${path}" alt="${alt}" draggable="false" decoding="async"></span>` : `<span class="${className} generated-art" aria-label="${alt}"><i>${card.icon}</i><b>${card.strategyKind === "plot" ? "PLOT" : card.type === "equipment" ? "GEAR" : card.type === "strategy" ? "TACTIC" : "BASIC"}</b></span>`;
}

function cardRuleText(card) { return card.fullDescription || card.description; }

function hpPips(player, className = "") {
  const current = Math.max(0, player.hp);
  const hearts = Array.from({ length: player.maxHp }, (_, index) => `<i class="${index < current ? "full" : "empty"}" aria-hidden="true">${index < current ? "♥" : "♡"}</i>`).join("");
  return `<span class="hp-pips ${className}" role="img" aria-label="体力 ${current}/${player.maxHp}" title="体力 ${current}/${player.maxHp}">${hearts}</span>`;
}

function dreamBadge(player, character) {
  if (!character?.dream || !player?.dreamState) return "";
  const state = player.dreamState;
  return `<span class="dream-badge ${state.awakened ? "dream-awakened" : ""}" title="梦想：${character.dream.name}">${state.awakened ? "觉醒" : `航迹 ${state.progress}/3`}</span>`;
}

function cardTags(card) {
  const tags = [cardTypeLabels[card.type], `标准 ×${deckProfiles.standard144[card.id]}`, `精简 ×${deckProfiles.compact80[card.id]}`];
  if (card.strategyKind) tags.push(strategyKindLabels[card.strategyKind]);
  if (card.responseOnly) tags.push("仅响应窗口使用");
  if (card.slot) tags.push(slotLabels[card.slot]);
  return tags;
}

function characterSkillEntries(character) {
  const active = activeSkills[character.id];
  return [
    { name: active.name, kind: "主动技", meta: `${active.costText} · ${targetLabels[active.target] || "指定目标"}`, text: active.text, icon: "动", active: true },
    ...character.skills.map(skill => ({ name: skill.name, kind: "角色特性", meta: "持续生效", text: skill.text, icon: "常" })),
    { name: character.signature.name, kind: "招牌技", meta: `${character.signature.cost} 能量 · ${targetLabels[character.signature.target] || "指定目标"}`, text: character.signature.text, icon: "奥", signature: true }
  ];
}

function renderLobby() {
  modeList.innerHTML = modes.map(mode => `
    <article class="mode-card ${mode.id === selectedMode ? "selected" : ""}" data-mode="${mode.id}" style="--accent:var(--${mode.accent})">
      <span class="tag">${mode.badge}</span><h3>${mode.name}</h3><b>${mode.label}</b><p>${mode.description}</p>
    </article>`).join("");
  const series = [...new Set(characters.map(character => character.series))];
  const seriesOptions = ["all", ...series];
  seriesFilters.innerHTML = seriesOptions.map(seriesId => {
    const count = seriesId === "all" ? characters.length : characters.filter(character => character.series === seriesId).length;
    const label = seriesId === "all" ? "全部作品" : seriesId;
    return `<button type="button" data-series="${seriesId}" class="${selectedSeries === seriesId ? "selected" : ""}" aria-pressed="${selectedSeries === seriesId}"><span>${label}</span><b>${count}</b></button>`;
  }).join("");
  const visibleCharacters = selectedSeries === "all" ? characters : characters.filter(character => character.series === selectedSeries);
  characterList.innerHTML = visibleCharacters.map(character => `
    <button class="character-choice ${character.id === selectedCharacter ? "selected" : ""}" data-character="${character.id}" style="--char:${character.color}" aria-pressed="${character.id === selectedCharacter}">
      <span class="role-chip">${character.role}</span>${character.pack ? `<span class="pack-chip">${character.pack}</span>` : ""}<span class="choice-avatar"><img src="${portraitPath(character.id)}" alt="${character.name}立绘"></span>
      <h4>${character.name}</h4><p>${character.series}</p><small>体力 ${character.hp} · 手牌 ${character.handLimit}</small>
    </button>`).join("");
  renderCharacterPreview(selectedCharacter);
}

seriesFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-series]");
  if (!button) return;
  selectedSeries = button.dataset.series;
  const current = getCharacter(selectedCharacter);
  if (selectedSeries !== "all" && current?.series !== selectedSeries) selectedCharacter = characters.find(character => character.series === selectedSeries)?.id || selectedCharacter;
  renderLobby();
});

function renderCharacterPreview(characterId) {
  const character = getCharacter(characterId);
  if (!character) return;
  const skillCards = characterSkillEntries(character);
  characterPreview.style.setProperty("--char", character.color);
  characterPreview.innerHTML = `
    <div class="preview-portrait"><img src="${portraitPath(character.id)}" alt="${character.name}技能预览立绘"></div>
    <div class="preview-content">
      <div class="preview-heading"><div><span>${character.series}${character.pack ? ` · 扩展包「${character.pack}」` : ""}</span><h3>${character.name}</h3></div><div class="preview-stats"><b>${character.role}</b><span>体力 ${character.hp}</span><span>手牌上限 ${character.handLimit}</span></div></div>
      <div class="preview-skills">${skillCards.map(skill => `<article><i>${skill.icon}</i><div><small>${skill.kind} · ${skill.meta}</small><h4>${skill.name}</h4><p>${skill.text}</p></div></article>`).join("")}</div>
    </div>`;
}

function renderCardCodex() {
  const standard = deckProfiles.standard144, compact = deckProfiles.compact80;
  const filters = [
    ["all", "全部", Object.keys(cardDefinitions).length],
    ["basic", "基础牌", Object.values(cardDefinitions).filter(card => card.type === "basic").length],
    ["strategy", "策略牌", Object.values(cardDefinitions).filter(card => card.type === "strategy").length],
    ["equipment", "装备牌", Object.values(cardDefinitions).filter(card => card.type === "equipment").length]
  ];
  $("#codexFilters").innerHTML = filters.map(([id, label, count]) => `<button data-codex-filter="${id}" class="${codexFilter === id ? "selected" : ""}" aria-pressed="${codexFilter === id}">${label}<span>${count}</span></button>`).join("");
  const cards = Object.values(cardDefinitions).filter(card => codexFilter === "all" || card.type === codexFilter);
  if (!cards.some(card => card.id === selectedCodexCard)) selectedCodexCard = cards[0]?.id;
  $("#codexGrid").innerHTML = cards.map(card => `<button class="codex-card ${selectedCodexCard === card.id ? "selected" : ""}" data-codex-card="${card.id}" style="--card:${cardColorMap[card.color] || "#aaa"}" aria-pressed="${selectedCodexCard === card.id}">
    ${artMarkup(card, "codex-art", `${card.name}卡面`)}
    <span class="codex-card-copy"><small>${cardTypeLabels[card.type]}</small><b>${card.name}</b><em>${standard[card.id]}/${compact[card.id]}</em></span>
  </button>`).join("");
  renderCodexDetail(selectedCodexCard);
}

function renderCodexDetail(cardId) {
  const card = cardDefinitions[cardId];
  if (!card) return;
  const tags = cardTags(card);
  $("#codexDetail").style.setProperty("--card", cardColorMap[card.color] || "#aaa");
  $("#codexDetail").innerHTML = `${artMarkup(card, "codex-detail-art", `${card.name}卡面`)}
    <div class="codex-detail-copy"><span class="codex-glyph">${card.icon}</span><p class="eyebrow">${cardTypeLabels[card.type]}</p><h3>${card.name}</h3><div class="codex-tags">${tags.map(tag => `<span>${tag}</span>`).join("")}</div><p>${cardRuleText(card)}</p></div>`;
}

modeList.addEventListener("click", event => {
  const card = event.target.closest("[data-mode]");
  if (!card) return;
  selectedMode = card.dataset.mode;
  renderLobby();
});

characterList.addEventListener("click", event => {
  const card = event.target.closest("[data-character]");
  if (!card) return;
  selectedCharacter = card.dataset.character;
  renderLobby();
});

characterList.addEventListener("mouseover", event => {
  const card = event.target.closest("[data-character]");
  if (card) renderCharacterPreview(card.dataset.character);
});
characterList.addEventListener("focusin", event => {
  const card = event.target.closest("[data-character]");
  if (card) renderCharacterPreview(card.dataset.character);
});
characterList.addEventListener("mouseleave", () => renderCharacterPreview(selectedCharacter));

$("#startButton").addEventListener("click", startGame);
$("#backButton").addEventListener("click", returnLobby);
$("#rulesButton").addEventListener("click", () => rulesDialog.showModal());
$("#cardCodexButton").onclick = () => {
  try { cardCodexDialog.showModal(); }
  catch { cardCodexDialog.setAttribute("open", ""); }
};
$("#gameRulesButton").addEventListener("click", () => rulesDialog.showModal());
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => $("#" + button.dataset.close).close()));
$("#codexFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-codex-filter]");
  if (!button) return;
  codexFilter = button.dataset.codexFilter;
  renderCardCodex();
});
$("#codexGrid").addEventListener("click", event => {
  const button = event.target.closest("[data-codex-card]");
  if (!button) return;
  selectedCodexCard = button.dataset.codexCard;
  renderCardCodex();
});

function startGame() {
  clearTimeout(aiTimer);
  lastMode = { modeId: selectedMode, humanCharacterId: selectedCharacter };
  engine = new GameEngine(lastMode).setup();
  previousHp = new Map(engine.players.map(player => [player.id, player.hp]));
  selectedCard = null;
  selectingSignature = false;
  selectingActive = false;
  discardSelection = new Set();
  activeDiscardPromptId = null;
  inspectedPlayerId = null;
  inspectedCardUid = null;
  identityPredictions = new Map();
  if (discardDialog.open) discardDialog.close();
  if (choiceDialog.open) choiceDialog.close();
  if (playerDetailDialog.open) playerDetailDialog.close();
  if (cardDetailDialog.open) cardDetailDialog.close();
  toggleIntel(false);
  lobby.classList.add("hidden");
  game.classList.remove("hidden");
  renderGame();
  continueFlow();
}

function returnLobby() {
  clearTimeout(aiTimer);
  if (resultDialog.open) resultDialog.close();
  if (responseDialog.open) responseDialog.close();
  if (discardDialog.open) discardDialog.close();
  if (choiceDialog.open) choiceDialog.close();
  inspectedPlayerId = null;
  if (playerDetailDialog.open) playerDetailDialog.close();
  inspectedCardUid = null;
  if (cardDetailDialog.open) cardDetailDialog.close();
  engine = null;
  previousHp = new Map();
  discardSelection = new Set();
  activeDiscardPromptId = null;
  inspectedPlayerId = null;
  identityPredictions = new Map();
  toggleIntel(false);
  game.classList.add("hidden");
  lobby.classList.remove("hidden");
}

function continueFlow(delay = 520) {
  clearTimeout(aiTimer);
  if (!engine || engine.winner) return showResult();
  if (playerDetailDialog.open || cardDetailDialog.open) return;
  if (engine.pendingChoice) return showChoice();
  if (engine.pendingDiscard) return showDiscard();
  if (engine.pendingResponse) return showResponse();
  if (engine.advancePastEliminatedCurrent()) {
    renderGame();
    return continueFlow(delay);
  }
  const current = engine.player(engine.currentPlayerId);
  if (!current?.human) aiTimer = setTimeout(runAI, delay);
}

function runAI() {
  if (!engine || engine.winner || engine.pendingResponse || engine.pendingDiscard || engine.pendingChoice) return continueFlow();
  const current = engine.player(engine.currentPlayerId);
  if (!current || current.human) return;
  const result = engine.aiStep(current.id);
  renderGame();
  if (engine.pendingResponse || engine.pendingDiscard || engine.pendingChoice || engine.winner) return continueFlow();
  if (result.acted) continueFlow(430);
  else {
    engine.endTurn(current.id);
    renderGame();
    continueFlow(620);
  }
}

function renderGame() {
  if (!engine) return;
  const inferredDamage = engine.players.map(player => ({
    playerId: player.id,
    amount: Math.max(0, (previousHp.get(player.id) ?? player.hp) - player.hp)
  })).filter(event => event.amount > 0);
  const queuedDamage = (engine.consumeVisualEvents?.() || []).filter(event => event.type === "damage");
  const damageByPlayer = new Map();
  for (const event of queuedDamage) damageByPlayer.set(event.playerId, (damageByPlayer.get(event.playerId) || 0) + event.amount);
  for (const event of inferredDamage) if (!damageByPlayer.has(event.playerId)) damageByPlayer.set(event.playerId, event.amount);
  const damageEvents = [...damageByPlayer].map(([playerId, amount]) => ({ playerId, amount }));
  const human = engine.players.find(player => player.human);
  const current = engine.player(engine.currentPlayerId);
  $("#modeName").textContent = `${engine.mode.name} · ${engine.mode.label}`;
  $("#roundTitle").textContent = `第 ${engine.round} 轮`;
  $("#phaseText").textContent = engine.winner ? "对局结束" : engine.pendingStrategySequence ? `${engine.pendingStrategySequence.cardName}结算中` : engine.pendingChoice ? "等待战术决策" : engine.pendingDiscard ? "你的弃牌阶段" : current?.human ? "你的出牌阶段" : `${engine.nameOf(current)}正在行动`;
  $("#turnOwner").textContent = current ? `${engine.nameOf(current)}的回合` : "等待对局";
  $("#turnHint").textContent = getTurnHint(current, human);
  $("#turnMark").textContent = engine.characterOf(current)?.glyph || "界";
  $("#deckCount").textContent = engine.deck.length;
  $("#discardCount").textContent = engine.discard.length;

  for (const player of engine.players) if (player.revealed || !player.alive) identityPredictions.delete(player.id);
  const targetIds = getActiveTargets();
  $("#opponents").dataset.players = engine.mode.playerCount;
  $("#opponents").innerHTML = engine.players.filter(player => !player.human).map(player => playerCardTemplate(player, targetIds.includes(player.id))).join("");
  $("#playerArea").innerHTML = playerAreaTemplate(human);
  renderIntel(human);
  renderLog();
  bindDynamicEvents();
  if (playerDetailDialog.open && inspectedPlayerId) renderPlayerDetail(inspectedPlayerId);
  previousHp = new Map(engine.players.map(player => [player.id, player.hp]));
  playDamageEffects(damageEvents);
}

function playDamageEffects(events) {
  for (const { playerId, amount } of events) {
    const card = document.querySelector(`[data-player="${playerId}"]`);
    if (!card) continue;
    card.classList.remove("taking-damage");
    void card.offsetWidth;
    card.classList.add("taking-damage");
    const number = document.createElement("span");
    number.className = "damage-number";
    number.textContent = `-${amount}`;
    number.setAttribute("aria-label", `受到${amount}点伤害`);
    card.append(number);
    window.setTimeout(() => {
      card.classList.remove("taking-damage");
      number.remove();
    }, 900);
  }
}

function getTurnHint(current, human) {
  if (engine.pendingStrategySequence) {
    const sequence = engine.pendingStrategySequence;
    if (sequence.kind === "mass") return `${sequence.cardName} · ${engine.nameOf(sequence.currentTargetId)}响应 · 剩余${sequence.remaining}名`;
    return `${sequence.cardName} · ${engine.nameOf(sequence.currentTargetId)}进行第${sequence.current}次交锋`;
  }
  if (engine.pendingChoice) return engine.pendingChoice.title;
  if (engine.pendingDiscard) return `弃牌阶段 · 请选择${engine.pendingDiscard.count}张手牌`;
  if (!current?.human) return "战术 AI 正在思考";
  if (selectingSignature) return "已选择招牌技 · 点击发光目标";
  if (selectingActive) return "已选择主动技 · 点击发光目标";
  if (selectedCard) {
    const card = human.hand.find(item => item.uid === selectedCard);
    return card ? `已选择【${card.name}】 · 点击发光目标` : "点击手牌选择行动";
  }
  return "点击手牌选择行动";
}

function playerCardTemplate(player, targetable = false) {
  const character = engine.characterOf(player), role = engine.roleOf(player);
  const showRole = player.revealed || engine.mode.id === "ranked2v2" || !player.alive;
  const prediction = engine.mode.id === "classic8" && !showRole ? identityPredictions.get(player.id) : null;
  const shownRole = showRole ? role : prediction ? roles[prediction] : null;
  const identityLabel = showRole ? role.name : prediction ? `预测·${roles[prediction].name}` : "身份?";
  const equipment = player.equipment;
  const plots = engine.getVisiblePlots(engine.players.find(item => item.human)?.id, player.id);
  const chessMarks = engine.players.filter(owner => owner.chessTargetId === player.id).length;
  const position = tableSeatPosition(engine.mode.playerCount, player.seat);
  return `<article class="player-card ${player.id === engine.currentPlayerId ? "current" : ""} ${targetable ? "targetable" : ""} ${engine.pendingStrategySequence?.currentTargetId === player.id ? "strategy-focus" : ""} ${!player.alive ? "dead" : ""}" data-player="${player.id}" style="--char:${character.color};--role-color:var(--${shownRole?.color || "muted"});--seat-x:${position.x}%;--seat-y:${position.y}%">
    <span class="portrait"><img src="${portraitPath(character.id)}" alt="${character.name}立绘"></span><span class="seat">${player.seat + 1}</span><span class="identity-dot ${prediction ? "predicted" : ""}">${identityLabel}</span>${player.id === engine.currentPlayerId ? `<span class="turn-badge">行动中</span>` : ""}${targetable ? `<span class="target-badge">可选择</span>` : ""}
    <h4>${character.name} ${dreamBadge(player, character)}</h4>
    <div class="stat-row"><span>♥ ${player.hp}/${player.maxHp}</span><span>牌 ${player.hand.length}</span></div>
    ${hpPips(player, "seat-hp")}
    <div class="energy-bar" style="--value:${player.energy / player.maxEnergy * 100}%"><i></i></div>
    <div class="equipment-mini"><i class="${equipment.weapon ? "on" : ""}">刃</i><i class="${equipment.armor ? "on" : ""}">甲</i><i class="${equipment.charm ? "on" : ""}">核</i>${player.poison ? `<i class="on">毒${player.poison}</i>` : ""}${plots.length ? `<i class="on plot-count">伏${plots.length}</i>` : ""}${player.specialCards.length ? `<i class="on special-count">术${player.specialCards.length}</i>` : ""}${player.sealedCards.length ? `<i class="on sealed-count">封${player.sealedCards.length}</i>` : ""}${chessMarks ? `<i class="on chess-count">棋</i>` : ""}</div>
    <button type="button" class="player-detail-button" data-inspect-player="${player.id}" aria-label="查看${character.name}的技能与状态" title="查看技能与状态">详情</button>
  </article>`;
}

function playerAreaTemplate(player) {
  const character = engine.characterOf(player);
  const isTurn = engine.currentPlayerId === player.id && !engine.winner;
  const canPlayHand = isTurn && !engine.pendingResponse && !engine.pendingDiscard && !engine.pendingChoice;
  const hand = player.hand.map(card => {
    const selected = selectedCard === card.uid;
    return `<div class="hand-card-shell ${selected ? "selected" : ""} ${canPlayHand ? "playable" : ""}" style="--card:${cardColorMap[card.color] || "#aaa"}">
      <button type="button" class="hand-card ${selected ? "selected" : ""} ${card.responseOnly ? "response-only" : ""}" data-card="${card.uid}" ${!canPlayHand ? "disabled" : ""}>
        ${artMarkup(card, "hand-art")}
        <span class="hand-icon">${card.icon}</span><span class="card-type">${card.type === "basic" ? "基础" : card.type === "strategy" ? "策略" : "装备"}</span>
        <span class="hand-copy"><h4>${card.name}</h4><p>${card.description}</p></span>
      </button>
      <button type="button" class="card-detail-trigger hand-detail-trigger" data-card-detail="${card.uid}" aria-label="放大查看${card.name}" title="查看完整规则">⌕</button>
    </div>`;
  }).join("");
  const slots = [
    ["weapon", "武器", "刃", "攻击距离 +1"],
    ["armor", "防具", "甲", "每轮首次攻击伤害 -1"],
    ["charm", "饰品", "核", "回合额外获得1能量"]
  ];
  const equipment = slots.map(([slot, label, icon, fallback]) => {
    const item = player.equipment[slot];
    return `<div class="self-equip-slot ${item ? "equipped" : ""}"><i>${icon}</i><span><small>${label}</small><b>${item?.name || "未装备"}</b><em>${item?.description || fallback}</em></span></div>`;
  }).join("");
  const plots = engine.getVisiblePlots(player.id, player.id);
  const plotTray = plots.length ? `<div class="self-plots">${plots.map(plot => `<span title="${plot.card.name} → ${engine.nameOf(plot.targetId)}"><i>${plot.card.icon}</i><b>${plot.card.name}</b></span>`).join("")}</div>` : "";
  const specialTray = player.specialCards.length || player.sealedCards.length ? `<div class="self-specials">${player.specialCards.map(item => item.kind === "lie" ? `<span class="lie" title="未知谎言 → ${engine.nameOf(item.targetId)}"><i>谎</i><b>未知谎言</b></span>` : `<span title="${item.kind === "clone" ? "影分身" : "百豪牌"} · ${item.card.name}"><i>${item.kind === "clone" ? "分" : "印"}</i><b>${item.card.name}</b></span>`).join("")}${player.sealedCards.map(item => `<span class="sealed" title="被月读封存：${item.card.name}"><i>封</i><b>${item.card.name}</b></span>`).join("")}</div>` : "";
  return `<div class="self-summary ${engine.pendingStrategySequence?.currentTargetId === player.id ? "strategy-focus" : ""}" data-player="${player.id}" style="--char:${character.color}"><span class="mini-avatar"><img src="${portraitPath(character.id)}" alt="${character.name}立绘"></span><div><h3>${character.name} ${dreamBadge(player, character)}</h3><p>${character.series} · ${character.role}</p><span class="stat-row"><b>♥ ${player.hp}/${player.maxHp}</b><b>◆ ${player.energy}/${player.maxEnergy}</b><b>牌 ${player.hand.length}/${engine.handLimit(player.id)}</b></span>${hpPips(player, "self-hp")}</div><button type="button" class="self-detail-button" data-inspect-player="${player.id}" aria-label="查看自己的状态与技能">状态与技能</button></div><div class="self-equipment">${equipment}</div>${plotTray}${specialTray}<div class="hand">${hand || `<p style="color:var(--muted);font-size:11px">暂无手牌</p>`}</div>`;
}

function playerStatusItems(player) {
  const items = [];
  const add = (label, text, tone = "") => items.push({ label, text, tone });
  if (!player.alive) add("已退场", "该角色已离开战局", "danger");
  else if (player.id === engine.currentPlayerId) add("行动中", `本回合攻击 ${player.attacksUsed}/${player.attackLimit}`, "active");
  else add("存活", "等待自己的行动回合", "normal");
  if (player.shield > 0) add("护盾", `可抵消 ${player.shield} 点伤害`, "buff");
  if (player.poison > 0) add("毒素", `${player.poison}层，回合结束失去体力`, "danger");
  if (player.frozenDraw > 0) add("冻结", `下回合少摸 ${player.frozenDraw} 张牌`, "danger");
  if (player.skipOffense) add("白霞罚", "本回合不能使用攻击和策略牌", "danger");
  if (player.dying) add("重伤", "正在等待其他角色救援", "danger");
  if (player.signatureLocked > 0) add("招牌技封存", "直到下个回合结束无法释放", "danger");
  if (player.contractHpLoss > 0) add("爆发契约", `下回合结束失去 ${player.contractHpLoss} 体力`, "danger");
  if (player.rangeInfinite) add("无限距离", "本回合攻击距离无限", "buff");
  if (player.turnFlags.rangeBonus) add("距离强化", `本回合攻击距离 +${player.turnFlags.rangeBonus}`, "buff");
  if (player.turnFlags.nextAttackPoison) add("毒刃涂布", "下一次攻击附加毒素", "buff");
  if (player.turnFlags.nextAttackBonus) {
    const attackBuffNames = { naruto: "影分身蓄势", sakura: "怪力蓄势", itachi: "月读前兆", kakashi: "复制强化", yuji: "径庭拳蓄势" };
    add(attackBuffNames[player.characterId] || "攻击强化", "下一次攻击伤害 +1", "buff");
  }
  if (player.turnFlags.nextAttackIgnoreArmor) add("月读前兆", "下一次攻击忽略防护装甲", "buff");
  if (player.turnFlags.copyNoIntervene) add("战术判断", "下一次策略牌的目标不能被强制介入", "buff");
  if (player.turnFlags.activeUsed && player.id === engine.currentPlayerId) add("主动技", "本回合已发动", "used");
  if (player.equipment.armor) add("防具", player.armorReady ? "本轮减伤尚未触发" : "本轮减伤已经触发", player.armorReady ? "buff" : "used");
  if (player.roundFlags.sandShield) add("砂之盾", "本轮已经触发", "used");
  if (player.roundFlags.observation) add("见闻色", "本轮已经检定", "used");
  if (player.roundFlags.infinity) add("无下限", "本轮已经触发", "used");
  if (player.roundFlags.substitute) add("替代防御", "本轮已经使用", "used");
  if (player.roundFlags.diagnosis) add("诊断", "本轮已经触发", "used");
  if (player.roundFlags.resolve) add("不屈容器", "本轮已经触发", "used");
  if (player.roundFlags.cover) add("战术掩护", "本轮已经触发", "used");
  if (player.roundFlags.damageEnergy) add("造成伤害能量", "本轮奖励已经获得", "used");
  if (player.roundFlags.hurtEnergy) add("受到伤害能量", "本轮奖励已经获得", "used");
  if (player.roundFlags.foresight) add("战术预读", "本轮行动后移效果已经触发", "used");
  if (player.roundFlags.chessPressure) add("影缝压力", "本轮的弃牌检定已经触发", "used");
  if (player.roundFlags.copyRecovery) add("查克拉回收", "本轮已经从拷贝牌获得能量", "used");
  if (player.turnFlags.shadowNeckTarget) add("影首缚颈", `下一次对${engine.nameOf(player.turnFlags.shadowNeckTarget)}的攻击无视距离且伤害+1`, "buff");
  if (player.turnFlags.activeUsed) add("主动技", "本回合已经发动", "used");
  else if (player.id === engine.currentPlayerId) add("主动技", "本回合尚未发动", "buff");
  if (player.plots.length) add("伏笔区", `${player.plots.length}/2 张暗置策略`, "buff");
  const clone = player.specialCards.find(item => item.kind === "clone");
  const seals = player.specialCards.filter(item => item.kind === "byakugo");
  if (clone) add("影分身", `由【${clone.card.name}】构成，可作为应变防御`, "buff");
  if (seals.length) add("百豪牌", `${seals.length}/2 · ${seals.map(item => cardTypeLabels[item.card.type]).join("、")}`, "buff");
  if (player.byakugoMode) add("百豪之术", "保护范围为全场，各类别首次解放后返回手牌", "buff");
  if (player.chessTargetId) add("棋子", `当前标记：${engine.nameOf(player.chessTargetId)}`, "buff");
  if (player.swapMarkedId) add("天手力追猎", `已标记：${engine.nameOf(player.swapMarkedId)}`, "buff");
  if (player.sandMarkedBy) add("砂瀑追葬", `被${engine.nameOf(player.sandMarkedBy)}标记；其下一次攻击无视距离且伤害+1`, "danger");
  if (player.scoutedTargetId) add("白眼锁定", `正在洞察：${engine.nameOf(player.scoutedTargetId)}`, "buff");
  const scoutedBy = engine.players.find(owner => owner.scoutedTargetId === player.id && owner.alive);
  if (scoutedBy) add("被白眼锁定", `${engine.nameOf(scoutedBy)}正在洞察你的手牌与伏笔`, "danger");
  if (player.toadBindTargetId) add("蛤蟆口束缚", `已束缚：${engine.nameOf(player.toadBindTargetId)}，其首次攻击或策略牌须弃1张牌`, "danger");
  const toadBinder = engine.players.find(owner => owner.alive && owner.characterId === "jiraiya" && owner.toadBindTargetId === player.id);
  if (toadBinder) add("被蛤蟆束缚", `${engine.nameOf(toadBinder)}的束缚尚未触发`, "danger");
  if (player.sageMarks) add("仙术印", `${player.sageMarks}/2 · 攻击距离+1${player.sageResonance ? " · 下一次攻击伤害+1且忽略防具" : ""}`, "buff");
  if (player.sageResonance) add("仙术共鸣", "下一次攻击伤害+1并忽略防护装甲，结算后消耗", "buff");
  if (player.curseSeal) add("咒印实验", `下一张${{ basic: "基础", strategy: "策略", equipment: "装备" }[player.curseSeal.type]}牌可能被夺取`, "danger");
  if (player.curseResearchType) add("禁术研究", `研究${{ basic: "基础牌", strategy: "策略牌", equipment: "装备牌" }[player.curseResearchType]}；使用同类牌时获得1点能量`, "buff");
  const copies = player.hand.filter(card => card._copiedBy === player.id).length;
  const spoils = player.hand.filter(card => card._curseSpoil === player.id).length;
  if (copies) add("拷贝牌", `${copies}张，将在本回合结束时消散`, "buff");
  if (spoils) add("实验牌", `${spoils}张，可供蛇蜕或不尸转生使用`, "buff");
  const markedBy = engine.players.filter(owner => owner.chessTargetId === player.id);
  if (markedBy.length) add("被落子", `被${markedBy.map(owner => engine.nameOf(owner)).join("、")}标记`, "danger");
  if (player.sealedCards.length) add("月读封存", `${player.sealedCards.length}张手牌暂时离开手牌区`, "danger");
  return items;
}

function plotTimingLabel(plot) {
  if (plot.effect === "checkmateTrap") return "公开 · 下一张非响应牌使用前触发";
  if (plot.isFalse) return "虚假伏笔 · 你的下回合开始时返回手牌";
  if (plot.effect === "delayedCast") return "你的下回合开始时触发";
  if (plot.effect === "echoScript") return plot.armed ? "本回合首张基础牌后触发" : "你的下回合生效，回合结束时到期";
  return "持续至你的下回合开始";
}

function plotRuleText(plot) {
  if (plot.effect === "checkmateTrap") return "目标下一次尝试使用非响应牌时，取消该牌并立即结束其出牌阶段。";
  if (plot.isFalse) return "由非伏笔牌伪装而成；被反制时鼬获得能量，未被反制则在鼬下回合开始时返回手牌。";
  return cardRuleText(plot.card);
}

function openPlayerDetail(playerId) {
  if (!engine?.player(playerId)) return;
  clearTimeout(aiTimer);
  inspectedPlayerId = playerId;
  renderPlayerDetail(playerId);
  if (!playerDetailDialog.open) playerDetailDialog.showModal();
}

function renderPlayerDetail(playerId) {
  const player = engine?.player(playerId);
  if (!player) return;
  const character = engine.characterOf(player), role = engine.roleOf(player);
  const human = engine.players.find(item => item.human);
  const showRole = player.human || player.revealed || engine.mode.id === "ranked2v2" || !player.alive;
  const distance = player.alive && human?.alive ? engine.distance(human.id, player.id) : Infinity;
  const attackRange = player.alive ? engine.attackRange(player.id) : 0;
  const skills = characterSkillEntries(character);
  const statuses = playerStatusItems(player);
  const equipmentSlots = [
    ["weapon", "武器", "刃", "攻击距离 +1"],
    ["armor", "防具", "甲", "每轮首次受到的攻击伤害 -1"],
    ["charm", "饰品", "核", "回合开始额外获得1点能量"]
  ];
  const prediction = identityPredictions.get(player.id);
  const canPredict = engine.mode.id === "classic8" && !player.human && player.alive && !player.revealed;
  const predictionPanel = canPredict ? `<section class="detail-section prediction-panel">
    <div class="detail-section-heading"><div><p class="eyebrow">IDENTITY NOTE</p><h3>我的身份预测</h3></div><small>仅在本局本地记录，不影响AI与胜负</small></div>
    <div class="prediction-options">
      <button type="button" data-predict-role="unknown" class="${!prediction ? "selected" : ""}" aria-pressed="${!prediction}">未判断</button>
      ${predictionRoleIds.map(roleId => `<button type="button" data-predict-role="${roleId}" class="${prediction === roleId ? "selected" : ""}" style="--prediction:var(--${roles[roleId].color})" aria-pressed="${prediction === roleId}">${roles[roleId].name}</button>`).join("")}
    </div>
    <p class="prediction-hint">经典军八身份构成：1界主、2守护者、4破界者、1独行者。界主始终公开，因此不列入预测。</p>
  </section>` : "";
  const identityName = showRole ? role.name : "身份未公开";
  const identityCopy = showRole ? role.goal : "身份仍处于隐藏状态，只能根据行动和局势自行判断。";
  const viewerId = human?.id;
  const visiblePlots = engine.getVisiblePlots(viewerId, player.id);
  const plotSection = `<section class="detail-section"><div class="detail-section-heading"><div><p class="eyebrow">PLOT ZONE</p><h3>伏笔区 ${visiblePlots.length}/2</h3></div><small>${viewerId === player.id ? "你可查看自己的伏笔" : "对手伏笔保持暗置"}</small></div><div class="detail-plot-list">${visiblePlots.length ? visiblePlots.map(plot => `<article class="${plot.hidden ? "hidden-plot" : ""}"><i>${plot.hidden ? "?" : plot.card.icon}</i><div><b>${plot.hidden ? plot.name : plot.effect === "checkmateTrap" ? `将军·${plot.card.name}` : plot.isFalse ? `幻象·${plot.card.name}` : plot.card.name}</b><span>目标：${engine.nameOf(plot.targetId)}${plot.hidden ? "" : ` · ${plotTimingLabel(plot)}`}</span><p>${plot.hidden ? "名称、效果与持续时间未知" : plotRuleText(plot)}</p></div></article>`).join("") : `<p class="empty-plots">当前没有伏笔</p>`}</div></section>`;
  const specialCards = player.specialCards.map(item => item.kind === "lie" && !player.human ? ({ icon: "谎", name: "未知谎言", copy: `目标：${engine.nameOf(item.targetId)}；牌面与触发条件仅设置者可见。` }) : ({ icon: item.kind === "clone" ? "分" : item.kind === "lie" ? "谎" : "印", name: item.kind === "clone" ? `影分身·${item.card.name}` : item.kind === "lie" ? `谎言·${item.card.name}` : `百豪·${item.card.name}`, copy: item.kind === "clone" ? "可作为应变用于防御，消耗后获得1点能量。" : item.kind === "lie" ? `指定目标：${engine.nameOf(item.targetId)}；其下一张非响应牌会触发检定。` : `${cardTypeLabels[item.card.type]}：${item.card.description}` }));
  const sealedCards = player.sealedCards.map(item => ({ icon: "封", name: `月读封存·${item.card.name}`, copy: `由${engine.nameOf(item.sealedBy)}封存，直到其下回合开始。` }));
  const specialSection = specialCards.length || sealedCards.length ? `<section class="detail-section"><div class="detail-section-heading"><div><p class="eyebrow">SPECIAL ZONE</p><h3>特殊牌区</h3></div><small>均不计入手牌与手牌上限</small></div><div class="detail-special-list">${[...specialCards, ...sealedCards].map(item => `<article><i>${item.icon}</i><div><b>${item.name}</b><p>${item.copy}</p></div></article>`).join("")}</div></section>` : "";
  const canRecon = human?.characterId === "hinata" && human.scoutedTargetId === player.id && !player.human;
  const reconSection = canRecon ? `<section class="detail-section recon-section"><div class="detail-section-heading"><div><p class="eyebrow">BYAKUGAN INTEL</p><h3>白眼侦察情报</h3></div><small>锁定结束后重新隐藏</small></div><div class="recon-hand">${player.hand.length ? player.hand.map(card => `<span><i>${card.icon}</i><b>${card.name}</b><small>${cardTypeLabels[card.type]}</small></span>`).join("") : `<p class="empty-plots">目标当前没有手牌</p>`}</div></section>` : "";

  const detail = $("#playerDetailContent");
  detail.style.setProperty("--char", character.color);
  detail.style.setProperty("--detail-role", showRole ? `var(--${role.color})` : "var(--muted)");
  detail.innerHTML = `<div class="player-detail-hero">
    <div class="player-detail-portrait"><img src="${portraitPath(character.id)}" alt="${character.name}立绘"></div>
    <div class="player-detail-summary">
      <p class="eyebrow">SEAT ${player.seat + 1} · ${character.series}</p>
      <div class="player-detail-title"><div><h2>${character.name}</h2><span>${character.role}</span></div><strong class="detail-identity ${showRole ? "confirmed" : "hidden-role"}">${identityName}</strong></div>
      <p class="identity-copy">${identityCopy}</p>
      <div class="detail-stat-grid">
        <article><small>体力</small><b>♥ ${player.hp}/${player.maxHp}</b></article>
        <article><small>能量</small><b>◆ ${player.energy}/${player.maxEnergy}</b></article>
        <article><small>手牌</small><b>${player.hand.length} 张</b></article>
        <article title="回合结束时，超过此数量的手牌需要弃置"><small>手牌上限</small><b>${engine.handLimit(player.id)} 张</b></article>
        <article><small>与你距离</small><b>${player.id === human?.id ? "自身" : Number.isFinite(distance) ? distance : "—"}</b></article>
        <article><small>攻击距离</small><b>${attackRange >= 99 ? "无限" : attackRange || "—"}</b></article>
      </div>
    </div>
  </div>
  <section class="detail-section">
    <div class="detail-section-heading"><div><p class="eyebrow">LIVE STATUS</p><h3>当前状态</h3></div><small>随战局实时更新</small></div>
    <div class="detail-status-list">${statuses.map(status => `<article class="${status.tone}"><b>${status.label}</b><span>${status.text}</span></article>`).join("")}</div>
  </section>
  ${character.dream ? `<section class="detail-section dream-section"><div class="detail-section-heading"><div><p class="eyebrow">DREAM TRAIL</p><h3>${character.dream.name} ${dreamBadge(player, character)}</h3></div><small>${player.dreamState?.awakened ? "已觉醒" : `进度 ${player.dreamState?.progress || 0}/3`}</small></div><p class="dream-condition">推进条件：${character.dream.conditionText}</p><p class="dream-awaken">觉醒效果：${character.dream.awakenText}</p></section>` : ""}
  ${plotSection}
  ${reconSection}
  ${specialSection}
  <section class="detail-section">
    <div class="detail-section-heading"><div><p class="eyebrow">EQUIPMENT</p><h3>装备区域</h3></div></div>
    <div class="detail-equipment-grid">${equipmentSlots.map(([slot, label, icon, fallback]) => {
      const card = player.equipment[slot];
      return `<article class="${card ? "equipped" : ""}"><i>${icon}</i><div><small>${label}</small><b>${card?.name || "未装备"}</b><p>${card?.description || fallback}</p></div></article>`;
    }).join("")}</div>
  </section>
  <section class="detail-section">
    <div class="detail-section-heading"><div><p class="eyebrow">ABILITY FILE</p><h3>角色技能</h3></div><small>主动技、角色特性与招牌技</small></div>
    <div class="detail-skill-grid">${skills.map(skill => { const meta = skill.signature ? `${engine.signatureCost(player.id)} 能量 · ${targetLabels[character.signature.target] || "指定目标"}` : skill.meta; return `<article class="${skill.active ? "active" : skill.signature ? "signature" : "passive"}"><i>${skill.icon}</i><div><small>${skill.kind} · ${meta}${skill.active && player.turnFlags.activeUsed ? " · 本回合已使用" : skill.signature && player.signatureLocked > 0 ? " · 当前封存" : ""}</small><b>${skill.name}</b><p>${skill.text}</p></div></article>`; }).join("")}</div>
  </section>
  ${predictionPanel}`;
}

function renderIntel(human) {
  const role = engine.roleOf(human), character = engine.characterOf(human), active = activeSkills[human.characterId];
  $("#identityCard").style.setProperty("--role-color", `var(--${role.color})`);
  $("#identityCard").innerHTML = `<small>你的身份 · ${human.revealed ? "已公开" : "未公开"}</small><h3>${role.name}</h3><p>${role.goal}</p>`;
  $("#skillPanel").innerHTML = characterSkillEntries(character).map(skill => `<article class="skill-item ${skill.active ? "clickable" : ""}"><b>${skill.name}</b><span>${skill.kind} · ${skill.meta}</span><p>${skill.text}</p></article>`).join("");
  const canAct = engine.canAct(human.id);
  $("#activeSkillButton").disabled = !canAct || !engine.getActiveSkillTargets(human.id).length;
  $("#activeSkillButton").classList.toggle("armed", selectingActive);
  $("#activeSkillButton").childNodes[0].textContent = `发动「${active.name}」 `;
  $("#activeSkillCost").textContent = active.costText;
  const signatureCost = engine.signatureCost(human.id);
  $("#signatureButton").disabled = !canAct || human.signatureLocked > 0 || human.energy < signatureCost || !engine.getSignatureTargets(human.id).length;
  $("#energyCost").textContent = `${signatureCost} 能量`;
  $("#revealButton").classList.toggle("hidden", engine.mode.id === "ranked2v2" || human.roleId === "lord" || human.revealed);
  $("#revealButton").disabled = !canAct;
  const endTurnDisabled = !canAct;
  $("#endTurnButton").disabled = endTurnDisabled;
  $("#compactEndTurnButton").disabled = endTurnDisabled;
}

function renderLog() {
  const logs = [...engine.logs].reverse().slice(0, 45);
  $("#gameLog").innerHTML = logs.map(log => `<div class="log-item ${["damage", "event", "victory", "signature"].includes(log.type) ? log.type === "damage" ? "damage" : "event" : ""}"><time>R${log.round || 0}</time><p>${highlightNames(log.message)}</p></div>`).join("");
}

function highlightNames(text) {
  let html = text;
  for (const character of characters) html = html.replaceAll(character.name, `<strong>${character.name}</strong>`);
  return html;
}

function bindDynamicEvents() {
  document.querySelectorAll("[data-card]").forEach(button => button.addEventListener("click", () => chooseCard(button.dataset.card)));
  document.querySelectorAll("[data-inspect-player]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    openPlayerDetail(button.dataset.inspectPlayer);
  }));
  document.querySelectorAll("[data-player]").forEach(card => card.addEventListener("click", () => chooseTarget(card.dataset.player)));
}

$("#playerDetailContent").addEventListener("click", event => {
  const button = event.target.closest("[data-predict-role]");
  const player = engine?.player(inspectedPlayerId);
  if (!button || !player || engine.mode.id !== "classic8" || player.revealed || !player.alive) return;
  const roleId = button.dataset.predictRole;
  if (roleId === "unknown") identityPredictions.delete(player.id);
  else if (predictionRoleIds.includes(roleId)) identityPredictions.set(player.id, roleId);
  const label = roleId === "unknown" ? "未判断" : roles[roleId].name;
  renderGame();
  showToast(`已将${engine.nameOf(player)}标记为：${label}`);
});

playerDetailDialog.addEventListener("close", () => {
  const shouldResume = Boolean(inspectedPlayerId);
  inspectedPlayerId = null;
  if (shouldResume && engine && !engine.winner) continueFlow(320);
});

function findHandCard(cardUid) {
  if (!engine) return null;
  for (const player of engine.players) {
    const card = player.hand.find(item => item.uid === cardUid);
    if (card) return card;
  }
  return null;
}

function openCardDetail(cardUid) {
  const card = findHandCard(cardUid);
  if (!card) return;
  clearTimeout(aiTimer);
  inspectedCardUid = cardUid;
  const tags = cardTags(card);
  const content = $("#cardDetailContent");
  content.style.setProperty("--card", cardColorMap[card.color] || "#aaa");
  content.innerHTML = `<div class="battle-card-detail-layout">
    ${artMarkup(card, "battle-card-detail-art", `${card.name}卡面`)}
    <div class="battle-card-detail-copy"><span class="codex-glyph">${card.icon}</span><p class="eyebrow">${cardTypeLabels[card.type]}</p><h2>${card.name}</h2><div class="codex-tags">${tags.map(tag => `<span>${tag}</span>`).join("")}</div><h3>完整规则</h3><p>${cardRuleText(card)}</p></div>
  </div>`;
  if (!cardDetailDialog.open) cardDetailDialog.showModal();
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-card-detail]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  openCardDetail(button.dataset.cardDetail);
});

cardDetailDialog.addEventListener("close", () => {
  const shouldResume = Boolean(inspectedCardUid);
  inspectedCardUid = null;
  if (shouldResume && engine && !engine.winner) continueFlow(320);
});

function chooseCard(uid) {
  const human = engine.players.find(player => player.human);
  const card = human.hand.find(item => item.uid === uid);
  if (!card || card.responseOnly) return showToast("这张牌只能在响应窗口使用");
  selectedCard = selectedCard === uid ? null : uid;
  selectingSignature = false;
  selectingActive = false;
  if (selectedCard) {
    const targets = engine.getCardTargets(human.id, card);
    if (!targets.length) { selectedCard = null; showToast("当前没有合法目标"); }
    else if (targets.length === 1 && targets[0] === human.id) return executeCard(human.id);
    else showToast(`已选择【${card.name}】，请点击发光目标`);
  }
  renderGame();
}

function getActiveTargets() {
  if (!engine) return [];
  const human = engine.players.find(player => player.human);
  if (selectingSignature) return engine.getSignatureTargets(human.id);
  if (selectingActive) return engine.getActiveSkillTargets(human.id);
  if (!selectedCard) return [];
  const card = human.hand.find(item => item.uid === selectedCard);
  return engine.getCardTargets(human.id, card).filter(id => id !== human.id);
}

function chooseTarget(targetId) {
  if (!getActiveTargets().includes(targetId)) return;
  if (selectingSignature) executeSignature(targetId);
  else if (selectingActive) executeActiveSkill(targetId);
  else executeCard(targetId);
}

function executeCard(targetId) {
  const human = engine.players.find(player => player.human);
  const result = engine.playCard(human.id, selectedCard, targetId);
  if (!result.ok) showToast(result.reason);
  selectedCard = null;
  renderGame();
  continueFlow();
}

$("#signatureButton").addEventListener("click", () => {
  const human = engine.players.find(player => player.human);
  const targets = engine.getSignatureTargets(human.id);
  if (!targets.length) return showToast("当前没有合法目标");
  selectedCard = null; selectingActive = false;
  if (targets.length === 1 && targets[0] === human.id) executeSignature(human.id);
  else { selectingSignature = !selectingSignature; showToast(selectingSignature ? "请选择招牌技目标" : "已取消选择"); renderGame(); }
});

function executeSignature(targetId) {
  const human = engine.players.find(player => player.human);
  const result = engine.useSignature(human.id, targetId);
  if (!result.ok) showToast(result.reason);
  selectingSignature = false;
  renderGame();
  continueFlow();
}

$("#activeSkillButton").addEventListener("click", () => {
  const human = engine.players.find(player => player.human);
  const targets = engine.getActiveSkillTargets(human.id);
  if (!targets.length) return showToast("本回合已使用，或暂不满足发动条件");
  selectedCard = null; selectingSignature = false;
  if (targets.length === 1 && targets[0] === human.id) executeActiveSkill(human.id);
  else { selectingActive = !selectingActive; showToast(selectingActive ? "请选择主动技目标" : "已取消选择"); renderGame(); }
});

function executeActiveSkill(targetId) {
  const human = engine.players.find(player => player.human);
  const result = engine.useActiveSkill(human.id, targetId);
  if (!result.ok) showToast(result.reason);
  selectingActive = false;
  renderGame();
  continueFlow();
}

$("#revealButton").addEventListener("click", () => {
  const human = engine.players.find(player => player.human);
  const result = engine.revealRole(human.id);
  if (!result.ok) showToast(result.reason);
  renderGame();
});

function endHumanTurn() {
  const human = engine.players.find(player => player.human);
  selectedCard = null; selectingSignature = false; selectingActive = false;
  toggleIntel(false);
  if (engine.endTurn(human.id)) { renderGame(); continueFlow(650); }
}

$("#endTurnButton").addEventListener("click", endHumanTurn);
$("#compactEndTurnButton").addEventListener("click", endHumanTurn);

function showDiscard() {
  const pending = engine?.pendingDiscard;
  if (!pending) return;
  const player = engine.player(pending.playerId);
  if (activeDiscardPromptId !== pending.id) {
    activeDiscardPromptId = pending.id;
    discardSelection = new Set();
  }
  const allowed = new Set(pending.allowedUids);
  $("#discardReason").textContent = pending.reason;
  $("#discardCardList").innerHTML = player.hand.map(card => {
    const selectable = allowed.has(card.uid);
    const selected = discardSelection.has(card.uid);
    const locked = !selected && discardSelection.size >= pending.count;
    return `<div class="discard-card-shell" style="--card:${cardColorMap[card.color] || "#aaa"}"><button class="discard-choice ${selected ? "selected" : ""}" data-discard-card="${card.uid}" ${!selectable || locked ? "disabled" : ""}>
      ${artMarkup(card, "discard-art", `${card.name}卡面`)}
      <span class="discard-check">${selected ? "✓" : card.icon}</span><span class="discard-copy"><small>${cardTypeLabels[card.type]}</small><b>${card.name}</b><p>${card.description}</p></span>
    </button><button type="button" class="card-detail-trigger discard-detail-trigger" data-card-detail="${card.uid}" aria-label="放大查看${card.name}" title="查看完整规则">⌕</button></div>`;
  }).join("");
  $("#discardProgress").textContent = `已选 ${discardSelection.size}/${pending.count}`;
  $("#confirmDiscard").disabled = discardSelection.size !== pending.count;
  if (!discardDialog.open) discardDialog.showModal();
}

$("#discardCardList").addEventListener("click", event => {
  const button = event.target.closest("[data-discard-card]");
  if (!button || button.disabled || !engine?.pendingDiscard) return;
  const uid = button.dataset.discardCard;
  if (discardSelection.has(uid)) discardSelection.delete(uid);
  else if (discardSelection.size < engine.pendingDiscard.count) discardSelection.add(uid);
  showDiscard();
});

$("#confirmDiscard").addEventListener("click", () => {
  const pending = engine?.pendingDiscard;
  if (!pending) return;
  const result = engine.confirmDiscard(pending.playerId, [...discardSelection]);
  if (!result.ok) return showToast(result.reason);
  discardDialog.close();
  discardSelection = new Set();
  activeDiscardPromptId = null;
  renderGame();
  continueFlow(500);
});

discardDialog.addEventListener("cancel", event => event.preventDefault());

function showChoice() {
  const pending = engine?.pendingChoice;
  if (!pending) return;
  $("#choiceTitle").textContent = pending.title;
  $("#choiceCopy").textContent = pending.text || "请根据当前战局选择一项。";
  $("#choiceOptions").innerHTML = pending.options.map(option => `<button type="button" data-choice-value="${option.value}" class="choice-option"><b>${option.label}</b>${option.description ? `<span>${option.description}</span>` : ""}</button>`).join("");
  if (!choiceDialog.open) choiceDialog.showModal();
}

$("#choiceOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-choice-value]");
  const pending = engine?.pendingChoice;
  if (!button || !pending) return;
  const result = engine.resolveChoice(pending.playerId, button.dataset.choiceValue);
  if (!result.ok) return showToast(result.reason);
  choiceDialog.close();
  renderGame();
  continueFlow(420);
});

choiceDialog.addEventListener("cancel", event => event.preventDefault());

function showResponse() {
  const response = engine.pendingResponse;
  if (!response) return;
  const isGuard = response.type === "guard", isIntervene = ["intervene", "interveneStrategy"].includes(response.type);
  $("#responseTitle").textContent = isGuard ? "攻击即将命中" : isIntervene ? "是否强制介入？" : "策略牌即将生效";
  $("#responseCopy").textContent = isGuard ? `${engine.nameOf(response.sourceId)}正在攻击你，需要${response.required}张防御牌。` : isIntervene ? `${engine.nameOf(response.originalTargetId)}正在成为${response.type === "interveneStrategy" ? `【${response.cardName}】` : "突击"}目标，你可以代替其承受这次结算。` : `${engine.nameOf(response.sourceId)}对你使用了【${response.cardName}】，是否打出反制？`;
  $("#acceptResponse").textContent = isGuard ? `打出${response.required}张防御` : isIntervene ? "打出强制介入" : "打出反制";
  $("#declineResponse").textContent = isGuard ? "承受伤害" : isIntervene ? "不介入" : "让其生效";
  if (!responseDialog.open) responseDialog.showModal();
}

$("#acceptResponse").addEventListener("click", () => resolveResponse(true));
$("#declineResponse").addEventListener("click", () => resolveResponse(false));
function resolveResponse(useCard) {
  responseDialog.close();
  engine.respond(useCard);
  renderGame();
  continueFlow(500);
}

function showResult() {
  if (!engine?.winner || resultDialog.open) return;
  if (playerDetailDialog.open) { inspectedPlayerId = null; playerDetailDialog.close(); }
  if (cardDetailDialog.open) { inspectedCardUid = null; cardDetailDialog.close(); }
  const won = engine.humanWon();
  $("#resultIcon").textContent = won ? "胜" : "败";
  $("#resultTitle").textContent = won ? "你赢得了这场战斗" : "这一次，命运站在对面";
  $("#resultCopy").textContent = `${engine.winner.label} · 对局进行至第 ${engine.round} 轮。`;
  resultDialog.showModal();
}

$("#resultLobby").addEventListener("click", returnLobby);
$("#rematchButton").addEventListener("click", () => { resultDialog.close(); selectedMode = lastMode.modeId; selectedCharacter = lastMode.humanCharacterId; startGame(); });
$("#soundButton").addEventListener("click", event => { event.currentTarget.classList.toggle("muted"); showToast(event.currentTarget.classList.contains("muted") ? "音效已关闭" : "音效已开启（演示）"); });
$("#intelToggle").addEventListener("click", () => toggleIntel(!$(".intel-panel").classList.contains("open")));
$("#intelClose").addEventListener("click", () => toggleIntel(false));
$("#intelScrim").addEventListener("click", () => toggleIntel(false));

function toggleIntel(open) {
  $(".intel-panel").classList.toggle("open", open);
  $("#intelScrim").classList.toggle("open", open);
  $("#intelToggle").setAttribute("aria-expanded", String(open));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

renderCardCodex();
renderLobby();
