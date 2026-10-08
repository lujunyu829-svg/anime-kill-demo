import { GameEngine } from "../src/engine.js";
import { characters, characterPacks } from "../src/data.js";

export function poolIds(pool = "mixed") {
  const packId = pool === "demon-slayer" ? "demon_slayer_sun_moon" : pool;
  const ids = pool === "mixed" ? characters.map(c => c.id) : characterPacks.find(p => p.id === packId)?.characterIds;
  if (!ids?.length) throw new Error("未知角色池: " + pool);
  return ids;
}
function randomFor(seed) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}
export function residualWindows(game) {
  const result = {};
  for (const key of ["pendingChoice", "pendingDiscard", "pendingResponse", "pendingStrategySequence", "activeCardContext", "pendingChoiceResolver", "pendingDiscardResolver"])
    if (game[key]) result[key] = 1;
  const dying = game.players.filter(p => p.dying).length;
  if (dying) result.dying = dying;
  return result;
}
function emptyMetrics() {
  return { activeDeclared: 0, activeEffective: 0, activeTargets: {}, signatureDeclared: 0, signatureEffective: 0, signatureCosts: {}, damage: 0, healing: 0, shield: 0, drawn: 0, discarded: 0, cancelled: 0, equipmentChanges: 0, healingOpportunities: 0, healingUsed: 0, healingSkipped: {}, dreamReasons: {}, awakeRound: 0 };
}
function effectState(game) {
  return JSON.stringify(game.players.map(p => ({ hp: p.hp, alive: p.alive, hand: p.hand.map(c => c.uid), equipment: p.equipment, special: p.specialCards, plots: p.plots, shield: p.shield, poison: p.poison, frozenDraw: p.frozenDraw, skipOffense: p.skipOffense, attackLimit: p.attackLimit, chess: p.chessTargetId, scout: p.scoutedTargetId, bind: p.toadBindTargetId, curse: p.curseSeal, swap: p.swapMarkedId, byakugo: p.byakugoMode, breath: p.breathReady, scent: p.scentTargetId, rage: p.rageTargetId, compass: p.compassTargetId, compassDefended: p.compassDefended, bloodFlame: p.bloodFlame, bloodMark: p.bloodMarkTargetId, stillWaterGuard: p.stillWaterGuard, deadCalm: p.deadCalm, flameGuard: p.flameGuard, nezukoAid: p.nezukoAid, flags: { ...p.turnFlags, activeUsed: undefined, signatureUsed: undefined } })));
}
function observe(game) {
  const metrics = new Map(game.players.map(p => [p.id, emptyMetrics()]));
  const wrap = (name, handler) => { const original = game[name]; game[name] = function (...args) { return handler(original.bind(this), ...args); }; };
  for (const name of ["useActiveSkill", "useSignature"]) wrap(name, (original, id, targetId, ...rest) => {
    const before = effectState(game), declaredCost = name === "useSignature" ? game.signatureCost(id) : 0;
    const result = original(id, targetId, ...rest), row = metrics.get(id);
    if (row && result?.ok !== false) {
      const active = name === "useActiveSkill", prefix = active ? "active" : "signature";
      row[prefix + "Declared"]++;
      if (effectState(game) !== before) row[prefix + "Effective"]++;
      if (active) { const type = targetId === id ? "self" : game.aiIsAlly(id, targetId) ? "ally" : "other"; row.activeTargets[type] = (row.activeTargets[type] || 0) + 1; if (game.player(id).characterId === "chopper") row.healingUsed++; }
      else { row.signatureCosts[declaredCost] = (row.signatureCosts[declaredCost] || 0) + 1; }
    }
    return result;
  });
  wrap("draw", (original, id, count) => { const before = game.player(id)?.hand.length || 0, result = original(id, count); if (metrics.has(id)) metrics.get(id).drawn += Math.max(0, game.player(id).hand.length - before); return result; });
  wrap("discardRandom", (original, id, count, ...rest) => { const before = game.discard.length, result = original(id, count, ...rest); if (metrics.has(id)) metrics.get(id).discarded += Math.max(0, game.discard.length - before); return result; });
  wrap("emitOnePieceEvent", (original, event) => {
    const result = original(event), row = metrics.get(event.sourceId);
    if (row) {
      if (event.type === "afterDamage") row.damage += event.amount || 0;
      if (event.type === "afterHeal") row.healing += event.amount || 0;
      if (event.type === "shieldGranted") row.shield += event.amount || 0;
      if (event.type === "dreamProgress") { row.dreamReasons[event.reason] = (row.dreamReasons[event.reason] || 0) + 1; if (event.progress === 3) row.awakeRound = game.round; }
    }
    if (event.type === "cardCancelled" && metrics.has(event.cancelledById)) metrics.get(event.cancelledById).cancelled++;
    if (event.type === "equipmentChanged" && event.entered?.uid !== event.left?.uid && metrics.has(event.ownerId || event.targetId)) metrics.get(event.ownerId || event.targetId).equipmentChanges++;
    return result;
  });
  return metrics;
}
export function runMatch({ seed = 1, pool = "mixed", characterId, anchor = 0, mode = "ranked2v2", scenario = "balance" } = {}) {
  const random = randomFor(seed), ids = scenario === "franky-chopper" ? ["franky", "chopper", "brook", "jinbe"] : poolIds(pool);
  const chosen = characterId || (scenario === "franky-chopper" ? "franky" : ids[Math.floor(random() * ids.length)]);
  const game = new GameEngine({ modeId: mode, humanCharacterId: chosen, fixedAnchorSeat: anchor, characterPool: ids, random }).setup();
  if (scenario === "franky-chopper") {
    for (const p of game.players) {
      if (!['p0', 'p1'].includes(p.id)) { p.alive = false; continue; }
      p.characterId = p.id === "p0" ? "franky" : "chopper";
      const c = game.characterOf(p);
      p.hp = p.maxHp = c.hp; p.baseHandLimit = c.handLimit; p.hand = []; p.energy = 1;
      p.turnFlags = {}; p.roundFlags = {}; p.dreamState = { progress: 0, awakened: false, progressedRound: 0 };
      game.draw(p.id, c.handLimit);
    }
    game.turnQueue = ["p1"]; game.currentPlayerId = "p0";
  }
  for (const p of game.players) p.human = false;
  const metrics = observe(game), maxSteps = mode === "classic8" ? 8000 : 4000;
  let steps = 0, lateSurvivors = [];
  while (!game.winner && steps < maxSteps) {
    if (game.round >= 30 && !lateSurvivors.length) lateSurvivors = game.players.filter(p => p.alive).map(p => p.characterId);
    const actor = game.player(game.currentPlayerId);
    if (actor?.characterId === "chopper" && game.canAct(actor.id) && !actor.turnFlags.activeUsed) {
      const row = metrics.get(actor.id), legal = game.getActiveSkillTargets(actor.id);
      if (legal.length) row.healingOpportunities++;
      else { const reason = actor.hand.some(c => c.type === "basic") ? "无可获益队友" : "无基础牌支付"; row.healingSkipped[reason] = (row.healingSkipped[reason] || 0) + 1; }
    }
    const result = game.aiStep();
    if (game.pendingResponse) game.respond(true);
    else if (game.pendingDiscard) { const d = game.pendingDiscard; game.confirmDiscard(d.playerId, d.allowedUids.slice(0, d.count)); }
    else if (game.pendingChoice) game.resolveChoice(game.pendingChoice.playerId, game.pendingChoice.options?.[0]?.value);
    else if (!result.acted) game.endTurn();
    steps++;
  }
  return { seed, pool, mode, anchor, scenario, rounds: game.round, steps, lateSurvivors, riftCollapseActive: game.riftCollapseActive, winner: game.winner?.camp || null, completed: Boolean(game.winner), residual: residualWindows(game), players: game.players.filter(p => scenario !== "franky-chopper" || ['p0', 'p1'].includes(p.id)).map(p => ({ id: p.id, characterId: p.characterId, pack: game.characterOf(p).packId, camp: game.roleOf(p).camp, alive: p.alive, win: game.winner?.camp === game.roleOf(p).camp, dreamProgress: p.dreamState?.progress || 0, awakened: Boolean(p.dreamState?.awakened), metrics: metrics.get(p.id) })) };
}
function percentile(values, ratio) { const ordered = [...values].sort((a, b) => a - b); return ordered[Math.floor((ordered.length - 1) * ratio)] || 0; }
export function summarizeMatches(matches, pinnedOnly = false) {
  const rounds = matches.map(m => m.rounds), camps = {}, residual = {}, byRole = new Map();
  for (const match of matches) {
    if (match.winner) camps[match.winner] = (camps[match.winner] || 0) + 1;
    for (const [key, count] of Object.entries(match.residual)) residual[key] = (residual[key] || 0) + count;
    for (const player of match.players.filter(p => !pinnedOnly || p.id === "p0")) {
      const key = player.characterId + ":" + match.anchor;
      if (!byRole.has(key)) byRole.set(key, { character: player.characterId, pack: player.pack, anchor: match.anchor, games: 0, wins: 0, unfinished: 0, residual: {}, camps: {}, supportOpportunityHistogram: {}, rounds: [], metrics: emptyMetrics(), dreamProgress: 0, awakened: 0, awakenedWins: 0, unawakenedWins: 0, awakeRounds: 0 });
      const row = byRole.get(key); row.games++; row.wins += player.win ? 1 : 0; row.rounds.push(match.rounds); row.dreamProgress += player.dreamProgress;
      row.unfinished += match.completed ? 0 : 1; row.camps[player.camp] = (row.camps[player.camp] || 0) + 1;
      for (const [key, count] of Object.entries(match.residual)) row.residual[key] = (row.residual[key] || 0) + count;
      const opportunities = player.metrics.healingOpportunities;
      row.supportOpportunityHistogram[opportunities] = (row.supportOpportunityHistogram[opportunities] || 0) + 1;
      if (player.awakened) { row.awakened++; row.awakeRounds += player.metrics.awakeRound; row.awakenedWins += player.win ? 1 : 0; } else row.unawakenedWins += player.win ? 1 : 0;
      for (const [name, value] of Object.entries(player.metrics)) {
        if (typeof value === "number") row.metrics[name] += value;
        else for (const [sub, count] of Object.entries(value)) row.metrics[name][sub] = (row.metrics[name][sub] || 0) + count;
      }
    }
  }
  return { games: matches.length, unfinished: matches.filter(m => !m.completed).length, camps, residual, avgRounds: rounds.reduce((a, b) => a + b, 0) / Math.max(1, rounds.length), p95Rounds: percentile(rounds, .95), p99Rounds: percentile(rounds, .99), maxRounds: Math.max(0, ...rounds), over80: rounds.filter(r => r > 80).length, maxSteps: Math.max(0, ...matches.map(m => m.steps)), roles: [...byRole.values()].map(r => ({ ...r, rounds: undefined, winRate: r.wins / r.games * 100, avgRounds: r.rounds.reduce((a,b) => a+b,0) / r.games, p95Rounds: percentile(r.rounds,.95), p99Rounds: percentile(r.rounds,.99), maxRounds: Math.max(0, ...r.rounds), avgDreamProgress: r.dreamProgress / r.games, awakenRate: r.awakened / r.games * 100, avgAwakenRound: r.awakened ? r.awakeRounds / r.awakened : null, awakenedWinRate: r.awakened ? r.awakenedWins / r.awakened * 100 : null, unawakenedWinRate: r.games > r.awakened ? r.unawakenedWins / (r.games - r.awakened) * 100 : null })) };
}
