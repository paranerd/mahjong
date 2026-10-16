import type { Game } from './game';

export interface ArcadeProfile { level: number; crystals: number }
export interface ArcadeRound {
  penalty: number;
  rewarded: boolean;
  reward?: { crystals: number; level: number };
}
export type ArcadeAction = 'undo' | 'hint' | 'shuffle';
export const arcadeCosts: Record<ArcadeAction, number> = { undo: 1, hint: 1, shuffle: 2 };
export const crystalTargets = [.5, .75, 1];
export function newArcadeProfile(): ArcadeProfile { return { level: 1, crystals: 5 }; }
export function newArcadeRound(): ArcadeRound { return { penalty: 0, rewarded: false }; }
const natural = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0;
export function validArcadeProfile(value: unknown): value is ArcadeProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as ArcadeProfile;
  return natural(p.level) && p.level >= 1 && natural(p.crystals);
}
export function validArcadeRound(value: unknown): value is ArcadeRound {
  if (!value || typeof value !== 'object') return false;
  const r = value as ArcadeRound;
  return natural(r.penalty) && r.penalty % 100 === 0 && typeof r.rewarded === 'boolean'
    && (r.rewarded
      ? !!r.reward && natural(r.reward.crystals) && r.reward.crystals <= 3 && natural(r.reward.level) && r.reward.level >= 2
      : r.reward === undefined);
}
export function arcadeScore(game: Game): number {
  return Math.max(0, game.removed.length / 2 * 100 - (game.arcade?.penalty ?? 0));
}
export function arcadeMaximum(game: Game): number { return game.tiles.length / 2 * 100; }
export function arcadeCrystals(game: Game): number {
  return crystalTargets.filter(target => arcadeScore(game) >= Math.ceil(arcadeMaximum(game) * target)).length;
}
export function canAfford(profile: ArcadeProfile, action: ArcadeAction): boolean {
  return profile.crystals >= arcadeCosts[action];
}
// Call only after an action succeeds; cancelled and failed actions cost nothing.
export function payForAction(game: Game, profile: ArcadeProfile, action: ArcadeAction): void {
  if (!game.arcade) return;
  profile.crystals -= arcadeCosts[action];
  game.arcade.penalty += action === 'hint' ? 100 : action === 'shuffle' ? 300 : 0;
}
// The round and profile are persisted together, including this receipt.
export function rewardArcadeWin(game: Game, profile: ArcadeProfile): boolean {
  if (!game.arcade || game.arcade.rewarded || game.removed.length !== game.tiles.length) return false;
  const crystals = arcadeCrystals(game);
  profile.crystals += crystals;
  profile.level += 1;
  game.arcade.rewarded = true;
  game.arcade.reward = { crystals, level: profile.level };
  return true;
}
