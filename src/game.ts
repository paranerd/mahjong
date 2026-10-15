export type LayoutId = 'turtle' | 'bridge' | 'lotus';
export interface Position { id: number; x: number; y: number; z: number }
export interface Tile extends Position { face: number }
export interface Game {
  version: 1;
  layout: LayoutId;
  tiles: Tile[];
  initialFaces: number[];
  removed: number[];
  history: number[][];
  started: number;
}
export const layouts: { id: LayoutId; name: string; description: string }[] = [
  { id: 'turtle', name: 'Schildkröte', description: 'Der Klassiker · 144 Steine' },
  { id: 'bridge', name: 'Brücke', description: 'Klare Linien · 112 Steine' },
  { id: 'lotus', name: 'Lotus', description: 'Sanfte Symmetrie · 112 Steine' },
];
export function positions(layout: LayoutId): Position[] {
  const result: Position[] = [];
  const row = (width: number, y: number, z: number, offset = (14 - width) / 2) => {
    for (let x = 0; x < width; x++) result.push({ id: result.length, x: x + offset, y, z });
  };
  if (layout === 'turtle') {
    [12, 12, 14, 14, 14, 14, 12, 12].forEach((w, y) => row(w, y, 0));
    for (let y = 2; y < 6; y++) row(8, y, 1);
    for (let y = 3; y < 5; y++) row(4, y, 2);
  } else if (layout === 'bridge') {
    for (let y = 1; y < 7; y++) row(12, y, 0);
    for (const y of [1, 2, 5, 6]) { row(4, y, 1, 1); row(4, y, 1, 9); }
    for (const y of [3, 4]) { row(2, y, 1, 1); row(2, y, 1, 11); }
  } else {
    [6, 10, 12, 14, 14, 12, 10, 6].forEach((w, y) => row(w, y, 0));
    for (let y = 2; y < 6; y++) row(6, y, 1);
    for (let y = 3; y < 5; y++) row(2, y, 2);
  }
  return result;
}
export function isFree(tile: Position, active: Position[]): boolean {
  if (active.some(t => t.z > tile.z && Math.abs(t.x - tile.x) < 0.98 && Math.abs(t.y - tile.y) < 0.98)) return false;
  const left = active.some(t => t.z === tile.z && Math.abs(t.y - tile.y) < 0.98 && t.x < tile.x && tile.x - t.x < 1.02);
  const right = active.some(t => t.z === tile.z && Math.abs(t.y - tile.y) < 0.98 && t.x > tile.x && t.x - tile.x < 1.02);
  return !left || !right;
}
export function activeTiles(game: Game): Tile[] {
  const removed = new Set(game.removed);
  return game.tiles.filter(t => !removed.has(t.id));
}
export function matches(game: Game): [Tile, Tile][] {
  const active = activeTiles(game);
  const free = active.filter(t => isFree(t, active));
  const pairs: [Tile, Tile][] = [];
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    if (free[i].face === free[j].face) pairs.push([free[i], free[j]]);
  }
  return pairs;
}
function shuffled<T>(values: T[], random: () => number): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// The removal order is a certificate: assigning one matching face to each
// pair makes every initial deal solvable without searching during play.
export function removalPlan(input: Position[], random = Math.random): number[][] | null {
  let visits = 0;
  const failed = new Set<string>();
  function search(active: Position[]): number[][] | null {
    if (!active.length) return [];
    if (++visits > 12000) return null;
    const key = active.map(t => t.id).join(',');
    if (failed.has(key)) return null;
    const free = shuffled(active.filter(t => isFree(t, active)), random);
    if (free.length < 2) return null;
    // Random free pairs give each deal a different solution path.
    const choices: [Position, Position][] = [];
    for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) choices.push([free[i], free[j]]);
    for (const [a, b] of choices) {
      const tail = search(active.filter(t => t.id !== a.id && t.id !== b.id));
      if (tail) return [[a.id, b.id], ...tail];
      if (visits > 12000) return null;
    }
    failed.add(key);
    return null;
  }
  return search(input);
}
export function createGame(layout: LayoutId, random = Math.random): Game {
  const places = positions(layout);
  const plan = removalPlan(places, random);
  if (!plan) throw new Error('Die Startstellung konnte nicht erzeugt werden.');
  const faces = shuffled(Array.from({ length: places.length / 2 }, (_, i) => i % 36), random);
  const assigned = new Map<number, number>();
  plan.forEach((pair, i) => pair.forEach(id => assigned.set(id, faces[i])));
  return { version: 1, layout, tiles: places.map(p => ({ ...p, face: assigned.get(p.id)! })), initialFaces: places.map(p => assigned.get(p.id)!), removed: [], history: [], started: Date.now() };
}
export function removePair(game: Game, a: number, b: number): boolean {
  const active = activeTiles(game);
  const first = active.find(t => t.id === a), second = active.find(t => t.id === b);
  if (!first || !second || a === b || first.face !== second.face || !isFree(first, active) || !isFree(second, active)) return false;
  game.history.push([a, b]);
  game.removed.push(a, b);
  return true;
}
export function undo(game: Game): boolean {
  const pair = game.history.pop();
  if (!pair) return false;
  game.removed = game.removed.filter(id => !pair.includes(id));
  return true;
}
export function reset(game: Game): void {
  game.tiles.forEach((tile, i) => { tile.face = game.initialFaces[i]; });
  game.removed = [];
  game.history = [];
  game.started = Date.now();
}
export function validSavedGame(value: unknown): value is Game {
  if (!value || typeof value !== 'object') return false;
  const g = value as Game;
  if (g.version !== 1 || !layouts.some(l => l.id === g.layout) || !Array.isArray(g.tiles) || !Array.isArray(g.removed) || !Array.isArray(g.history) || !Number.isFinite(g.started)) return false;
  const expected = positions(g.layout);
  if (g.tiles.length !== expected.length || !Array.isArray(g.initialFaces) || g.initialFaces.length !== expected.length || !g.initialFaces.every(f => Number.isInteger(f) && f >= 0 && f < 36)) return false;
  if (!g.tiles.every((t, i) => t && t.id === i && t.x === expected[i].x && t.y === expected[i].y && t.z === expected[i].z && Number.isInteger(t.face) && t.face >= 0 && t.face < 36)) return false;
  const ids = new Set(g.removed);
  if (ids.size !== g.removed.length || g.removed.length % 2 || !g.removed.every(id => Number.isInteger(id) && id >= 0 && id < g.tiles.length)) return false;
  const historyIds = g.history.flat();
  if (new Set(historyIds).size !== historyIds.length || !g.history.every(p => Array.isArray(p) && p.length === 2 && p[0] !== p[1] && p.every(id => ids.has(id)) && g.tiles[p[0]].face === g.tiles[p[1]].face)) return false;
  const counts = new Map<number, number>();
  activeTiles(g).forEach(t => counts.set(t.face, (counts.get(t.face) ?? 0) + 1));
  return [...counts.values()].every(c => c % 2 === 0);
}
