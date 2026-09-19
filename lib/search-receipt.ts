import {adminToken,type Item,type Frame} from './server';
type Receipt={space:string;user:string;capture:string;query:string;frames:Frame[];objects:Item[];expires:number};
const encode=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const decode=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function key(){return crypto.subtle.importKey('raw',new TextEncoder().encode('arika-search-confirmation:'+adminToken()),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function issueSearchReceipt(data:Omit<Receipt,'expires'>){const payload=encode(new TextEncoder().encode(JSON.stringify({...data,expires:Date.now()+86400000})));const signature=await crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(payload));return payload+'.'+encode(new Uint8Array(signature));}
export async function readSearchReceipt(token:string,space:string,user:string):Promise<Receipt>{
 try{const [payload,signature,extra]=token.split('.');if(!payload||!signature||extra||!await crypto.subtle.verify('HMAC',await key(),decode(signature),new TextEncoder().encode(payload)))throw new Error();
 const data=JSON.parse(new TextDecoder().decode(decode(payload))) as Receipt;if(data.space!==space||data.user!==user||data.expires<Date.now())throw new Error();return data;
 }catch{throw new Error('検索結果を確認できません。もう一度検索してください。');}
}
