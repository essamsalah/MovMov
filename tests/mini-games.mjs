import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname.replace(/\/$/,'');
const {GAMES,createRound,currentTask,step,extraPose}=await import(root+'/js/mini-rules.js');
const {MotionCamera}=await import(root+'/js/motion-camera.js');
const originalRandom=Math.random;Math.random=()=>.99;
for(const game of ['jungle','superhero','animals']){
 const s=createRound(game);s.spawn=1000;for(let i=0;i<GAMES[game].tasks.length;i++){
  const task=currentTask(s);let guard=0;while(!s.done&&guard++<180)step(s,.05,{[task[0]]:true});assert.equal(s.success,true,game+' '+task[0]);assert.equal(s.completed,i+1);assert.equal(s.score,(i+1)*10);const score=s.score;
  for(let j=0;j<10;j++)step(s,.05,{[task[0]]:true});assert.equal(s.score,score,'Only reward once per task');while(s.done)step(s,.05,{});
 }
}
const jungle=createRound('jungle');for(let i=0;i<600&&!jungle.over;i++)step(jungle,.05,{});assert.equal(jungle.health,0);assert.equal(jungle.over,true);
const fruit=createRound('jungle');fruit.spawn=100;fruit.objects=[{x:480,y:438}];step(fruit,.01,{});assert.equal(fruit.score,2);
for(const game of Object.keys(GAMES)){const s=createRound(game);for(let i=0;i<1300&&!s.over;i++){const task=currentTask(s);step(s,.05,task?{[task[0]]:true}:{});}assert.equal(s.over,true);assert.equal(s.elapsed,GAMES[game].duration);if(game!=='jungle')assert.equal(s.health,3);}
let bubbles=createRound('bubbles');bubbles.objects=[{x:.5,y:.5,r:.06,action:null,hold:0,life:0}];step(bubbles,.01,{cursor:{x:.5,y:.5},pop:true,tap:true});assert.equal(bubbles.score,1);
bubbles=createRound('bubbles');bubbles.objects=[{x:.5,y:.5,r:.06,action:'boost',hold:0,life:0}];for(let i=0;i<10;i++)step(bubbles,.05,{hands:[{x:.5,y:.5}]});assert.equal(bubbles.score,0);for(let i=0;i<8;i++)step(bubbles,.05,{hands:[{x:.5,y:.5}],boost:true});assert.equal(bubbles.score,5);
const lm=Array.from({length:33},()=>({x:.5,y:.8,z:0,visibility:1}));Object.assign(lm[11],{x:.4,y:.3});Object.assign(lm[12],{x:.6,y:.3});lm[23].y=lm[24].y=.6;lm[15]={x:.35,y:.45,z:-.35,visibility:1};lm[16]={x:.65,y:.65,z:0,visibility:1};assert.equal(extraPose(lm,null).punch,true);
lm[15]={x:.45,y:.2,z:0};lm[16]={x:.55,y:.2,z:0};assert.equal(extraPose(lm,null).block,true);lm[25].y=.6;lm[26].y=.9;assert.equal(extraPose(lm,null).balance,true);lm[25].visibility=.1;assert.equal(extraPose(lm,null).balance,false);lm[11].visibility=.1;assert.equal(extraPose(lm,null),null);
const noop=()=>{},context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
for(const game of Object.keys(GAMES)){
 const elements=new Map(),events={};function el(id){if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},classList:{add:noop,remove:noop,toggle:noop},getContext:()=>context,addEventListener:(name,cb)=>events[id+':'+name]=cb,setAttribute:noop,blur:noop});return elements.get(id);}
 const camera={pose:null,baseline:null,poll:noop,ready:()=>false,stop:noop,close:noop};
 const sandbox={console,GAMES,createRound,currentTask,step,MotionCamera:class{constructor(){return camera;}},document:{body:{dataset:{game}},getElementById:el,querySelectorAll:()=>[],activeElement:el('body'),addEventListener:noop},window:{addEventListener:noop},requestAnimationFrame:noop};vm.createContext(sandbox);
 let source=fs.readFileSync(root+'/js/mini-games.js','utf8').replace(/^import .*;\n/gm,'');source+='\n globalThis.test={start,tick,pause,draw,get:()=>({state,round}),getInput,keys};';vm.runInContext(source,sandbox);const t=sandbox.test;
 t.start('demo');t.tick(.05,1000);assert.ok(t.get().round.elapsed>0);t.draw();t.pause();const time=t.get().round.elapsed;t.tick(.05,1000);assert.equal(t.get().round.elapsed,time);t.pause();t.start('camera');t.tick(.05,1000);assert.equal(t.get().round.elapsed,0,'Lost camera must freeze timer');
 t.start('demo');assert.equal(t.get().round.score,0);assert.equal(t.get().state,'playing');
}
const video={srcObject:null,play:async()=>{},readyState:2};let stopped=0;const stream={getTracks:()=>[{stop:()=>stopped++}]};
const oldNavigator=globalThis.navigator;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>stream}}});
const cam=new MotionCamera(video,{getContext:()=>context},noop);cam.tracker={close:noop};assert.equal(await cam.start(),true);assert.ok(cam.stream);cam.stop();assert.equal(stopped,1);assert.equal(video.srcObject,null);
let resolve;globalThis.navigator.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);const pending=cam.start();cam.stop();resolve(stream);assert.equal(await pending,false);assert.equal(stopped,2,'Late camera request must stop its stream');Object.defineProperty(globalThis,'navigator',{configurable:true,value:oldNavigator});
const pages=['index.html','classic.html','star-motion.html','space-explorer.html','jungle-adventure.html','bubble-pop.html','superhero-training.html','animal-moves.html'];for(const name of pages){for(const [,href]of fs.readFileSync(root+'/'+name,'utf8').matchAll(/(?:href|src)="([^"]+)"/g))if(!/^(https?:|#)/.test(href))assert.ok(fs.existsSync(root+'/'+href),name+': '+href);}
assert.equal([...fs.readFileSync(root+'/classic.html','utf8').matchAll(/<article /g)].length,6);
Math.random=originalRandom;
console.log('PASS: all four game loops and rewards, bubble targets and special poses, animal holds, jungle fruit and damage, extra gestures, pause/restart, camera loss/cancellation/cleanup, and all six home links.');
