import { describe, it, expect } from 'vitest';
import { activeTiles, createGame, isFree, layouts, matches, positions, removalPlan, removePair, reset, undo, validSavedGame } from './game';
function seeded(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}
describe('Mahjong rules', () => {
  it('requires an uncovered top and at least one open side', () => {
    const row = [0, 1, 2].map(x => ({ id: x, x, y: 0, z: 0 }));
    expect(isFree(row[0], row)).toBe(true);
    expect(isFree(row[1], row)).toBe(false);
    expect(isFree(row[2], row)).toBe(true);
    expect(isFree(row[0], [...row, { id: 3, x: 0, y: 0, z: 1 }])).toBe(false);
    expect(isFree(row[0], [row[0], row[1], { id: 3, x: .5, y: .5, z: 1 }])).toBe(false);
  });
  for (const layout of layouts) {
    it(`${layout.name}: deals are fully solvable and valid`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const g = createGame(layout.id, seeded(seed));
        expect(validSavedGame(g)).toBe(true);
        expect(g.tiles.length).toBe(layout.id === 'turtle' ? 144 : 112);
        const plan = removalPlan(positions(layout.id), seeded(seed))!;
        expect(plan.length).toBe(g.tiles.length / 2);
        for (const [a, b] of plan) {
          expect(g.tiles[a].face).toBe(g.tiles[b].face);
          expect(removePair(g, a, b)).toBe(true);
        }
        expect(activeTiles(g)).toHaveLength(0);
        expect(undo(g)).toBe(true);
        expect(activeTiles(g)).toHaveLength(2);
      }
    });
  }
  it('rejects invalid pairs and restores a pair on undo', () => {
    const g = createGame('turtle', seeded(4));
    expect(removePair(g, 0, 0)).toBe(false);
    const [a, b] = matches(g)[0];
    expect(removePair(g, a.id, b.id)).toBe(true);
    expect(removePair(g, a.id, b.id)).toBe(false);
    expect(g.removed).toHaveLength(2);
    expect(undo(g)).toBe(true);
    expect(g.removed).toHaveLength(0);
    expect(undo(g)).toBe(false);
  });
  it('reset restores the original deal and clears move history', () => {
    for (const layout of layouts) {
      const g = createGame(layout.id, seeded(8));
      const original = g.tiles.map(t => ({ ...t }));
      for (let i = 0; i < 9; i++) { const pair = matches(g)[0]; if (pair) removePair(g, pair[0].id, pair[1].id); }
      expect(g.removed.length).toBeGreaterThan(0);
      reset(g);
      expect(g.tiles).toEqual(original);
      expect(g.removed).toEqual([]);
      expect(g.history).toEqual([]);
      expect(validSavedGame(g)).toBe(true);
    }
  });
  it('rejects damaged saves instead of crashing', () => {
    expect(validSavedGame(null)).toBe(false);
    expect(validSavedGame({ version: 1 })).toBe(false);
    const g = createGame('lotus');
    expect(validSavedGame(JSON.parse(JSON.stringify(g)))).toBe(true);
    g.removed = [0, 0]; expect(validSavedGame(g)).toBe(false);
    g.removed = []; g.tiles[0].face = 100; expect(validSavedGame(g)).toBe(false);
  });
});
