const red = '#ad473c', green = '#276b58', blue = '#344f70';
const numbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function faceLabel(face: number): string {
  if (face < 9) return `${face + 1} Kreise`;
  if (face < 18) return `${face - 8} Bambus`;
  if (face < 27) return `${face - 17} Zeichen`;
  return ['Ostwind', 'Südwind', 'Westwind', 'Nordwind', 'Roter Drache', 'Grüner Drache', 'Weißer Drache', 'Pflaumenblüte', 'Chrysantheme'][face - 27];
}
export function faceSVG(face: number): string {
  let art = '';
  const n = face % 9 + 1;
  if (face < 9) {
    const spots: [number, number][][] = [
      [[30, 39]], [[30, 21], [30, 57]], [[19, 18], [30, 39], [41, 60]],
      [[18, 21], [42, 21], [18, 57], [42, 57]],
      [[17, 18], [43, 18], [30, 39], [17, 60], [43, 60]],
      [[18, 17], [42, 17], [18, 39], [42, 39], [18, 61], [42, 61]],
      [[15, 16], [30, 27], [45, 16], [18, 45], [42, 45], [18, 63], [42, 63]],
      [[18, 13], [42, 13], [18, 30], [42, 30], [18, 48], [42, 48], [18, 65], [42, 65]],
      [[14, 17], [30, 17], [46, 17], [14, 39], [30, 39], [46, 39], [14, 61], [30, 61], [46, 61]],
    ];
    spots[n - 1].forEach(([x, y], i) => {
      const color = n === 1 ? red : [blue, green, red][i % 3];
      const r = n === 1 ? 17 : n < 6 ? 7.4 : 5.6;
      art += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-width="2.7"/><circle cx="${x}" cy="${y}" r="${r * .47}" fill="none" stroke="${color}" stroke-width="1.4"/><circle cx="${x}" cy="${y}" r="1.5" fill="${color}"/>`;
    });
  } else if (face < 18) {
    if (n === 1) art = `<path d="M20 62Q5 39 23 23Q30 9 44 21L37 25Q47 50 27 56L20 67M25 32Q22 48 34 45M21 25L13 21M34 55L40 66" fill="none" stroke="${green}" stroke-width="3" stroke-linecap="round"/><circle cx="34" cy="23" r="2" fill="${red}"/><path d="M21 49L11 59M26 53L18 67" stroke="${blue}" stroke-width="2"/>`;
    else {
      const cols = n <= 3 ? n : n <= 6 ? 2 : 3, rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const x = 30 + (i % cols - (cols - 1) / 2) * 16;
        const y = 39 + (Math.floor(i / cols) - (rows - 1) / 2) * 23;
        const color = i === Math.floor(n / 2) && n % 2 ? red : green;
        art += `<path d="M${x} ${y - 8}v16M${x - 3} ${y - 7}h6M${x - 3} ${y}h6M${x - 3} ${y + 7}h6" stroke="${color}" stroke-width="3.4" stroke-linecap="round"/>`;
      }
    }
  } else if (face < 27) {
    art = `<text x="30" y="34" fill="${blue}" font-size="29">${numbers[n - 1]}</text><text x="30" y="67" fill="${red}" font-size="30">萬</text>`;
  } else if (face < 33) {
    const glyph = ['東', '南', '西', '北', '中', '發'][face - 27];
    art = `<text x="30" y="54" fill="${face === 31 ? red : face === 32 ? green : blue}" font-size="43">${glyph}</text>`;
  } else if (face === 33) {
    art = `<rect x="13" y="15" width="34" height="49" rx="3" fill="none" stroke="${blue}" stroke-width="3"/><rect x="18" y="20" width="24" height="39" rx="1" fill="none" stroke="${blue}" stroke-width="1"/>`;
  } else {
    art = `<path d="M21 68Q38 43 30 20M29 49L14 42M31 39L45 30" stroke="${green}" stroke-width="2.3" fill="none"/>`;
    for (const [x, y] of [[29, 22], [17, 40], [42, 30]]) {
      for (let i = 0; i < 5; i++) art += `<ellipse cx="${x}" cy="${y - 5}" rx="3.6" ry="6" fill="${face === 34 ? red : '#b68a38'}" transform="rotate(${i * 72} ${x} ${y})"/>`;
      art += `<circle cx="${x}" cy="${y}" r="2.5" fill="#e3bb64"/>`;
    }
  }
  return `<svg viewBox="0 0 60 80" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g text-anchor="middle" font-family="serif" font-weight="600">${art}</g></svg>`;
}
export const icons: Record<string, string> = {
  undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12" transform="translate(0 -2)"/>',
  hint: '<path d="M9 18h6m-5 3h4M8 13a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/>',
  settings: '<path d="M4 6h9m4 0h3M4 12h3m4 0h9M4 18h9m4 0h3"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="18" r="2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shuffle: '<path d="m17 3 4 4-4 4M3 7h3c5 0 7 10 12 10h3m-4-4 4 4-4 4M3 17h3c2 0 3-2 4-4m4-3c1-2 2-3 4-3h3"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
};
export const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
