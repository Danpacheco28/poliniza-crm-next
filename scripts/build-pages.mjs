import {mkdir,readFile,writeFile,readdir,copyFile} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),out=join(root,'.site');
const config=JSON.parse((await readFile(join(root,'deploy','public-cloud.json'),'utf8')).replace(/^\uFEFF/,''));
if(!/^https:\/\/[a-z]{20}\.supabase\.co$/.test(config.url)||!config.publishableKey?.startsWith('sb_publishable_'))throw Error('Configure only the new Supabase public URL and publishable key before publishing.');
if(config.url.includes('feezzyorxypdibuaifxs'))throw Error('The previous CRM project is not a deployment target.');
async function copyTree(from,to){await mkdir(to,{recursive:true});for(const entry of await readdir(from,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Unexpected symlink.');const source=join(from,entry.name),target=join(to,entry.name);if(entry.isDirectory())await copyTree(source,target);else if(['.html','.mjs','.js','.css'].includes(extname(entry.name))){let text=await readFile(source,'utf8');text=text.replace(/(from\s*['"])\/(?!\/)/g,'$1./').replace(/(from\s*['"])\.\.\/src\//g,'$1./src/');if(extname(entry.name)==='.html')text=text.replace(/((?:src|href)=['"])\/(?!\/)/g,'$1./');await writeFile(target,text);}else await copyFile(source,target);}}
await copyTree(join(root,'public'),out);await copyTree(join(root,'src'),join(out,'src'));
await writeFile(join(out,'cloud-config.mjs'),'export const cloudConfig='+JSON.stringify({enabled:true,url:config.url,publishableKey:config.publishableKey})+';\n');
await writeFile(join(out,'.nojekyll'),'');
console.log('Static pilot built in .site; private runtime and backend are excluded.');
