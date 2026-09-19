// Export committed source into a new, unregistered installation directory.
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync,chmodSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const arg=process.argv[2];
if(!arg)throw new Error('Usage: node scripts/export-installation.mjs /absolute/new-directory');
const target=resolve(arg);
if(target===root||target.startsWith(root+'/'))throw new Error('Choose a destination outside this source checkout.');
if(existsSync(target))throw new Error('Destination already exists; no files were changed.');
const entries=execFileSync('git',['ls-tree','-rz','HEAD'],{cwd:root}).toString().split('\0').filter(Boolean).map(line=>{const [meta,path]=line.split('\t');const [mode,type,sha]=meta.split(' ');return {mode,type,sha,path};});
if(entries.some(e=>e.type!=='blob'||!['100644','100755'].includes(e.mode)))throw new Error('Unsupported source entry.');
const files=entries.map(e=>{
 if(/(^|\/)(?:\.env(?:\..*)?|\.dev.vars(?:\..*)?|\.wrangler|\.sites-runtime|node_modules|dist|\.git)(?:\/|$)/.test(e.path)&&e.path!=='.env.example')throw new Error('Unexpected runtime file in committed source: '+e.path);
 let content=execFileSync('git',['cat-file','blob',e.sha],{cwd:root,maxBuffer:16*1024*1024});
 if(e.path==='.openai/hosting.json'){
  const {project_id,...manifest}=JSON.parse(content.toString());
  content=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
 }
 return {...e,content};
});
mkdirSync(target,{recursive:true});
for(const e of files){const out=resolve(target,e.path);mkdirSync(dirname(out),{recursive:true});writeFileSync(out,e.content);chmodSync(out,e.mode==='100755'?0o755:0o644);}
const manifest=JSON.parse(readFileSync(resolve(target,'.openai/hosting.json'),'utf8'));
if(manifest.project_id)throw new Error('Export retained an existing Site identity.');
console.log(`Exported ${files.length} source files. Follow DEPLOYMENT.md in the new directory. No Site has been created or deployed.`);
