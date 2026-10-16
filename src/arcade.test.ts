import { describe, expect, it } from 'vitest';
import { createGame, difficulties, positions, removalPlan, removePair, reset, undo, validSavedGame } from './game';
import { arcadeCrystals, arcadeMaximum, arcadeScore, canAfford, newArcadeProfile, newArcadeRound, payForAction, rewardArcadeWin, validArcadeProfile } from './arcade';

function seeded(initial: number) {
  let seed = initial;
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
function round(difficulty: 'easy' | 'medium' | 'hard' = 'easy') {
  const game = createGame('turtle', seeded(32), difficulty);
  game.arcade = newArcadeRound();
  return { game, plan: removalPlan(positions('turtle', difficulty), seeded(32))!, profile: newArcadeProfile() };
}

describe('Arcade economy', () => {
  for (const difficulty of difficulties) it(`scales crystal thresholds to ${difficulty.name}`, () => {
    const { game, plan } = round(difficulty.id);
    for (const [i, [a, b]] of plan.entries()) {
      expect(removePair(game, a, b)).toBe(true);
      expect(arcadeScore(game)).toBe((i + 1) * 100);
      expect(arcadeCrystals(game)).toBe([.5, .75, 1].filter(t => i + 1 >= plan.length * t).length);
    }
    expect(arcadeScore(game)).toBe(arcadeMaximum(game));
    expect(arcadeCrystals(game)).toBe(3);
  });

  it('keeps point penalties as debt at zero and removes restored pair points', () => {
    const { game, plan, profile } = round();
    payForAction(game, profile, 'hint');
    expect(arcadeScore(game)).toBe(0);
    removePair(game, ...plan[0] as [number, number]);
    expect(arcadeScore(game)).toBe(0);
    removePair(game, ...plan[1] as [number, number]);
    expect(arcadeScore(game)).toBe(100);
    undo(game); payForAction(game, profile, 'undo');
    expect(arcadeScore(game)).toBe(0);
    expect(profile.crystals).toBe(3);
    payForAction(game, profile, 'shuffle');
    expect(game.arcade!.penalty).toBe(400);
    expect(profile.crystals).toBe(1);
    expect(canAfford(profile, 'shuffle')).toBe(false);
    expect(canAfford(profile, 'hint')).toBe(true);
  });

  it('awards a won round once across undo, reset and save restoration', () => {
    const { game, plan, profile } = round();
    expect(rewardArcadeWin(game, profile)).toBe(false);
    for (const [a, b] of plan) removePair(game, a, b);
    expect(rewardArcadeWin(game, profile)).toBe(true);
    expect(profile).toEqual({ level: 2, crystals: 8 });
    expect(rewardArcadeWin(game, profile)).toBe(false);
    undo(game); payForAction(game, profile, 'undo');
    removePair(game, ...plan.at(-1)! as [number, number]);
    expect(rewardArcadeWin(game, profile)).toBe(false);
    reset(game);
    for (const [a, b] of plan) removePair(game, a, b);
    const restored = JSON.parse(JSON.stringify(game));
    expect(validSavedGame(restored)).toBe(true);
    expect(rewardArcadeWin(restored, profile)).toBe(false);
    expect(profile).toEqual({ level: 2, crystals: 7 });
  });

  it('resets score penalties without refunding spent currency', () => {
    const { game, plan, profile } = round();
    removePair(game, ...plan[0] as [number, number]);
    payForAction(game, profile, 'hint');
    reset(game);
    expect(arcadeScore(game)).toBe(0);
    expect(game.arcade!.penalty).toBe(0);
    expect(profile.crystals).toBe(4);
  });

  it('levels up even when penalties leave no crystal reward', () => {
    const { game, plan, profile } = round();
    for (const [a, b] of plan) removePair(game, a, b);
    game.arcade!.penalty = arcadeMaximum(game);
    expect(rewardArcadeWin(game, profile)).toBe(true);
    expect(profile).toEqual({ level: 2, crystals: 5 });
  });

  it('keeps Classic free and outside Arcade progression', () => {
    const { game, plan, profile } = round();
    delete game.arcade;
    for (const [a, b] of plan) removePair(game, a, b);
    payForAction(game, profile, 'hint');
    expect(rewardArcadeWin(game, profile)).toBe(false);
    expect(profile).toEqual(newArcadeProfile());
  });

  it('rejects corrupt Arcade saves while accepting legacy Classic saves', () => {
    const { game } = round();
    expect(validSavedGame(game)).toBe(true);
    for (const arcade of [{ penalty: -100, rewarded: false }, { penalty: 1, rewarded: false }, { penalty: 0, rewarded: true }, { penalty: 0, rewarded: true, reward: { crystals: 4, level: 2 } }]) {
      expect(validSavedGame({ ...game, arcade })).toBe(false);
    }
    for (const profile of [{ level: 0, crystals: 5 }, { level: 1, crystals: -1 }, { level: 1.5, crystals: 5 }, null]) expect(validArcadeProfile(profile)).toBe(false);
    delete game.arcade;
    expect(validSavedGame(game)).toBe(true);
  });
});
