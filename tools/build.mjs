// Build: inline the engine (and level pack) into the game template.
// Outputs:
//   dist/index.html     full HTML document — the file uploaded to CrazyGames
//   dist/artifact.html  body fragment — used for the shareable playtest page
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

// Strip the CommonJS export block (always the last statement of the file):
// in the browser these files run as plain scripts.
const stripExports = src => src.replace(/^if \(typeof module !== 'undefined'\)[\s\S]*$/m, '');

const engine = stripExports(read('src/engine.js'));
const levels = existsSync(join(root, 'src/levels.js')) ? stripExports(read('src/levels.js')) : 'const LEVEL_PACK = [];';
const template = read('src/game.html');

for (const marker of ['/*ENGINE*/', '/*LEVELS*/']) {
  if (!template.includes(marker) && marker === '/*ENGINE*/') throw new Error(`Template is missing ${marker}`);
}
const fragment = template.replace('/*ENGINE*/', () => engine).replace('/*LEVELS*/', () => levels);

// Split the fragment into head material (title, meta, fonts, styles) and body (everything from #app on).
const split = fragment.indexOf('<div id="app">');
if (split < 0) throw new Error('Template is missing <div id="app">');
const head = fragment.slice(0, split).trim();
const body = fragment.slice(split).trim();

const doc = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>[hidden]{display:none!important}html,body{margin:0}</style>
${head}
</head>
<body>
${body}
</body>
</html>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), doc);
writeFileSync(join(root, 'dist/artifact.html'), fragment);
const kb = n => (Buffer.byteLength(n) / 1024).toFixed(1) + ' KB';
console.log(`dist/index.html     ${kb(doc)}`);
console.log(`dist/artifact.html  ${kb(fragment)}`);
