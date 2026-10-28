import {build} from 'esbuild';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {headerMarkup} from './navigation.mjs';
await mkdir('campaigns/assets',{recursive:true});
await build({entryPoints:['campaigns/src/main.jsx'],outfile:'campaigns/assets/app.js',bundle:true,minify:true,format:'esm',target:['es2020'],define:{'process.env.NODE_ENV':'"production"'},external:['/assets/*'],legalComments:'eof'});
await build({stdin:{contents:"import {createClient} from '@supabase/supabase-js';window.supabase={createClient};",resolveDir:process.cwd()},outfile:'assets/supabase.min.js',bundle:true,minify:true,format:'iife',target:['es2020'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
await build({entryPoints:['campaigns/src/confirm-email.js'],outfile:'campaigns/assets/confirm-email.js',bundle:true,minify:true,format:'esm',target:['es2020'],define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
async function htmlFiles(dir='.') {const out=[];for(const item of await readdir(dir,{withFileTypes:true})){if(['node_modules','.git','sources','tests','supabase'].includes(item.name))continue;const path=dir+'/'+item.name;if(item.isDirectory())out.push(...await htmlFiles(path));else if(!item.name.startsWith('__qa')&&item.name.endsWith('.html'))out.push(path);}return out;}
for(const file of await htmlFiles()){
 let html=await readFile(file,'utf8');html=html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi,'');
 if(!['./campaigns/index.html','./campaigns/confirm.html'].includes(file)){
  html=/<header\b/i.test(html)?html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i,headerMarkup):html.replace(/(<body\b[^>]*>\s*(?:<a class="skip-link"[^>]*>[\s\S]*?<\/a>)?)/i,`$1${headerMarkup}`);
  if(!html.includes('/assets/navigation.css'))html=html.replace('</head>','<link rel="stylesheet" href="/assets/navigation.css?v=1"></head>');
  if(!html.includes('/assets/navigation.js'))html=html.replace('</body>','<script src="/assets/navigation.js?v=1" defer></script></body>');
 }
 const hashes=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].filter(m=>m[1].trim()).map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'");
 // Legacy markup still uses inline styles; scripts are restricted to first-party bundles, exact hashes and Stripe.
 const policy="default-src 'self'; script-src 'self' https://js.stripe.com "+hashes.join(' ')+"; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://xynujmscxjxbfivylfne.supabase.co wss://xynujmscxjxbfivylfne.supabase.co https://api.stripe.com https://formspree.io; frame-src https://js.stripe.com https://hooks.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self' https://formspree.io";
 html=html.replace(/(<meta charset=[^>]+>)/i,`$1<meta http-equiv="Content-Security-Policy" content="${policy}">`).replaceAll('/assets/social-card.svg','/assets/social-card.png');
 await writeFile(file,html);
}
console.log('Production bundles and page security policies built.');
