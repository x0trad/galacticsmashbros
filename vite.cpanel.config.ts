import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({
 root:project+'cpanel',
 base:'./',
 publicDir:project+'public',
 resolve:{alias:{'@':project}},
 css:{postcss:{plugins:[tailwindcss()]}},
 plugins:[{
  name:'cpanel-relative-public-assets',enforce:'pre',
  transform(code,id){
   if(!id.startsWith(project+'app/')||!/\.[jt]sx?$/.test(id))return;
   // The standalone build can be extracted into a domain root or any folder.
   // Apply only to this target; the hosted Cloudflare build retains root URLs.
   return code.replace(/(['"`])\/(sprites|branding|audio|power-cards)\//g,'$1./$2/').replace(/href="\/"/g,'href="./"');
  },
 },react()],
 build:{outDir:project+'dist-cpanel',emptyOutDir:true,sourcemap:false},
});
