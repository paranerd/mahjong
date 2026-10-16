import './style.scss';
import { activeTiles, createGame, difficulties, isFree, layouts, matches, removePair, reshuffle, reset, undo, validSavedGame, type DifficultyId, type Game, type LayoutId } from './game';
import { faceLabel, faceSVG, icon } from './faces';
import { arcadeCosts, arcadeCrystals, arcadeMaximum, arcadeScore, canAfford, crystalTargets, newArcadeProfile, newArcadeRound, payForAction, rewardArcadeWin, validArcadeProfile, type ArcadeAction } from './arcade';
import pandaUrl from './assets/panda.png';
import pandaWinkUrl from './assets/panda-wink.png';
import pandaLaughUrl from './assets/panda-laugh.png';
import pandaSurprisedUrl from './assets/panda-surprised.png';

const pandaExpressions = [
  { name: 'wink', url: pandaWinkUrl },
  { name: 'laugh', url: pandaLaughUrl },
  { name: 'surprised', url: pandaSurprisedUrl },
];
for (const expression of pandaExpressions) { const preload = new Image(); preload.src = expression.url; }

const SAVE_KEY = 'mahjong.game.v1';
const THEME_KEY = 'mahjong.theme.v1';
const HIGHLIGHT_KEY = 'mahjong.highlight-free.v1';
let game: Game;
let storageAvailable = true;
let profile = newArcadeProfile();
let arcadeEnabled = false;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
  game = validSavedGame(saved) ? saved : createGame('turtle');
  if (validArcadeProfile(saved?.arcadeProfile)) profile = saved.arcadeProfile;
  arcadeEnabled = saved?.arcadeEnabled === true;
} catch { game = createGame('turtle'); }
let selected: number | null = null;
let hinted: number[] = [];
let hintIndex = 0;
let zoomScale = 1;
let pan = { x: 0, y: 0 };
let busy = false;
let chosenLayout: LayoutId = game.layout;
let chosenDifficulty: DifficultyId = game.difficulty ?? 'hard';
let pendingAction: 'shuffle' | 'reset' | null = null;
let highlightFree = false;
try { highlightFree = localStorage.getItem(HIGHLIGHT_KEY) === 'true'; } catch { /* Optional preference. */ }
let theme = 'dark';
try { theme = localStorage.getItem(THEME_KEY) ?? 'dark'; } catch { /* Storage is optional. */ }
if (!['dark', 'light', 'system'].includes(theme)) theme = 'dark';

const app = document.querySelector<HTMLDivElement>('#app')!;
const crystalSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path class="crystal-body" d="M7 3h10l5 6-10 13L2 9Z"/><path d="m7 3 5 19 5-19M2 9h20M7 3l5 6 5-6"/></svg>`;
app.innerHTML = `
  <main class="table${game.arcade ? ' arcade' : ''}" aria-label="Mahjong Solitaire">
    <div class="hud">
    <div class="round-info"><span class="eyebrow" id="layout-name"></span><div class="remaining"><span id="remaining">72</span><span class="remaining-label">PAARE ÜBRIG</span></div></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
    <section class="arcade-panel" id="arcade-panel" aria-label="Arcade-Fortschritt" hidden>
      <div class="arcade-summary"><span class="level-badge">LEVEL <strong id="arcade-level">1</strong></span><span class="arcade-score"><strong id="arcade-score">0</strong><span> PUNKTE</span></span><span class="crystal-wallet" aria-label="Kristallguthaben">${crystalSVG}<strong id="arcade-balance">5</strong></span></div>
      <div class="score-track" id="score-track" role="progressbar" aria-label="Punkte bis zu drei Kristallen" aria-valuemin="0" aria-valuemax="7200" aria-valuenow="0"><div class="score-fill" id="score-fill"></div>${crystalTargets.map((target, i) => `<span class="crystal-milestone" data-crystal="${i}" style="--target:${target * 100}%">${crystalSVG}<span class="crystal-target"></span></span>`).join('')}</div>
    </section>
    <div class="corner-actions"><button class="icon-button" id="open-new-game" aria-label="Neues Spiel" title="Neues Spiel">${icon('plus')}</button><button class="icon-button" id="menu" aria-label="Einstellungen und Anleitung" title="Einstellungen und Anleitung">${icon('settings')}</button></div>
    </div>
    <button class="arcade-panda" id="arcade-panda" type="button" aria-label="Panda kitzeln" title="Panda kitzeln" data-expression="default" hidden><img id="panda-face" src="${pandaUrl}" alt="" width="256" height="232" draggable="false"></button>
    <div class="arena" id="arena"><div class="board" id="board" role="group" aria-label="Spielfeld"></div></div>
    <div class="board-message" id="board-message" hidden><span>Kein freies Paar</span><p>Mische die Steine oder gehe einen Zug zurück.</p></div>
    <nav class="tools" aria-label="Spielaktionen">
      <button id="undo" title="Rückgängig (Strg/⌘ + Z)">${icon('undo')}<span>Zurück</span></button>
      <span class="tool-divider"></span>
      <button id="hint" title="Hinweis (H)">${icon('hint')}<span>Hinweis</span></button>
      <span class="tool-divider"></span>
      <button id="shuffle" title="Steine mischen (M)">${icon('shuffle')}<span>Mischen</span></button>
      <span class="tool-divider"></span>
      <button id="reset" title="Runde zurücksetzen (R)">${icon('reset')}<span>Reset</span></button>
    </nav>
    <div class="sr-only" id="announcer" aria-live="polite" aria-atomic="true"></div>
  </main>
  <dialog id="new-game-dialog" aria-labelledby="new-game-title">
    <header class="dialog-header">
    <div class="dialog-top"><span class="eyebrow">EIN NEUER ANFANG</span><button class="icon-button close-dialog" aria-label="Neues Spiel schließen">${icon('close')}</button></div>
    <h1 id="new-game-title">Neues Spiel<span class="title-dot">.</span></h1>
    <p class="dialog-intro">Dein Spielfeld. Dein Tempo.</p>
    </header>
    <div class="dialog-content" tabindex="0" role="region" aria-label="Spieloptionen">
    <p class="new-game-mode" id="new-game-mode" hidden></p>
    <div class="layout-options" role="group" aria-label="Spielfeld wählen">${layouts.map(l => `<button class="layout-option" data-layout="${l.id}" aria-pressed="${l.id === game.layout}"><span class="layout-preview" data-preview="${l.id}" aria-hidden="true"></span><span><strong>${l.name}</strong><small>${l.description}</small></span><span class="layout-check">${icon('check')}</span></button>`).join('')}</div>
    <div class="difficulty-options" role="group" aria-label="Schwierigkeit wählen">${difficulties.map(d => `<button data-difficulty="${d.id}" aria-pressed="${d.id === chosenDifficulty}"><strong>${d.name}</strong><small>${d.count} Steine</small></button>`).join('')}</div>
    </div>
    <footer class="dialog-footer"><button class="primary-button" id="new-game">${icon('plus')}Spiel starten</button></footer>
  </dialog>
  <dialog id="settings" aria-labelledby="settings-title">
    <header class="dialog-header">
    <div class="dialog-top"><span class="eyebrow">EIN RUHIGER MOMENT</span><button class="icon-button close-dialog" aria-label="Einstellungen schließen">${icon('close')}</button></div>
    <h1 id="settings-title">Einstellungen<span class="title-dot">.</span></h1>
    <p class="dialog-intro">Mach es dir angenehm.</p>
    </header>
    <div class="dialog-content" tabindex="0" role="region" aria-label="Einstellungsinhalt">
    <div class="settings-row"><span>Darstellung</span><div class="theme-options" role="group" aria-label="Darstellung"><button data-theme="light" aria-label="Hell" title="Hell">${icon('sun')}</button><button data-theme="dark" aria-label="Dunkel" title="Dunkel">${icon('moon')}</button><button data-theme="system" aria-label="Wie das Gerät" title="Wie das Gerät"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg></button></div></div>
    <label class="settings-row highlight-setting"><span>Freie Steine hervorheben</span><input type="checkbox" id="highlight-free" role="switch"><span class="switch-track" aria-hidden="true"></span></label>
    <label class="settings-row highlight-setting arcade-setting"><span>Arcade-Modus<small id="arcade-setting-note">Gilt ab dem nächsten neuen Spiel.</small></span><input type="checkbox" id="arcade-enabled" role="switch" aria-describedby="arcade-setting-note"><span class="switch-track" aria-hidden="true"></span></label>
    <div class="arcade-rules" id="arcade-rules" hidden><strong>Arcade: Punkte & Kristalle</strong><p>100 Punkte pro Paar. Drei Kristalle warten bei 50 %, 75 % und 100 % der möglichen Punkte. Hinweise kosten 1 Kristall und 100 Punkte, Mischen 2 Kristalle und 300 Punkte. Zurück kostet 1 Kristall und nimmt die Punkte des Paares zurück. Kein Zeitlimit.</p><p>Jede gewonnene Arcade-Runde bringt ein Level und die erreichten Kristalle. Start: Level 1 und einmalig 5 Kristalle. Ohne Guthaben sind Hilfen gesperrt; Reset bleibt kostenlos. Ein Reset setzt die Rundenpunkte zurück, erstattet keine Kristalle und ermöglicht keine erneute Belohnung derselben Runde. Fortschritt wird auf diesem Gerät gespeichert. Classic bleibt kostenlos.</p></div>
    <details><summary>So wird gespielt</summary><p>Entferne zwei gleiche Steine. Ein Stein ist frei, wenn kein anderer auf ihm liegt und seine linke oder rechte Seite offen ist.</p><p>Alle Startstellungen sind lösbar. Deine Zugwahl kann Wege versperren. „Mischen“ verteilt die übrigen Steine neu und lösbar; dabei wird der Zugverlauf gelöscht. „Reset“ stellt die ursprüngliche Startstellung dieser Runde wieder her. Beide Aktionen fragen vorher nach.</p><p>Im Hochformat dreht sich die Anordnung. Die Reihen verlaufen dann senkrecht: Oben oder unten muss frei sein. In den Einstellungen kannst du freie Steine hervorheben lassen.</p><p>Vergrößern: Ziehe auf dem Spielfeld zwei Finger auseinander. Danach kannst du das Feld mit einem Finger verschieben. Auf dem Trackpad funktioniert die Zoomgeste ebenfalls. Tastatur: Pfeiltasten und Enter, H für Hinweis, M für Mischen, R für Reset, +/− für Zoom und 0 für die Gesamtansicht, Strg/⌘ + Z für Zurück.</p></details>
    </div>
    <footer class="dialog-footer" id="install-footer" hidden><button class="text-button" id="install">${icon('download')} App installieren</button></footer>
  </dialog>
  <dialog id="confirm-action" aria-labelledby="confirm-title" aria-describedby="confirm-description">
    <header class="dialog-header">
    <span class="confirmation-icon" aria-hidden="true"></span>
    <h1 id="confirm-title"></h1>
    </header>
    <div class="dialog-content" tabindex="0" role="region" aria-label="Bestätigungstext"><p id="confirm-description"></p></div>
    <footer class="dialog-footer confirmation-actions"><button class="secondary-button" id="cancel-action" autofocus>Abbrechen</button><button class="primary-button" id="accept-action"></button></footer>
  </dialog>
  <dialog id="victory" aria-labelledby="victory-title">
    <header class="dialog-header"><div class="victory-mark" aria-hidden="true">${faceSVG(34)}</div><span class="eyebrow">ALLE STEINE, EIN MOMENT RUHE</span><h1 id="victory-title">Schön gelöst<span class="title-dot">.</span></h1></header>
    <div class="dialog-content" tabindex="0" role="region" aria-label="Spielergebnis"><p class="classic-victory-copy">Das Feld ist frei. Der Kopf vielleicht auch.</p><div class="arcade-victory" id="arcade-victory" hidden><div class="victory-crystals" aria-hidden="true">${crystalTargets.map((_, i) => `<span style="--i:${i}">${crystalSVG}</span>`).join('')}</div><p id="arcade-reward-copy"></p><div class="level-up" id="level-up"><span>LEVEL GESCHAFFT</span><div><span id="previous-level">1</span><span class="level-arrow" aria-hidden="true">→</span><strong id="next-level">2</strong></div></div></div></div>
    <footer class="dialog-footer"><button class="primary-button" id="play-again">Noch eine Runde</button></footer>
  </dialog>
`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const board = $('#board'), arena = $('#arena');
const settings = $<HTMLDialogElement>('#settings'), victory = $<HTMLDialogElement>('#victory');
const confirmation = $<HTMLDialogElement>('#confirm-action');
const newGameDialog = $<HTMLDialogElement>('#new-game-dialog');
let tileElements = new Map<number, HTMLButtonElement>();
let renderedGame: Game | null = null;
let toastTimer: ReturnType<typeof setTimeout>;
let hintTimer: ReturnType<typeof setTimeout>;
let pandaTimer: ReturnType<typeof setTimeout>;
let lastPandaExpression = -1;

function resetPanda() {
  clearTimeout(pandaTimer);
  $<HTMLImageElement>('#panda-face').src = pandaUrl;
  $('#arcade-panda').dataset.expression = 'default';
  $('#arcade-panda').classList.remove('reacting', 'celebrating');
}
function reactPanda(matched = false) {
  if (!game.arcade) return;
  const choices = pandaExpressions.map((_, i) => i).filter(i => i !== lastPandaExpression);
  lastPandaExpression = choices[Math.floor(Math.random() * choices.length)];
  const expression = pandaExpressions[lastPandaExpression];
  const panda = $('#arcade-panda');
  clearTimeout(pandaTimer);
  $<HTMLImageElement>('#panda-face').src = expression.url;
  panda.dataset.expression = expression.name;
  panda.classList.remove('reacting', 'celebrating'); void panda.offsetWidth;
  panda.classList.add('reacting');
  panda.classList.toggle('celebrating', matched);
  pandaTimer = setTimeout(resetPanda, 1600);
}
$('#arcade-panda').addEventListener('click', () => reactPanda());

function showVictory() {
  // A modal dialog sits above every z-index. Move the same Panda into its
  // top layer so its current reaction and click handler remain intact.
  if (game.arcade) $('#victory .dialog-header').prepend($('#arcade-panda'));
  victory.showModal();
}
victory.addEventListener('close', () => {
  if (!victory.open) $('.table').append($('#arcade-panda'));
});

function toast(message: string, duration = 4000) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), duration);
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...game, arcadeProfile: profile, arcadeEnabled })); }
  catch {
    if (storageAvailable) toast('Automatisches Speichern ist in diesem Browser gerade nicht verfügbar.');
    storageAvailable = false;
  }
}
const systemTheme = matchMedia('(prefers-color-scheme: light)');
function applyTheme() {
  document.documentElement.dataset.theme = theme === 'system' ? (systemTheme.matches ? 'light' : 'dark') : theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', document.documentElement.dataset.theme === 'light' ? '#e5e8dd' : '#123b35');
  document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === theme)));
}
systemTheme.addEventListener('change', applyTheme);
applyTheme();
$<HTMLInputElement>('#arcade-enabled').checked = arcadeEnabled;
$('#arcade-rules').hidden = !arcadeEnabled;
$<HTMLInputElement>('#arcade-enabled').addEventListener('change', e => {
  arcadeEnabled = (e.target as HTMLInputElement).checked;
  $('#arcade-rules').hidden = !arcadeEnabled;
  persist();
  $('#arcade-setting-note').textContent = `Ab dem nächsten neuen Spiel: ${arcadeEnabled ? 'Arcade' : 'Classic'}.`;
});
$<HTMLInputElement>('#highlight-free').checked = highlightFree;
$<HTMLInputElement>('#highlight-free').addEventListener('change', e => {
  highlightFree = (e.target as HTMLInputElement).checked;
  try { localStorage.setItem(HIGHLIGHT_KEY, String(highlightFree)); } catch { /* Optional preference. */ }
  renderState();
});

function buildBoard(animate = true) {
  // Apply the mode before measuring the board, including restored Arcade rounds.
  $('.table').classList.toggle('arcade', !!game.arcade);
  $('#arcade-panel').hidden = !game.arcade;
  board.replaceChildren();
  tileElements = new Map();
  const removed = new Set(game.removed);
  for (const tile of game.tiles) {
    if (removed.has(tile.id)) continue;
    const el = document.createElement('button');
    el.className = `tile${animate ? ' entering' : ''}`;
    el.dataset.id = String(tile.id);
    el.dataset.level = String(tile.z);
    el.innerHTML = `<span class="tile-face">${faceSVG(tile.face)}</span>`;
    el.style.setProperty('--delay', `${Math.min(tile.id * 3, 380)}ms`);
    el.addEventListener('click', () => chooseTile(tile.id));
    el.addEventListener('keydown', e => navigateTiles(e, tile.id));
    tileElements.set(tile.id, el);
    board.append(el);
  }
  layoutBoard();
  renderState();
  if (animate) setTimeout(() => tileElements.forEach(el => el.classList.remove('entering')), 1100);
}
function layoutBoard() {
  if (game.arcade) arena.style.top = `${$('.hud').getBoundingClientRect().bottom + 20}px`;
  else arena.style.removeProperty('top');
  const rect = arena.getBoundingClientRect();
  const portrait = window.innerHeight > window.innerWidth;
  const maxX = Math.max(...game.tiles.map(t => t.x));
  const minX = Math.min(...game.tiles.map(t => t.x));
  const maxY = Math.max(...game.tiles.map(t => t.y));
  const minY = Math.min(...game.tiles.map(t => t.y));
  const ratio = portrait && window.innerHeight < 650 ? 1.16 : 1.34;
  const columns = (portrait ? maxY - minY : maxX - minX) + 1;
  const rows = (portrait ? maxX - minX : maxY - minY) + 1;
  const maxLevel = Math.max(...game.tiles.map(t => t.z));
  const depthRatio = .16;
  const width = Math.min((rect.width - 20) / (columns + maxLevel * depthRatio), (rect.height - 20) / (rows * ratio + maxLevel * depthRatio), 66);
  const height = width * ratio;
  const depth = width * depthRatio;
  board.style.width = `${columns * width + depth * maxLevel}px`;
  board.style.height = `${rows * height + depth * maxLevel}px`;
  board.style.setProperty('--tile-width', `${width}px`);
  board.style.setProperty('--tile-height', `${height}px`);
  for (const tile of game.tiles) {
    const el = tileElements.get(tile.id);
    if (!el) continue;
    const x = (portrait ? maxY - tile.y : tile.x - minX) * width + tile.z * depth;
    const y = (portrait ? tile.x - minX : tile.y - minY) * height + (maxLevel - tile.z) * depth;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.zIndex = String(tile.z * 1000 + Math.round(y) * 2 + Math.round(x / 100));
  }
  clampPan();
  applyZoom();
}
function renderState() {
  const active = activeTiles(game), pairs = matches(game);
  const justRewarded = rewardArcadeWin(game, profile);
  renderArcade(justRewarded);
  $('#remaining').textContent = String(active.length / 2);
  $('#layout-name').textContent = layouts.find(l => l.id === game.layout)!.name;
  const free = active.filter(t => isFree(t, active));
  const focusId = free.find(t => t.id === selected)?.id ?? free[0]?.id;
  for (const t of active) {
    const el = tileElements.get(t.id);
    if (!el) continue;
    const available = isFree(t, active);
    el.classList.toggle('blocked', !available);
    el.classList.toggle('dimmed', highlightFree && !available);
    el.classList.toggle('selected', selected === t.id);
    el.classList.toggle('hinted', hinted.includes(t.id));
    el.setAttribute('aria-label', `${faceLabel(t.face)}, Ebene ${t.z + 1}, ${available ? 'frei' : 'blockiert'}`);
    el.setAttribute('aria-disabled', String(!available));
    el.setAttribute('aria-pressed', String(selected === t.id));
    el.tabIndex = t.id === focusId ? 0 : -1;
  }
  $<HTMLButtonElement>('#menu').disabled = busy;
  $<HTMLButtonElement>('#open-new-game').disabled = busy;
  $<HTMLButtonElement>('#undo').disabled = busy || !game.history.length || !affordable('undo');
  $<HTMLButtonElement>('#hint').disabled = busy || !pairs.length || !affordable('hint');
  $<HTMLButtonElement>('#reset').disabled = busy || !canReset();
  $<HTMLButtonElement>('#shuffle').disabled = busy || active.length < 2 || !affordable('shuffle');
  $('#board-message').hidden = active.length === 0 || pairs.length > 0;
  $('#announcer').textContent = `${active.length / 2} Paare übrig. ${pairs.length ? `${pairs.length} freie Kombinationen.` : active.length ? 'Kein freies Paar. Nutze Mischen, Zurück oder Reset.' : 'Geschafft!'}`;
  persist();
}
function affordable(action: ArcadeAction) { return !game.arcade || canAfford(profile, action); }
function renderArcade(justRewarded = false) {
  const enabled = !!game.arcade;
  const roundChanged = renderedGame !== game;
  renderedGame = game;
  if (roundChanged) resetPanda();
  $('#arcade-panel').hidden = !enabled;
  $('#arcade-panda').hidden = !enabled;
  $('#arcade-victory').hidden = !enabled;
  victory.classList.toggle('arcade-result', enabled);
  for (const action of ['undo', 'hint', 'shuffle'] as const) {
    const button = $<HTMLButtonElement>(`#${action}`);
    button.dataset.classicTitle ??= button.title;
    button.title = enabled
      ? `${button.dataset.classicTitle} · ${arcadeCosts[action]} ${arcadeCosts[action] === 1 ? 'Kristall' : 'Kristalle'}${affordable(action) ? '' : ' · Nicht genug Kristalle'}`
      : button.dataset.classicTitle;
    let badge = button.querySelector<HTMLElement>('.action-cost');
    if (enabled && !badge) {
      badge = document.createElement('small'); badge.className = 'action-cost';
      badge.innerHTML = `${crystalSVG}${arcadeCosts[action]}`;
      button.append(badge);
    } else if (!enabled) badge?.remove();
  }
  if (!enabled) return;
  const score = arcadeScore(game), maximum = arcadeMaximum(game), earned = arcadeCrystals(game);
  $('#arcade-level').textContent = String(profile.level);
  $('#arcade-balance').textContent = String(profile.crystals);
  $('#arcade-score').textContent = score.toLocaleString('de-DE');
  $('#score-fill').style.width = `${score / maximum * 100}%`;
  $('#score-track').setAttribute('aria-valuemax', String(maximum));
  $('#score-track').setAttribute('aria-valuenow', String(score));
  $('#score-track').setAttribute('aria-valuetext', `${score} von ${maximum} Punkten. ${earned} von 3 Kristallen.`);
  document.querySelectorAll<HTMLElement>('[data-crystal]').forEach((el, i) => {
    const reached = i < earned, wasReached = el.classList.contains('reached');
    el.classList.toggle('reached', reached);
    el.querySelector('.crystal-target')!.textContent = Math.ceil(maximum * crystalTargets[i]).toLocaleString('de-DE');
    if (reached && !wasReached && !roundChanged) {
      el.classList.remove('crystal-flash'); void el.offsetWidth; el.classList.add('crystal-flash');
    } else if (!reached) el.classList.remove('crystal-flash');
  });
  const reward = game.arcade!.reward;
  if (reward) {
    document.querySelectorAll('#arcade-victory .victory-crystals > span').forEach((el, i) => el.classList.toggle('reached', i < earned));
    $('#previous-level').textContent = String(reward.level - 1);
    $('#next-level').textContent = String(reward.level);
    // Preserve the result through the final pair animation, without replaying it on a rematch.
    if (justRewarded) victory.dataset.freshReward = 'true';
    $('#level-up').hidden = victory.dataset.freshReward !== 'true';
    $('#arcade-reward-copy').textContent = victory.dataset.freshReward === 'true'
      ? `${score.toLocaleString('de-DE')} Punkte · ${reward.crystals} ${reward.crystals === 1 ? 'Kristall' : 'Kristalle'} gewonnen!`
      : `${score.toLocaleString('de-DE')} Punkte · Diese Runde wurde bereits belohnt.`;
  }
}
function clearSelection() { selected = null; hinted = []; clearTimeout(hintTimer); }
async function animateMatch(pair: number[]) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sources = pair.map(id => ({ el: tileElements.get(id)!, id }));
  const layer = document.createElement('div');
  layer.className = 'match-effect';
  layer.setAttribute('aria-hidden', 'true');
  const animations: Promise<unknown>[] = [];
  const centerX = window.innerWidth / 2, centerY = window.innerHeight / 2;
  const targetWidth = Math.min(72, window.innerWidth * .15);
  sources.sort((a, b) => a.el.getBoundingClientRect().left - b.el.getBoundingClientRect().left);
  sources.forEach(({ el, id }, index) => {
    const rect = el.getBoundingClientRect();
    if (!reducedMotion) {
      const clone = document.createElement('div');
      clone.className = 'match-tile';
      clone.innerHTML = el.innerHTML;
      Object.assign(clone.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: getComputedStyle(el).borderRadius });
      layer.append(clone);
      const side = index === 0 ? -1 : 1;
      const scale = targetWidth / rect.width;
      const move = (offset: number, lift: number, angle: number, stretchX = 1, stretchY = 1) =>
        `translate(${centerX + side * targetWidth * offset - rect.left - rect.width / 2}px, ${centerY + lift - rect.top - rect.height / 2}px) rotate(${side * angle}deg) scale(${scale * stretchX}, ${scale * stretchY})`;
      animations.push(clone.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0, easing: 'cubic-bezier(.2,.7,.2,1)' },
        { transform: move(1.12, -12, 9), opacity: 1, offset: .38, easing: 'cubic-bezier(.65,0,1,.65)' },
        { transform: move(.47, 0, 0, .91, 1.05), opacity: 1, offset: .6 },
        { transform: move(.47, 0, 0, .91, 1.05), opacity: 0, offset: .6001 },
        { transform: move(.47, 0, 0, .91, 1.05), opacity: 0, offset: 1 },
      ], { duration: 780, easing: 'linear', fill: 'forwards' }).finished.catch(() => {}));
      // At the first impact, replace each intact tile with cropped pieces of
      // the same face. Every piece travels outwards; nothing returns inward.
      const shardWidth = targetWidth * .91;
      const shardHeight = rect.height * scale * 1.05;
      for (let row = 0; row < 4; row++) for (let column = 0; column < 3; column++) {
        const shard = document.createElement('div');
        shard.className = 'match-shard';
        shard.innerHTML = el.innerHTML;
        const left = column * 100 / 3, right = (column + 1) * 100 / 3;
        const top = row * 25, bottom = (row + 1) * 25;
        Object.assign(shard.style, {
          left: `${centerX + side * targetWidth * .47 - shardWidth / 2}px`,
          top: `${centerY - shardHeight / 2}px`,
          width: `${shardWidth}px`, height: `${shardHeight}px`,
          borderRadius: `${parseFloat(getComputedStyle(el).borderRadius) * scale}px`,
          clipPath: `polygon(${left}% ${top}%, ${right}% ${top}%, ${right}% ${bottom}%, ${left}% ${bottom}%)`,
          transformOrigin: `${(left + right) / 2}% ${(top + bottom) / 2}%`,
        });
        layer.append(shard);
        const outward = side * (28 + (side < 0 ? 2 - column : column) * 20 + row * 3);
        const vertical = (row - 1.5) * 24;
        const spin = side * (12 + row * 9 + column * 6);
        animations.push(shard.animate([
          { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1, offset: 0 },
          { transform: `translate(${outward * .5}px, ${vertical * .5 - 6}px) rotate(${spin * .4}deg) scale(.98)`, opacity: 1, offset: .35 },
          { transform: `translate(${outward * .82}px, ${vertical * .82 + 6}px) rotate(${spin * .75}deg) scale(.76)`, opacity: .9, offset: .7 },
          { transform: `translate(${outward}px, ${vertical + 20}px) rotate(${spin}deg) scale(.3)`, opacity: 0, offset: 1 },
        ], { delay: 468, duration: 340, easing: 'linear', fill: 'forwards' }).finished.catch(() => {}));
      }

    }
    el.remove(); tileElements.delete(id);
  });
  if (reducedMotion) return;
  const burst = document.createElement('div');
  burst.className = 'match-burst';
  burst.style.left = `${centerX}px`; burst.style.top = `${centerY}px`;
  burst.innerHTML = `<span class="impact-ring"></span>${Array.from({ length: 10 }, (_, i) => `<i style="--angle:${i * 36}deg;--distance:${i % 2 ? 61 : 88}px"></i>`).join('')}`;
  layer.append(burst);
  $('.table').append(layer);
  try { await Promise.all(animations); } finally { layer.remove(); }
}

async function chooseTile(id: number) {
  if (busy || performance.now() < suppressClickUntil) return;
  const active = activeTiles(game), tile = active.find(t => t.id === id);
  if (!tile) return;
  if (!isFree(tile, active)) {
    const el = tileElements.get(id)!;
    el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
    toast('Dieser Stein ist noch blockiert.', 2200);
    return;
  }
  hinted = [];
  if (selected === id) selected = null;
  else if (selected !== null && removePair(game, selected, id)) {
    reactPanda(true);
    const pair = [selected, id];
    const hadFocus = pair.some(i => tileElements.get(i) === document.activeElement);
    clearSelection();
    busy = true;
    const animation = animateMatch(pair);
    renderState();
    await animation;
    busy = false;
    renderState();
    if (hadFocus) board.querySelector<HTMLButtonElement>('.tile[tabindex="0"]')?.focus({ preventScroll: true });
    if (!activeTiles(game).length && !victory.open) showVictory();
    return;
  } else selected = id;
  renderState();
}
function navigateTiles(e: KeyboardEvent, id: number) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const current = tileElements.get(id)!.getBoundingClientRect();
  const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
  const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
  const active = activeTiles(game);
  const next = active.filter(t => t.id !== id && isFree(t, active)).map(t => {
    const r = tileElements.get(t.id)!.getBoundingClientRect();
    const x = r.x - current.x, y = r.y - current.y;
    return { id: t.id, forward: x * dx + y * dy, score: Math.hypot(x, y) + Math.abs(x * dy - y * dx) * 2 };
  }).filter(t => t.forward > 2).sort((a, b) => a.score - b.score)[0];
  if (next) {
    tileElements.forEach((el, i) => { el.tabIndex = i === next.id ? 0 : -1; });
    tileElements.get(next.id)!.focus({ preventScroll: true });
  }
}
function undoMove() {
  if (busy || !affordable('undo')) return;
  const restored = [...(game.history.at(-1) ?? [])];
  if (!undo(game)) return;
  payForAction(game, profile, 'undo');
  delete victory.dataset.freshReward;
  clearSelection(); buildBoard(false);
  restored.forEach(id => {
    const el = tileElements.get(id)!;
    el.style.setProperty('--delay', '0ms'); el.classList.add('entering');
    setTimeout(() => el.classList.remove('entering'), 650);
  });
}
function showHint() {
  if (busy || !affordable('hint')) return;
  const pairs = matches(game);
  if (!pairs.length) return;
  payForAction(game, profile, 'hint');
  selected = null;
  hinted = pairs[hintIndex++ % pairs.length].map(t => t.id);
  renderState();
  toast('Diese beiden Steine passen zusammen.', 2400);
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { hinted = []; renderState(); }, 4000);
}
function canReset() { return game.removed.length > 0 || (game.arcade?.penalty ?? 0) > 0 || game.tiles.some(t => t.face !== game.initialFaces[t.id]); }
function resetRound() {
  if (busy || !canReset()) return;
  reset(game);
  delete victory.dataset.freshReward;
  clearSelection(); resetView(); buildBoard();
  toast('Zurück am Anfang. Gleiche Steine, neue Chance.');
}
function requestAction(action: 'shuffle' | 'reset') {
  if (busy || confirmation.open || settings.open || newGameDialog.open || victory.open) return;
  if (action === 'reset' ? !canReset() : activeTiles(game).length < 2) return;
  if (action === 'shuffle' && !affordable('shuffle')) return;
  pendingAction = action;
  $('#confirm-title').textContent = action === 'shuffle' ? 'Neu mischen?' : 'Runde zurücksetzen?';
  $('#confirm-description').textContent = action === 'shuffle'
    ? 'Die übrigen Steine werden neu verteilt. Entfernte Steine bleiben entfernt. Der Verlauf für „Zurück“ wird gelöscht.'
    : 'Alle Steine kehren in ihre ursprüngliche Startstellung zurück. Dein Fortschritt und der Zugverlauf werden gelöscht.';
  if (game.arcade) $('#confirm-description').textContent += action === 'shuffle'
    ? ' Kostet 2 Kristalle und 300 Punkte – nur bei erfolgreichem Mischen.'
    : ' Deine Rundenpunkte werden zurückgesetzt. Ausgegebene Kristalle werden nicht erstattet. Eine bereits belohnte Runde bringt keine weitere Belohnung.';
  $('#accept-action').textContent = action === 'shuffle' ? 'Mischen' : 'Zurücksetzen';
  $('.confirmation-icon').innerHTML = icon(action === 'shuffle' ? 'shuffle' : 'reset');
  confirmation.showModal();
  $('#cancel-action').focus();
}
$('#cancel-action').addEventListener('click', () => confirmation.close());
confirmation.addEventListener('close', () => { pendingAction = null; });
$('#accept-action').addEventListener('click', () => {
  const action = pendingAction;
  confirmation.close();
  if (action === 'reset') resetRound();
  else if (action === 'shuffle') void shuffleRound();
});
async function shuffleRound() {
  if (busy || !affordable('shuffle')) return;
  busy = true; clearSelection(); renderState();
  const before = activeTiles(game).map(t => ({ id: t.id, face: t.face }));
  const success = reshuffle(game);
  if (success) { payForAction(game, profile, 'shuffle'); persist(); }
  if (success && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const destinations = new Map<number, { x: number; y: number }[]>();
    for (const t of activeTiles(game)) {
      const el = tileElements.get(t.id)!;
      const points = destinations.get(t.face) ?? [];
      points.push({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) });
      destinations.set(t.face, points);
    }
    await Promise.all(before.map((t, i) => {
      const el = tileElements.get(t.id)!, target = destinations.get(t.face)!.pop()!;
      const x = target.x - parseFloat(el.style.left), y = target.y - parseFloat(el.style.top);
      el.style.zIndex = String(10000 + i);
      return el.animate([
        { transform: 'translate(0, 0)' },
        { transform: `translate(${x * .5}px, ${y * .5 - 12}px) rotate(${i % 2 ? 4 : -4}deg)` },
        { transform: `translate(${x}px, ${y}px)` },
      ], { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished.catch(() => {});
    }));
  }
  buildBoard(false); busy = false; renderState();
  toast(success ? 'Neu gemischt. Die übrigen Steine sind lösbar.' : 'Diese Anordnung lässt sich nicht mischen. Gehe einen Zug zurück.');
}
$('#undo').addEventListener('click', undoMove);
$('#hint').addEventListener('click', showHint);
$('#reset').addEventListener('click', () => requestAction('reset'));
$('#shuffle').addEventListener('click', () => requestAction('shuffle'));
$('#menu').addEventListener('click', () => settings.showModal());
$('#open-new-game').addEventListener('click', openNewGame);
function openNewGame() {
  chosenLayout = game.layout; chosenDifficulty = game.difficulty ?? 'hard'; updateLayoutChoice();
  $('#new-game-title').innerHTML = `${arcadeEnabled ? `Level ${profile.level}` : 'Neues Spiel'}<span class="title-dot">.</span>`;
  $('#new-game-dialog .dialog-intro').textContent = arcadeEnabled ? 'Finde Paare. Sammle Kristalle. Steig auf.' : 'Dein Spielfeld. Dein Tempo.';
  $('#new-game-mode').hidden = !arcadeEnabled;
  $('#new-game-mode').textContent = 'Arcade Mode';
  newGameDialog.showModal();
}
function updateLayoutChoice() {
  document.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.layout === chosenLayout));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.difficulty === chosenDifficulty)));
  updateLayoutPreviews();
}
document.querySelectorAll<HTMLButtonElement>('[data-layout]').forEach(b => b.addEventListener('click', () => { chosenLayout = b.dataset.layout as LayoutId; updateLayoutChoice(); }));
document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(b => b.addEventListener('click', () => { chosenDifficulty = b.dataset.difficulty as DifficultyId; updateLayoutChoice(); }));
document.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach(b => b.addEventListener('click', () => {
  theme = b.dataset.theme!; applyTheme();
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* Optional preference. */ }
}));
function startGame() {
  clearSelection(); hintIndex = 0; resetView();
  game = createGame(chosenLayout, Math.random, chosenDifficulty);
  if (arcadeEnabled) game.arcade = newArcadeRound();
  delete victory.dataset.freshReward;
  newGameDialog.close(); if (victory.open) victory.close();
  buildBoard();
}
$('#new-game').addEventListener('click', startGame);
$('#play-again').addEventListener('click', () => { victory.close(); openNewGame(); });
document.querySelectorAll<HTMLButtonElement>('.close-dialog').forEach(button => button.addEventListener('click', () => button.closest('dialog')!.close()));
settings.addEventListener('close', () => {
  if (!newGameDialog.open && !victory.open && !confirmation.open) $('#menu').focus({ preventScroll: true });
});
newGameDialog.addEventListener('close', () => {
  if (!settings.open && !victory.open && !confirmation.open) $('#open-new-game').focus({ preventScroll: true });
});
for (const dialog of [settings, newGameDialog, victory, confirmation]) dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });

function resetView() { zoomScale = 1; pan = { x: 0, y: 0 }; applyZoom(); }
function clampPan() {
  if (zoomScale <= 1.001) { pan = { x: 0, y: 0 }; return; }
  const maxX = Math.max(0, (board.offsetWidth * zoomScale - arena.clientWidth) / 2 + 26);
  const maxY = Math.max(0, (board.offsetHeight * zoomScale - arena.clientHeight) / 2 + 26);
  pan.x = Math.max(-maxX, Math.min(maxX, pan.x));
  pan.y = Math.max(-maxY, Math.min(maxY, pan.y));
}
function applyZoom() {
  arena.classList.toggle('zoomed', zoomScale > 1.001);
  board.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`;
}
function zoomAt(scale: number, x: number, y: number) {
  const rect = arena.getBoundingClientRect();
  const nextScale = Math.max(1, Math.min(3, scale));
  const relativeX = x - rect.left - rect.width / 2;
  const relativeY = y - rect.top - rect.height / 2;
  const factor = nextScale / zoomScale;
  pan = { x: relativeX - (relativeX - pan.x) * factor, y: relativeY - (relativeY - pan.y) * factor };
  zoomScale = nextScale; clampPan(); applyZoom();
}
const pointers = new Map<number, { x: number; y: number }>();
let suppressClickUntil = 0;
let gestureMoved = false;
let dragStart: { x: number; y: number; px: number; py: number } | null = null;
let pinchStart: { distance: number; scale: number; anchorX: number; anchorY: number } | null = null;
function beginGesture() {
  const points = [...pointers.values()];
  if (points.length >= 2) {
    const [a, b] = points, rect = arena.getBoundingClientRect();
    const x = (a.x + b.x) / 2 - rect.left - rect.width / 2;
    const y = (a.y + b.y) / 2 - rect.top - rect.height / 2;
    pinchStart = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale: zoomScale, anchorX: (x - pan.x) / zoomScale, anchorY: (y - pan.y) / zoomScale };
    gestureMoved = true;
    suppressClickUntil = Infinity;
    for (const id of pointers.keys()) arena.setPointerCapture(id);
  } else if (points.length === 1) {
    dragStart = { ...points[0], px: pan.x, py: pan.y }; pinchStart = null;
  }
}
arena.addEventListener('pointerdown', e => {
  if (e.button !== 0 || busy) return;
  if (!pointers.size) gestureMoved = false;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  beginGesture();
});
arena.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2 && pinchStart) {
    const [a, b] = [...pointers.values()], rect = arena.getBoundingClientRect();
    zoomScale = Math.max(1, Math.min(3, pinchStart.scale * Math.hypot(a.x - b.x, a.y - b.y) / pinchStart.distance));
    pan = { x: (a.x + b.x) / 2 - rect.left - rect.width / 2 - pinchStart.anchorX * zoomScale, y: (a.y + b.y) / 2 - rect.top - rect.height / 2 - pinchStart.anchorY * zoomScale };
    clampPan(); applyZoom();
  } else if (dragStart && zoomScale > 1.001) {
    const dx = e.clientX - dragStart.x, dy = e.clientY - dragStart.y;
    if (Math.hypot(dx, dy) > 6) { gestureMoved = true; suppressClickUntil = Infinity; arena.setPointerCapture(e.pointerId); }
    if (gestureMoved) { pan = { x: dragStart.px + dx, y: dragStart.py + dy }; clampPan(); applyZoom(); }
  }
});
function finishGesture(e: PointerEvent) {
  if (!pointers.delete(e.pointerId)) return;
  if (pointers.size) beginGesture();
  else {
    pinchStart = null; dragStart = null;
    if (gestureMoved) suppressClickUntil = performance.now() + 280;
  }
}
arena.addEventListener('pointerup', finishGesture);
arena.addEventListener('pointercancel', finishGesture);
window.addEventListener('pointerup', finishGesture);
window.addEventListener('pointercancel', finishGesture);
window.addEventListener('blur', () => {
  pointers.clear(); pinchStart = null; dragStart = null;
  suppressClickUntil = performance.now() + 280;
});
arena.addEventListener('lostpointercapture', e => { if (e.target === arena) finishGesture(e); });
arena.addEventListener('wheel', e => {
  if (!e.ctrlKey || busy) return;
  e.preventDefault(); zoomAt(zoomScale * Math.exp(-e.deltaY * .012), e.clientX, e.clientY);
}, { passive: false });
// Safari trackpads emit gesture events instead of Ctrl + wheel.
let safariScale = 1;
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) arena.addEventListener(type, raw => {
  const e = raw as Event & { scale: number; clientX: number; clientY: number };
  e.preventDefault();
  if (busy || pointers.size >= 2) return;
  if (type === 'gesturestart') safariScale = zoomScale;
  else if (type === 'gesturechange') zoomAt(safariScale * e.scale, e.clientX, e.clientY);
}, { passive: false });
// touch-action disables browser double-tap zoom while pointer gestures zoom the board.
$('.table').addEventListener('click', e => {
  if (selected === null || busy || performance.now() < suppressClickUntil) return;
  if ((e.target as Element).closest('button')) return;
  clearSelection();
  renderState();
});
$('.table').addEventListener('dblclick', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (settings.open || newGameDialog.open || victory.open || confirmation.open || e.altKey || (e.target as HTMLElement).matches('input, textarea, select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoMove(); }
  else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'h') showHint();
  else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'r') requestAction('reset');
  else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'm') requestAction('shuffle');
  else if (e.key === 'Escape' || e.key === '0') resetView();
  else if (['+', '=', '-'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const r = arena.getBoundingClientRect();
    zoomAt(zoomScale * (e.key === '-' ? 1 / 1.2 : 1.2), r.left + r.width / 2, r.top + r.height / 2);
  }
});
const boardObserver = new ResizeObserver(layoutBoard);
boardObserver.observe(arena);
boardObserver.observe($('.hud'));
window.addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

// Tiny layout silhouettes are drawn from the same coordinates as the game.
import { positions } from './game';
function updateLayoutPreviews() {
 document.querySelectorAll<HTMLElement>('[data-preview]').forEach(el => {
  const tiles = positions(el.dataset.preview as LayoutId, chosenDifficulty);
  el.innerHTML = `<svg viewBox="0 0 90 65">${tiles.map(t => `<rect x="${t.x * 5.4 + 5 + t.z}" y="${t.y * 6.4 + 5 - t.z}" width="4.8" height="5.8" rx=".8" opacity="${.3 + t.z * .28}" fill="currentColor"/>`).join('')}</svg>`;
 });
}
updateLayoutChoice();
buildBoard();
if (game.arcade && !activeTiles(game).length) showVictory();
if (!game.removed.length) setTimeout(() => toast('Wähle zwei gleiche, freie Steine.', 5500), 1000);

interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let installPrompt: InstallPrompt | null = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); installPrompt = e as InstallPrompt; $('#install-footer').hidden = false;
});
$('#install').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt(); await installPrompt.userChoice;
  installPrompt = null; $('#install-footer').hidden = true;
});
window.addEventListener('appinstalled', () => { $('#install-footer').hidden = true; });
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      await navigator.serviceWorker.ready;
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) toast('Eine neue Version ist bereit und wird beim nächsten Öffnen geladen.', 6000);
        });
      });
    } catch { /* Retry registration on the next visit; keep the interface quiet. */ }
  });
}
