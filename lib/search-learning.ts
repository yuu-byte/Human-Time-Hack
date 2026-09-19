import type {Item} from './server';
import {cleanSearchQuery} from './search';

// Only server-validated AI observations are passed as found. Keep each query
// on the matching object/frame, without broadening it into partial aliases.
export function mergeSearchLearning(existing:Item[],found:Item[],query:string):Item[]{
 const merged=existing.map(o=>({...o}));
 const term=cleanSearchQuery(query);
 for(const hit of found){
  const index=merged.findIndex(o=>o.source!=='手動'&&o.frame===hit.frame&&o.name.normalize('NFKC').toLowerCase()===hit.name.normalize('NFKC').toLowerCase());
  const previous=index>=0?merged[index]:undefined;
  const learnedQueries=[...new Set([...(previous?.learnedQueries||[]),...(term?[term]:[])])];
  const item={...previous,...hit,aliases:[...new Set([...(previous?.aliases||[]),...(hit.aliases||[])])],...(learnedQueries.length?{learnedQueries}:{})};
  if(index>=0)merged[index]=item;else merged.push(item);
 }
 return merged;
}
