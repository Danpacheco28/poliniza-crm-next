import {mkdir,readdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import {resolve,relative,join,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Export source by explicit allowlist. Never traverse runtime, Git or node_modules.
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const destination=join(root,'.release','source-'+new Date().toISOString().replace(/[:.]/g,'-'));
const files=[];
const allowedExtensions=new Set(['.mjs','.cjs','.js','.html','.css','.png','.svg','.ico','.json','.md','.sql','.yml','.yaml','.example']);
const secretPatterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/GOCSPX-[A-Za-z0-9_-]{15,}/,/sb_secret_[A-Za-z0-9_-]{15,}/,/gh[pousr]_[A-Za-z0-9]{25,}/];
async function include(path){
  const source=resolve(root,path);if(!source.startsWith(root+sep))throw Error('Source outside project.');
  if(/(?:^|[/\\])(?:node_modules|\.runtime|\.git|\.release)(?:[/\\]|$)/.test(path)||/(?:client_secret|credentials|backup|token)[^/\\]*\.json$/i.test(path))throw Error('Private file is not allowed in source export.');
  if(!allowedExtensions.has(extname(path))&&!['.gitignore','.dockerignore'].includes(path))throw Error('Unexpected source extension: '+path);
  const contents=await readFile(source);if(!['.png','.ico'].includes(extname(path))&&secretPatterns.some(pattern=>pattern.test(contents.toString('utf8'))))throw Error('Possible credential in source file: '+path);
  const target=resolve(destination,path);if(!target.startsWith(destination+sep))throw Error('Invalid export target.');
  await mkdir(resolve(target,'..'),{recursive:true});await copyFile(source,target);files.push(path.replaceAll('\\','/'));
}
async function directory(path){for(const entry of await readdir(join(root,path),{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Symlinks are not permitted in source export.');const next=join(path,entry.name);if(entry.isDirectory())await directory(next);else if(entry.isFile())await include(next);}}
await mkdir(destination,{recursive:true});
for(const folder of ['public','src','server','tests','scripts','.github','deploy','supabase'])await directory(folder);
for(const file of ['package.json','package-lock.json','server.mjs','.gitignore','README.md','PRODUCT.md','DESIGN.md','VALIDACAO.md','PLANO-WHATSAPP.md','PUBLICACAO.md','FORMULARIOS.md','.impeccable/design.json'])await include(file);
await writeFile(join(destination,'SOURCE-MANIFEST.json'),JSON.stringify({generatedAt:new Date().toISOString(),purpose:'Source review only; not a production deployment',excluded:['.runtime','node_modules','.git','.env','credential files','private messages'],files:files.sort()},null,2));
console.log(JSON.stringify({directory:relative(root,destination),files:files.length,privateRuntimeIncluded:false},null,2));
