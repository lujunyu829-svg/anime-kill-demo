import { activeSkills, cardDefinitions, characters, deckProfiles, getCharacter, getMode, roles } from "./data.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class GameEngine {
  constructor({ modeId, humanCharacterId, random = Math.random } = {}) {
    this.random = random;
    this.mode = getMode(modeId) || getMode("classic8");
    this.humanCharacterId = humanCharacterId || characters[0].id;
    this.players = [];
    this.deck = [];
    this.discard = [];
    this.logs = [];
    this.visualEvents = [];
    this.round = 0;
    this.phase = "setup";
    this.currentPlayerId = null;
    this.turnQueue = [];
    this.pendingResponse = null;
    this.pendingDiscard = null;
    this.pendingChoice = null;
    this.pendingChoiceResolver = null;
    this.pendingStrategySequence = null;
    this.pendingDiscardResolver = null;
    this.discardPromptId = 0;
    this.choicePromptId = 0;
    this.winner = null;
    this.instance = 0;
    this.turnNumber = 0;
  }

  setup() {
    this.deck = this.shuffle(this.buildDeck());
    const available = this.shuffle(characters.filter(c => c.id !== this.humanCharacterId));
    let roleList = [...this.mode.roles];
    if (this.mode.id === "classic8") roleList = this.shuffle(roleList);
    this.players = Array.from({ length: this.mode.playerCount }, (_, seat) => {
      const character = seat === 0 ? getCharacter(this.humanCharacterId) : available[seat - 1];
      const roleId = roleList[seat];
      const lordBonus = roleId === "lord" ? 1 : 0;
      return {
        id: `p${seat}`,
        seat,
        human: seat === 0,
        characterId: character.id,
        roleId,
        revealed: this.mode.publicRoles.includes(roleId),
        alive: true,
        hp: character.hp + lordBonus,
        maxHp: character.hp + lordBonus,
        baseHandLimit: character.handLimit,
        handLimitModifier: lordBonus,
        energy: 0,
        maxEnergy: 4,
        hand: [],
        equipment: { weapon: null, armor: null, charm: null },
        plots: [],
        specialCards: [],
        sealedCards: [],
        chessTargetId: null,
        sandMarkedBy: null,
        sandMarkSetTurn: 0,
        swapMarkedId: null,
        scoutedTargetId: null,
        scoutSetTurn: 0,
        toadBindTargetId: null,
        toadBindExpiresTurn: 0,
        sageMarks: 0,
        sageResonance: false,
        sageMarkRoundFlags: { dealt: false, taken: false },
        curseSeal: null,
        curseResearchType: null,
        byakugoMode: false,
        byakugoActivatedTurn: 0,
        lastSealType: null,
        dying: false,
        shield: 0,
        poison: 0,
        frozenDraw: 0,
        skipOffense: false,
        attackLimit: 1,
        attacksUsed: 0,
        rangeInfinite: false,
        armorReady: true,
        signatureLocked: 0,
        contractHpLoss: 0,
        energyLocked: false,
        roundFlags: {},
        turnFlags: {}
      };
    });

    for (const player of this.players) this.draw(player.id, player.baseHandLimit + player.handLimitModifier, false);
    const lord = this.players.find(player => player.roleId === "lord");
    this.anchorSeat = lord?.seat ?? 0;
    this.log("system", `对局开始：${this.mode.name}`);
    if (lord) this.log("event", `${this.nameOf(lord)}公开身份：${roles.lord.name}`);
    this.startRound();
    return this;
  }

  buildDeck() {
    const cards = [];
    const recipe = deckProfiles[this.mode.deckProfile] || deckProfiles.standard144;
    for (const [id, count] of Object.entries(recipe)) {
      for (let index = 0; index < count; index += 1) cards.push({ ...cardDefinitions[id], uid: `${id}-${this.instance++}` });
    }
    return cards;
  }

  shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  startRound() {
    if (this.winner) return;
    this.round += 1;
    for (const player of this.players) {
      player.roundFlags = {};
      player.armorReady = true;
      player.sageMarkRoundFlags = { dealt: false, taken: false };
    }
    const alive = this.players.filter(player => player.alive);
    this.turnQueue = [...alive.filter(p => p.seat >= this.anchorSeat), ...alive.filter(p => p.seat < this.anchorSeat)].map(p => p.id);
    this.log("round", `第 ${this.round} 轮开始`);
    this.startNextTurn();
  }

  startNextTurn() {
    if (this.winner) return;
    while (this.turnQueue.length && !this.player(this.turnQueue[0])?.alive) this.turnQueue.shift();
    if (!this.turnQueue.length) return this.startRound();
    const player = this.player(this.turnQueue.shift());
    this.currentPlayerId = player.id;
    this.turnNumber += 1;
    this.phase = "play";
    if (this.expirePlotsAtTurnStart(player.id, () => this.completeTurnStart(player.id))) return;
    this.completeTurnStart(player.id);
  }

  completeTurnStart(playerId) {
    const player = this.player(playerId);
    if (!player?.alive || this.winner) return;
    this.returnSealedCards(playerId);
    this.expireFalsePlots(playerId);
    if (player.scoutedTargetId && player.scoutSetTurn < this.turnNumber) {
      player.scoutedTargetId = null;
      this.log("event", `${this.nameOf(player)}的白眼锁定结束`);
    }
    if (player.characterId === "jiraiya" && player.toadBindTargetId) {
      player.toadBindTargetId = null;
      player.toadBindExpiresTurn = 0;
      this.log("event", `${this.nameOf(player)}的“蛤蟆口束缚”结束`);
    }
    for (const target of this.players) {
      if (target.curseSeal?.sourceId === playerId && target.curseSeal.setTurn < this.turnNumber) {
        target.curseSeal = null;
        this.log("event", `${this.nameOf(player)}布置的咒印实验到期`);
      }
    }
    if (player.byakugoMode && player.byakugoActivatedTurn < this.turnNumber) {
      player.byakugoMode = false;
      player.roundFlags.byakugoReturnedTypes = [];
      this.log("event", `${this.nameOf(player)}的“百豪之术”结束`);
    }
    player.turnFlags = { cardsPlayed: 0 };
    player.attacksUsed = 0;
    player.attackLimit = 1 + (player.equipment.weapon?.id === "repeater" ? 1 : 0);
    player.rangeInfinite = false;
    this.refreshEnergyCap(player);
    this.gainEnergy(player.id, 1 + (player.equipment.charm?.id === "charm" ? 1 : 0));

    let drawCount = Math.max(0, 2 - player.frozenDraw);
    player.frozenDraw = 0;
    this.draw(player.id, drawCount);
    if (player.characterId === "tanjiro") {
      const top = this.peek();
      if (top?.type === "basic") {
        player.hand.push(this.takeTop());
        this.log("event", `${this.nameOf(player)}以“嗅觉”获得了1张基础牌`);
      }
    }
    this.log("turn", `${this.nameOf(player)}的回合`);
  }

  endTurn(playerId = this.currentPlayerId) {
    if (this.winner || this.pendingResponse || this.pendingDiscard || this.pendingChoice || playerId !== this.currentPlayerId) return false;
    const player = this.player(playerId);
    if (!player?.alive) return false;
    const expiredCopies = player.hand.filter(card => card._copiedBy === playerId);
    if (expiredCopies.length) {
      player.hand = player.hand.filter(card => card._copiedBy !== playerId);
      this.log("event", `${this.nameOf(player)}未使用的${expiredCopies.length}张拷贝牌随查克拉消散`);
    }
    if (player.poison > 0) {
      player.poison -= 1;
      this.log("damage", `${this.nameOf(player)}受到毒素侵蚀，失去1点体力`);
      this.loseHp(player.id, 1, null, "poison");
      if (this.winner || this.pendingChoice) return true;
    }
    player.skipOffense = false;
    const limit = this.handLimit(player.id);
    if (player.hand.length > limit) {
      const count = player.hand.length - limit;
      this.phase = "discard";
      this.requestDiscard(player.id, count, {
        reason: `回合结束：手牌上限为${limit}，请选择${count}张手牌弃置`,
        shouldLog: false,
        onComplete: () => {
          this.log("system", `${this.nameOf(player)}弃置了${count}张超出上限的手牌`);
          this.finishTurn(player.id);
        }
      });
      return true;
    }
    return this.finishTurn(player.id);
  }

  finishTurn(playerId) {
    if (this.winner || this.pendingDiscard || this.pendingChoice || playerId !== this.currentPlayerId) return false;
    const player = this.player(playerId);
    if (player?.contractHpLoss > 0) {
      const loss = player.contractHpLoss;
      player.contractHpLoss = 0;
      this.log("event", `${this.nameOf(player)}的极限契约到期，失去${loss}点体力`);
      this.loseHp(playerId, loss, null, "contract", () => this.finishTurnAfterEffects(playerId));
      return true;
    }
    return this.finishTurnAfterEffects(playerId);
  }

  finishTurnAfterEffects(playerId) {
    const player = this.player(playerId);
    if (player?.signatureLocked > 0) player.signatureLocked -= 1;
    if (player?.energyLocked) player.energyLocked = false;
    this.expireEchoAtTurnEnd(playerId);
    for (const target of this.players) {
      if (target.sandMarkedBy === playerId && target.sandMarkSetTurn < this.turnNumber) {
        target.sandMarkedBy = null;
        target.sandMarkSetTurn = 0;
      }
    }
    this.phase = "between";
    this.startNextTurn();
    return true;
  }

  advancePastEliminatedCurrent() {
    if (this.winner || this.pendingResponse || this.pendingDiscard || this.pendingChoice) return false;
    const current = this.player(this.currentPlayerId);
    if (!current || current.alive) return false;
    this.phase = "between";
    this.startNextTurn();
    return true;
  }

  draw(playerId, count = 1, shouldLog = true) {
    const player = this.player(playerId);
    if (!player?.alive) return [];
    const cards = [];
    for (let i = 0; i < count; i += 1) {
      if (!this.deck.length) {
        if (!this.discard.length) break;
        this.deck = this.shuffle(this.discard.splice(0));
        this.log("system", "弃牌堆已重新洗入牌堆");
      }
      const card = this.deck.shift();
      player.hand.push(card);
      cards.push(card);
    }
    if (shouldLog && cards.length) this.log("system", `${this.nameOf(player)}摸了${cards.length}张牌`);
    return cards;
  }

  peek() { return this.deck[0] || null; }
  takeTop() { return this.deck.shift() || null; }
  player(id) { return this.players.find(player => player.id === id); }
  characterOf(playerOrId) { const player = typeof playerOrId === "string" ? this.player(playerOrId) : playerOrId; return getCharacter(player?.characterId); }
  nameOf(playerOrId) { return this.characterOf(playerOrId)?.name || "未知角色"; }
  roleOf(playerOrId) { const player = typeof playerOrId === "string" ? this.player(playerOrId) : playerOrId; return roles[player?.roleId]; }

  refreshEnergyCap(playerOrId) {
    const player = typeof playerOrId === "string" ? this.player(playerOrId) : playerOrId;
    if (!player) return;
    player.maxEnergy = 4 + (player.equipment.charm?.id === "battery" ? 1 : 0);
    player.energy = clamp(player.energy, 0, player.maxEnergy);
  }

  gainEnergy(playerId, amount = 1) {
    const player = this.player(playerId);
    if (!player?.alive || amount <= 0 || player.energyLocked) return 0;
    const before = player.energy;
    player.energy = clamp(player.energy + amount, 0, player.maxEnergy);
    return player.energy - before;
  }

  pushDamageFeedback(playerId, amount) {
    if (amount > 0) this.visualEvents.push({ type: "damage", playerId, amount });
  }

  consumeVisualEvents() {
    return this.visualEvents.splice(0);
  }

  handLimit(playerId) {
    const player = this.player(playerId);
    if (!player) return 0;
    const printed = player.baseHandLimit ?? this.characterOf(player)?.handLimit ?? 4;
    return Math.max(0, printed + (player.handLimitModifier || 0) + (player.equipment.charm?.id === "memory_core" ? 2 : 0));
  }

  getVisiblePlots(viewerId, ownerId) {
    const owner = this.player(ownerId);
    if (!owner) return [];
    const viewer = this.player(viewerId);
    const scouted = viewer?.characterId === "hinata" && viewer.scoutedTargetId === ownerId;
    return owner.plots.map(plot => viewerId === ownerId || plot.revealed || scouted ? { ...plot, hidden: false } : {
      uid: plot.uid,
      ownerId: plot.ownerId,
      targetId: plot.targetId,
      hidden: true,
      name: "未知伏笔"
    });
  }

  getSpecialCards(playerId, kind = null) {
    const player = this.player(playerId);
    if (!player) return [];
    return player.specialCards.filter(item => !kind || item.kind === kind);
  }

  storeSpecialCard(playerId, cardUid, kind) {
    const player = this.player(playerId);
    const index = player?.hand.findIndex(card => card.uid === cardUid) ?? -1;
    if (index < 0) return null;
    const [card] = player.hand.splice(index, 1);
    const stored = { uid: `special-${card.uid}`, kind, card, storedTurn: this.turnNumber };
    player.specialCards.push(stored);
    return stored;
  }

  consumeSpecialCard(playerId, kind, { returnToHand = false } = {}) {
    const player = this.player(playerId);
    const index = player?.specialCards.findIndex(item => item.kind === kind) ?? -1;
    if (index < 0) return null;
    const [stored] = player.specialCards.splice(index, 1);
    if (returnToHand && player.alive) player.hand.push(stored.card);
    else this.discard.push(stored.card);
    return stored;
  }

  returnSealedCards(sealerId) {
    for (const player of this.players) {
      const returning = player.sealedCards.filter(item => item.sealedBy === sealerId);
      if (!returning.length) continue;
      player.sealedCards = player.sealedCards.filter(item => item.sealedBy !== sealerId);
      if (player.alive) player.hand.push(...returning.map(item => item.card));
      else this.discard.push(...returning.map(item => item.card));
      this.log("event", `${this.nameOf(player)}被“月读”封存的${returning.length}张牌返回手牌`);
    }
  }

  expireFalsePlots(ownerId) {
    const owner = this.player(ownerId);
    if (!owner) return;
    for (const plot of [...owner.plots].filter(item => item.isFalse && item.setTurn < this.turnNumber)) {
      this.removePlot(plot, { discard: false, reveal: true, triggerOwnerSkill: false });
      if (owner.alive) owner.hand.push(plot.card);
      else this.discard.push(plot.card);
      this.log("event", `虚假伏笔【${plot.card.name}】到期并返回${this.nameOf(owner)}的手牌`);
    }
  }

  nearbySakuraProtectors(targetId) {
    const target = this.player(targetId);
    if (!target) return [];
    return this.players.filter(player => {
      if (!player.alive || player.characterId !== "sakura" || (!player.byakugoMode && this.distance(player.id, targetId) > 1)) return false;
      if (player.id === targetId || this.mode.id === "ranked2v2") return player.id === targetId || this.isAlly(player.id, targetId);
      return player.revealed && target.revealed && this.isAlly(player.id, targetId);
    });
  }

  consumeByakugo(targetId, type, reason) {
    const sakura = this.nearbySakuraProtectors(targetId).find(player => this.getSpecialCards(player.id, "byakugo").some(item => item.card.type === type));
    if (!sakura) return false;
    const stored = this.getSpecialCards(sakura.id, "byakugo").find(item => item.card.type === type);
    const index = sakura.specialCards.findIndex(item => item.uid === stored.uid);
    sakura.specialCards.splice(index, 1);
    const returnedTypes = sakura.roundFlags.byakugoReturnedTypes || (sakura.roundFlags.byakugoReturnedTypes = []);
    const returns = sakura.byakugoMode && !returnedTypes.includes(type);
    if (returns) { returnedTypes.push(type); sakura.hand.push(stored.card); }
    else this.discard.push(stored.card);
    if (sakura.lastSealType && sakura.lastSealType !== type) this.gainEnergy(sakura.id, 1);
    if (sakura.characterId === "sakura" && type === "basic") sakura.turnFlags.nextAttackBonus = true;
    if (sakura.characterId === "sakura" && type === "strategy") {
      const control = this.plotsTargeting(sakura.id).find(plot => plot.effect !== "echoScript");
      if (control) this.removePlot(control);
      else if (sakura.poison > 0) sakura.poison = 0;
      else if (sakura.frozenDraw > 0) sakura.frozenDraw = 0;
      else if (sakura.skipOffense) sakura.skipOffense = false;
      else if (sakura.energyLocked) sakura.energyLocked = false;
      else if (sakura.signatureLocked > 0) sakura.signatureLocked = 0;
    }
    sakura.lastSealType = type;
    this.log("event", `${this.nameOf(sakura)}解放${{ basic: "基础", strategy: "策略", equipment: "装备" }[type]}百豪牌，${reason}`);
    return true;
  }

  plotsTargeting(targetId, effect = null) {
    return this.players.flatMap(player => player.plots).filter(plot => plot.targetId === targetId && (!effect || plot.effect === effect));
  }

  removePlot(plot, { discard = true, reveal = true, triggerOwnerSkill = true } = {}) {
    const owner = this.player(plot?.ownerId);
    if (!owner) return null;
    const index = owner.plots.findIndex(item => item.uid === plot.uid);
    if (index < 0) return null;
    const [removed] = owner.plots.splice(index, 1);
    if (discard) this.discard.push(removed.card);
    if (reveal) this.log("event", `伏笔【${removed.card.name}】被揭示`);
    if (triggerOwnerSkill) this.afterOwnedPlotRemoved(owner.id);
    return removed;
  }

  triggerTacticalForesight(ownerId, targetId = null, reason = "局势变化") {
    const owner = this.player(ownerId);
    const markedId = targetId || owner?.chessTargetId;
    if (owner?.characterId !== "shikamaru" || owner.roundFlags.foresight || !markedId || owner.chessTargetId !== markedId) return false;
    const index = this.turnQueue.indexOf(markedId);
    if (index < 0 || index >= this.turnQueue.length - 1) return false;
    [this.turnQueue[index], this.turnQueue[index + 1]] = [this.turnQueue[index + 1], this.turnQueue[index]];
    owner.roundFlags.foresight = true;
    owner.turnFlags.shadowNeckTarget = markedId;
    this.log("event", `${this.nameOf(owner)}因${reason}发动“战术预读”，令${this.nameOf(markedId)}的行动后移一位`);
    return true;
  }

  notifyCardCancelled(playerId, reason = "出牌被取消") {
    const owner = this.findChessOwner(playerId);
    if (owner) this.triggerTacticalForesight(owner.id, playerId, reason);
  }

  afterOwnedPlotRemoved(ownerId) {
    this.triggerTacticalForesight(ownerId, null, "伏笔被移除");
  }

  requestChoice(playerId, { title = "请选择", text = "", options = [], onResolve = null, aiChoice = null } = {}) {
    const player = this.player(playerId);
    const available = options.filter(option => !option.disabled);
    if (!player?.alive || !available.length) {
      if (onResolve) onResolve(null);
      return { ok: true, pending: false };
    }
    if (!player.human) {
      const value = typeof aiChoice === "function" ? aiChoice(available, player) : aiChoice;
      const chosen = available.find(option => option.value === value) || available[0];
      if (onResolve) onResolve(chosen.value);
      return { ok: true, pending: false, value: chosen.value };
    }
    this.pendingChoice = { id: ++this.choicePromptId, playerId, title, text, options: available.map(option => ({ value: option.value, label: option.label, description: option.description || "" })) };
    this.pendingChoiceResolver = onResolve;
    return { ok: true, pending: true };
  }

  resolveChoice(playerId, value) {
    const pending = this.pendingChoice;
    if (!pending || pending.playerId !== playerId || !pending.options.some(option => option.value === value)) return { ok: false, reason: "当前选项无效" };
    const resolver = this.pendingChoiceResolver;
    this.pendingChoice = null;
    this.pendingChoiceResolver = null;
    if (resolver) resolver(value);
    return { ok: true };
  }

  isAlly(aId, bId) {
    const a = this.player(aId), b = this.player(bId);
    if (!a || !b) return false;
    if (a.roleId === "lone" || b.roleId === "lone") return a.id === b.id;
    return this.roleOf(a).camp === this.roleOf(b).camp;
  }

  distance(aId, bId) {
    const alive = this.players.filter(player => player.alive).sort((a, b) => a.seat - b.seat);
    const ai = alive.findIndex(player => player.id === aId), bi = alive.findIndex(player => player.id === bId);
    if (ai < 0 || bi < 0) return Infinity;
    const direct = Math.abs(ai - bi);
    let distance = Math.min(direct, alive.length - direct);
    const target = this.player(bId);
    if (target.characterId === "shinobu" && !target.equipment.armor) distance += 1;
    return distance;
  }

  attackRange(playerId) {
    const player = this.player(playerId);
    if (player.rangeInfinite) return 99;
    let range = 1 + (player.equipment.weapon?.rangeBonus || 0) + (player.turnFlags.rangeBonus || 0);
    if (["ichigo"].includes(player.characterId)) range += 1;
    if (player.characterId === "mikasa" && player.equipment.weapon) range += 1;
    if (player.characterId === "jiraiya" && player.sageMarks > 0) range += 1;
    if (player.characterId === "naruto" && this.getSpecialCards(playerId, "clone").length) return 99;
    return range;
  }

  getCardTargets(playerId, card) {
    const player = this.player(playerId);
    if (!player?.alive || !card || card.responseOnly) return [];
    if (card.type === "equipment" || ["focus", "overdrive", "energy_auction", "delayed_cast", "echo_script", "dimensional_barrage", "rift_invasion"].includes(card.id)) return [playerId];
    if (card.id === "adapt") return this.players.filter(target => target.alive && (target.id === playerId || this.distance(playerId, target.id) <= this.attackRange(playerId))).map(target => target.id);
    if (card.id === "heal") {
      const targets = player.hp < player.maxHp ? [playerId] : [];
      if (player.characterId === "chopper") targets.push(...this.players.filter(p => p.alive && p.id !== playerId && (this.mode.id === "classic8" || this.isAlly(playerId, p.id)) && p.hp < p.maxHp && this.distance(playerId, p.id) <= 1).map(p => p.id));
      return targets;
    }
    if (card.id === "attack") return this.players.filter(p => p.alive && p.id !== playerId && (
      this.distance(playerId, p.id) <= this.attackRange(playerId)
      || (player.characterId === "sasuke" && player.swapMarkedId === p.id)
      || (player.characterId === "shikamaru" && player.turnFlags.shadowNeckTarget === p.id)
      || (player.characterId === "gaara" && p.sandMarkedBy === playerId)
      || (player.characterId === "hinata" && player.scoutedTargetId === p.id)
    )).map(p => p.id);
    if (card.id === "memory_exchange") return this.players.filter(p => p.alive && p.id !== playerId && p.hand.length && player.hand.some(item => item.uid !== card.uid)).map(p => p.id);
    if (card.id === "tactical_relay") return player.hand.some(item => item.uid !== card.uid && item.type === "basic") ? this.players.filter(p => p.alive && p.id !== playerId).map(p => p.id) : [];
    if (["limit_contract", "causal_mark", "rhythm_break", "will_duel", "energy_collapse"].includes(card.id)) return this.players.filter(p => p.alive && p.id !== playerId).map(p => p.id);
    if (card.id === "mind_burn") return this.players.filter(p => p.alive && p.id !== playerId && p.hand.length).map(p => p.id);
    if (["guardian_oath", "return_route"].includes(card.id)) return this.players.filter(p => p.alive).map(p => p.id);
    if (card.id === "equipment_shift") return this.players.some(p => Object.values(p.equipment).some(Boolean)) ? this.players.filter(p => p.alive).map(p => p.id) : [];
    if (card.id === "initiative_swap") return this.turnQueue.filter(id => this.player(id)?.alive).length >= 2 ? [...this.turnQueue].filter(id => this.player(id)?.alive) : [];
    return [];
  }

  getSignatureTargets(playerId) {
    const player = this.player(playerId), signature = this.characterOf(player)?.signature;
    if (!player?.alive || !signature) return [];
    if (signature.effect === "colossal" && player.hp <= 1) return [];
    if (signature.effect === "checkmate") {
      const targetId = player.chessTargetId;
      return targetId && this.player(targetId)?.alive ? [targetId] : [];
    }
    if (signature.effect === "tsukuyomi") {
      return player.plots.filter(plot => plot.isFalse && this.player(plot.targetId)?.alive && this.player(plot.targetId).hand.some(card => !card.responseOnly)).map(plot => plot.targetId);
    }
    if (signature.effect === "kirin") return player.swapMarkedId && this.player(player.swapMarkedId)?.alive ? [player.swapMarkedId] : [];
    if (signature.effect === "kamuiRaikiri") {
      if (!player.hand.some(card => card._copiedBy === playerId)) return [];
      return this.players.filter(target => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= Math.max(2, this.attackRange(playerId))).map(target => target.id);
    }
    if (signature.effect === "sixtyFourPalms") return player.scoutedTargetId && this.player(player.scoutedTargetId)?.alive ? [player.scoutedTargetId] : [];
    if (signature.effect === "goemon") {
      return this.players.filter(target => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2).map(target => target.id);
    }
    if (signature.effect === "immortality") return player.hand.some(card => card._curseSpoil === playerId) ? [playerId] : [];
    if (signature.target === "self") return [playerId];
    const candidates = this.players.filter(p => p.alive && p.id !== playerId);
    if (signature.target === "ally") return candidates.filter(p => this.mode.id === "classic8" || this.isAlly(playerId, p.id)).map(p => p.id);
    return candidates.filter(p => (this.mode.id === "classic8" || !this.isAlly(playerId, p.id)) && this.distance(playerId, p.id) <= Math.max(2, this.attackRange(playerId))).map(p => p.id);
  }

  getActiveSkillTargets(playerId) {
    const player = this.player(playerId), skill = activeSkills[player?.characterId];
    if (!player?.alive || !skill || player.turnFlags.activeUsed) return [];
    if (skill.cost && player.energy < skill.cost) return [];
    if (["totalConcentration", "odmGear", "tacticalGift"].includes(skill.effect) && !player.hand.length) return [];
    if (skill.effect === "shadowClone" && (this.getSpecialCards(playerId, "clone").length || !player.hand.some(card => card.type === "basic" && !card.responseOnly))) return [];
    if (skill.effect === "byakugoStore") {
      const stored = this.getSpecialCards(playerId, "byakugo");
      const storedTypes = new Set(stored.map(item => item.card.type));
      const canStore = stored.length < 2 && player.hand.some(card => !storedTypes.has(card.type));
      if (!canStore && !stored.length) return [];
    }
    if (skill.effect === "illusionPlot" && !player.hand.some(card => card.strategyKind !== "plot")) return [];
    if (skill.effect === "amenotejikara") {
      return this.players.filter(target => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2 && ["weapon", "armor", "charm"].some(slot => player.equipment[slot] || target.equipment[slot])).map(target => target.id);
    }
    if (skill.effect === "copyNinjutsu" && !this.discard.some(card => !card.responseOnly && !card._copiedBy && (card.type === "basic" || card.strategyKind === "instant"))) return [];
    if (skill.effect === "toadBind") {
      if (player.toadBindTargetId) return [];
      return this.players.filter(target => target.alive && target.id !== playerId && (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2).map(target => target.id);
    }
    if (skill.effect === "curseExperiment" && !player.hand.length) return [];
    if (skill.effect === "medicine" && !player.hand.some(card => card.type === "basic")) return [];
    if (skill.effect === "secondGear" && player.hp <= 1) return [];
    if (skill.target === "self") return [playerId];
    if (skill.target === "future") return this.turnQueue.filter(id => this.player(id)?.alive);
    const candidates = this.players.filter(target => target.alive && target.id !== playerId);
    if (skill.target === "other") return candidates.map(target => target.id);
    if (skill.target === "ally") {
      return candidates.filter(target => (this.mode.id === "classic8" || this.isAlly(playerId, target.id)) && (skill.effect !== "medicine" || target.hp < target.maxHp)).map(target => target.id);
    }
    return candidates.filter(target => (this.mode.id === "classic8" || !this.isAlly(playerId, target.id)) && this.distance(playerId, target.id) <= 2).map(target => target.id);
  }

  useActiveSkill(playerId, targetId) {
    const player = this.player(playerId), skill = activeSkills[player?.characterId];
    if (!this.canAct(playerId)) return { ok: false, reason: "现在不能发动技能" };
    if (!skill || player.turnFlags.activeUsed) return { ok: false, reason: "主动技本回合已经使用" };
    if (!this.getActiveSkillTargets(playerId).includes(targetId)) return { ok: false, reason: "消耗不足或目标不合法" };
    if (skill.cost) player.energy -= skill.cost;
    player.turnFlags.activeUsed = true;
    this.log("signature", `${this.nameOf(player)}发动主动技「${skill.name}」`);
    switch (skill.effect) {
      case "shadowClone": {
        const cards = player.hand.filter(card => card.type === "basic" && !card.responseOnly);
        return this.requestChoice(playerId, {
          title: "影分身：选择基础牌",
          text: "该牌将正面置于分身区，不计入手牌上限。",
          options: cards.map(card => ({ value: card.uid, label: `以【${card.name}】制造分身`, description: card.description })),
          aiChoice: cards[0]?.uid,
          onResolve: uid => { const stored = this.storeSpecialCard(playerId, uid, "clone"); if (stored) this.log("event", `${this.nameOf(player)}将【${stored.card.name}】化为影分身`); }
        });
      }
      case "byakugoStore": return this.resolveByakugoSkill(playerId);
      case "chessMove": player.chessTargetId = targetId; this.log("event", `${this.nameOf(player)}将${this.nameOf(targetId)}设为“棋子”`); break;
      case "illusionPlot": {
        const cards = player.hand.filter(card => card.strategyKind !== "plot");
        return this.requestChoice(playerId, {
          title: "幻象布置：选择伪装牌",
          text: `该牌将作为未知伏笔指定${this.nameOf(targetId)}。`,
          options: cards.map(card => ({ value: card.uid, label: `暗置【${card.name}】`, description: card.description })),
          aiChoice: cards[0]?.uid,
          onResolve: uid => this.beginFalsePlot(playerId, targetId, uid)
        });
      }
      case "amenotejikara": return this.resolveAmenotejikara(playerId, targetId);
      case "copyNinjutsu": return this.resolveCopyNinjutsu(playerId);
      case "byakugan": {
        player.scoutedTargetId = targetId;
        player.scoutSetTurn = this.turnNumber;
        this.log("event", `${this.nameOf(player)}以白眼锁定了${this.nameOf(targetId)}`);
        break;
      }
      case "toadBind": {
        player.toadBindTargetId = targetId;
        player.toadBindExpiresTurn = this.turnNumber + 1;
        this.log("event", `${this.nameOf(player)}以“蛤蟆口束缚”困住了${this.nameOf(targetId)}`);
        return { ok: true };
      }
      case "sandBind": return this.resolveSandBind(playerId, targetId);
      case "curseExperiment": return this.resolveCurseExperiment(playerId, targetId);
      case "secondGear": this.loseHp(playerId, 1, null, "skill"); if (player.alive) { this.draw(playerId, 2); player.attackLimit += 1; } break;
      case "medicine": {
        const basicCards = player.hand.filter(item => item.type === "basic").map(item => item.uid);
        return this.requestDiscard(playerId, 1, {
          reason: "医术：请选择1张基础牌弃置",
          allowedUids: basicCards,
          shouldLog: false,
          onComplete: () => {
            const target = this.player(targetId); target.hp = clamp(target.hp + 1, 0, target.maxHp);
            this.log("heal", `${this.nameOf(target)}回复了1点体力`);
            if (!player.roundFlags.diagnosis) { player.roundFlags.diagnosis = true; this.draw(playerId, 1); this.draw(targetId, 1); }
          }
        });
      }
      case "getsuga": return this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "active" });
      case "firstDance": this.player(targetId).frozenDraw = Math.max(1, this.player(targetId).frozenDraw); break;
      case "totalConcentration": return this.requestDiscard(playerId, 1, { reason: "全集中呼吸：请选择1张手牌弃置", shouldLog: false, onComplete: () => { this.draw(playerId, 2); player.turnFlags.rangeBonus = (player.turnFlags.rangeBonus || 0) + 1; } });
      case "poisonCoat": player.turnFlags.nextAttackPoison = true; break;
      case "sixEyes": this.draw(playerId, 2); return this.requestDiscard(playerId, 1, { reason: "六眼：摸牌后请选择1张手牌弃置", shouldLog: false });
      case "divergentPrep": player.turnFlags.nextAttackBonus = true; break;
      case "odmGear": return this.requestDiscard(playerId, 1, { reason: "立体机动：请选择1张手牌弃置", shouldLog: false, onComplete: () => { player.attackLimit += 1; player.turnFlags.rangeBonus = (player.turnFlags.rangeBonus || 0) + 1; } });
      case "tacticalGift": {
        const [card] = player.hand.splice(0, 1);
        if (card) this.player(targetId).hand.push(card);
        this.draw(targetId, 1);
        break;
      }
    }
    return { ok: true };
  }

  resolveByakugoSkill(playerId) {
    const player = this.player(playerId);
    const stored = this.getSpecialCards(playerId, "byakugo");
    const storedTypes = new Set(stored.map(item => item.card.type));
    const cards = player.hand.filter(card => !storedTypes.has(card.type));
    const canStore = stored.length < 2 && cards.length > 0;
    const typeNames = { basic: "基础", strategy: "策略", equipment: "装备" };
    const options = [
      ...(canStore ? [{ value: "store", label: "继续蓄印", description: "选择1张不同类别手牌置入百豪区" }] : []),
      ...stored.map(item => ({
        value: `release:${item.uid}`,
        label: `解放【${item.card.name}】`,
        description: item.card.type === "basic" ? "回复1点体力并强化下一次攻击" : item.card.type === "strategy" ? "净化伏笔或异常并摸1张牌" : "获得2点护盾"
      }))
    ];
    const preferredRelease = stored.find(item => item.card.type === "basic" && player.hp < player.maxHp)
      || stored.find(item => item.card.type === "strategy" && (this.plotsTargeting(playerId).length || player.poison || player.frozenDraw || player.skipOffense || player.energyLocked || player.signatureLocked))
      || (!canStore ? stored[0] : null);
    return this.requestChoice(playerId, {
      title: "百豪印：蓄印或解放",
      text: "每回合可选择继续储存，或主动解放一张百豪牌。",
      options,
      aiChoice: preferredRelease ? `release:${preferredRelease.uid}` : "store",
      onResolve: value => {
        if (value === "store") {
          this.requestChoice(playerId, {
            title: "百豪蓄印：选择卡牌",
            text: "百豪区最多2张，且卡牌类别不能重复。",
            options: cards.map(card => ({ value: card.uid, label: `蓄入【${card.name}】`, description: `${typeNames[card.type]}牌 · ${card.description}` })),
            aiChoice: cards[0]?.uid,
            onResolve: uid => {
              const sealed = this.storeSpecialCard(playerId, uid, "byakugo");
              if (sealed) this.log("event", `${this.nameOf(player)}蓄入了一张${typeNames[sealed.card.type]}百豪牌`);
            }
          });
          return;
        }
        const uid = value?.slice("release:".length);
        const selected = stored.find(item => item.uid === uid);
        if (!selected || !this.consumeByakugo(playerId, selected.card.type, `主动解放【${selected.card.name}】`)) return;
        if (selected.card.type === "basic") {
          player.hp = clamp(player.hp + 1, 0, player.maxHp);
          this.log("heal", `${this.nameOf(player)}以百豪回复1点体力并凝聚怪力`);
        } else if (selected.card.type === "strategy") {
          this.draw(playerId, 1);
          this.log("event", `${this.nameOf(player)}以医疗忍术净化异常并摸1张牌`);
        } else {
          player.shield += 2;
          this.log("event", `${this.nameOf(player)}将装备百豪牌转化为2点护盾`);
        }
      }
    });
  }

  resolveAmenotejikara(sourceId, targetId) {
    const source = this.player(sourceId), target = this.player(targetId);
    const slots = ["weapon", "armor", "charm"].filter(slot => source.equipment[slot] || target.equipment[slot]);
    return this.requestChoice(sourceId, {
      title: "天手力：选择换位槽位",
      text: `与${this.nameOf(target)}交换对应装备，并建立追猎标记。`,
      options: slots.map(slot => ({ value: slot, label: { weapon: "武器", armor: "防具", charm: "饰品" }[slot], description: `${source.equipment[slot]?.name || "空槽"} ↔ ${target.equipment[slot]?.name || "空槽"}` })),
      aiChoice: slots[0],
      onResolve: slot => {
        [source.equipment[slot], target.equipment[slot]] = [target.equipment[slot], source.equipment[slot]];
        this.refreshEnergyCap(source); this.refreshEnergyCap(target);
        source.swapMarkedId = targetId;
        this.log("event", `${this.nameOf(source)}以“天手力”交换${{ weapon: "武器", armor: "防具", charm: "饰品" }[slot]}并标记${this.nameOf(target)}`);
      }
    });
  }

  resolveCopyNinjutsu(playerId) {
    const player = this.player(playerId);
    const candidates = [...this.discard].reverse().filter(card => !card.responseOnly && !card._copiedBy && (card.type === "basic" || card.strategyKind === "instant")).slice(0, 8);
    return this.requestChoice(playerId, {
      title: "拷贝忍术：选择术式",
      text: "生成的拷贝不计出牌数，仅持续到本回合结束。",
      options: candidates.map(card => ({ value: card.uid, label: `复刻【${card.name}】`, description: card.description })),
      aiChoice: candidates.find(card => card.type === "strategy")?.uid || candidates[0]?.uid,
      onResolve: uid => {
        const original = candidates.find(card => card.uid === uid);
        if (!original) return;
        const copy = { ...original, uid: `copy-${original.uid}-${this.instance++}`, name: `拷贝·${original.name}`, _copiedBy: playerId, _ephemeral: true };
        player.hand.push(copy);
        if (original.type === "basic") player.turnFlags.nextAttackBonus = true;
        if (original.type === "strategy") player.turnFlags.copyNoIntervene = true;
        this.log("event", `${this.nameOf(player)}复刻了【${original.name}】`);
      }
    });
  }

  resolveCurseExperiment(sourceId, targetId) {
    const source = this.player(sourceId), target = this.player(targetId);
    return this.requestDiscard(sourceId, 1, {
      reason: "咒印实验：选择1张手牌作为类别样本",
      onComplete: removed => {
        const sample = removed[0];
        if (!sample || !target?.alive) return;
        source.curseResearchType = sample.type;
        target.curseSeal = { sourceId, type: sample.type, setTurn: this.turnNumber };
        this.log("event", `${this.nameOf(source)}以${{ basic: "基础牌", strategy: "策略牌", equipment: "装备牌" }[sample.type]}为样本，对${this.nameOf(target)}布下咒印`);
      }
    });
  }

  findToadBindOwner(targetId) {
    return this.players.find(player => player.alive && player.characterId === "jiraiya" && player.toadBindTargetId === targetId);
  }

  findChessOwner(targetId) {
    return this.players.find(player => player.alive && player.characterId === "shikamaru" && player.chessTargetId === targetId);
  }

  handleChessPressure(playerId, card, cardUid, targetId, options = {}) {
    if (options.ignoreChessPressure || (card.id !== "attack" && card.type !== "strategy")) return null;
    const owner = this.findChessOwner(playerId);
    const player = this.player(playerId);
    if (!owner || player.roundFlags.chessPressure) return null;
    const markTriggered = () => { player.roundFlags.chessPressure = true; };
    const cancel = () => {
      markTriggered();
      this.removeCard(playerId, cardUid);
      this.log("event", `${this.nameOf(player)}被“影缝”打断了【${card.name}】`);
      this.notifyCardCancelled(playerId, "棋子出牌被取消");
      return { ok: true, cancelled: true };
    };
    const proceed = () => {
      markTriggered();
      return this.playCard(playerId, cardUid, targetId, { ...options, ignoreChessPressure: true });
    };
    const payable = player.hand.filter(item => item.uid !== cardUid);
    if (!payable.length) return cancel();
    if (!player.human) {
      this.discardRandom(playerId, 1, true, payable.map(item => item.uid));
      return proceed();
    }
    return this.requestChoice(playerId, {
      title: "影缝触发",
      text: `你被${this.nameOf(owner)}的棋子锁定。弃置另一张手牌可继续，否则此牌被取消。`,
      options: [{ value: "pay", label: "弃牌继续" }, { value: "cancel", label: "取消此牌" }],
      onResolve: value => {
        if (value === "pay") this.requestDiscard(playerId, 1, { reason: "影缝：请弃置当前待使用牌之外的1张牌", allowedUids: payable.map(item => item.uid), onComplete: proceed });
        else cancel();
      }
    });
  }

  resolveSandBind(sourceId, targetId) {
    const target = this.player(targetId);
    if (!target?.alive) return { ok: false, reason: "目标已经退场" };
    target.sandMarkedBy = sourceId;
    target.sandMarkSetTurn = this.turnNumber;
    const finish = removed => {
      if (removed.length) {
        target.frozenDraw = Math.max(1, target.frozenDraw);
        this.log("event", `${this.nameOf(target)}被“砂缚牢”限制，下回合少摸1张牌`);
      } else if (target.alive) {
        this.dealDamage(sourceId, targetId, 1, "skill");
      }
    };
    return this.requestDiscard(targetId, 1, { reason: "砂缚牢：请选择1张手牌弃置", onComplete: finish });
  }

  handleToadBind(playerId, card, cardUid, targetId, options = {}) {
    if (options.ignoreToadBind || (card.id !== "attack" && card.type !== "strategy")) return null;
    const owner = this.findToadBindOwner(playerId);
    if (!owner) return null;
    const player = this.player(playerId);
    const clear = () => {
      owner.toadBindTargetId = null;
      owner.toadBindExpiresTurn = 0;
    };
    const cancel = () => {
      clear();
      this.removeCard(playerId, cardUid);
      this.log("event", `${this.nameOf(player)}被“蛤蟆口束缚”打断了【${card.name}】`);
      this.draw(owner.id, 1);
      this.log("event", `${this.nameOf(owner)}发动“蛤蟆协攻”摸1张牌`);
      this.notifyCardCancelled(playerId, "出牌被蛤蟆束缚取消");
      return { ok: true, cancelled: true };
    };
    const proceed = () => {
      clear();
      this.gainEnergy(owner.id, 1);
      this.log("event", `${this.nameOf(owner)}发动“蛤蟆协攻”获得1点能量`);
      return this.playCard(playerId, cardUid, targetId, { ...options, ignoreToadBind: true });
    };
    const payable = player.hand.filter(item => item.uid !== cardUid);
    if (!payable.length) return cancel();
    if (!player.human) {
      this.discardRandom(playerId, 1, true, payable.map(item => item.uid));
      return proceed();
    }
    return this.requestChoice(playerId, {
      title: "蛤蟆口束缚触发",
      text: `你本回合首次使用【${card.name}】。弃置另一张手牌可继续，否则此牌被取消。`,
      options: [{ value: "pay", label: "弃牌继续" }, { value: "cancel", label: "取消此牌" }],
      onResolve: value => {
        if (value === "pay") this.requestDiscard(playerId, 1, { reason: "蛤蟆口束缚：请弃置当前待使用牌之外的1张牌", allowedUids: payable.map(item => item.uid), onComplete: proceed });
        else cancel();
      }
    });
  }

  playCard(playerId, cardUid, targetId, options = {}) {
    const player = this.player(playerId);
    if (!options.freeUse && !this.canAct(playerId)) return { ok: false, reason: "现在不能出牌" };
    if (options.freeUse && (!player?.alive || this.winner || this.pendingResponse || this.pendingDiscard || this.pendingChoice)) return { ok: false, reason: "现在不能出牌" };
    const index = player.hand.findIndex(card => card.uid === cardUid);
    const card = player.hand[index];
    if (!card || card.responseOnly) return { ok: false, reason: "这张牌只能用于响应" };
    if (!this.getCardTargets(playerId, card).includes(targetId)) return { ok: false, reason: "目标不合法" };
    if (card.id === "attack" && !options.freeUse && (player.skipOffense || player.attacksUsed >= player.attackLimit)) return { ok: false, reason: player.skipOffense ? "你本回合无法攻击" : "本回合攻击次数已用完" };
    if (card.type === "strategy" && player.skipOffense) return { ok: false, reason: "你本回合无法使用策略牌" };
    if (player.curseSeal?.type === card.type) {
      const curse = player.curseSeal;
      const experimenter = this.player(curse.sourceId);
      player.curseSeal = null;
      if (experimenter?.alive) {
        player.hand.splice(index, 1);
        card._curseSpoil = experimenter.id;
        experimenter.hand.push(card);
        this.gainEnergy(experimenter.id, 1);
        this.log("event", `${this.nameOf(player)}触发咒印，【${card.name}】被${this.nameOf(experimenter)}夺为实验牌`);
        this.notifyCardCancelled(playerId, "出牌被咒印夺取");
        return { ok: true, cancelled: true };
      }
    }
    if (!options.freeUse) {
      const checkmate = this.plotsTargeting(playerId, "checkmateTrap")[0];
      if (checkmate) {
        if (this.consumeByakugo(playerId, "strategy", "解除了“将军”陷阱")) {
          this.removePlot(checkmate);
        } else {
          this.removePlot(checkmate);
          this.log("event", `${this.nameOf(player)}被“将军”中断了出牌阶段`);
          this.notifyCardCancelled(playerId, "出牌被将军取消");
          return this.forceEndPlayPhase(playerId);
        }
      }
    }
    if (!options.skipRhythm && !options.freeUse && !card._copiedBy && (player.turnFlags.cardsPlayed || 0) >= 2) {
      const rhythm = this.plotsTargeting(playerId, "rhythmBreak")[0];
      if (rhythm) return this.triggerRhythmBreak(rhythm, playerId, cardUid, targetId);
    }
    const bindResult = this.handleToadBind(playerId, card, cardUid, targetId, options);
    if (bindResult) return bindResult;
    const chessResult = this.handleChessPressure(playerId, card, cardUid, targetId, options);
    if (chessResult) return chessResult;
    player.hand.splice(index, 1);
    if (card.type !== "equipment" && card.strategyKind !== "plot" && !card._ephemeral) this.discard.push(card);
    if (!options.freeUse && !card._copiedBy) player.turnFlags.cardsPlayed = (player.turnFlags.cardsPlayed || 0) + 1;
    this.log("card", `${this.nameOf(player)}使用了【${card.name}】${targetId !== playerId ? `，目标是${this.nameOf(targetId)}` : ""}`);
    if (player.characterId === "kakashi" && card._copiedBy === playerId && !player.roundFlags.copyRecovery) {
      player.roundFlags.copyRecovery = true;
      this.gainEnergy(playerId, 1);
      this.log("event", `${this.nameOf(player)}回收拷贝忍术的查克拉，获得1点能量`);
    }
    if (player.characterId === "orochimaru" && player.curseResearchType === card.type) {
      this.gainEnergy(playerId, 1);
      this.log("event", `${this.nameOf(player)}使用研究类别牌，获得1点能量`);
    }
    if (player.characterId === "hinata" && card.type === "strategy" && targetId === player.scoutedTargetId && !player.roundFlags.meridianSeal) {
      player.roundFlags.meridianSeal = true;
      const target = this.player(targetId);
      if (target?.alive) {
        target.energyLocked = true;
        this.log("event", `${this.nameOf(player)}以“经络封锁”阻断${this.nameOf(target)}的能量获取`);
      }
    }

    if (card.id === "attack") {
      if (!options.freeUse) player.attacksUsed += 1;
      const result = this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "attack", freeUse: options.freeUse });
      return this.finishBasicUse(playerId, card, result);
    }
    if (card.id === "heal") return this.finishBasicUse(playerId, card, this.resolveHeal(playerId, targetId));
    if (card.id === "focus") { this.gainEnergy(playerId, 1); this.draw(playerId, 1); return this.finishBasicUse(playerId, card, { ok: true }); }
    if (card.id === "overdrive") {
      if (player.turnFlags.overdriveUsed) { player.hand.push(this.discard.pop()); return { ok: false, reason: "本回合已使用超载" }; }
      player.turnFlags.overdriveUsed = true;
      player.turnFlags.nextAttackBonus = true;
      return this.finishBasicUse(playerId, card, { ok: true });
    }
    if (card.id === "adapt") return this.resolveAdapt(playerId, card, targetId, options);
    if (card.type === "strategy") return this.resolveStrategyCard(playerId, targetId, card);
    if (card.type === "equipment") return this.equip(playerId, card);
    return { ok: true };
  }

  finishBasicUse(playerId, card, result) {
    const echo = this.player(playerId)?.plots.find(plot => plot.effect === "echoScript" && plot.armed);
    if (echo) {
      this.removePlot(echo);
      const index = this.discard.findIndex(item => item.uid === card.uid);
      if (index >= 0 && this.player(playerId)?.alive) {
        this.player(playerId).hand.push(this.discard.splice(index, 1)[0]);
        this.log("event", `【招式残响】将【${card.name}】送回了${this.nameOf(playerId)}的手牌`);
      }
    }
    return result;
  }

  resolveAdapt(playerId, physicalCard, targetId, options = {}) {
    const player = this.player(playerId);
    const forms = [];
    if (targetId !== playerId && this.distance(playerId, targetId) <= this.attackRange(playerId) && (options.freeUse || player.attacksUsed < player.attackLimit)) forms.push({ value: "attack", label: `化为突击 → ${this.nameOf(targetId)}` });
    if (targetId === playerId && player.hp < player.maxHp) forms.push({ value: "heal", label: "化为恢复" });
    if (targetId === playerId) forms.push({ value: "focus", label: "化为蓄能" });
    if (targetId === playerId && !player.turnFlags.overdriveUsed) forms.push({ value: "overdrive", label: "化为超载" });
    if (!forms.length) {
      const discardIndex = this.discard.findIndex(item => item.uid === physicalCard.uid);
      if (discardIndex >= 0) player.hand.push(this.discard.splice(discardIndex, 1)[0]);
      return { ok: false, reason: "没有可用的应变形态" };
    }
    return this.requestChoice(playerId, {
      title: "选择应变形态",
      text: `【应变】将以选定的基础牌效果结算。`,
      options: forms,
      aiChoice: forms.some(item => item.value === "attack") ? "attack" : forms[0].value,
      onResolve: form => {
        if (form === "attack") {
          if (!options.freeUse) player.attacksUsed += 1;
          this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "attack", freeUse: options.freeUse });
        } else if (form === "heal") this.resolveHeal(playerId, playerId);
        else if (form === "focus") { this.gainEnergy(playerId, 1); this.draw(playerId, 1); }
        else if (form === "overdrive") { player.turnFlags.overdriveUsed = true; player.turnFlags.nextAttackBonus = true; }
        this.finishBasicUse(playerId, physicalCard, { ok: true });
      }
    });
  }

  equip(playerId, card) {
    const player = this.player(playerId);
    const old = player.equipment[card.slot];
    if (old) this.discard.push(old);
    player.equipment[card.slot] = card;
    this.refreshEnergyCap(player);
    if (card.id === "battery") this.gainEnergy(playerId, 1);
    this.log("event", `${this.nameOf(player)}装备了【${card.name}】`);
    return { ok: true };
  }

  resolveHeal(sourceId, targetId) {
    const source = this.player(sourceId), target = this.player(targetId);
    target.hp = clamp(target.hp + 1, 0, target.maxHp);
    this.log("heal", `${this.nameOf(target)}回复了1点体力`);
    if (source.characterId === "chopper" && sourceId !== targetId && !source.roundFlags.diagnosis) {
      source.roundFlags.diagnosis = true;
      this.draw(sourceId, 1); this.draw(targetId, 1);
      this.log("event", `${this.nameOf(source)}发动“诊断”，双方各摸1张牌`);
    }
    return { ok: true };
  }

  resolveStrategyCard(sourceId, targetId, card) {
    if (card.strategyKind === "plot") return this.beginPlot(sourceId, targetId, card);
    if (card.id === "dimensional_barrage") return this.resolveMassDamageStrategy(sourceId, card, "guard");
    if (card.id === "rift_invasion") return this.resolveMassDamageStrategy(sourceId, card, "attack");
    if (card.id === "will_duel") return this.offerStrategyIntervention(sourceId, targetId, card, actualTargetId => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveWillDuel(sourceId, actualTargetId)));
    if (card.id === "mind_burn") return this.offerStrategyIntervention(sourceId, targetId, card, actualTargetId => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveMindBurn(sourceId, actualTargetId)));
    if (card.id === "energy_collapse") return this.offerStrategyIntervention(sourceId, targetId, card, actualTargetId => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveEnergyCollapse(sourceId, actualTargetId)));
    if (card.id === "memory_exchange") return this.offerStrategyIntervention(sourceId, targetId, card, actualTargetId => this.offerCounter(sourceId, actualTargetId, card, () => this.resolveMemoryExchange(sourceId, actualTargetId)));
    if (card.id === "equipment_shift") return this.resolveEquipmentShiftSetup(sourceId, targetId, card);
    if (card.id === "tactical_relay") return this.resolveTacticalRelay(sourceId, targetId);
    if (card.id === "energy_auction") return this.resolveEnergyAuction(sourceId);
    if (card.id === "initiative_swap") return this.resolveInitiativeSwapSetup(sourceId, targetId, card);
    if (card.id === "limit_contract") return this.resolveLimitContract(sourceId, targetId);
    return { ok: true };
  }

  clockwiseTargets(sourceId) {
    const source = this.player(sourceId);
    if (!source) return [];
    const count = this.players.length;
    return this.players
      .filter(player => player.alive && player.id !== sourceId)
      .sort((a, b) => ((a.seat - source.seat + count) % count) - ((b.seat - source.seat + count) % count))
      .map(player => player.id);
  }

  strategyResponseResources(playerId, kind) {
    if (kind === "guard") return this.guardResources(playerId);
    const player = this.player(playerId);
    return player?.hand.filter(card => card.id === "attack" || card.id === "adapt").length || 0;
  }

  spendStrategyResponse(playerId, kind) {
    if (kind === "guard") return this.spendGuards(playerId, 1);
    const player = this.player(playerId);
    const card = player?.hand.find(item => item.id === "attack") || player?.hand.find(item => item.id === "adapt");
    if (card) this.removeCard(playerId, card.uid);
  }

  resolveMassDamageStrategy(sourceId, card, responseKind) {
    const targetIds = this.clockwiseTargets(sourceId);
    const total = targetIds.length;
    const step = index => {
      if (this.winner || index >= targetIds.length) {
        this.pendingStrategySequence = null;
        return { ok: true };
      }
      const targetId = targetIds[index], target = this.player(targetId);
      if (!target?.alive) return step(index + 1);
      this.pendingStrategySequence = { kind: "mass", cardName: card.name, sourceId, currentTargetId: targetId, current: index + 1, total, remaining: total - index - 1 };
      const responseLabel = responseKind === "guard" ? "防御或应变" : "突击或应变";
      const options = [];
      if (this.strategyResponseResources(targetId, responseKind) > 0) options.push({ value: "respond", label: `打出${responseLabel}`, description: "抵消对自己的这次效果" });
      if (target.hand.some(item => item.id === "counter")) options.push({ value: "counter", label: "打出反制", description: "仅免除对自己的效果，不影响其他目标" });
      options.push({ value: "take", label: "不响应", description: "受到1点策略伤害" });
      const aiChoice = options.some(option => option.value === "respond") ? "respond"
        : options.some(option => option.value === "counter") && (target.hp <= 1 || !this.isAlly(sourceId, targetId)) ? "counter" : "take";
      return this.requestChoice(targetId, {
        title: `${card.name} · 响应 ${index + 1}/${total}`,
        text: `${this.nameOf(sourceId)}发动【${card.name}】，${this.nameOf(targetId)}须打出${responseLabel}，否则受到1点策略伤害。`,
        options,
        aiChoice,
        onResolve: value => {
          if (value === "respond") {
            this.spendStrategyResponse(targetId, responseKind);
            this.log("event", `${this.nameOf(targetId)}响应【${card.name}】，免除了此次效果`);
            step(index + 1);
          } else if (value === "counter") {
            const counter = target.hand.find(item => item.id === "counter");
            if (counter) this.removeCard(targetId, counter.uid);
            this.log("event", `${this.nameOf(targetId)}以【反制】免除了【${card.name}】对自己的效果`);
            step(index + 1);
          } else this.dealDamage(sourceId, targetId, 1, "strategy", () => step(index + 1));
        }
      });
    };
    const result = step(0);
    return { ok: true, pending: Boolean(this.pendingChoice || this.pendingDiscard || this.pendingResponse), result };
  }

  resolveWillDuel(sourceId, targetId) {
    const exchange = (currentId, opponentId, count = 1) => {
      const current = this.player(currentId), opponent = this.player(opponentId);
      if (this.winner || !current?.alive || !opponent?.alive) {
        this.pendingStrategySequence = null;
        return { ok: true };
      }
      const cards = current.hand.filter(card => card.id === "attack" || card.id === "adapt");
      this.pendingStrategySequence = { kind: "duel", cardName: "意志对决", sourceId, currentTargetId: currentId, current: count, total: null, remaining: null };
      return this.requestChoice(currentId, {
        title: `意志对决 · 第${count}次交锋`,
        text: `${this.nameOf(currentId)}须打出突击或应变，否则受到${this.nameOf(opponentId)}造成的1点策略伤害。`,
        options: [...cards.map(card => ({ value: card.uid, label: `打出【${card.name}】`, description: "作为对决响应，不消耗突击次数" })), { value: "pass", label: "停止对决", description: "承受1点策略伤害" }],
        aiChoice: cards.find(card => card.id === "attack")?.uid || cards[0]?.uid || "pass",
        onResolve: value => {
          if (value === "pass") return this.dealDamage(opponentId, currentId, 1, "strategy", () => { this.pendingStrategySequence = null; });
          const card = current.hand.find(item => item.uid === value && (item.id === "attack" || item.id === "adapt"));
          if (!card) return this.dealDamage(opponentId, currentId, 1, "strategy", () => { this.pendingStrategySequence = null; });
          this.removeCard(currentId, card.uid);
          this.log("event", `${this.nameOf(currentId)}在【意志对决】中打出【${card.name}】`);
          exchange(opponentId, currentId, count + 1);
        }
      });
    };
    return exchange(targetId, sourceId);
  }

  resolveMindBurn(sourceId, targetId) {
    const source = this.player(sourceId), target = this.player(targetId);
    if (!source?.alive || !target?.alive || !target.hand.length) return { ok: true };
    return this.requestChoice(targetId, {
      title: "精神灼烧 · 展示手牌",
      text: "选择一张手牌展示；该牌结算后仍保留在你的手中。",
      options: target.hand.map(card => ({ value: card.uid, label: `展示【${card.name}】`, description: { basic: "基础牌", strategy: "策略牌", equipment: "装备牌" }[card.type] })),
      aiChoice: target.hand[0].uid,
      onResolve: uid => {
        const shown = target.hand.find(card => card.uid === uid);
        if (!shown) return;
        this.log("event", `${this.nameOf(target)}为【精神灼烧】展示了${{ basic: "基础牌", strategy: "策略牌", equipment: "装备牌" }[shown.type]}【${shown.name}】`);
        const matches = source.hand.filter(card => card.type === shown.type);
        if (!matches.length) return this.log("event", `${this.nameOf(source)}没有弃置同类别手牌，【精神灼烧】未造成伤害`);
        this.requestChoice(sourceId, {
          title: "精神灼烧 · 是否追击",
          text: `弃置一张${{ basic: "基础牌", strategy: "策略牌", equipment: "装备牌" }[shown.type]}，对${this.nameOf(target)}造成1点策略伤害。`,
          options: [{ value: "pass", label: "放弃追击" }, ...matches.map(card => ({ value: card.uid, label: `弃置【${card.name}】`, description: card.description }))],
          aiChoice: matches[0].uid,
          onResolve: value => {
            if (value === "pass") return;
            const paid = source.hand.find(card => card.uid === value && card.type === shown.type);
            if (!paid) return;
            this.removeCard(sourceId, paid.uid);
            this.dealDamage(sourceId, targetId, 1, "strategy");
          }
        });
      }
    });
  }

  resolveEnergyCollapse(sourceId, targetId) {
    const target = this.player(targetId);
    if (!target?.alive) return { ok: true };
    if (target.energy < 2) {
      this.dealDamage(sourceId, targetId, 1, "strategy");
      return { ok: true, pending: Boolean(this.pendingChoice || this.pendingDiscard) };
    }
    const signature = this.characterOf(target)?.signature;
    const preserveEnergy = target.hp > 1 && target.signatureLocked <= 0 && target.energy >= Math.max(2, (signature?.cost || 4) - 1);
    return this.requestChoice(targetId, {
      title: "能量崩解",
      text: "消耗2点能量免除伤害，或保留能量并受到1点策略伤害。",
      options: [{ value: "energy", label: "消耗2点能量" }, { value: "damage", label: "承受1点伤害" }],
      aiChoice: preserveEnergy ? "damage" : "energy",
      onResolve: value => {
        if (value === "energy") {
          target.energy = Math.max(0, target.energy - 2);
          this.log("event", `${this.nameOf(target)}消耗2点能量抵消了【能量崩解】`);
        } else this.dealDamage(sourceId, targetId, 1, "strategy");
      }
    });
  }

  offerCounter(sourceId, targetId, card, onResolve, { hidden = false, onCounter = null } = {}) {
    const target = this.player(targetId);
    const counter = target?.hand.find(item => item.id === "counter");
    if (!counter || targetId === sourceId) { onResolve(); return { ok: true }; }
    if (target.human) {
      this.pendingResponse = { type: "counter", sourceId, targetId, cardName: hidden ? "未知伏笔" : card.name, required: 1, onDecline: onResolve, onCounter, hidden, strategyCard: card };
      return { ok: true, pending: true };
    }
    const shouldCounter = hidden ? this.random() < .42 : !this.isAlly(sourceId, targetId) && this.random() < .72;
    if (shouldCounter) {
      this.removeCard(targetId, counter.uid);
      if (card.strategyKind === "plot") this.discard.push(card._physicalCard || card);
      this.log("event", `${this.nameOf(target)}打出【反制】，${hidden ? "伏笔布置" : "策略牌"}无效`);
      this.notifyCardCancelled(sourceId, "策略牌被反制");
      if (onCounter) onCounter();
      return { ok: true, countered: true };
    }
    onResolve();
    return { ok: true };
  }

  offerStrategyIntervention(sourceId, targetId, card, onTarget) {
    const source = this.player(sourceId);
    if (source?.turnFlags.copyNoIntervene) {
      source.turnFlags.copyNoIntervene = false;
      onTarget(targetId);
      return { ok: true, unredirectable: true };
    }
    if (!card.redirectable) { onTarget(targetId); return { ok: true }; }
    const eligible = this.players.filter(player => player.alive && player.id !== sourceId && player.id !== targetId && player.hand.some(item => item.id === "intervene") && (card.id !== "mind_burn" || player.hand.length > 1));
    const candidate = eligible.find(player => player.human) || eligible.find(player => this.isAlly(player.id, targetId) && !this.isAlly(player.id, sourceId));
    if (!candidate) { onTarget(targetId); return { ok: true }; }
    const decide = use => {
      if (!use) return onTarget(targetId);
      const responseCard = candidate.hand.find(item => item.id === "intervene");
      if (responseCard) this.removeCard(candidate.id, responseCard.uid);
      this.log("event", `${this.nameOf(candidate)}以【强制介入】接管了【${card.name}】的目标`);
      onTarget(candidate.id);
      if (candidate.alive) this.draw(candidate.id, 1);
    };
    if (candidate.human) {
      this.pendingResponse = { type: "interveneStrategy", sourceId, targetId: candidate.id, originalTargetId: targetId, cardName: card.name, required: 1, onDecision: decide };
      return { ok: true, pending: true };
    }
    decide(true);
    return { ok: true };
  }

  triggerRhythmBreak(plot, playerId, cardUid, targetId) {
    if (this.consumeByakugo(playerId, "strategy", "解除了【节奏断点】")) {
      this.removePlot(plot);
      return this.playCard(playerId, cardUid, targetId, { skipRhythm: true });
    }
    this.removePlot(plot);
    const player = this.player(playerId);
    const payable = player.hand.filter(card => card.uid !== cardUid);
    const finishPlay = () => this.playCard(playerId, cardUid, targetId, { skipRhythm: true });
    if (!payable.length) {
      this.log("event", `${this.nameOf(player)}被【节奏断点】中断了出牌阶段`);
      this.notifyCardCancelled(playerId, "出牌被节奏断点取消");
      return this.forceEndPlayPhase(playerId);
    }
    return this.requestChoice(playerId, {
      title: "节奏断点触发",
      text: "弃置另1张手牌令当前牌继续，或取消当前牌并结束出牌阶段。",
      options: [{ value: "pay", label: "弃牌继续" }, { value: "stop", label: "停止出牌" }],
      aiChoice: player.hand.length > 2 ? "pay" : "stop",
      onResolve: value => {
        if (value === "pay") this.requestDiscard(playerId, 1, { reason: "节奏断点：请弃置当前待使用牌之外的1张牌", allowedUids: payable.map(card => card.uid), onComplete: finishPlay });
        else {
          this.notifyCardCancelled(playerId, "出牌被节奏断点取消");
          this.forceEndPlayPhase(playerId);
        }
      }
    });
  }

  forceEndPlayPhase(playerId) {
    const player = this.player(playerId);
    if (!player?.alive) return { ok: true };
    player.turnFlags.forcedEnd = true;
    this.phase = "play";
    this.endTurn(playerId);
    return { ok: true, cancelled: true };
  }

  beginPlot(sourceId, targetId, card) {
    const owner = this.player(sourceId);
    if (owner.plots.some(plot => plot.effect === card.effect)) {
      owner.hand.push(card);
      return { ok: false, reason: "已有同名伏笔" };
    }
    const place = () => {
      owner.plots.push({ uid: `plot-${card.uid}`, card, ownerId: sourceId, targetId, effect: card.effect, setTurn: this.turnNumber, expiresTurn: this.turnNumber + Math.max(1, this.players.filter(player => player.alive).length), damaged: false, armed: false });
      this.log("event", `${this.nameOf(owner)}布置了1张伏笔，目标为${this.nameOf(targetId)}`);
    };
    return this.ensurePlotSlot(sourceId, () => {
      if (targetId !== sourceId) return this.offerCounter(sourceId, targetId, card, place, { hidden: true });
      place();
      return { ok: true };
    });
  }

  beginFalsePlot(sourceId, targetId, cardUid) {
    const owner = this.player(sourceId);
    if (!owner) return { ok: false, reason: "角色不存在" };
    const index = owner.hand.findIndex(card => card.uid === cardUid && card.strategyKind !== "plot");
    if (index < 0) return { ok: false, reason: "伪装牌无效" };
    const [card] = owner.hand.splice(index, 1);
    const proxy = { ...card, name: "幻象", strategyKind: "plot", hidden: true, _physicalCard: card };
    const place = () => {
      owner.plots.push({ uid: `false-${card.uid}`, card, ownerId: sourceId, targetId, effect: "falsePlot", isFalse: true, setTurn: this.turnNumber, expiresTurn: this.turnNumber + Math.max(1, this.players.filter(player => player.alive).length) });
      this.log("event", `${this.nameOf(owner)}布置了1张未知伏笔，目标为${this.nameOf(targetId)}`);
    };
    return this.ensurePlotSlot(sourceId, () => this.offerCounter(sourceId, targetId, proxy, place, {
      hidden: true,
      onCounter: () => { this.gainEnergy(sourceId, 2); owner.turnFlags.nextAttackIgnoreArmor = true; owner.turnFlags.nextAttackBonus = true; this.log("event", `${this.nameOf(owner)}的幻象骗取反制，获得2点能量并强化下一次攻击`); }
    }));
  }

  ensurePlotSlot(ownerId, onReady) {
    const owner = this.player(ownerId);
    if (!owner?.alive) return { ok: false, reason: "角色已经退场" };
    if (owner.plots.length < 2) return onReady();
    return this.requestChoice(ownerId, {
      title: "伏笔区已满：选择替换",
      text: "被替换的伏笔会公开并进入弃牌堆；新伏笔随后照常接受反制。",
      options: owner.plots.map(plot => ({
        value: plot.uid,
        label: `替换【${plot.isFalse ? "幻象·" : ""}${plot.card.name}】`,
        description: `当前目标：${this.nameOf(plot.targetId)}`
      })),
      aiChoice: owner.plots[0]?.uid,
      onResolve: plotUid => {
        const replaced = owner.plots.find(plot => plot.uid === plotUid);
        if (!replaced) return;
        this.removePlot(replaced);
        this.log("event", `${this.nameOf(owner)}替换了一个伏笔槽位`);
        onReady();
      }
    });
  }

  expirePlotsAtTurnStart(playerId, resume = null) {
    const owner = this.player(playerId);
    if (!owner) return false;
    const expiring = owner.plots.filter(plot => plot.setTurn < this.turnNumber + 1);
    const delayed = expiring.find(plot => plot.effect === "delayedCast");
    for (const plot of expiring.filter(item => !item.isFalse && item.effect !== "delayedCast" && item.effect !== "echoScript")) {
      this.removePlot(plot);
      if (plot.effect === "causalMark" && this.player(plot.targetId)?.alive) {
        this.draw(plot.targetId, 1);
        this.log("event", `【因果标记】未触发，${this.nameOf(plot.targetId)}摸1张牌`);
      }
    }
    const echo = owner.plots.find(plot => plot.effect === "echoScript");
    if (echo && echo.setTurn < this.turnNumber + 1) echo.armed = true;
    if (!delayed) return false;
    this.removePlot(delayed);
    const resolveDelayed = choice => {
      if (!delayed.damaged || choice === "draw") this.draw(playerId, 2);
      if (!delayed.damaged || choice === "energy") this.gainEnergy(playerId, 2);
    };
    if (!delayed.damaged) {
      resolveDelayed("both");
      return false;
    }
    this.requestChoice(playerId, {
      title: "延迟咏唱",
      text: "你在伏笔期间受过伤，请选择一项效果。",
      options: [{ value: "draw", label: "摸2张牌" }, { value: "energy", label: "获2点能量" }],
      aiChoice: owner.energy <= 2 ? "energy" : "draw",
      onResolve: choice => { resolveDelayed(choice); if (owner.human && resume) resume(); }
    });
    return Boolean(this.pendingChoice);
  }

  expireEchoAtTurnEnd(playerId) {
    const owner = this.player(playerId);
    const echo = owner?.plots.find(plot => plot.effect === "echoScript" && plot.armed);
    if (echo) this.removePlot(echo);
  }

  chooseHandCard(playerId, { title, excludeUid = null, onResolve }) {
    const player = this.player(playerId);
    const cards = player.hand.filter(card => card.uid !== excludeUid);
    return this.requestChoice(playerId, {
      title,
      text: "对方在你确认前不会看到这张牌。",
      options: cards.map(card => ({ value: card.uid, label: `【${card.name}】`, description: card.description })),
      aiChoice: cards[0]?.uid,
      onResolve
    });
  }

  resolveMemoryExchange(sourceId, targetId) {
    let sourceUid = null;
    return this.chooseHandCard(sourceId, {
      title: "记忆交换：选择你的牌",
      onResolve: uid => {
        sourceUid = uid;
        this.chooseHandCard(targetId, {
          title: "记忆交换：选择你的牌",
          onResolve: targetUid => {
            const source = this.player(sourceId), target = this.player(targetId);
            const si = source.hand.findIndex(card => card.uid === sourceUid), ti = target.hand.findIndex(card => card.uid === targetUid);
            if (si < 0 || ti < 0) return;
            const [a] = source.hand.splice(si, 1), [b] = target.hand.splice(ti, 1);
            source.hand.push(b); target.hand.push(a);
            this.log("event", `${this.nameOf(source)}与${this.nameOf(target)}完成了记忆交换`);
          }
        });
      }
    });
  }

  resolveEquipmentShiftSetup(sourceId, firstId, card) {
    const first = this.player(firstId);
    const candidates = this.players.filter(player => player.alive && player.id !== firstId && ["weapon", "armor", "charm"].some(slot => first.equipment[slot] || player.equipment[slot]));
    return this.requestChoice(sourceId, {
      title: "装备转移：选择第二名角色",
      options: candidates.map(player => ({ value: player.id, label: this.nameOf(player) })),
      aiChoice: candidates[0]?.id,
      onResolve: secondId => {
        const second = this.player(secondId);
        const slots = ["weapon", "armor", "charm"].filter(slot => first.equipment[slot] || second.equipment[slot]);
        this.requestChoice(sourceId, {
          title: "装备转移：选择槽位",
          options: slots.map(slot => ({ value: slot, label: { weapon: "武器", armor: "防具", charm: "饰品" }[slot] })),
          aiChoice: slots[0],
          onResolve: slot => this.offerCountersSequential(sourceId, [firstId, secondId], card, () => {
            const protectedId = [firstId, secondId].find(id => this.player(id)?.equipment[slot] && this.consumeByakugo(id, "equipment", `阻止了${{ weapon: "武器", armor: "防具", charm: "饰品" }[slot]}转移`));
            if (protectedId) return;
            [first.equipment[slot], second.equipment[slot]] = [second.equipment[slot], first.equipment[slot]];
            this.refreshEnergyCap(first); this.refreshEnergyCap(second);
            this.log("event", `${this.nameOf(first)}与${this.nameOf(second)}交换了${{ weapon: "武器", armor: "防具", charm: "饰品" }[slot]}`);
          })
        });
      }
    });
  }

  offerCountersSequential(sourceId, targetIds, card, onResolve, index = 0) {
    const ids = [...new Set(targetIds)].filter(id => id !== sourceId);
    if (index >= ids.length) { onResolve(); return { ok: true }; }
    return this.offerCounter(sourceId, ids[index], card, () => this.offerCountersSequential(sourceId, ids, card, onResolve, index + 1));
  }

  resolveTacticalRelay(sourceId, targetId) {
    const basics = this.player(sourceId).hand.filter(card => card.type === "basic");
    return this.requestChoice(sourceId, {
      title: "战术接力：选择交付的基础牌",
      options: basics.map(card => ({ value: card.uid, label: `【${card.name}】`, description: card.description })),
      aiChoice: basics[0]?.uid,
      onResolve: uid => {
        const source = this.player(sourceId), target = this.player(targetId);
        const index = source.hand.findIndex(card => card.uid === uid);
        if (index < 0) return;
        const [given] = source.hand.splice(index, 1); target.hand.push(given);
        const uses = this.relayUseOptions(targetId, given);
        this.requestChoice(targetId, {
          title: "战术接力",
          text: `你获得了【${given.name}】，可立即使用或保留。`,
          options: [{ value: "keep", label: "保留手牌" }, ...uses],
          aiChoice: uses[0]?.value || "keep",
          onResolve: value => {
            if (value === "keep") return;
            const [, selectedTarget] = value.split(":");
            const result = this.playCard(targetId, given.uid, selectedTarget, { freeUse: true, skipRhythm: true });
            if (result.ok !== false) { this.gainEnergy(sourceId, 1); this.gainEnergy(targetId, 1); }
          }
        });
      }
    });
  }

  relayUseOptions(playerId, card) {
    if (card.responseOnly) return [];
    const targets = this.getCardTargets(playerId, card);
    return targets.map(targetId => ({ value: `use:${targetId}`, label: `立即使用 → ${this.nameOf(targetId)}` }));
  }

  resolveEnergyAuction(sourceId) {
    const alive = this.players.filter(player => player.alive);
    const bids = new Map();
    for (const player of alive.filter(item => !item.human)) bids.set(player.id, Math.min(player.energy, player.energy >= 4 ? 2 : player.energy >= 2 ? 1 : 0));
    const human = alive.find(player => player.human);
    const finish = () => {
      for (const player of alive) {
        const bid = bids.get(player.id) || 0;
        player.energy -= bid;
        this.log("event", `${this.nameOf(player)}在能量竞逐中投入${bid}点能量`);
      }
      const highest = Math.max(...bids.values(), 0);
      if (highest === 0) return void this.draw(sourceId, 1);
      const winners = alive.filter(player => bids.get(player.id) === highest);
      if (winners.length === 1) this.draw(winners[0].id, 3);
      else for (const winner of winners) this.draw(winner.id, 1);
      if (winners.length === 1) this.requestDiscard(winners[0].id, 1, { reason: "能量竞逐胜者：摸3张后请弃置1张" });
    };
    if (!human) { finish(); return { ok: true }; }
    const options = [0, 1, 2].filter(value => value <= human.energy).map(value => ({ value: String(value), label: `投入 ${value} 点能量` }));
    return this.requestChoice(human.id, { title: "能量竞逐", text: "其他角色已秘密决定投入，确认后同时公开。", options, onResolve: value => { bids.set(human.id, Number(value)); finish(); } });
  }

  resolveInitiativeSwapSetup(sourceId, firstId, card) {
    const candidates = this.turnQueue.filter(id => id !== firstId && this.player(id)?.alive);
    return this.requestChoice(sourceId, {
      title: "时序改写：选择第二名角色",
      options: candidates.map(id => ({ value: id, label: this.nameOf(id) })),
      aiChoice: candidates.at(-1),
      onResolve: secondId => this.offerCountersSequential(sourceId, [firstId, secondId], card, () => {
        const a = this.turnQueue.indexOf(firstId), b = this.turnQueue.indexOf(secondId);
        if (a >= 0 && b >= 0) [this.turnQueue[a], this.turnQueue[b]] = [this.turnQueue[b], this.turnQueue[a]];
        this.log("event", `${this.nameOf(firstId)}与${this.nameOf(secondId)}的行动时序被改写`);
      })
    });
  }

  resolveLimitContract(sourceId, targetId) {
    const target = this.player(targetId);
    return this.requestChoice(targetId, {
      title: "极限契约",
      text: `${this.nameOf(sourceId)}向你提供两种契约。`,
      options: [
        { value: "burst", label: "爆发：获2能量", description: "契约者摸1；你下回合结束失1体力" },
        { value: "seal", label: "封存：摸2张牌", description: "契约者获1能量；你的招牌技锁定至下回合结束" }
      ],
      aiChoice: target.energy <= 1 ? "burst" : "seal",
      onResolve: value => {
        if (value === "burst") { this.gainEnergy(targetId, 2); this.draw(sourceId, 1); target.contractHpLoss += 1; }
        else { this.draw(targetId, 2); this.gainEnergy(sourceId, 1); target.signatureLocked = Math.max(target.signatureLocked, 1); }
      }
    });
  }

  beginAttack({ sourceId, targetId, damage = 1, requiredGuards = 1, origin = "attack", alwaysPoison = false, onComplete = null, skipIntervene = false, skipRaven = false, freeUse = false }) {
    const source = this.player(sourceId), target = this.player(targetId);
    if (!source?.alive || !target?.alive) return { ok: false, reason: "目标已经退场" };
    if (!skipRaven) {
      const raven = this.offerRavenSubstitution({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete, skipIntervene, freeUse });
      if (raven) return raven;
    }
    if (!skipIntervene) {
      const intervention = this.offerAttackIntervention({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete, freeUse });
      if (intervention) return intervention;
    }
    if (source.characterId === "itachi" && origin === "attack" && source.plots.some(plot => plot.isFalse && plot.targetId === targetId)) {
      requiredGuards += 1;
      this.log("event", `${this.nameOf(source)}以“月读前兆”压迫幻象目标，此次攻击额外需要1张防御`);
    }
    if (source.characterId === "shikamaru" && origin === "attack" && source.turnFlags.shadowNeckTarget === targetId) {
      source.turnFlags.shadowNeckTarget = null;
      damage += 1;
      this.log("event", `${this.nameOf(source)}抓住“战术预读”的破绽，此次攻击伤害+1`);
    }
    if (source.characterId === "gaara" && origin === "attack" && target.sandMarkedBy === sourceId) {
      target.sandMarkedBy = null;
      target.sandMarkSetTurn = 0;
      damage += 1;
      this.log("event", `${this.nameOf(source)}发动“砂瀑追葬”，此次攻击伤害+1`);
    }
    if (source.characterId === "jiraiya" && origin === "attack" && source.sageResonance) {
      source.sageResonance = false;
      source.turnFlags.ignoreArmorTarget = targetId;
      damage += 1;
      const priorComplete = onComplete;
      onComplete = () => {
        source.sageMarks = 0;
        if (priorComplete) priorComplete();
      };
      this.log("event", `${this.nameOf(source)}消耗“仙术共鸣”，此次攻击伤害+1并忽略防护装甲`);
    }
    if (source.characterId === "sasuke" && origin === "attack" && source.swapMarkedId === targetId) {
      source.swapMarkedId = null;
      source.turnFlags.ignoreArmorTarget = targetId;
      source.turnFlags.pursuitTarget = targetId;
      requiredGuards += 1;
      this.log("event", `${this.nameOf(source)}发动“写轮眼追猎”，突击需要额外防御并忽略防护装甲`);
    }
    if (source.characterId === "itachi" && source.turnFlags.nextAttackIgnoreArmor) {
      source.turnFlags.nextAttackIgnoreArmor = false;
      source.turnFlags.ignoreArmorTarget = targetId;
      this.log("event", `${this.nameOf(source)}以“月读前兆”蓄势，下一次攻击忽略防护装甲`);
    }
    if (source.turnFlags.nextAttackBonus) { damage += 1; source.turnFlags.nextAttackBonus = false; }
    if (source.turnFlags.nextAttackPoison) { alwaysPoison = true; source.turnFlags.nextAttackPoison = false; }
    const returnPlot = origin === "attack" ? this.plotsTargeting(targetId, "returnRoute")[0] : null;
    if (returnPlot) {
      this.removePlot(returnPlot);
      const prior = onComplete;
      onComplete = () => { if (prior) prior(); this.resolveReturnRoute(targetId, sourceId); };
    }

    if (target.characterId === "gojo" && !target.roundFlags.infinity) {
      target.roundFlags.infinity = true;
      if (source.hand.length) {
        return this.requestDiscard(sourceId, 1, {
          reason: "突破无下限：请选择1张手牌额外弃置",
          onComplete: () => {
            this.log("event", `${this.nameOf(source)}额外弃1张牌突破“无下限”`);
            this.continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete });
          }
        });
      } else {
        this.log("event", `${this.nameOf(target)}的“无下限”令攻击无效`);
        return this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
      }
    }
    return this.continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete });
  }

  offerRavenSubstitution(payload) {
    const { sourceId, targetId, origin } = payload;
    const target = this.player(targetId);
    if (origin !== "attack" || target?.characterId !== "itachi" || target.roundFlags.raven) return null;
    const illusion = target.plots.find(plot => plot.isFalse && plot.targetId === sourceId) || target.plots.find(plot => plot.isFalse);
    if (!illusion) return null;
    const candidates = this.players.filter(player => player.alive && player.id !== sourceId && player.id !== targetId && this.distance(sourceId, player.id) <= this.attackRange(sourceId));
    const perform = selectedId => {
      if (!selectedId || selectedId === "pass") return this.beginAttack({ ...payload, skipRaven: true });
      target.roundFlags.raven = true;
      this.removePlot(illusion);
      this.draw(targetId, 1);
      if (selectedId === "cancel") {
        this.log("event", `${this.nameOf(target)}发动“乌鸦替身”，化作乌鸦避开了此次突击`);
        return this.afterDefended(sourceId, targetId, origin, payload.alwaysPoison, payload.onComplete);
      }
      this.log("event", `${this.nameOf(target)}发动“乌鸦替身”，将突击转移给${this.nameOf(selectedId)}`);
      return this.beginAttack({ ...payload, targetId: selectedId, skipRaven: true });
    };
    if (target.human) {
      const ravenOptions = candidates.length
        ? candidates.map(player => ({ value: player.id, label: `转移给${this.nameOf(player)}` }))
        : [{ value: "cancel", label: "化鸦避开攻击" }];
      return this.requestChoice(targetId, {
        title: "乌鸦替身",
        text: "可消耗任一虚假伏笔转移此次突击；没有合法转移目标时直接避开攻击。",
        options: [{ value: "pass", label: "保留幻象" }, ...ravenOptions],
        aiChoice: "pass",
        onResolve: perform
      });
    }
    const enemy = candidates.find(player => !this.isAlly(targetId, player.id));
    perform((enemy || candidates[0])?.id || "cancel");
    return { ok: true, pending: Boolean(this.pendingChoice || this.pendingResponse || this.pendingDiscard) };
  }

  continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete = null }) {
    const source = this.player(sourceId), target = this.player(targetId);
    if (!source?.alive || !target?.alive) return { ok: false, reason: "目标已经退场" };
    if (target.characterId === "gaara" && !target.roundFlags.sandShield && target.hand.length) {
      target.roundFlags.sandShield = true;
      const useShield = () => this.requestDiscard(targetId, 1, {
        reason: "绝对防御：请选择1张手牌弃置以取消攻击",
        onComplete: () => {
          const finishShield = () => {
            this.log("event", `${this.nameOf(target)}发动“绝对防御”取消攻击`);
            this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
          };
          if (source.hand.length) this.requestDiscard(sourceId, 1, { reason: "绝对防御反震：请选择1张手牌弃置", onComplete: finishShield });
          else finishShield();
        }
      });
      if (target.human) {
        return this.requestChoice(targetId, {
          title: "绝对防御",
          text: `是否弃置1张手牌取消${this.nameOf(source)}的此次攻击？发动后攻击者也须弃1张牌。`,
          options: [{ value: "use", label: "发动绝对防御" }, { value: "pass", label: "保留手牌，正常响应" }],
          aiChoice: "use",
          onResolve: value => value === "use" ? useShield() : this.continueAttack({ sourceId, targetId, damage, requiredGuards, origin, alwaysPoison, onComplete })
        });
      }
      return useShield();
    }
    if (target.characterId === "luffy" && !target.roundFlags.observation) {
      target.roundFlags.observation = true;
      if (this.random() < .5) {
        this.log("event", `${this.nameOf(target)}以“见闻色”避开攻击`);
        return this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
      }
    }

    const resources = this.guardResources(targetId);
    if (resources >= requiredGuards) {
      if (target.human) {
        this.pendingResponse = { type: "guard", sourceId, targetId, damage, required: requiredGuards, origin, alwaysPoison, onComplete };
        return { ok: true, pending: true };
      }
      this.spendGuards(targetId, requiredGuards);
      this.log("event", `${this.nameOf(target)}打出${requiredGuards}张【防御】`);
      return this.afterDefended(sourceId, targetId, origin, alwaysPoison, onComplete);
    }
    this.resolveAttackHit(sourceId, targetId, damage, origin, alwaysPoison, onComplete);
    return { ok: true };
  }

  offerAttackIntervention(payload) {
    const { sourceId, targetId, origin } = payload;
    if (origin !== "attack") return null;
    const eligible = this.players.filter(player => player.alive && player.id !== sourceId && player.id !== targetId && player.hand.some(card => card.id === "intervene"));
    if (!eligible.length) return null;
    const candidate = eligible.find(player => player.human) || eligible.find(player => this.isAlly(player.id, targetId) && !this.isAlly(player.id, sourceId));
    if (!candidate) return null;
    const perform = use => {
      if (!use) return this.beginAttack({ ...payload, skipIntervene: true });
      const card = candidate.hand.find(item => item.id === "intervene");
      if (card) this.removeCard(candidate.id, card.uid);
      this.log("event", `${this.nameOf(candidate)}打出【强制介入】，代替${this.nameOf(targetId)}成为目标`);
      const prior = payload.onComplete;
      this.beginAttack({ ...payload, targetId: candidate.id, skipIntervene: true, onComplete: () => { if (prior) prior(); if (candidate.alive) this.draw(candidate.id, 1); } });
    };
    if (candidate.human) {
      this.pendingResponse = { type: "intervene", sourceId, targetId: candidate.id, originalTargetId: targetId, cardName: "强制介入", required: 1, onDecision: perform };
      return { ok: true, pending: true };
    }
    perform(true);
    return { ok: true, pending: Boolean(this.pendingResponse || this.pendingDiscard || this.pendingChoice) };
  }

  resolveReturnRoute(targetId, attackerId) {
    const target = this.player(targetId), attacker = this.player(attackerId);
    if (!target?.alive || !attacker?.alive) return;
    const attacks = target.hand.filter(card => card.id === "attack" || card.id === "adapt");
    if (!attacks.length) return;
    this.requestChoice(targetId, {
      title: "回击轨迹",
      text: `是否对${this.nameOf(attacker)}立即反击？`,
      options: [{ value: "pass", label: "放弃反击" }, ...attacks.map(card => ({ value: card.uid, label: `打出【${card.name}】` }))],
      aiChoice: attacks[0].uid,
      onResolve: uid => {
        if (uid === "pass") return;
        const card = target.hand.find(item => item.uid === uid);
        if (!card) return;
        this.playCard(targetId, uid, attackerId, { freeUse: true, skipRhythm: true });
      }
    });
  }

  guardResources(playerId) {
    const player = this.player(playerId);
    const guards = player.hand.filter(card => card.id === "guard" || card.id === "adapt").length;
    const armorSubstitute = player.equipment.armor?.id === "adaptive_armor" && !player.roundFlags.adaptiveGuard && player.hand.some(card => card.type === "basic" && !["guard", "adapt"].includes(card.id));
    const canSubstitute = player.characterId === "mikasa" && !player.roundFlags.substitute && player.hand.some(card => card.id !== "guard");
    const clone = player.characterId === "naruto" && this.getSpecialCards(playerId, "clone").length ? 1 : 0;
    return guards + (armorSubstitute ? 1 : 0) + (canSubstitute ? 1 : 0) + clone;
  }

  spendGuards(playerId, count) {
    const player = this.player(playerId);
    let left = count;
    while (left > 0) {
      const guard = player.hand.find(card => card.id === "guard");
      if (guard) { this.removeCard(playerId, guard.uid); left -= 1; continue; }
      const adapt = player.hand.find(card => card.id === "adapt");
      if (adapt) { this.removeCard(playerId, adapt.uid); left -= 1; continue; }
      if (player.equipment.armor?.id === "adaptive_armor" && !player.roundFlags.adaptiveGuard) {
        const substitute = player.hand.find(card => card.type === "basic" && !["guard", "adapt"].includes(card.id));
        if (substitute) { this.removeCard(playerId, substitute.uid); player.roundFlags.adaptiveGuard = true; left -= 1; continue; }
      }
      if (player.characterId === "naruto" && this.getSpecialCards(playerId, "clone").length) {
        const stored = this.consumeSpecialCard(playerId, "clone");
        if (stored) {
          this.gainEnergy(playerId, 1);
          player.turnFlags.nextAttackBonus = true;
          this.log("event", `${this.nameOf(player)}消耗影分身，将【${stored.card.name}】视为防御`);
          left -= 1;
          continue;
        }
      }
      if (player.characterId === "mikasa" && !player.roundFlags.substitute) {
        const substitute = player.hand.find(card => card.id !== "guard");
        if (substitute) {
          this.removeCard(playerId, substitute.uid);
          player.roundFlags.substitute = true;
          left -= 1;
          continue;
        }
      }
      break;
    }
  }

  respond(useCard) {
    const response = this.pendingResponse;
    if (!response) return false;
    this.pendingResponse = null;
    if (response.type === "guard") {
      if (useCard && this.guardResources(response.targetId) >= response.required) {
        this.spendGuards(response.targetId, response.required);
        this.log("event", `${this.nameOf(response.targetId)}成功防御`);
        this.afterDefended(response.sourceId, response.targetId, response.origin, response.alwaysPoison, response.onComplete);
      } else this.resolveAttackHit(response.sourceId, response.targetId, response.damage, response.origin, response.alwaysPoison, response.onComplete);
    } else if (response.type === "counter") {
      if (useCard) {
        const card = this.player(response.targetId).hand.find(item => item.id === "counter");
        if (card) this.removeCard(response.targetId, card.uid);
        if (response.hidden && response.strategyCard) this.discard.push(response.strategyCard._physicalCard || response.strategyCard);
        this.log("event", `${this.nameOf(response.targetId)}打出【反制】，策略牌无效`);
        this.notifyCardCancelled(response.sourceId, "策略牌被反制");
        if (response.onCounter) response.onCounter();
      } else if (response.onDecline) response.onDecline();
    } else if (["intervene", "interveneStrategy"].includes(response.type)) {
      if (response.onDecision) response.onDecision(useCard);
    }
    return true;
  }

  afterDefended(sourceId, targetId, origin, alwaysPoison = false, onComplete = null) {
    const source = this.player(sourceId);
    if (source?.turnFlags.ignoreArmorTarget === targetId) source.turnFlags.ignoreArmorTarget = null;
    if (source?.turnFlags.goemonIgnoreArmorTarget === targetId) source.turnFlags.goemonIgnoreArmorTarget = null;
    if (source?.characterId === "ichigo" && !source.turnFlags.resolve) { source.turnFlags.resolve = true; this.draw(sourceId, 1); }
    if (source?.characterId === "sasuke" && source.turnFlags.pursuitTarget === targetId) {
      source.turnFlags.pursuitTarget = null;
      this.draw(sourceId, 1);
      this.log("event", `${this.nameOf(source)}的“千鸟贯穿”即使被防御仍追回1张牌`);
    }
    const shikamaru = this.findChessOwner(sourceId);
    if (shikamaru) this.triggerTacticalForesight(shikamaru.id, sourceId, "棋子攻击被防御");
    const finish = () => {
      if (origin === "blackFlash" && source) this.gainEnergy(sourceId, 2);
      if (alwaysPoison) this.applyPoison(targetId, origin === "venomStrike" ? 2 : 1);
      const target = this.player(targetId);
      const scoutedByHinata = this.players.some(owner => owner.alive && owner.characterId === "hinata" && owner.scoutedTargetId === targetId);
      if (target?.equipment.armor?.id === "reflector" && !target.roundFlags.reflector && !scoutedByHinata) { target.roundFlags.reflector = true; this.draw(targetId, 1); }
      if (onComplete) onComplete();
    };
    if (source?.characterId === "tanjiro" && !source.turnFlags.water) {
      source.turnFlags.water = true;
      if (source.hand.length) return this.requestDiscard(sourceId, 1, { reason: "水之呼吸：请选择1张手牌弃置后再摸1张牌", shouldLog: false, onComplete: () => { this.draw(sourceId, 1); finish(); } });
      this.draw(sourceId, 1); finish();
      return { ok: true, defended: true };
    }
    finish();
    return { ok: true, defended: true };
  }

  resolveAttackHit(sourceId, targetId, damage, origin, alwaysPoison = false, onComplete = null) {
    const target = this.player(targetId);
    const source = this.player(sourceId);
    if (source?.turnFlags.pursuitTarget === targetId) source.turnFlags.pursuitTarget = null;
    const markedPierce = source?.turnFlags.ignoreArmorTarget === targetId;
    if (markedPierce) source.turnFlags.ignoreArmorTarget = null;
    const goemonPierce = source?.turnFlags.goemonIgnoreArmorTarget === targetId;
    if (goemonPierce) source.turnFlags.goemonIgnoreArmorTarget = null;
    const ignoresArmor = (source?.equipment.weapon?.id === "piercer" && origin === "attack") || markedPierce || goemonPierce || (source?.characterId === "hinata" && source.scoutedTargetId === targetId);
    if (!ignoresArmor && target.equipment.armor?.id === "armor" && target.armorReady) {
      target.armorReady = false;
      damage = Math.max(0, damage - 1);
      this.log("event", `${this.nameOf(target)}的防护装甲令伤害-1`);
    }
    this.dealDamage(sourceId, targetId, damage, origin, onComplete);
    if (alwaysPoison && target.alive) this.applyPoison(targetId, origin === "venomStrike" ? 1 : 1);
  }

  addSageMark(playerId, kind) {
    const player = this.player(playerId);
    if (!player?.alive || player.characterId !== "jiraiya") return;
    player.sageMarkRoundFlags ||= { dealt: false, taken: false };
    if (player.sageMarkRoundFlags[kind]) return;
    player.sageMarkRoundFlags[kind] = true;
    if (player.sageMarks >= 2) return;
    player.sageMarks += 1;
    this.log("event", `${this.nameOf(player)}获得1枚“仙术印”（${player.sageMarks}/2）`);
    if (player.sageMarks >= 2 && !player.sageResonance) {
      player.sageResonance = true;
      this.log("event", `${this.nameOf(player)}进入“仙术共鸣”，下一次攻击将被强化`);
    }
  }

  dealDamage(sourceId, targetId, amount, origin = "damage", onComplete = null) {
    const source = this.player(sourceId), target = this.player(targetId);
    if (!target?.alive || amount <= 0) { if (onComplete) onComplete(); return; }
    if (target.equipment.armor?.id === "limit_shield" && amount >= 2) {
      amount = 1;
      this.discard.push(target.equipment.armor);
      target.equipment.armor = null;
      this.log("event", `${this.nameOf(target)}的【限界护盾】将伤害改为1点`);
    }
    const oaths = this.plotsTargeting(targetId, "guardianOath");
    for (const oath of oaths) { this.removePlot(oath); amount = Math.max(0, amount - 1); }
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, amount);
      target.shield -= absorbed;
      amount -= absorbed;
      this.log("event", `${this.nameOf(target)}的护盾抵消了${absorbed}点伤害`);
    }
    if (amount > 0 && this.consumeByakugo(targetId, "basic", `令${this.nameOf(target)}受到的伤害-1`)) amount = Math.max(0, amount - 1);
    if (amount > 0 && target.characterId === "orochimaru" && !target.roundFlags.shed) {
      const spoil = target.hand.find(card => card._curseSpoil === targetId);
      if (spoil) {
        target.roundFlags.shed = true;
        target.curseResearchType = spoil.type;
        const index = target.hand.findIndex(card => card.uid === spoil.uid);
        target.hand.splice(index, 1);
        delete spoil._curseSpoil;
        this.discard.push(spoil);
        amount = Math.max(0, amount - 1);
        this.log("event", `${this.nameOf(target)}消耗实验牌【${spoil.name}】完成蛇蜕，伤害-1`);
      }
    }
    if (amount <= 0) { if (onComplete) onComplete(); return; }
    target.hp -= amount;
    this.pushDamageFeedback(targetId, amount);
    for (const plot of target.plots.filter(item => item.effect === "delayedCast")) plot.damaged = true;
    if (source && !source.roundFlags.damageEnergy) { source.roundFlags.damageEnergy = true; this.gainEnergy(sourceId, 1); }
    if (!target.roundFlags.hurtEnergy) { target.roundFlags.hurtEnergy = true; this.gainEnergy(targetId, 1); }
    this.addSageMark(sourceId, "dealt");
    this.addSageMark(targetId, "taken");
    this.log("damage", `${this.nameOf(sourceId)}对${this.nameOf(target)}造成${amount}点伤害`);
    const causalPlots = source ? this.plotsTargeting(sourceId, "causalMark") : [];
    for (const causal of causalPlots) { this.removePlot(causal); this.draw(causal.ownerId, 2); this.gainEnergy(causal.ownerId, 1); }

    if (source?.characterId === "rukia" && origin === "attack") target.frozenDraw = 1;
    if (source?.characterId === "shinobu" && origin === "attack") this.applyPoison(targetId, 1);
    if (source?.characterId === "yuji" && origin === "attack" && !source.turnFlags.divergent) {
      source.turnFlags.divergent = true;
      if (target.hp > 0 && target.hand.length) return this.requestDiscard(targetId, 1, { reason: "受到径庭拳命中：请选择1张手牌弃置", shouldLog: false, onComplete: () => this.finishDamageResolution(sourceId, targetId, onComplete, origin) });
    }
    this.finishDamageResolution(sourceId, targetId, onComplete, origin);
  }

  finishDamageResolution(sourceId, targetId, onComplete = null, origin = "damage") {
    const source = this.player(sourceId), target = this.player(targetId);
    if (!target?.alive) return;
    if (target.characterId === "yuji" && target.hp <= 2 && !target.roundFlags.resolve) { target.roundFlags.resolve = true; this.draw(targetId, 2); }
    if (source) {
      const armin = this.players.find(p => p.alive && p.characterId === "armin" && this.isAlly(p.id, targetId) && p.id !== targetId && !p.roundFlags.cover);
      if (armin) { armin.roundFlags.cover = true; this.draw(targetId, 1); this.log("event", `${this.nameOf(armin)}发动“战术掩护”`); }
    }
    if (origin === "attack" && source?.equipment.weapon?.id === "impact_hammer" && !source.turnFlags.impact && target.hand.length) {
      source.turnFlags.impact = true;
      return this.requestDiscard(targetId, 1, { reason: "震荡重锤：请弃置1张手牌", onComplete: () => this.finishDamageResolution(sourceId, targetId, onComplete, origin) });
    }
    if (target.hp <= 0) return this.startDying(targetId, sourceId, onComplete);
    if (onComplete) onComplete();
  }

  loseHp(targetId, amount, sourceId = null, origin = "loss", onComplete = null) {
    const target = this.player(targetId);
    if (!target?.alive) return;
    target.hp -= amount;
    this.pushDamageFeedback(targetId, amount);
    if (target.hp <= 0) return this.startDying(targetId, sourceId, onComplete);
    if (onComplete) onComplete();
  }

  startDying(targetId, sourceId = null, onComplete = null) {
    const target = this.player(targetId);
    if (!target?.alive || target.dying) return;
    target.dying = true;
    this.log("event", `${this.nameOf(target)}进入重伤，等待救援`);
    if (target.equipment.charm?.id === "life_pendant") {
      this.discard.push(target.equipment.charm);
      target.equipment.charm = null;
      this.refreshEnergyCap(target);
      target.hp = 1;
      target.dying = false;
      this.log("heal", `${this.nameOf(target)}的【生命吊坠】将其救回至1点体力`);
      if (onComplete) onComplete();
      return { ok: true, rescued: true };
    }
    const alive = this.players.filter(player => player.alive).sort((a, b) => a.seat - b.seat);
    const start = alive.findIndex(player => player.id === targetId);
    const order = [...alive.slice(start), ...alive.slice(0, start)].map(player => player.id);
    return this.continueRescue({ targetId, sourceId, onComplete, order, index: 0 });
  }

  continueRescue(state) {
    const target = this.player(state.targetId);
    if (!target?.alive) return;
    if (target.hp > 0) {
      target.dying = false;
      this.log("heal", `${this.nameOf(target)}脱离重伤`);
      if (state.onComplete) state.onComplete();
      return { ok: true, rescued: true };
    }
    if (state.index >= state.order.length) {
      target.dying = false;
      this.eliminate(state.targetId, state.sourceId);
      if (state.onComplete && !this.winner) state.onComplete();
      return { ok: true, eliminated: true };
    }
    const rescuerId = state.order[state.index], rescuer = this.player(rescuerId);
    if (!rescuer?.alive) return this.continueRescue({ ...state, index: state.index + 1 });
    const valid = rescuer.hand.filter(card => card.id === "heal" || card.id === "adapt" || (rescuerId === state.targetId && card.id === "overdrive"));
    if (!valid.length || (!rescuer.human && rescuerId !== state.targetId && !this.isAlly(rescuerId, state.targetId))) return this.continueRescue({ ...state, index: state.index + 1 });
    return this.requestChoice(rescuerId, {
      title: `救援${this.nameOf(target)}`,
      text: `${this.nameOf(target)}当前体力为${target.hp}，须回复至至少1点。`,
      options: [{ value: "pass", label: "放弃救援" }, ...valid.map(card => ({ value: card.uid, label: `打出【${card.name}】` }))],
      aiChoice: valid[0]?.uid || "pass",
      onResolve: value => {
        if (value === "pass") return this.continueRescue({ ...state, index: state.index + 1 });
        const card = rescuer.hand.find(item => item.uid === value);
        if (!card) return this.continueRescue({ ...state, index: state.index + 1 });
        this.removeCard(rescuerId, card.uid);
        target.hp += 1;
        this.log("heal", `${this.nameOf(rescuer)}以【${card.name}】令${this.nameOf(target)}回复1点体力`);
        this.continueRescue(state);
      }
    });
  }

  applyPoison(targetId, amount) {
    const target = this.player(targetId);
    target.poison = clamp(target.poison + amount, 0, 2);
    this.log("event", `${this.nameOf(target)}获得${amount}层毒素`);
  }

  eliminate(targetId, sourceId = null) {
    const target = this.player(targetId);
    if (!target?.alive) return;
    if (target.characterId === "itachi") this.returnSealedCards(targetId);
    target.alive = false;
    target.hp = 0;
    target.revealed = true;
    for (const plot of [...target.plots]) this.removePlot(plot);
    for (const owner of this.players) for (const plot of [...owner.plots]) if (plot.targetId === targetId) this.removePlot(plot);
    for (const card of target.hand.splice(0)) this.discard.push(card);
    for (const stored of target.specialCards.splice(0)) this.discard.push(stored.card);
    for (const sealed of target.sealedCards.splice(0)) this.discard.push(sealed.card);
    for (const owner of this.players) if (owner.chessTargetId === targetId) owner.chessTargetId = null;
    for (const marked of this.players) if (marked.sandMarkedBy === targetId) { marked.sandMarkedBy = null; marked.sandMarkSetTurn = 0; }
    for (const slot of Object.keys(target.equipment)) if (target.equipment[slot]) { this.discard.push(target.equipment[slot]); target.equipment[slot] = null; }
    this.log("eliminate", `${this.nameOf(target)}退场，身份为${this.roleOf(target).name}`);
    if (this.mode.id === "classic8" && sourceId) {
      const source = this.player(sourceId);
      if (target.roleId === "rebel" && source?.alive) this.draw(sourceId, 2);
      if (source?.roleId === "lord" && target.roleId === "loyal") {
        for (const card of source.hand.splice(0)) this.discard.push(card);
        for (const slot of Object.keys(source.equipment)) if (source.equipment[slot]) { this.discard.push(source.equipment[slot]); source.equipment[slot] = null; }
        this.log("event", `${this.nameOf(source)}误伤守护者，失去了所有牌`);
      }
    }
    this.checkWinner();
  }

  checkWinner() {
    if (this.winner) return this.winner;
    const alive = this.players.filter(player => player.alive);
    if (this.mode.id === "ranked2v2") {
      const azure = alive.some(player => player.roleId === "azure"), crimson = alive.some(player => player.roleId === "crimson");
      if (!azure) this.winner = { camp: "crimson", label: "绯队获胜" };
      if (!crimson) this.winner = { camp: "azure", label: "苍队获胜" };
    } else {
      const lord = this.players.find(player => player.roleId === "lord");
      if (!lord.alive) {
        if (alive.length === 1 && alive[0].roleId === "lone") this.winner = { camp: "lone", label: "独行者获胜" };
        else this.winner = { camp: "chaos", label: "破界者获胜" };
      } else if (!alive.some(player => player.roleId === "rebel" || player.roleId === "lone")) this.winner = { camp: "order", label: "界主阵营获胜" };
    }
    if (this.winner) { this.phase = "ended"; this.log("victory", this.winner.label); }
    return this.winner;
  }

  revealRole(playerId) {
    const player = this.player(playerId);
    if (!this.canAct(playerId) || player.revealed || player.roleId === "lord" || this.mode.id === "ranked2v2") return { ok: false, reason: "无法显露身份" };
    player.revealed = true;
    this.log("event", `${this.nameOf(player)}主动显露身份：${this.roleOf(player).name}`);
    if (player.roleId === "loyal") {
      this.draw(playerId, 2);
      const lord = this.players.find(p => p.alive && p.roleId === "lord");
      if (lord) lord.shield += 1;
    } else if (player.roleId === "rebel") {
      this.draw(playerId, 1); this.gainEnergy(playerId, 2); player.rangeInfinite = true;
    } else if (player.roleId === "lone") { this.draw(playerId, 2); player.shield += 1; }
    return { ok: true };
  }

  useSignature(playerId, targetId) {
    const player = this.player(playerId), character = this.characterOf(player), sig = character?.signature;
    if (!this.canAct(playerId)) return { ok: false, reason: "现在不能发动技能" };
    if (!sig || player.energy < sig.cost) return { ok: false, reason: "能量不足" };
    if (player.signatureLocked > 0) return { ok: false, reason: "招牌技正在封存中" };
    if (!this.getSignatureTargets(playerId).includes(targetId)) return { ok: false, reason: "目标不合法" };
    player.energy -= sig.cost;
    this.log("signature", `${this.nameOf(player)}释放招牌技「${sig.name}」！`);
    switch (sig.effect) {
      case "doubleGuard": return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "signature" });
      case "rasenshuriken": {
        const clone = this.consumeSpecialCard(playerId, "clone");
        if (clone) this.log("event", `${this.nameOf(player)}消耗影分身，使螺旋手里剑伤害+1且无法被强制介入`);
        return this.beginAttack({ sourceId: playerId, targetId, damage: 2 + (clone ? 1 : 0), requiredGuards: 2, origin: "signature", skipIntervene: Boolean(clone) });
      }
      case "hundredHealings": player.byakugoMode = true; player.byakugoActivatedTurn = this.turnNumber; player.roundFlags.byakugoReturnedTypes = []; player.turnFlags.nextAttackBonus = true; return { ok: true };
      case "checkmate": {
        const plot = player.plots.find(item => item.targetId === targetId && !item.isFalse);
        if (!plot) return this.requestDiscard(targetId, 2, { reason: "将军：请选择2张手牌弃置", onComplete: () => { player.chessTargetId = null; } });
        plot.effect = "checkmateTrap";
        plot.revealed = true;
        player.chessTargetId = null;
        this.log("event", `${this.nameOf(player)}将伏笔【${plot.card.name}】改写为公开的“将军”陷阱`);
        return { ok: true };
      }
      case "tsukuyomi": return this.resolveTsukuyomi(playerId, targetId);
      case "kirin": {
        player.swapMarkedId = null;
        player.turnFlags.ignoreArmorTarget = targetId;
        const hpBefore = this.player(targetId).hp;
        return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 2, origin: "kirin", onComplete: () => {
          const target = this.player(targetId);
          if (target?.alive && target.hp < hpBefore && target.hand.length) this.requestDiscard(targetId, 1, { reason: "麒麟命中：请选择1张手牌弃置" });
        } });
      }
      case "kamuiRaikiri": return this.resolveKamuiRaikiri(playerId, targetId);
      case "sixtyFourPalms": {
        const target = this.player(targetId);
        target.energy = 0;
        target.energyLocked = true;
        target.signatureLocked = Math.max(target.signatureLocked, 1);
        this.log("event", `${this.nameOf(player)}封锁了${this.nameOf(target)}的能量经络与招牌技`);
        this.dealDamage(playerId, targetId, 1, "signature");
        return { ok: true, pending: Boolean(this.pendingChoice || this.pendingDiscard) };
      }
      case "goemon": return this.resolveGoemon(playerId, targetId);
      case "immortality": return this.resolveImmortality(playerId);
      case "discardOrDamage": return this.forceDiscardOrDamage(playerId, targetId, 2, 2);
      case "gearFive": player.hp = clamp(player.hp + 1, 0, player.maxHp); this.draw(playerId, 2); player.attackLimit += 1; return { ok: true };
      case "miracleCure": { const target = this.player(targetId); target.hp = clamp(target.hp + 1, 0, target.maxHp); this.draw(targetId, 2); return { ok: true }; }
      case "bankai": player.rangeInfinite = true; player.attackLimit += 1; this.drawSpecific(playerId, "attack"); return { ok: true };
      case "freeze": this.player(targetId).skipOffense = true; return { ok: true };
      case "powerAttack": return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 1, origin: "signature" });
      case "venomStrike": return this.beginAttack({ sourceId: playerId, targetId, damage: 1, requiredGuards: 1, origin: "venomStrike", alwaysPoison: true });
      case "hollowPurple": { const target = this.player(targetId); if (target.hand.length >= 2) return this.requestDiscard(targetId, 2, { reason: "虚式·茈：请选择2张手牌弃置" }); else { this.dealDamage(playerId, targetId, 1, "signature"); for (const slot of Object.keys(target.equipment)) if (target.equipment[slot]) { this.discard.push(target.equipment[slot]); target.equipment[slot] = null; } this.refreshEnergyCap(target); } return { ok: true }; }
      case "blackFlash": return this.beginAttack({ sourceId: playerId, targetId, damage: 2, requiredGuards: 1, origin: "blackFlash" });
      case "thunderSpear": { const target = this.player(targetId); const slots = Object.keys(target.equipment).filter(slot => target.equipment[slot]); if (slots.length) { for (const slot of slots) { this.discard.push(target.equipment[slot]); target.equipment[slot] = null; } this.refreshEnergyCap(target); } else this.dealDamage(playerId, targetId, 2, "signature"); return { ok: true }; }
      case "colossal": { this.loseHp(playerId, 1, null); if (!player.alive) return { ok: true }; this.resolveColossal(playerId, this.players.filter(p => p.alive && p.id !== playerId).map(p => p.id)); return { ok: true, pending: Boolean(this.pendingDiscard) }; }
      default: return { ok: true };
    }
  }

  resolveTsukuyomi(sourceId, targetId) {
    const source = this.player(sourceId), target = this.player(targetId);
    const illusion = source?.plots.find(plot => plot.isFalse && plot.targetId === targetId);
    const cards = target?.hand.filter(card => !card.responseOnly) || [];
    if (!illusion || !cards.length) return { ok: false, reason: "没有可用于月读的幻象或手牌" };
    this.removePlot(illusion);
    const seal = uid => {
      const index = target.hand.findIndex(card => card.uid === uid && !card.responseOnly);
      if (index < 0) return;
      const [card] = target.hand.splice(index, 1);
      target.sealedCards.push({ uid: `sealed-${card.uid}`, card, sealedBy: sourceId, setTurn: this.turnNumber });
      this.log("event", `${this.nameOf(source)}以“月读”封存了${this.nameOf(target)}的【${card.name}】`);
      this.dealDamage(sourceId, targetId, 1, "tsukuyomi");
    };
    if (!source.human) { seal(cards[0].uid); return { ok: true }; }
    return this.requestChoice(sourceId, {
      title: "月读：选择封存手牌",
      text: `${this.nameOf(target)}展示了可被封存的非响应手牌。`,
      options: cards.map(card => ({ value: card.uid, label: `封存【${card.name}】`, description: card.description })),
      aiChoice: cards[0].uid,
      onResolve: seal
    });
  }

  resolveGoemon(sourceId, firstTargetId) {
    const source = this.player(sourceId);
    const candidates = this.getSignatureTargets(sourceId).filter(id => id !== firstTargetId);
    const chooseTargets = secondTargetId => {
      const targetIds = [firstTargetId, secondTargetId].filter(Boolean);
      const enhanced = source.sageResonance ? (source.human ? null : targetIds[0]) : null;
      const begin = enhancedId => {
        if (source.sageResonance) {
          source.sageResonance = false;
        }
        return this.resolveGoemonTargets(sourceId, targetIds, 0, enhancedId);
      };
      if (!source.sageResonance) return begin(null);
      if (!source.human) return begin(enhanced || targetIds[0]);
      return this.requestChoice(sourceId, {
        title: "五右卫门：仙术共鸣",
        text: "选择一名目标承受仙术强化：伤害+1并忽略防护装甲。",
        options: targetIds.map(id => ({ value: id, label: `强化${this.nameOf(id)}` })),
        aiChoice: targetIds[0],
        onResolve: begin
      });
    };
    if (!candidates.length) return chooseTargets(null);
    if (!source.human) return chooseTargets(candidates.sort((a, b) => this.player(a).hp - this.player(b).hp)[0]);
    return this.requestChoice(sourceId, {
      title: "仙法·五右卫门：选择第二目标",
      text: "最多选择两名距离2以内的敌人；也可以只攻击当前目标。",
      options: [{ value: "none", label: "只攻击当前目标" }, ...candidates.map(id => ({ value: id, label: `追加${this.nameOf(id)}` }))],
      aiChoice: "none",
      onResolve: value => chooseTargets(value === "none" ? null : value)
    });
  }

  resolveGoemonTargets(sourceId, targetIds, index = 0, enhancedId = null) {
    if (index >= targetIds.length || this.winner) {
      const source = this.player(sourceId);
      if (source && enhancedId) source.sageMarks = 0;
      return { ok: true };
    }
    const source = this.player(sourceId);
    const targetId = targetIds[index];
    const target = this.player(targetId);
    if (!source?.alive || !target?.alive) return this.resolveGoemonTargets(sourceId, targetIds, index + 1, enhancedId);
    const bound = source.toadBindTargetId === targetId;
    const damage = 2 + (enhancedId === targetId ? 1 : 0);
    const requiredGuards = 2 + (bound ? 1 : 0);
    if (enhancedId === targetId) source.turnFlags.goemonIgnoreArmorTarget = targetId;
    return this.beginAttack({
      sourceId,
      targetId,
      damage,
      requiredGuards,
      origin: "goemon",
      skipIntervene: true,
      onComplete: () => {
        if (source.toadBindTargetId === targetId) {
          source.toadBindTargetId = null;
          source.toadBindExpiresTurn = 0;
          this.log("event", `${this.nameOf(target)}的“蛤蟆口束缚”在五右卫门后解除`);
        }
        this.resolveGoemonTargets(sourceId, targetIds, index + 1, enhancedId);
      }
    });
  }

  resolveKamuiRaikiri(sourceId, targetId) {
    const source = this.player(sourceId), target = this.player(targetId);
    const copies = source.hand.filter(card => card._copiedBy === sourceId);
    return this.requestChoice(sourceId, {
      title: "神威雷切：选择拷贝核心",
      text: "基础牌化为双防强袭；策略牌抹除目标场上的一张牌并延后行动。",
      options: copies.map(card => ({ value: card.uid, label: `消耗【${card.name}】`, description: card.type === "basic" ? "造成2点伤害，需要2张防御" : "抹除1张伏笔或装备，并将目标行动后移" })),
      aiChoice: copies.find(card => card.type === "basic")?.uid || copies[0]?.uid,
      onResolve: uid => {
        const index = source.hand.findIndex(card => card.uid === uid && card._copiedBy === sourceId);
        if (index < 0) return;
        const [copy] = source.hand.splice(index, 1);
        if (copy.type === "basic") {
          this.beginAttack({ sourceId, targetId, damage: 2, requiredGuards: 2, origin: "signature" });
          return;
        }
        const options = [
          ...target.plots.map(plot => ({ value: `plot:${plot.uid}`, label: `抹除伏笔【${plot.card.name}】` })),
          ...["weapon", "armor", "charm"].filter(slot => target.equipment[slot]).map(slot => ({ value: `equip:${slot}`, label: `抹除${{ weapon: "武器", armor: "防具", charm: "饰品" }[slot]}【${target.equipment[slot].name}】` }))
        ];
        const finish = value => {
          if (value?.startsWith("plot:")) this.removePlot(target.plots.find(plot => plot.uid === value.slice(5)));
          else if (value?.startsWith("equip:")) {
            const slot = value.slice(6);
            const equipment = target.equipment[slot];
            if (equipment) { this.discard.push(equipment); target.equipment[slot] = null; this.refreshEnergyCap(target); }
          }
          const queueIndex = this.turnQueue.indexOf(targetId);
          if (queueIndex >= 0 && queueIndex < this.turnQueue.length - 1) this.turnQueue.push(this.turnQueue.splice(queueIndex, 1)[0]);
          this.log("event", `${this.nameOf(source)}以“神威雷切”扭曲了${this.nameOf(target)}的场域与行动时序`);
        };
        if (!options.length) { finish(null); return; }
        this.requestChoice(sourceId, { title: "神威：选择抹除目标", options, aiChoice: options[0].value, onResolve: finish });
      }
    });
  }

  resolveImmortality(playerId) {
    const player = this.player(playerId);
    const spoils = player.hand.filter(card => card._curseSpoil === playerId);
    return this.requestChoice(playerId, {
      title: "不尸转生：选择实验牌",
      text: "基础牌转化为生命与护盾；策略牌净化伏笔与封锁；装备牌直接装入对应槽位。",
      options: spoils.map(card => ({ value: card.uid, label: `转化【${card.name}】`, description: { basic: "回复1点体力并获得1点护盾", strategy: "移除指向你的伏笔并解除异常封锁", equipment: "直接装备并获得1点护盾" }[card.type] })),
      aiChoice: spoils[0]?.uid,
      onResolve: uid => {
        const index = player.hand.findIndex(card => card.uid === uid && card._curseSpoil === playerId);
        if (index < 0) return;
        const [card] = player.hand.splice(index, 1);
        delete card._curseSpoil;
        if (card.type === "basic") {
          player.hp = clamp(player.hp + 1, 0, player.maxHp);
          player.shield += 1;
          this.discard.push(card);
        } else if (card.type === "strategy") {
          for (const plot of [...this.plotsTargeting(playerId)]) this.removePlot(plot);
          player.poison = 0; player.frozenDraw = 0; player.energyLocked = false; player.signatureLocked = 0;
          this.discard.push(card);
        } else {
          if (player.equipment[card.slot]) this.discard.push(player.equipment[card.slot]);
          player.equipment[card.slot] = card;
          player.shield += 1;
          this.refreshEnergyCap(player);
        }
        this.log("event", `${this.nameOf(player)}以【${card.name}】完成“不尸转生”`);
      }
    });
  }

  forceDiscardOrDamage(sourceId, targetId, discardCount, damage) {
    const target = this.player(targetId);
    if (target.hand.length >= discardCount) return this.requestDiscard(targetId, discardCount, { reason: `砂瀑大葬：请选择${discardCount}张手牌弃置`, onComplete: () => { target.frozenDraw = Math.max(1, target.frozenDraw); } });
    else { target.frozenDraw = Math.max(1, target.frozenDraw); this.dealDamage(sourceId, targetId, damage, "signature"); }
    return { ok: true };
  }

  resolveColossal(sourceId, targetIds, index = 0) {
    if (index >= targetIds.length || this.winner) return;
    const targetId = targetIds[index], target = this.player(targetId);
    const next = () => this.resolveColossal(sourceId, targetIds, index + 1);
    if (!target?.alive) return next();
    if (this.isAlly(sourceId, targetId)) { this.draw(targetId, 1); return next(); }
    if (target.hand.length) return this.requestDiscard(targetId, 1, { reason: "超大型巨人冲击：请选择1张手牌弃置", shouldLog: false, onComplete: next });
    return next();
  }

  drawSpecific(playerId, cardId) {
    let index = this.deck.findIndex(card => card.id === cardId);
    if (index < 0) index = this.discard.findIndex(card => card.id === cardId);
    if (index >= 0) {
      const source = this.deck.findIndex(card => card.id === cardId) >= 0 ? this.deck : this.discard;
      this.player(playerId).hand.push(source.splice(index, 1)[0]);
    } else this.draw(playerId, 1);
  }

  canAct(playerId) { return !this.winner && !this.pendingResponse && !this.pendingDiscard && !this.pendingChoice && this.phase === "play" && this.currentPlayerId === playerId && this.player(playerId)?.alive && !this.player(playerId)?.turnFlags.forcedEnd; }

  removeCard(playerId, uid) {
    const player = this.player(playerId), index = player.hand.findIndex(card => card.uid === uid);
    if (index < 0) return null;
    const [card] = player.hand.splice(index, 1); this.discard.push(card); return card;
  }

  requestDiscard(playerId, count = 1, { reason = "请选择要弃置的手牌", allowedUids = null, shouldLog = true, onComplete = null } = {}) {
    const player = this.player(playerId);
    if (!player?.alive) { if (onComplete) onComplete([]); return { ok: true, pending: false, removed: [] }; }
    const allowed = allowedUids ? new Set(allowedUids) : null;
    const eligible = player.hand.filter(card => !allowed || allowed.has(card.uid));
    const required = Math.min(Math.max(0, count), eligible.length);
    if (!required) { if (onComplete) onComplete([]); return { ok: true, pending: false, removed: [] }; }
    if (player.human) {
      this.pendingDiscard = {
        id: ++this.discardPromptId,
        playerId,
        count: required,
        reason,
        allowedUids: eligible.map(card => card.uid),
        shouldLog
      };
      this.pendingDiscardResolver = onComplete;
      return { ok: true, pending: true };
    }
    const removed = this.discardRandom(playerId, required, shouldLog, eligible.map(card => card.uid));
    if (onComplete) onComplete(removed);
    return { ok: true, pending: false, removed };
  }

  confirmDiscard(playerId, cardUids) {
    const pending = this.pendingDiscard;
    if (!pending || pending.playerId !== playerId) return { ok: false, reason: "当前没有需要确认的弃牌" };
    const unique = [...new Set(cardUids || [])];
    if (unique.length !== pending.count) return { ok: false, reason: `需要选择${pending.count}张牌` };
    const allowed = new Set(pending.allowedUids);
    const player = this.player(playerId);
    if (!player || unique.some(uid => !allowed.has(uid) || !player.hand.some(card => card.uid === uid))) return { ok: false, reason: "选择中包含无效手牌" };
    const removed = unique.map(uid => this.removeCard(playerId, uid)).filter(Boolean);
    if (pending.shouldLog && removed.length) this.log("system", `${this.nameOf(player)}弃置了${removed.length}张手牌`);
    const resolver = this.pendingDiscardResolver;
    this.pendingDiscard = null;
    this.pendingDiscardResolver = null;
    if (resolver) resolver(removed);
    return { ok: true, removed };
  }

  discardRandom(playerId, count = 1, shouldLog = true, allowedUids = null) {
    const player = this.player(playerId); if (!player) return [];
    const allowed = allowedUids ? new Set(allowedUids) : null;
    const removed = [];
    for (let i = 0; i < count; i += 1) {
      const candidates = player.hand.map((card, index) => ({ card, index })).filter(item => !allowed || allowed.has(item.card.uid));
      if (!candidates.length) break;
      const index = candidates[Math.floor(this.random() * candidates.length)].index;
      const [card] = player.hand.splice(index, 1); this.discard.push(card); removed.push(card);
    }
    if (shouldLog && removed.length) this.log("system", `${this.nameOf(player)}弃置了${removed.length}张手牌`);
    return removed;
  }

  getAITargets(playerId, candidates) {
    const enemies = candidates.filter(id => !this.isAlly(playerId, id));
    return enemies.sort((a, b) => this.player(a).hp - this.player(b).hp);
  }

  aiStep(playerId = this.currentPlayerId) {
    const player = this.player(playerId);
    if (player && !player.alive && playerId === this.currentPlayerId) {
      this.advancePastEliminatedCurrent();
      return { acted: true };
    }
    if (!this.canAct(playerId) || player.human) return { acted: false };
    if (!player.revealed && this.mode.id === "classic8" && this.round >= 2 && this.random() < .35) { this.revealRole(playerId); return { acted: true }; }
    if (player.characterId === "jiraiya" && player.energy >= 4 && player.sageResonance) {
      const targets = this.getAITargets(playerId, this.getSignatureTargets(playerId));
      if (targets.length) { const result = this.useSignature(playerId, targets[0]); if (result.ok !== false) return { acted: true }; }
    }
    const activeTargets = this.getActiveSkillTargets(playerId);
    if (activeTargets.length && !player.turnFlags.activeUsed && this.random() < .55) {
      const skill = activeSkills[player.characterId];
      const choices = skill.target === "enemy" ? this.getAITargets(playerId, activeTargets) : skill.target === "ally" ? activeTargets.filter(id => this.isAlly(playerId, id)) : activeTargets;
      if (choices.length) { this.useActiveSkill(playerId, choices[0]); return { acted: true }; }
    }
    const sig = this.characterOf(player).signature;
    if (player.energy >= sig.cost && player.signatureLocked <= 0) {
      const targets = this.getSignatureTargets(playerId);
      const choices = sig.target === "enemy" ? this.getAITargets(playerId, targets) : sig.target === "ally" ? targets.filter(id => this.isAlly(playerId, id)) : targets;
      if (choices.length) { const result = this.useSignature(playerId, choices[0]); if (result.ok !== false) return { acted: true }; }
    }
    const heal = player.hand.find(card => card.id === "heal");
    if (heal && player.hp < player.maxHp) { this.playCard(playerId, heal.uid, playerId); return { acted: true }; }
    const equipment = player.hand.find(card => card.type === "equipment" && (!player.equipment[card.slot] || this.random() < .18));
    if (equipment) { this.playCard(playerId, equipment.uid, playerId); return { acted: true }; }
    const focus = player.hand.find(card => card.id === "focus" && player.energy < player.maxEnergy);
    if (focus) { this.playCard(playerId, focus.uid, playerId); return { acted: true }; }
    if (player.skipOffense) return { acted: false };
    const massDamage = player.hand.find(card => ["dimensional_barrage", "rift_invasion"].includes(card.id));
    if (massDamage && !player.skipOffense) {
      const others = this.players.filter(target => target.alive && target.id !== playerId);
      const enemies = others.filter(target => !this.isAlly(playerId, target.id));
      const allies = others.length - enemies.length;
      if (enemies.length > allies) { this.playCard(playerId, massDamage.uid, playerId); return { acted: true }; }
    }
    const duel = player.hand.find(card => card.id === "will_duel");
    if (duel && !player.skipOffense) {
      const ownResponses = player.hand.filter(card => card.id === "attack" || card.id === "adapt").length;
      const targets = this.getAITargets(playerId, this.getCardTargets(playerId, duel)).sort((a, b) => this.player(a).hand.length - this.player(b).hand.length || this.player(a).hp - this.player(b).hp);
      if (targets.length && (ownResponses > 0 || this.player(targets[0]).hand.length === 0)) { this.playCard(playerId, duel.uid, targets[0]); return { acted: true }; }
    }
    const mindBurn = player.hand.find(card => card.id === "mind_burn");
    if (mindBurn && !player.skipOffense) {
      const targets = this.getAITargets(playerId, this.getCardTargets(playerId, mindBurn));
      if (targets.length && player.hand.some(card => card.uid !== mindBurn.uid)) { this.playCard(playerId, mindBurn.uid, targets[0]); return { acted: true }; }
    }
    const collapse = player.hand.find(card => card.id === "energy_collapse");
    if (collapse && !player.skipOffense) {
      const targets = this.getAITargets(playerId, this.getCardTargets(playerId, collapse)).sort((a, b) => this.player(a).energy - this.player(b).energy || this.player(a).hp - this.player(b).hp);
      if (targets.length) { this.playCard(playerId, collapse.uid, targets[0]); return { acted: true }; }
    }
    const contract = player.hand.find(card => card.id === "limit_contract");
    if (contract) {
      const allies = this.getCardTargets(playerId, contract).filter(id => this.isAlly(playerId, id));
      if (allies.length) { this.playCard(playerId, contract.uid, allies[0]); return { acted: true }; }
    }
    const relay = player.hand.find(card => card.id === "tactical_relay" && player.hand.some(item => item.type === "basic"));
    if (relay) {
      const allies = this.getCardTargets(playerId, relay).filter(id => this.isAlly(playerId, id));
      if (allies.length) { this.playCard(playerId, relay.uid, allies[0]); return { acted: true }; }
    }
    const selfStrategy = player.hand.find(card => ["energy_auction", "delayed_cast", "echo_script"].includes(card.id) && this.getCardTargets(playerId, card).length);
    if (selfStrategy && this.random() < .65) { this.playCard(playerId, selfStrategy.uid, playerId); return { acted: true }; }
    const enemyPlot = player.hand.find(card => ["causal_mark", "rhythm_break"].includes(card.id) && this.getCardTargets(playerId, card).length);
    if (enemyPlot && player.plots.length < 2) {
      const targets = this.getAITargets(playerId, this.getCardTargets(playerId, enemyPlot));
      if (targets.length) { this.playCard(playerId, enemyPlot.uid, targets[0]); return { acted: true }; }
    }
    const allyPlot = player.hand.find(card => ["guardian_oath", "return_route"].includes(card.id) && this.getCardTargets(playerId, card).length);
    if (allyPlot && player.plots.length < 2) {
      const allies = this.getCardTargets(playerId, allyPlot).filter(id => this.isAlly(playerId, id));
      if (allies.length) { this.playCard(playerId, allyPlot.uid, allies[0]); return { acted: true }; }
    }
    const exchange = player.hand.find(card => card.id === "memory_exchange");
    if (exchange) {
      const targets = this.getAITargets(playerId, this.getCardTargets(playerId, exchange));
      if (targets.length && this.random() < .35) { this.playCard(playerId, exchange.uid, targets[0]); return { acted: true }; }
    }
    const initiative = player.hand.find(card => card.id === "initiative_swap" && this.getCardTargets(playerId, card).length >= 2);
    if (initiative && this.random() < .35) { this.playCard(playerId, initiative.uid, this.getCardTargets(playerId, initiative)[0]); return { acted: true }; }
    if (!player.skipOffense) {
      const overdrive = player.hand.find(card => card.id === "overdrive" && !player.turnFlags.overdriveUsed && player.hand.some(item => item.id === "attack"));
      if (overdrive) { this.playCard(playerId, overdrive.uid, playerId); return { acted: true }; }
      const attack = player.hand.find(card => card.id === "attack");
      if (attack && player.attacksUsed < player.attackLimit) {
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, attack));
        if (targets.length) { this.playCard(playerId, attack.uid, targets[0]); return { acted: true }; }
      }
      const adapt = player.hand.find(card => card.id === "adapt");
      if (adapt && player.attacksUsed < player.attackLimit) {
        const targets = this.getAITargets(playerId, this.getCardTargets(playerId, adapt).filter(id => id !== playerId));
        if (targets.length) { this.playCard(playerId, adapt.uid, targets[0]); return { acted: true }; }
      }
    }
    return { acted: false };
  }

  log(type, message) {
    this.logs.push({ id: `${Date.now()}-${this.logs.length}`, round: this.round, type, message });
    if (this.logs.length > 120) this.logs.shift();
  }

  humanWon() {
    if (!this.winner) return false;
    const human = this.players.find(player => player.human);
    return this.winner.camp === this.roleOf(human).camp;
  }
}
