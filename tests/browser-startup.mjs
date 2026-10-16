// Exercise the exact browser scripts linked by each HTML page, without rewriting imports.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const pages=['star-motion','space-explorer','jungle-adventure','bubble-pop','superhero-training','animal-moves'];
for(const page of pages){
 const html=fs.readFileSync(path.join(root,page+'.html'),'utf8');
 const elements=new Map(),windowEvents={},documentEvents={},queue=[],noop=()=>{};let draws=0;
 const gradient={addColorStop:noop};const ctx=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,fillRect:()=>draws++},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
 function element(id){if(!elements.has(id))elements.set(id,{id,tagName:'DIV',textContent:'',className:'',hidden:false,disabled:false,width:960,height:540,open:false,click(){for(const fn of this.events.click??[])fn({});},showModal(){this.open=true;},close(){this.open=false;},focus:noop,style:{},dataset:{},events:{},classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},append:noop,getBoundingClientRect:()=>({width:960,height:540}),getContext:()=>ctx,blur:noop,setAttribute:noop,setPointerCapture:noop,addEventListener(name,fn){(this.events[name]??=[]).push(fn);}});return elements.get(id);}
 const controls=[...html.matchAll(/data-control="([^"]+)"/g)].map(([,name])=>{const b=element('control-'+name);b.dataset.control=name;b.tagName='BUTTON';return b;});
 const document={documentElement:{},createElement:()=>element('status'),body:{dataset:{game:html.match(/data-game="([^"]+)"/)?.[1]},append:noop,classList:{remove:noop,contains:()=>false,toggle:()=>false}},querySelector:selector=>selector==='.game'?element('stage'):selector==='.aside'?element('aside'):null,getElementById:element,querySelectorAll:selector=>selector==='[data-control]'?controls:[],activeElement:{tagName:'BODY',blur:noop},addEventListener:(name,fn,capture=false)=>(documentEvents[name]??=[]).push({fn,capture})};
 const sandbox={console,document,window:{addEventListener:(name,fn)=>(windowEvents[name]??=[]).push(fn)},navigator:{},performance:{now:()=>0},requestAnimationFrame:cb=>queue.push(cb)};
 vm.createContext(sandbox);
 for(const [,attrs,inline]of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
  assert.ok(!/type=["']module["']/.test(attrs),page+' must support opening directly from Finder');
  const src=attrs.match(/src="([^"]+)"/)?.[1];const code=src?fs.readFileSync(path.join(root,src),'utf8'):inline;
  vm.runInContext(code,sandbox,{filename:src??page+'.html'});
 }
 const click=id=>{assert.ok(element(id).events.click?.length,page+': missing '+id+' handler');for(const cb of element(id).events.click)cb({});};
 let now=0;function frames(count){for(let i=0;i<count;i++){assert.ok(queue.length,page+': animation loop stopped');now+=25;queue.shift()(now);}}
 click('startDemo');assert.equal(Number(element('score').textContent),0);
 const key=page==='animal-moves'?'w':page==='jungle-adventure'?'ArrowDown':' ';
 for(const cb of windowEvents.keydown??[])cb({key,repeat:false,preventDefault:noop,target:{closest:()=>null}});
 frames(140);
 for(const cb of windowEvents.keyup??[])cb({key});
 assert.ok(Number(element('time').textContent)<(page==='bubble-pop'||page==='star-motion'?45:60),page+': timer did not advance');
 assert.ok(draws>100,page+': canvas did not render');
 if(['animal-moves','superhero-training','jungle-adventure'].includes(page))assert.ok(Number(element('score').textContent)>=10,page+': keyboard action did not score');
 {click('pause');const time=element('time').textContent;frames(40);assert.equal(element('time').textContent,time,page+': pause did not freeze time');click('pause');frames(44);assert.ok(Number(element('time').textContent)<Number(time));}

 click('helpToggle');assert.equal(element('poseGuide').open,true,page+': guide did not open');
 const guideTime=element('time').textContent;frames(40);assert.equal(element('time').textContent,guideTime,page+': guide must pause game');
 let stopped=false;const escape={key:'Escape',target:{tagName:'BUTTON'},preventDefault:noop,stopPropagation:()=>stopped=true,stopImmediatePropagation:()=>stopped=true};
 for(const {fn,capture}of documentEvents.keydown??[])if(capture)fn(escape);
 if(!stopped)for(const fn of windowEvents.keydown??[])fn(escape);
 assert.equal(element('poseGuide').open,false,page+': Escape must close guide');frames(40);assert.equal(element('time').textContent,guideTime,page+': Escape must not resume game');
 click('helpToggle');click('poseGuideReturn');assert.equal(element('poseGuide').open,false);frames(44);assert.ok(Number(element('time').textContent)<Number(guideTime),page+': return should resume');
 click('helpToggle');click('poseGuideClose');assert.equal(element('poseGuide').open,false);
 click('startDemo');assert.equal(Number(element('score').textContent),0,page+': restart did not reset score');
 console.log('PASS:',page,'actual page scripts, drawing, demo controls, timer, pause/restart, guide open/close/Escape/resume');
}
