import {MAX_IMAGE_EDGE, MAX_FRAME_DATA_LENGTH} from './vision-config';
export type LocalFrame={data:string;time:number;segment?:number;score?:number};
export type FrameSelection={frames:LocalFrame[];reserve:LocalFrame[]};
export function excludeAndRefill(selection:FrameSelection,index:number):FrameSelection {
 const removed=selection.frames[index];
 if(!removed)return selection;
 const reserve=[...selection.reserve];
 const same=reserve.findIndex(f=>f.segment===removed.segment);
 const replacement=reserve.splice(same>=0?same:0,1)[0];
 const frames=selection.frames.filter((_,i)=>i!==index);
 if(replacement)frames.splice(index,0,replacement);
 return {frames:frames.sort((a,b)=>a.time-b.time),reserve};
}
function event(el:HTMLMediaElement,name:string,act?:()=>void){return new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{clean();reject(new Error('動画の読み込みに時間がかかっています。写真を選ぶか、短い動画で再試行してください。'));},12000);const ok=()=>{clean();resolve();},bad=()=>{clean();reject(new Error('この動画を読み込めません。写真を選んで試してください。'));};function clean(){clearTimeout(timer);el.removeEventListener(name,ok);el.removeEventListener('error',bad);}el.addEventListener(name,ok,{once:true});el.addEventListener('error',bad,{once:true});act?.();});}
function jpeg(source:CanvasImageSource,w:number,h:number){
 if(w<=0||h<=0)throw new Error('画像のサイズを確認できません。');
 let scale=Math.min(1,MAX_IMAGE_EDGE/Math.max(w,h));
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('画像を処理できません。');
 // Preserve readable edges; shrink only after moderate JPEG compression.
 for(let attempt=0;attempt<6;attempt++){
  canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  for(const quality of [.88,.8,.72,.64]){
   const data=canvas.toDataURL('image/jpeg',quality);
   if(data.length<=MAX_FRAME_DATA_LENGTH)return data;
  }
  scale*=.85;
 }
 throw new Error('画像が大きすぎます。');
}
function sharpness(source:CanvasImageSource,w:number,h:number){
 const c=document.createElement('canvas');c.width=160;c.height=Math.max(3,Math.round(160*h/w));
 const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return 0;
 ctx.drawImage(source,0,0,c.width,c.height);const p=ctx.getImageData(0,0,c.width,c.height).data;
 const gray=(i:number)=>(p[i]*.299+p[i+1]*.587+p[i+2]*.114);let sum=0,sq=0,n=0;
 for(let y=1;y<c.height-1;y++)for(let x=1;x<c.width-1;x++){
  const i=(y*c.width+x)*4,v=4*gray(i)-gray(i-4)-gray(i+4)-gray(i-c.width*4)-gray(i+c.width*4);
  sum+=v;sq+=v*v;n++;
 }
 return n?Math.max(0,sq/n-(sum/n)**2):0;
}
export async function extract(files:File[],progress:(n:number)=>void):Promise<FrameSelection>{if(!files.length)return {frames:[],reserve:[]};const isVideo=files[0].type.startsWith('video/')||/\.(mov|mp4|m4v)$/i.test(files[0].name);if(isVideo){const file=files[0];if(file.size>150*1024*1024)throw new Error('動画は150MB以下にしてください。');const url=URL.createObjectURL(file),v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='auto';v.style.cssText='position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(v);try{await event(v,'loadeddata',()=>{v.src=url;v.load();});if(!Number.isFinite(v.duration)||v.duration<=0||v.duration>90)throw new Error('90秒以内の動画を選んでください。');const count=Math.min(12,Math.max(3,Math.ceil(v.duration/2)));const frames:LocalFrame[]=[],reserve:LocalFrame[]=[];for(let i=0;i<count;i++){const candidates:LocalFrame[]=[];
// Compare nearby moments within each time segment; never add AI calls here.
for(const offset of [.2,.5,.8]){const t=Math.max(0,Math.min(v.duration-.01,(i+offset)*v.duration/count));if(Math.abs(v.currentTime-t)>.001)await event(v,'seeked',()=>{v.currentTime=t;});const score=sharpness(v,v.videoWidth,v.videoHeight);if(!candidates.some(f=>Math.abs(f.time-t)<.001))candidates.push({data:jpeg(v,v.videoWidth,v.videoHeight),time:t,segment:i,score});}
candidates.sort((a,b)=>(b.score??0)-(a.score??0));const best=candidates.shift();if(best)frames.push(best);reserve.push(...candidates);progress(Math.round((i+1)/count*100));}reserve.sort((a,b)=>(b.score??0)-(a.score??0));return {frames,reserve};}finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);}}
const frames:LocalFrame[]=[];for(const file of files.slice(0,12)){if(file.size>30*1024*1024)throw new Error('写真は1枚30MB以下にしてください。');const url=URL.createObjectURL(file),img=new Image();try{await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('写真を読み込めません。JPEG形式で試してください。'));img.src=url;});frames.push({data:jpeg(img,img.naturalWidth,img.naturalHeight),time:0});progress(Math.round(frames.length/Math.min(12,files.length)*100));}finally{URL.revokeObjectURL(url);}}return {frames,reserve:[]};}
