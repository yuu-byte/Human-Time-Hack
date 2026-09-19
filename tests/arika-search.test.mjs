import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['lib/search.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {searchScore}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
test('Book search excludes microphone counters and unrelated compounds',()=>{
 const examples=[
  {name:'マイクロホン充電器・スタンド',description:'2本のワイヤレスマイクを収める黒い充電スタンド'},
  {name:'ワイヤレスマイクロホン2本',description:'黒色ワイヤレスマイク、充電器にセット済み'},
  ...['マイク2 本','マイク２本','マイク二本','マイク数本','マイク本体','日本製マイク','microphone','notebook computer','本棚'].map(name=>({name})),
 ];
 for(const object of examples)for(const query of ['本','本はどこですか','書籍','book'])assert.equal(searchScore(query,object,'会場'),0,query+':'+object.name);
 for(const name of ['本','赤い本','絵本','単行本','文庫本','書籍','book','books'])assert.ok(searchScore('本',{name},'会場')>0,name);
 for(const query of ['マイク','マイクロホン','microphone'])assert.ok(searchScore(query,examples[1],'会場')>0,query);
 assert.ok(searchScore('本',{name:'積み重なった物',description:'本が3冊置かれている'},'会場')>0);
 assert.ok(searchScore('赤い本',{name:'書籍',description:'赤色の表紙'},'会場')>0);
 assert.equal(searchScore('青い本',{name:'書籍',description:'赤色の表紙'},'会場'),0);
});
