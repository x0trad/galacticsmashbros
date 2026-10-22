import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {readFile,readdir,rm,writeFile,mkdir,stat} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url)),out=join(root,'dist-cpanel');
await build({configFile:join(root,'vite.cpanel.config.ts')});
// Ship the three Galactic Dog palettes, not local unreleased character experiments.
for(const name of await readdir(join(out,'sprites'))){if(!/^(green|grey|purple)-(idle|walk|punch)-(down|left|right|up)-[1-4]\.png$/.test(name))await rm(join(out,'sprites',name),{recursive:true});}
await writeFile(join(out,'.htaccess'),`DirectoryIndex index.html
Options -Indexes
<IfModule mod_headers.c>
  <FilesMatch "^index\\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType text/css .css
  AddType font/ttf .ttf
  AddType audio/wav .wav
</IfModule>
`);
let count=0,bytes=0;
async function inspect(dir){for(const name of await readdir(dir)){const path=join(dir,name),info=await stat(path);if(info.isDirectory()){await inspect(path);continue}const rel=relative(out,path);if(/(^|\/)(?:\.env[^/]*|\.dev\.vars[^/]*|\.git|\.wrangler|\.openai)(\/|$)/.test(rel))throw Error('Unexpected private file: '+rel);count++;bytes+=info.size;
 if(/\.(js|html|css)$/.test(name)){const text=await readFile(path,'utf8');if(/sk-proj-[A-Za-z0-9_-]{20,}|-----BEGIN (?:OPENSSH |RSA )?PRIVATE KEY-----/.test(text))throw Error('Credential-like content found in '+rel);}
}}
await inspect(out);
const exports=join(root,'releases');await mkdir(exports,{recursive:true});
const archive=join(exports,'galactic-smash-bros-cpanel.zip');await rm(archive,{force:true});
const zipped=spawnSync('zip',['-q','-r',archive,'.'],{cwd:out,stdio:'inherit'});if(zipped.status!==0)throw Error('ZIP packaging failed.');
console.log(`cPanel package: ${archive}\n${count} files, ${(bytes/1024/1024).toFixed(1)} MiB unpacked. No Node.js, database or credentials required.`);
