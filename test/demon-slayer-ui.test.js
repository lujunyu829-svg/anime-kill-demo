import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { characters, activeSkills, characterPacks, portraitPath } from "../src/data.js";
import { GameEngine } from "../src/engine.js";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const page = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const ids = characterPacks.find(pack => pack.id === "demon_slayer_sun_moon").characterIds;

test("选将页按作品筛选并可预览鬼灭十人完整技能", () => {
  assert.equal(characters.length, 36);
  assert.equal(ids.length, 10);
  assert.ok(app.includes('characters.filter(character => character.series === selectedSeries)'));
  assert.ok(app.includes("characterSkillEntries(character)"));
  for (const id of ids) {
    const character = characters.find(item => item.id === id);
    assert.equal(character.series, "鬼灭之刃");
    assert.equal(character.skills.length, 2);
    assert.ok(activeSkills[id]?.name);
    assert.ok(character.signature?.name);
  }
});

test("炭治郎私查牌仅设置者可见，公开呼吸态与血印目标可供角色详情读取", () => {
  const game = new GameEngine({ modeId: "classic8", humanCharacterId: "tanjiro", fixedAnchorSeat: 0, random: () => 0.25 }).setup();
  const tanjiro = game.player("p0");
  tanjiro.scentTargetId = "p2";
  tanjiro.scentCardName = "防御";
  tanjiro.breathReady = true;
  assert.equal(game.getVisibleDemonSlayerState("p0", "p0").scentCardName, "防御");
  const enemyView = game.getVisibleDemonSlayerState("p1", "p0");
  assert.equal(enemyView.scentCardName, undefined);
  assert.equal(enemyView.scentTargetId, "p2");
  assert.equal(enemyView.breathReady, true);
  assert.equal(enemyView.scentMarkedBy, undefined);
  assert.equal(game.getVisibleDemonSlayerState("p1", "p2").scentMarkedBy, "p0");
});

test("战场席位和详情统一显示鬼灭公开状态，私查信息只通过安全视图", () => {
  assert.ok(app.includes("function demonStatusBadges(player)"));
  assert.ok(app.includes("engine.getVisibleDemonSlayerState(viewerId, player.id)"));
  assert.ok(app.includes("demonStatusBadges(player)"));
  for (const label of ["呼吸态", "爆血印", "罗针", "血印", "破绽", "护人本能"]) assert.ok(app.includes(label), label);
  assert.ok(css.includes(".demon-status-mini"));
  assert.ok(css.includes(".self-detail-button"));
});

test("八张新增立绘接入统一路径，规则说明包含日轮与血月且缺图可回退", () => {
  for (const id of ids.filter(id => !["tanjiro", "shinobu"].includes(id))) {
    const path = fileURLToPath(new URL(`../${portraitPath(id).replace(/^\.\//, "")}`, import.meta.url));
    assert.equal(existsSync(path), true, id);
    assert.ok(statSync(path).size > 50_000, id);
  }
  assert.ok(page.includes("日轮与血月"));
  assert.ok(app.includes("data-portrait"));
  assert.ok(app.includes('addEventListener("error"'));
});

test("横屏窄视口将牌桌切为单栏且结束回合按钮常驻", () => {
  assert.ok(css.includes("@media (max-width:900px)"));
  assert.ok(css.includes(".game-layout { height:auto; min-height:728px; grid-template-columns:1fr; }"));
  assert.ok(css.includes(".compact-end-turn { display:block;"));
  assert.ok(css.includes(".game-header { position:sticky; top:0; }"));
});
