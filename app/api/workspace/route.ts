import {issueSearchReceipt,readSearchReceipt} from '@/lib/search-receipt';
import {MAX_FRAME_DATA_LENGTH, MAX_UPLOAD_LENGTH} from '@/lib/vision-config';
import {mergeSearchLearning} from '@/lib/search-learning';
import {searchScore} from '@/lib/search';
import {analyze,budgetSettings,budgetCap,adminToken,saveApiKey,apiKey,authorize,bucket,database,identity,reject,reply,textValue,type Frame,type Item} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const user=await identity(),d=database();const spaces=user==='creator'?(await d.prepare('SELECT * FROM spaces WHERE owner=? ORDER BY created DESC').bind(user).all()).results:(await d.prepare('SELECT * FROM spaces WHERE id=?').bind(user.slice(7)).all()).results;const space=new URL(request.url).searchParams.get('space');let captures:any[]=[],members=0,invite='',feedback:any[]=[];if(space){const s=await authorize(space,user);invite=s.owner===user?s.invite:'';captures=(await d.prepare('SELECT * FROM captures WHERE space=? ORDER BY created DESC LIMIT 50').bind(space).all()).results.map((c:any)=>({...c,frames:JSON.parse(c.frames),objects:JSON.parse(c.objects),canDelete:c.owner===user,owner:undefined}));members=Number((await d.prepare('SELECT COUNT(*) AS n FROM members WHERE space=?').bind(space).first<any>())?.n||0);feedback=(await d.prepare('SELECT found,intent,seconds,created FROM feedback WHERE space=? ORDER BY created DESC LIMIT 50').bind(space).all()).results;}
 const limits=await budgetSettings();const budget=await d.prepare('SELECT COALESCE(SUM(cost),0) AS total,SUM(CASE WHEN status!=? THEN 1 ELSE 0 END) AS unconfirmed FROM ledger').bind('completed').first();return reply({spaces:spaces.map((s:any)=>({id:s.id,name:s.name,isOwner:s.owner===user})),captures,members,invite,feedback,budget:{...budget,...limits},aiReady:!!(await apiKey())});}catch(e){return reject(e);}}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'操作元を確認できませんでした。'},403);
 const d=database();if(Number(request.headers.get('content-length')||0)>MAX_UPLOAD_LENGTH)throw new Error('データが大きすぎます。画像数を減らしてください。');const raw=await request.text();if(raw.length>MAX_UPLOAD_LENGTH)throw new Error('データが大きすぎます。');const b=JSON.parse(raw);const action=b.action;
 if(action==='logout')return new Response('{}',{headers:{'Content-Type':'application/json','Set-Cookie':'arika_access=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0','Cache-Control':'no-store'}});
 if(action==='login'){
 const token=textValue(b.token,200);let owner=false;
 if(adminToken()&&token===adminToken()){owner=true;const existing=await d.prepare("SELECT id FROM spaces WHERE owner='creator'").first<any>();if(!existing){await d.batch([d.prepare('INSERT OR IGNORE INTO spaces(id,name,owner,invite,created) VALUES(?,?,?,?,?)').bind('shared-space','共有スペース','creator',crypto.randomUUID().replaceAll('-',''),new Date().toISOString()),d.prepare('INSERT OR IGNORE INTO members(space,user) VALUES(?,?)').bind('shared-space','creator'),d.prepare("INSERT OR IGNORE INTO config(key,value) VALUES('admin','creator')")]);}}
 else {const s=await d.prepare('SELECT id FROM spaces WHERE invite=?').bind(token).first();if(!s)throw new Error('招待リンクを確認してください。');}
 return new Response(JSON.stringify({ok:true,owner}),{headers:{'Content-Type':'application/json','Set-Cookie':`arika_access=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`,'Cache-Control':'no-store'}});
 }
 const user=await identity();
 if(action==='setkey'){if(user!=='creator')throw new Error('作成者のみ設定できます。');const key=textValue(b.key,500);if(!key.startsWith('sk-')||key.length<20)throw new Error('OpenAIのAPIキーを入力してください。');await saveApiKey(key);return reply({ok:true});}
 if(action==='create'||action==='join')throw new Error('招待リンクから共有スペースを開いてください。');
 const space=textValue(b.space,80);const s=await authorize(space,user);
 if(action==='settings'){
  if(s.owner!==user)throw new Error('組織設定は管理者のみ変更できます。');
  const name=textValue(b.name,80),limit=b.budgetLimit,cap=budgetCap();
  if(!name)throw new Error('組織・スペース名を入力してください。');
  if(typeof limit!=='number'||!Number.isFinite(limit)||limit<0||limit>cap||Math.abs(limit*100-Math.round(limit*100))>0.000001)throw new Error(`AI利用上限は0〜${cap}ドルの範囲で、小数第2位まで入力してください。`);
  await d.batch([
   d.prepare('UPDATE spaces SET name=? WHERE id=? AND owner=?').bind(name,space,user),
   d.prepare("INSERT INTO config(key,value) VALUES('budget_limit',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(limit))
  ]);
  return reply({ok:true});
 }
 if(['save','delete','deleteFrame','rotate','edit'].includes(action)&&s.owner!==user)throw new Error('記録の追加・変更・削除は作成者のみ利用できます。');
 if(action==='analyze'&&!textValue(b.query)&&s.owner!==user)throw new Error('初回解析は作成者のみ利用できます。');
 if(action==='edit'){const id=textValue(b.capture,80),label=textValue(b.label,80),notes=textValue(b.notes,500);if(!label)throw new Error('撮影場所を入力してください。');const c=await d.prepare('SELECT objects FROM captures WHERE id=? AND space=? AND owner=?').bind(id,space,user).first<any>();if(!c)throw new Error('記録が見つかりません。');const objects=JSON.parse(c.objects).filter((o:Item)=>o.source!=='手動');if(notes)objects.unshift({name:notes,description:'撮影者のメモ',location:label,frame:0,source:'手動'});const changed=await d.prepare('UPDATE captures SET label=?,objects=? WHERE id=? AND objects=?').bind(label,JSON.stringify(objects),id,c.objects).run();if(!changed.meta.changes)throw new Error('記録が更新されました。開き直して再試行してください。');return reply({ok:true});}
 if(action==='rotate'){if(s.owner!==user)throw new Error('作成者のみ操作できます。');await d.prepare('UPDATE spaces SET invite=? WHERE id=?').bind(crypto.randomUUID().replaceAll('-',''),space).run();return reply({ok:true});}
 if(action==='save'){
 const capturedAt=b.capturedAt?new Date(b.capturedAt):new Date();if(!Number.isFinite(capturedAt.getTime())||capturedAt.getTime()>Date.now()+600000||capturedAt.getFullYear()<1900)throw new Error('撮影日時を確認してください。');const label=textValue(b.label,80);if(!label)throw new Error('撮影場所を入力してください。');if(!Array.isArray(b.frames)||b.frames.length<1||b.frames.length>12)throw new Error('画像を1〜12枚選んでください。');const n=await d.prepare('SELECT COUNT(*) AS n FROM captures WHERE space=?').bind(space).first<any>();if(n.n>=30)throw new Error('記録は30件までです。不要な記録を削除してください。');
 const prepared=b.frames.map((f:any)=>{if(typeof f.data!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.data)||f.data.length>MAX_FRAME_DATA_LENGTH)throw new Error('画像を読み込めません。JPEG画像を小さくして再試行してください。');const binary=atob(f.data.split(',')[1]);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));if(bytes[0]!==255||bytes[1]!==216)throw new Error('JPEG画像を選択してください。');return {bytes,time:typeof f.time==='number'&&Number.isFinite(f.time)?Math.max(0,f.time):0};});
 const id=crypto.randomUUID(),frames:Frame[]=[];try{for(const f of prepared){const key=space+'/'+id+'/'+crypto.randomUUID()+'.jpg';await bucket().put(key,f.bytes,{httpMetadata:{contentType:'image/jpeg'}});frames.push({id:key,time:f.time});}const notes=textValue(b.notes,500);const objects:Item[]=notes?[{name:notes,description:'撮影者が入力したメモ',location:label,frame:0,source:'手動'}]:[];await d.prepare('INSERT INTO captures(id,space,owner,label,created,frames,objects,mode) VALUES(?,?,?,?,?,?,?,?)').bind(id,space,user,label,capturedAt.toISOString(),JSON.stringify(frames),JSON.stringify(objects),'manual').run();return reply({id});}catch(e){for(const f of frames)await bucket().delete(f.id);throw e;}
 }
 if(action==='deleteFrame'){
 const capture=await d.prepare('SELECT * FROM captures WHERE id=? AND space=? AND owner=?').bind(textValue(b.capture,80),space,user).first<any>();if(!capture)throw new Error('記録が見つかりません。');
 const frames:Frame[]=JSON.parse(capture.frames),image=textValue(b.image,240),index=frames.findIndex(f=>f.id===image);if(index<0)throw new Error('画像が見つかりません。記録を開き直してください。');if(frames.length<=1)throw new Error('最後の1枚は削除できません。記録一覧から撮影記録全体を削除してください。');
 const remaining=frames.filter((_,i)=>i!==index),objects:Item[]=JSON.parse(capture.objects).filter((o:Item)=>o.source==='手動'||o.frame!==index).map((o:Item)=>({...o,frame:o.source==='手動'?0:o.frame>index?o.frame-1:o.frame}));
 const changed=await d.prepare('UPDATE captures SET frames=?,objects=? WHERE id=? AND space=? AND owner=? AND frames=? AND objects=?').bind(JSON.stringify(remaining),JSON.stringify(objects),capture.id,space,user,capture.frames,capture.objects).run();if(!changed.meta.changes)throw new Error('記録が更新されました。開き直して再試行してください。');
 await bucket().delete(image);return reply({ok:true});
 }
 if(action==='analyze'||action==='delete'){
 const capture=await d.prepare('SELECT * FROM captures WHERE id=? AND space=?').bind(textValue(b.capture,80),space).first<any>();if(!capture)throw new Error('記録が見つかりません。');if(action==='delete'){if(capture.owner!==user)throw new Error('削除できるのは撮影者のみです。');await d.prepare('DELETE FROM captures WHERE id=?').bind(capture.id).run();for(const f of JSON.parse(capture.frames))await bucket().delete(f.id);return reply({ok:true});}
 const q=textValue(b.query,180);const result=await analyze(space,JSON.parse(capture.frames),q);
 if(!q){const kept=JSON.parse(capture.objects).filter((x:Item)=>x.source==='手動'||x.learnedQueries?.length);const changed=await d.prepare('UPDATE captures SET objects=?,mode=? WHERE id=? AND frames=? AND objects=?').bind(JSON.stringify(mergeSearchLearning(kept,result.objects,'')),'ai',capture.id,capture.frames,capture.objects).run();if(!changed.meta.changes)throw new Error('解析中に撮影記録が変更されました。最新の記録から再試行してください。');}
 const latest=await d.prepare('SELECT frames FROM captures WHERE id=? AND space=?').bind(capture.id,space).first<any>();if(!latest||latest.frames!==capture.frames)throw new Error('検索中に撮影画像が変更されました。最新の記録から再試行してください。');const receipt=q&&result.objects.length?await issueSearchReceipt({space,user,capture:capture.id,query:q,frames:JSON.parse(capture.frames),objects:result.objects}):'';return reply({...result,capture:capture.id,receipt});
 }
 if(action==='search'){const q=textValue(b.query,180);if(!q)throw new Error('探したいモノを入力してください。');const rows=(await d.prepare('SELECT * FROM captures WHERE space=? ORDER BY created DESC LIMIT 50').bind(space).all()).results;const results:any[]=[];for(const c of rows as any[]){const frames=JSON.parse(c.frames);for(const o of JSON.parse(c.objects)){const score=searchScore(q,o,c.label);if(score)results.push({...o,capture:c.id,label:c.label,created:c.created,image:frames[o.frame]?.id,time:frames[o.frame]?.time,score});}}results.sort((a,b)=>b.score-a.score);return reply({results:results.slice(0,30),cost:0,mode:'保存済み記録の検索'});}
 if(action==='feedback'){
 let learned=false;
 if(b.found===true&&b.receipt){
  if(typeof b.receipt!=='string')throw new Error('検索結果を確認してください。');
  const receipt=await readSearchReceipt(b.receipt,space,user),index=b.resultIndex;
  if(!Number.isInteger(index)||index<0||index>=receipt.objects.length)throw new Error('実物を見つけた画像を選んでください。');
  const hit=receipt.objects[index],image=receipt.frames[hit.frame]?.id;
  for(let attempt=0;attempt<3;attempt++){
   const current=await d.prepare('SELECT frames,objects FROM captures WHERE id=? AND space=?').bind(receipt.capture,space).first<any>();
   const frame=current?JSON.parse(current.frames).findIndex((f:Frame)=>f.id===image):-1;
   if(frame<0)throw new Error('対象画像が削除されています。最新の記録から検索してください。');
   const merged=mergeSearchLearning(JSON.parse(current.objects),[{...hit,frame}],receipt.query);
   const changed=await d.prepare('UPDATE captures SET objects=? WHERE id=? AND space=? AND frames=? AND objects=?').bind(JSON.stringify(merged),receipt.capture,space,current.frames,current.objects).run();
   if(changed.meta.changes){learned=true;break;}
  }
  if(!learned)throw new Error('記録が更新されました。もう一度お試しください。');
 }
 await d.prepare('INSERT INTO feedback(id,space,user,found,intent,seconds,created) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),space,user,b.found?1:0,textValue(b.intent,160),typeof b.seconds==='number'&&Number.isFinite(b.seconds)?Math.min(86400,Math.max(0,b.seconds)):0,new Date().toISOString()).run();return reply({ok:true,learned});}
 throw new Error('操作を確認できませんでした。');
 }catch(e){return reject(e);}}
