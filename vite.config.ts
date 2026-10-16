import { defineConfig } from 'vite';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'offline-cache',
    closeBundle() {
      // Include imported images too, so the Arcade mascot remains available offline.
      const files = readdirSync(resolve('dist/assets')).map(file => `./assets/${file}`);
      const assets = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icons/icon-192.png', './icons/icon-512.png', ...files];
      const hash = createHash('sha256');
      assets.filter(file => file !== './').forEach(file => hash.update(readFileSync(resolve('dist', file))));
      hash.update(readFileSync(resolve('public/sw.js')));
      const version = hash.digest('hex').slice(0, 16);
      const worker = readFileSync(resolve('public/sw.js'), 'utf8')
        .replace('__PRECACHE__', JSON.stringify(assets))
        .replace('__VERSION__', JSON.stringify(version));
      writeFileSync(resolve('dist/sw.js'), worker);
    },
  }],
});
