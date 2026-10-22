// Exercise the shipped V2 script through DOM events and animation frames.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const code=fs.readFileSync(new URL('app.js',root),'utf8');
for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
 if(!/^(https?:|#)/.test(ref))assert.ok(fs.existsSync(new URL(ref,root)),`Missing asset: ${ref}`);
}
function setup(saved={}){
 const nodes=new Map(),events={},frames=[],storage=new Map(Object.entries(saved));
 let now=0,draws=0;
 const noop=()=>{},gradient={addColorStop:noop};
 const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,fillRect:()=>draws++},{get:(obj,k)=>obj[k]??noop});
 function element(id){
  const classes=new Set();
  const node={id,events:{},dataset:{},textContent:'',disabled:false,hidden:false,width:640,height:480,readyState:0,
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k)}},
   addEventListener(k,fn){(this.events[k]??=[]).push(fn)},setAttribute:noop,getContext:()=>ctx,setPointerCapture:noop,play:async()=>{},
   set innerHTML(value){nodes.delete('countdownText');for(const [,id] of value.matchAll(/id="([^"]+)"/g))nodes.set(id,element(id));this.markup=value},get innerHTML(){return this.markup??''}};
  return node;
 }
 for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes.set(id,element(id));
 const cards=['alex','luna','momo'].map(id=>{const c=element(id);c.dataset.character=id;return c});
 const sandbox={console,document:{getElementById:id=>nodes.get(id)??null,querySelectorAll:()=>cards,body:{classList:{toggle:noop}},documentElement:{}},window:{isSecureContext:true,scrollTo:noop,addEventListener:(k,fn)=>(events[k]??=[]).push(fn)},navigator:{mediaDevices:{}},performance:{now:()=>now},requestAnimationFrame:fn=>frames.push(fn),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},Image:class{complete=true;naturalWidth=200},Math:Object.assign(Object.create(Math),{random:()=>.5})};
 vm.runInNewContext(code,sandbox,{filename:'app.js'});
 const fire=(id,type='click',e={})=>{const node=nodes.get(id);assert.ok(node,`Missing ${id}`);for(const fn of node.events[type]??[])fn(e)};
 const tick=n=>{for(let i=0;i<n;i++){now+=25;assert.ok(frames.length);frames.shift()(now)}};
 const active=name=>nodes.get(name+'Screen').classList.contains('active');
 return {nodes,cards,storage,sandbox,fire,tick,active,draws:()=>draws,windowEvent:(k,e)=>{for(const fn of events[k]??[])fn(e)}};
}
const first=setup();first.fire('homePlay');assert.ok(first.active('character'));
first.cards[1].events.click[0]();first.fire('confirmCharacter');assert.equal(first.storage.get('movmov_character'),'luna');assert.ok(first.active('games'));assert.equal(first.nodes.get('currentCharacterName').textContent,'LUNA');
first.fire('starChaseCard');first.fire('startWithKeyboard');first.tick(130);assert.ok(first.active('game'));first.tick(80);assert.ok(Number(first.nodes.get('hudTime').textContent)<45);assert.ok(first.draws()>150);
first.fire('pauseBtn');const paused=first.nodes.get('hudTime').textContent;first.tick(100);assert.equal(first.nodes.get('hudTime').textContent,paused);
// Quitting while paused replaces the overlay; the next start must recreate its countdown.
first.fire('gameOverlay','click',{target:{closest:selector=>selector==='[data-quit]'?{}:null}});assert.ok(first.active('games'));
first.fire('starChaseCard');first.fire('startWithKeyboard');assert.equal(first.nodes.get('countdownText').textContent,'');first.tick(130);assert.ok(first.active('game'));
first.fire('pauseBtn');first.fire('pauseBtn');first.tick(85);const resumed=Number(first.nodes.get('hudTime').textContent);first.tick(45);assert.ok(Number(first.nodes.get('hudTime').textContent)<resumed);
first.tick(1800);assert.ok(first.active('result'));assert.ok(Number(first.nodes.get('resultScore').textContent)>0);assert.ok(Number(first.storage.get('movmov_best'))>0);
first.fire('playAgain');assert.ok(first.active('game'));assert.equal(first.storage.get('movmov_character'),'luna');assert.equal(Number(first.nodes.get('hudScore').textContent),0);
const returning=setup(Object.fromEntries(first.storage));returning.fire('homePlay');assert.ok(returning.active('games'),'Saved hero must skip selection');returning.fire('starChaseCard');returning.fire('startWithKeyboard');returning.tick(130);
// Move to the right lane using keyboard, then touch; keeping clear of center bumpers permits a full timed round.
returning.windowEvent('keydown',{key:'ArrowRight',preventDefault(){}});returning.tick(40);returning.windowEvent('keyup',{key:'ArrowRight'});
returning.fire('touchRight','pointerdown',{preventDefault(){},pointerId:1});returning.tick(40);returning.fire('touchRight','pointerup');returning.tick(1800);
assert.ok(returning.active('result'));assert.equal(returning.nodes.get('resultTime').textContent,'45s');assert.equal(returning.nodes.get('resultTitle').textContent,'LEVEL COMPLETE!');
const pending=setup({movmov_character:'momo'});let resolveCamera,stops=0;
pending.sandbox.navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{resolveCamera=resolve});
pending.fire('homePlay');pending.fire('starChaseCard');pending.fire('enableCamera');pending.fire('readyBack');
resolveCamera({getTracks:()=>[{stop(){stops++}}]});await new Promise(resolve=>setImmediate(resolve));
assert.equal(stops,1,'Late camera permission must stop the stream after leaving setup');assert.equal(pending.nodes.get('webcam').srcObject,null);assert.ok(pending.active('games'));assert.equal(pending.nodes.get('enableCamera').disabled,false);
console.log('PASS: V2 assets, first/saved hero selection, rendering, keyboard/touch, pause/resume, paused-quit restart, scoring, best score, results/replay, full 45-second round, and camera cancellation.');
