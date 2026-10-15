import { describe, it, expect } from 'vitest';
import { activeTiles, createGame, difficulties, isFree, layouts, matches, positions, removalPlan, removePair, reshuffle, reset, undo, validSavedGame } from './game';
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
  for (const layout of layouts) for (const difficulty of difficulties) {
    it(`${layout.name}, ${difficulty.name}: ${difficulty.count} fully solvable tiles`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const g = createGame(layout.id, seeded(seed), difficulty.id);
        expect(validSavedGame(g)).toBe(true);
        expect(g.tiles.length).toBe(difficulty.count);
        const plan = removalPlan(positions(layout.id, difficulty.id), seeded(seed))!;
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


describe('Shuffle and save compatibility', () => {
  for (const layout of layouts) for (const difficulty of difficulties) {
    it(`shuffles ${layout.id}/${difficulty.id} without losing removed tiles or reset state`, () => {
      const g = createGame(layout.id, seeded(13), difficulty.id);
      for (let i = 0; i < 5; i++) {
        const pair = matches(g)[0];
        if (pair) removePair(g, pair[0].id, pair[1].id);
      }
      const removed = [...g.removed], initial = [...g.initialFaces];
      const remainingFaces = activeTiles(g).map(t => t.face).sort((a,b) => a-b);
      expect(reshuffle(g, seeded(71))).toBe(true);
      expect(g.removed).toEqual(removed);
      expect(g.history).toEqual([]);
      expect(g.initialFaces).toEqual(initial);
      expect(activeTiles(g).map(t => t.face).sort((a,b) => a-b)).toEqual(remainingFaces);
      expect(validSavedGame(g)).toBe(true);
      const plan = removalPlan(activeTiles(g), seeded(71))!;
      for (const [a,b] of plan) expect(removePair(g, a, b)).toBe(true);
      expect(activeTiles(g)).toHaveLength(0);
      reset(g);
      expect(g.tiles.map(t => t.face)).toEqual(initial);
    });
  }
  it('keeps a pre-difficulty 112-tile Lotus save and reset intact', () => {
    const points = positions('lotus').filter(t => t.z === 0);
    for (let y = 2; y < 6; y++) for (let x = 4; x < 10; x++) points.push({ id: points.length, x, y, z: 1 });
    for (let y = 3; y < 5; y++) for (let x = 6; x < 8; x++) points.push({ id: points.length, x, y, z: 2 });
    const old = { version: 1 as const, layout: 'lotus' as const, tiles: points.map(p => ({ ...p, face: Math.floor(p.id / 2) % 36 })), initialFaces: points.map(p => Math.floor(p.id / 2) % 36), removed: [], history: [], started: Date.now() };
    expect(old.tiles).toHaveLength(112);
    expect(validSavedGame(old)).toBe(true);
    expect(validSavedGame({ ...old, difficulty: 'easy' })).toBe(false);
    reset(old); expect(validSavedGame(old)).toBe(true);
  });
  it('leaves unsolvable geometry unchanged on shuffle failure', () => {
    const g = createGame('turtle');
    g.tiles = [ { id: 0, x: 0, y: 0, z: 0, face: 0 }, { id: 1, x: 0, y: 0, z: 1, face: 0 } ];
    const before = structuredClone(g);
    expect(reshuffle(g)).toBe(false);
    expect(g).toEqual(before);
  });
});
