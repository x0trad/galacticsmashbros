import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
const root=resolve('dist-cpanel');
const html=readFileSync(join(root,'index.html'),'utf8');
assert(!html.includes('localhost'));assert(html.includes('type="module"'));assert(existsSync(join(root,'.htaccess')));
const entries=[...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(m=>m[1]);assert(entries.length>=3);
for(const entry of entries)assert(existsSync(join(root,entry)),entry);
const scripts=readdirSync(join(root,'assets')).filter(n=>n.endsWith('.js')).map(n=>readFileSync(join(root,'assets',n),'utf8')).join('\n');
assert(scripts.includes('./sprites/'));assert(scripts.includes('./audio/'));assert(scripts.includes('./branding/'));
assert(!/cloudflare:workers|sk-proj-[A-Za-z0-9_-]{20,}/.test(scripts));
for(const file of readdirSync(join(root,'assets')).filter(n=>n.endsWith('.css'))){const path=join(root,'assets',file),css=readFileSync(path,'utf8');for(const match of css.matchAll(/url\(([^)]+)\)/g)){const url=match[1].replace(/["']/g,'');if(url.startsWith('data:'))continue;assert(!url.startsWith('/'),'Root-only CSS URL: '+url);assert(existsSync(resolve(dirname(path),url)),url)}}
const sprites=readdirSync(join(root,'sprites'));assert.equal(sprites.length,120);for(const name of sprites){assert(/^(green|grey|purple)-/.test(name));const data=readFileSync(join(root,'sprites',name));assert.equal(data.readUInt32BE(16),192);assert.equal(data.readUInt32BE(20),192)}
const privatePaths=['.env','.env.local','.dev.vars','.git','.wrangler','.openai','db','app'];for(const path of privatePaths)assert(!existsSync(join(root,path)),path);
assert(statSync('releases/galactic-smash-bros-cpanel.zip').size>0);
console.log('PASS: standalone HTML/JS/CSS asset references, root/subdirectory-compatible paths, 120 original Galactic Dog frames, no server/secrets directories and upload ZIP.');
