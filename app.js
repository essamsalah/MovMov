/* MovMov V2 – Bounceverse. Static browser game; no server required.
   Camera pose landmarks are processed in the browser with MediaPipe. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (n,lo,hi) => Math.max(lo,Math.min(hi,n));
  const rand = (a,b) => a + Math.random() * (b-a);
  const CHARACTERS = {
    alex:{name:'ALEX',src:'assets/characters/alex.svg',accent:'#54cfff'},
    luna:{name:'LUNA',src:'assets/characters/luna.svg',accent:'#ff65bb'},
    momo:{name:'MOMO',src:'assets/characters/momo.svg',accent:'#4af1ec'}
  };
  const W=1280,H=720,DURATION=45;
  const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
  const webcam=$('webcam'),skeleton=$('skeleton'),sk=skeleton.getContext('2d');
  const imgs={};for(const [id,c] of Object.entries(CHARACTERS)){imgs[id]=new Image();imgs[id].src=c.src;}
  const screens=['home','character','games','ready','game','result'];
  let screen='home';
  let selected=readStorage('movmov_character',null);
  if(!CHARACTERS[selected])selected=null;
  let selectedDraft=selected||'alex';
  let soundOn=true,audio=null;
  let cameraSession=0;
  let mediaStream=null,landmarker=null,camReady=false,camTracking=false,lastPoseSeen=0,lastPoseCall=0,lastVideoTime=-1,calibrationCenter=null,lastDetectedCenter=null;
  let mode='keyboard',lastFrame=performance.now(),worldTime=0;
  const keys={left:false,right:false};
  const touch={left:false,right:false};
  let game={state:'idle',score:0,health:3,remaining:DURATION,elapsed:0,playerPos:0,targetPos:0,objects:[],particles:[],starSpawn:.45,bumperSpawn:1.8,hitFlash:0,countdown:3,lastRenderedCount:null};
  function readStorage(k,fallback){try{return localStorage.getItem(k)??fallback}catch{return fallback}}
  function saveStorage(k,v){try{localStorage.setItem(k,String(v))}catch{}}
  function bestScore(){return Number(readStorage('movmov_best',0))||0}
  function playSound(freq=500, duration=.11, kind='sine',volume=.085){
    if(!soundOn)return;
    try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.type=kind;osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.68),audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain).connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration+.025);}catch{}
  }
  function show(name){
    if(!screens.includes(name))return;
    for(const s of screens){$(s+'Screen').classList.toggle('active',s===name)}
    screen=name;
    document.body.classList.toggle('body-playing',name==='game');
    if(name==='home')updateHome();
    if(name==='games')updateGames();
    if(name==='character')updateCharacterPicker();
    if(name==='ready')updateReady();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function updateHome(){
    $('homeCharacterLabel').textContent=selected?'CHANGE CHARACTER':'CHOOSE CHARACTER';
  }
  function updateCharacterPicker(){
    for(const card of document.querySelectorAll('.character-card')){
      const isSelected=card.dataset.character===selectedDraft;
      card.classList.toggle('selected',isSelected);card.setAttribute('aria-pressed',isSelected?'true':'false');
    }
  }
  function updateGames(){
    if(!selected)return;
    const c=CHARACTERS[selected];$('currentCharacterAvatar').src=c.src;
    $('currentCharacterName').textContent=c.name;$('gameCardHero').src=c.src;
  }
  function updateReady(){
    if(camReady){badge(camTracking?'● Body detected':'● Camera ready',camTracking?'good':'');
      $('startWithCamera').disabled=!camTracking;
      $('enableCamera').textContent='📷 CAMERA ON';
    }else{
      badge('● Not started','');$('startWithCamera').disabled=true;
      $('enableCamera').textContent='📷 ENABLE CAMERA';
    }
  }
  function badge(txt,cls=''){$('cameraBadge').textContent=txt;$('cameraBadge').className='connection-chip '+cls;}
  function cameraMessage(txt){$('cameraMessage').textContent=txt;}
  function stopCamera(){
    cameraSession++;
    if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null;}
    webcam.srcObject=null;camReady=false;camTracking=false;lastVideoTime=-1;lastPoseSeen=0;
    calibrationCenter=null;lastDetectedCenter=null;sk.clearRect(0,0,skeleton.width,skeleton.height);
    $('cameraPlaceholder').hidden=false;
    $('startWithCamera').disabled=true;
    $('enableCamera').disabled=false;
    $('enableCamera').textContent='📷 ENABLE CAMERA';badge('● Not started','');
  }
  function goHome(){stopCamera();game.state='idle';show('home')}
  $('brandHome').addEventListener('click',goHome);
  $('homePlay').addEventListener('click',()=>{if(!selected){selectedDraft='alex';show('character')}else show('games');playSound(620,.08)});
  $('homeCharacter').addEventListener('click',()=>{selectedDraft=selected||'alex';show('character');playSound(560,.08)});
  $('charactersBack').addEventListener('click',()=>show('home'));
  document.querySelectorAll('.character-card').forEach(card=>card.addEventListener('click',()=>{selectedDraft=card.dataset.character;updateCharacterPicker();playSound(680,.13)}));
  $('confirmCharacter').addEventListener('click',()=>{selected=selectedDraft;saveStorage('movmov_character',selected);updateHome();show('games');playSound(850,.15)});
  $('gamesBack').addEventListener('click',goHome);
  $('starChaseCard').addEventListener('click',()=>{show('ready');playSound(810,.13)});
  $('readyBack').addEventListener('click',()=>{stopCamera();show('games')});
  $('soundToggle').addEventListener('click',()=>{soundOn=!soundOn;$('soundToggle').textContent=soundOn?'♪':'♪̸';$('soundToggle').setAttribute('aria-label',soundOn?'Mute sound':'Enable sound');if(soundOn)playSound(720,.12)});
  $('fullscreenToggle').addEventListener('click',()=>{
    if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{})}
    else document.documentElement.requestFullscreen?.().catch(()=>{});
  });

  const connections=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
  const visible=p=>!!p&&(p.visibility===undefined||p.visibility>.52);
  function paintSkeleton(lm){
    sk.clearRect(0,0,skeleton.width,skeleton.height);if(!lm)return;
    const w=skeleton.width,h=skeleton.height;
    sk.strokeStyle='#3efaa1';sk.lineWidth=5;sk.lineCap='round';sk.shadowColor='#3efaa1';sk.shadowBlur=7;
    for(const [a,b] of connections){if(!visible(lm[a])||!visible(lm[b]))continue;sk.beginPath();sk.moveTo(lm[a].x*w,lm[a].y*h);sk.lineTo(lm[b].x*w,lm[b].y*h);sk.stroke()}
    sk.shadowBlur=0;sk.fillStyle='#fff5a3';for(const i of [11,12,13,14,15,16,23,24,25,26]){if(!visible(lm[i]))continue;sk.beginPath();sk.arc(lm[i].x*w,lm[i].y*h,6,0,Math.PI*2);sk.fill()}
  }
  async function enableCamera(){
    const session=++cameraSession;
    const button=$('enableCamera');button.disabled=true;button.textContent='⏳ CONNECTING...';
    badge('● Loading camera','');cameraMessage('Please allow camera access. Loading body tracking model…');
    try{
      if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Camera access requires HTTPS or localhost in a modern browser.');
      if(!mediaStream){
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30}},audio:false});
        if(session!==cameraSession){stream.getTracks().forEach(t=>t.stop());return}
        mediaStream=stream;webcam.srcObject=stream;await webcam.play();
        if(session!==cameraSession)return;
      }
      $('cameraPlaceholder').hidden=true;
      if(!landmarker){
        const vision=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm');
        if(session!==cameraSession)return;
        const wasm=await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm');
        if(session!==cameraSession)return;
        const options={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:'GPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5,minTrackingConfidence:.5};
        let detector;
        try{detector=await vision.PoseLandmarker.createFromOptions(wasm,options)}catch(e){
          if(session!==cameraSession)return;
          console.info('MediaPipe GPU unavailable; using CPU.',e);options.baseOptions.delegate='CPU';detector=await vision.PoseLandmarker.createFromOptions(wasm,options);
        }
        if(session!==cameraSession){detector.close();return}
        landmarker=detector;
      }
      camReady=true;calibrationCenter=null;lastDetectedCenter=null;lastPoseSeen=0;lastVideoTime=-1;camTracking=false;
      badge('● Stand in frame','');cameraMessage('Stand in the green frame so we can detect your shoulders.');
      playSound(850,.1);
    }catch(e){
      if(session!==cameraSession)return;
      console.error('Camera could not start',e);
      stopCamera();badge('● Camera unavailable','bad');
      cameraMessage(e.name==='NotAllowedError'?'Camera permission denied. Enable it in your browser or try keyboard mode.':(e.message||'Could not start the camera. Try the keyboard option.'));
    }finally{
      if(session===cameraSession){button.disabled=false;button.textContent=camReady?'📷 CAMERA ON':'📷 RETRY CAMERA'}
    }
  }
  $('enableCamera').addEventListener('click',enableCamera);
  $('startWithCamera').addEventListener('click',()=>{if(camReady&&camTracking){calibrationCenter=lastDetectedCenter;mode='camera';startRound()}});
  $('startWithKeyboard').addEventListener('click',()=>{stopCamera();mode='keyboard';startRound()});
  function poseTick(now){
    if(!camReady||!landmarker||!webcam.srcObject||webcam.readyState<2||now-lastPoseCall<115||webcam.currentTime===lastVideoTime)return;
    if(!['ready','game','result'].includes(screen))return;
    lastPoseCall=now;lastVideoTime=webcam.currentTime;
    try{
      const result=landmarker.detectForVideo(webcam,now);
      const lm=result.landmarks?.[0];paintSkeleton(lm);
      if(lm&&visible(lm[11])&&visible(lm[12])){
        const center=1-(lm[11].x+lm[12].x)/2;lastDetectedCenter=center;
        if(calibrationCenter===null)calibrationCenter=center;
        lastPoseSeen=now;
        if(!camTracking){camTracking=true;if(screen==='ready'){badge('● Body detected','good');cameraMessage('Great! You are in the zone. You only need to lean LEFT or RIGHT.');$('startWithCamera').disabled=false;}}
        if(screen==='game'&&mode==='camera'){
          game.targetPos=clamp((center-calibrationCenter)/.20,-1,1);
          if(game.state==='recenter'){game.countdown=2;game.lastRenderedCount=null;game.state='countdown';setOverlay('<div class="countdown" id="countdownText">2</div>');}
        }
      }else if(now-lastPoseSeen>1600&&camTracking){
        camTracking=false;
        if(screen==='ready'){badge('● Move into frame','bad');cameraMessage('We lost your shoulders. Please stand where your upper body is visible.');$('startWithCamera').disabled=true;}
      }
    }catch(e){console.warn('Pose detection error',e)}
  }

  function updateHud(){
    $('hudScore').textContent=game.score;
    $('hudLives').textContent='♥ '.repeat(game.health).trim()||'—';
    $('hudTime').textContent=Math.ceil(game.remaining);
  }
  function startRound(){
    if(!selected){show('character');return}
    game={state:'countdown',score:0,health:3,remaining:DURATION,elapsed:0,playerPos:0,targetPos:0,objects:[],particles:[],starSpawn:1.2,bumperSpawn:2.1,hitFlash:0,countdown:3,lastRenderedCount:null};
    keys.left=keys.right=touch.left=touch.right=false;
    updateHud();show('game');setOverlay('<div class="countdown" id="countdownText">3</div>');
    $('trackingPill').className='tracking-pill '+(mode==='camera'?'good':'');
    $('trackingText').textContent=mode==='camera'?'CAMERA TRACKING':'KEYBOARD MODE';
    playSound(700,.11);
  }
  function setOverlay(html){$('gameOverlay').innerHTML=html;$('gameOverlay').classList.remove('hidden')}
  function resumeRound(){game.state='countdown';game.countdown=2;game.lastRenderedCount=null;setOverlay('<div class="countdown" id="countdownText">2</div>')}
  function pauseRound(){
    if(screen!=='game')return;
    if(game.state==='playing'||game.state==='countdown'){
      game.state='paused';setOverlay('<div class="pause-panel"><h2>PAUSED ⏸</h2><p>Take a moment. Your hero will be right here!</p><button class="big-btn yellow" data-resume>▶ RESUME</button><button class="big-btn purple" data-quit>⌂ GAME MENU</button></div>');
    }else if(game.state==='paused')resumeRound();
  }
  $('pauseBtn').addEventListener('click',pauseRound);
  $('gameOverlay').addEventListener('click',e=>{
    if(e.target.closest('[data-resume]'))resumeRound();
    if(e.target.closest('[data-quit]')){game.state='idle';stopCamera();show('games')}
  });
  window.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight',' ','Escape','p','P'].includes(e.key)&&screen==='game')e.preventDefault();
    if(e.key==='ArrowLeft')keys.left=true;
    if(e.key==='ArrowRight')keys.right=true;
    if(screen==='game'&&(e.key==='Escape'||e.key.toLowerCase()==='p')&&!e.repeat)pauseRound();
  });
  window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft')keys.left=false;if(e.key==='ArrowRight')keys.right=false});
  window.addEventListener('blur',()=>{keys.left=false;keys.right=false;touch.left=false;touch.right=false;if(['playing','countdown'].includes(game.state)&&screen==='game')pauseRound()});
  for(const side of ['left','right']){
    const el=$(side==='left'?'touchLeft':'touchRight');
    el.addEventListener('pointerdown',e=>{e.preventDefault();touch[side]=true;try{el.setPointerCapture(e.pointerId)}catch{}});
    for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>touch[side]=false);
  }
  function spawn(kind){
    const lanes=[-1,0,1],lane=lanes[Math.floor(Math.random()*3)];
    game.objects.push({kind,lane,z:-.07,speed:rand(.30,.37),spin:rand(-.5,.5),processed:false});
  }
  function burst(x,y,color='#ffe23b',count=12){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(50,240);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.3,.85),max:.85,r:rand(2.5,7),color})}}
  function addScore(){game.score++;updateHud();burst(640+game.playerPos*350,555,'#ffe833',15);playSound(780+(game.score%8)*40,.095)}
  function takeHit(){game.health--;game.hitFlash=.35;updateHud();burst(640+game.playerPos*350,575,'#ff66bf',18);playSound(185,.25,'sawtooth',.08);if(game.health<=0)endRound()}
  function endRound(){
    if(game.state==='finished')return;
    game.state='finished';
    const best=Math.max(bestScore(),game.score);saveStorage('movmov_best',best);
    $('resultHero').src=CHARACTERS[selected].src;
    $('resultScore').textContent=game.score;
    $('resultBest').textContent=best;
    $('resultTime').textContent=Math.round(game.elapsed)+'s';
    $('resultTitle').textContent=game.health>0?'LEVEL COMPLETE!':'NICE TRY, HERO!';
    const stars=game.score>=18?3:game.score>=9?2:game.score>=3?1:0;
    $('resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
    $('resultMessage').textContent=game.score>=18?'WOW! You’re a MovMov champion!':game.score>=9?'Amazing moves! Let’s go again!':'Every hero gets better with practice!';
    show('result');playSound(900,.26);
  }
  $('playAgain').addEventListener('click',()=>{if(mode==='camera'&&!camReady){show('ready')}else startRound()});
  $('otherGames').addEventListener('click',()=>{stopCamera();show('games')});
  function gameUpdate(dt,now){
    if(game.state==='paused'||game.state==='idle'||game.state==='finished')return;
    if(game.state==='recenter')return;
    if(mode==='camera'&&game.state==='playing'&&now-lastPoseSeen>2400){
      game.state='recenter';$('trackingPill').className='tracking-pill bad';$('trackingText').textContent='STEP INTO CAMERA VIEW';
      setOverlay('<div class="pause-panel"><h2>CAN’T SEE YOU 👀</h2><p>Move back into the camera view. The game will resume automatically!</p><button class="big-btn purple" data-quit>⌂ GAME MENU</button></div>');return;
    }
    if(game.state==='countdown'){
      game.countdown-=dt;
      if(game.countdown<=0){game.state='playing';$('gameOverlay').classList.add('hidden');$('trackingPill').className='tracking-pill '+(mode==='camera'?'good':'');$('trackingText').textContent=mode==='camera'?'CAMERA TRACKING':'KEYBOARD MODE';playSound(1000,.20);return}
      const number=Math.ceil(game.countdown);
      if(game.lastRenderedCount!==number){game.lastRenderedCount=number;const el=$('countdownText');if(el){el.textContent=number>=1?String(number):'GO!';playSound(470+number*70,.065)}}
      return;
    }
    if(mode==='keyboard'){
      const direction=(keys.right||touch.right?1:0)-(keys.left||touch.left?1:0);
      game.targetPos=clamp(game.targetPos+direction*1.28*dt,-1.04,1.04);
    }
    game.playerPos+=(game.targetPos-game.playerPos)*Math.min(1,dt*(mode==='camera'?7:13));
    game.elapsed+=dt;game.remaining=Math.max(0,DURATION-game.elapsed);
    game.hitFlash=Math.max(0,game.hitFlash-dt);
    game.starSpawn-=dt;game.bumperSpawn-=dt;
    if(game.starSpawn<=0){spawn('star');game.starSpawn=rand(.52,.82)}
    if(game.bumperSpawn<=0){spawn('bumper');game.bumperSpawn=rand(2.4,3.6)}
    for(const o of game.objects){
      o.z+=o.speed*dt;o.spin+=dt*(o.kind==='star'?1.6:.5);
      if(o.z>.89&&!o.processed){
        o.processed=true;
        if(Math.abs(game.playerPos-o.lane*.98)<.38){
          if(o.kind==='star')addScore();else {takeHit();if(game.state==='finished')break}
          o.z=2;
        }
      }
    }
    game.objects=game.objects.filter(o=>o.z<1.17);
    for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=210*dt;p.life-=dt}
    game.particles=game.particles.filter(p=>p.life>0);
    updateHud();
    if(game.remaining<=0)endRound();
  }
  function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
  function starShape(cx,cy,outer,inner=outer*.46,rotation=0){ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2+rotation,r=i%2?inner:outer;const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.closePath()}
  function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
  function drawCloud(x,y,scale=1,opacity=.9){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.globalAlpha=opacity;ellipse(0,6,100,32,'#fff');ellipse(-38,-10,52,41,'#fff');ellipse(29,-30,59,48,'#f6ffff');ellipse(70,0,45,31,'#fff');ctx.restore()}
  function drawIsland(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ellipse(0,45,122,38,'#244fb257');
    const dirt=ctx.createLinearGradient(0,8,0,122);dirt.addColorStop(0,'#ffa84b');dirt.addColorStop(.7,'#f1669f');dirt.addColorStop(1,'#9137be');ctx.fillStyle=dirt;
    ctx.beginPath();ctx.moveTo(-122,14);ctx.quadraticCurveTo(-108,62,-23,114);ctx.quadraticCurveTo(5,140,33,114);ctx.quadraticCurveTo(113,65,122,14);ctx.closePath();ctx.fill();
    ellipse(0,14,122,35,'#61df86');ellipse(0,-1,115,23,'#b4f577');
    for(let i=-1;i<=1;i++){ctx.fillStyle=i===0?'#ff70bc':'#55cffe';rr(i*55-12,-76,24,83,11);ctx.fill();ellipse(i*55,-77,20,15,'#ffce51')}
    ctx.restore();}
  function laneX(lane,z){return 640+lane*(56+366*Math.max(0,z))}
  function roadY(z){return 255+364*Math.pow(Math.max(0,z),1.5)}
  function drawBackground(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#2375f8');sky.addColorStop(.48,'#6bcaff');sky.addColorStop(1,'#e5a8f5');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const sun=ctx.createRadialGradient(830,150,5,830,150,330);sun.addColorStop(0,'#fff9dbaa');sun.addColorStop(1,'#fff9d000');ctx.fillStyle=sun;ctx.fillRect(495,0,680,490);ellipse(830,115,72,72,'#fff0a3b5');
    drawCloud(165+Math.sin(worldTime*.13)*15,157,.78,.68);drawCloud(980-Math.sin(worldTime*.11)*12,185,.9,.6);drawCloud(510+Math.cos(worldTime*.10)*17,80,.48,.48);
    drawIsland(150,279,.75);drawIsland(1080,265,.85);drawIsland(1089,104,.38);drawIsland(325,80,.3);
    // Decorative inflatable columns behind the runway
    for(const [x,y,s] of [[112,464,1.3],[1138,445,1.3],[350,339,.58],[927,338,.58]]){
      ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#4230b0';rr(-22,-108,44,120,19);ctx.fill();ctx.fillStyle='#ff62a8';rr(-27,-109,54,96,22);ctx.fill();ellipse(0,-109,27,11,'#ffa5d0');ellipse(0,-13,30,12,'#ffc840');ctx.restore();
    }
    // Broad track in perspective
    ctx.beginPath();ctx.moveTo(582,254);ctx.lineTo(697,254);ctx.lineTo(1270,719);ctx.lineTo(10,719);ctx.closePath();
    const road=ctx.createLinearGradient(0,250,0,720);road.addColorStop(0,'#ffd65e');road.addColorStop(.55,'#ff9d70');road.addColorStop(1,'#ffcc54');ctx.fillStyle=road;ctx.fill();
    // stripes recede toward the horizon
    for(let i=0;i<15;i++){const z=i/15,z2=(i+.32)/15;const y1=roadY(z),y2=roadY(z2);const left1=640-(58+572*z),right1=640+(58+572*z),left2=640-(58+572*z2),right2=640+(58+572*z2);
      ctx.fillStyle=i%2?'#ffda5987':'#ff7ec283';ctx.beginPath();ctx.moveTo(left1,y1);ctx.lineTo(right1,y1);ctx.lineTo(right2,y2);ctx.lineTo(left2,y2);ctx.fill();}
    // lane lines
    for(const lane of [-.5,.5]){ctx.beginPath();for(let j=0;j<=25;j++){const z=j/25,x=laneX(lane,z),y=roadY(z);if(j)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.strokeStyle='#ffffff8c';ctx.lineWidth=7;ctx.setLineDash([14,19]);ctx.stroke();ctx.setLineDash([])}
    // edge tubing
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(640+side*62,248);ctx.lineTo(640+side*623,720);ctx.lineWidth=31;ctx.strokeStyle='#4e3bc8';ctx.stroke();ctx.beginPath();ctx.moveTo(640+side*62,248);ctx.lineTo(640+side*623,720);ctx.lineWidth=17;ctx.strokeStyle=side===1?'#ff56b7':'#59d8ff';ctx.stroke();}
    for(let i=0;i<24;i++){let x=30+((i*163)%1250),y=70+((i*79)%300);ctx.globalAlpha=.3+.25*Math.sin(worldTime+i);starShape(x,y,3+i%4,1.7);ctx.fillStyle='#fff';ctx.fill()}ctx.globalAlpha=1;
  }
  function drawStarObject(x,y,s,rot){ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(rot)*.12);ctx.scale(s,s);ctx.shadowColor='#fff05d';ctx.shadowBlur=20;starShape(0,0,35,17);const gold=ctx.createLinearGradient(-30,-30,30,34);gold.addColorStop(0,'#ffffa2');gold.addColorStop(.5,'#ffe339');gold.addColorStop(1,'#ff9b2f');ctx.fillStyle=gold;ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=5;ctx.strokeStyle='#fff7ae';ctx.stroke();ellipse(-11,-6,4,5,'#91562f');ellipse(12,-6,4,5,'#91562f');ctx.beginPath();ctx.arc(1,6,9,0,Math.PI);ctx.lineWidth=3;ctx.strokeStyle='#a56625';ctx.stroke();ctx.restore()}
  function drawBumper(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.shadowColor='#25208c77';ctx.shadowBlur=16;const g=ctx.createLinearGradient(-40,-55,40,55);g.addColorStop(0,'#ffb1d8');g.addColorStop(.37,'#ff4fa7');g.addColorStop(1,'#a62cbd');ctx.fillStyle=g;rr(-49,-46,98,94,37);ctx.fill();ctx.shadowBlur=0;ctx.lineWidth=6;ctx.strokeStyle='#ffe1f4';ctx.stroke();ellipse(-15,-9,8,12,'#552673');ellipse(15,-9,8,12,'#552673');ctx.beginPath();ctx.arc(0,10,12,.15,Math.PI-.15);ctx.lineWidth=4;ctx.strokeStyle='#5d287f';ctx.stroke();ctx.restore()}
  function drawHero(){
    const x=640+game.playerPos*350,y=638+Math.sin(worldTime*8)*4;ellipse(x,y+29,63,18,'#2621815e');
    ctx.save();ctx.translate(x,y-115);ctx.rotate((game.targetPos-game.playerPos)*.11);let sprite=imgs[selected||'alex'];
    ctx.shadowColor='#1f167b60';ctx.shadowBlur=18;
    if(sprite?.complete&&sprite.naturalWidth){ctx.drawImage(sprite,-108,-171,216,313)}else{ellipse(0,-24,80,110,CHARACTERS[selected||'alex'].accent)}
    ctx.restore();
  }
  function drawWorld(){
    ctx.save();ctx.clearRect(0,0,W,H);drawBackground();
    for(const o of [...game.objects].sort((a,b)=>a.z-b.z)){if(o.z<0)continue;let z=o.z;const x=laneX(o.lane,z),y=roadY(z);const s=.28+z*1.23;
      ellipse(x,y+25*s,35*s,9*s,'#38298f46');
      if(o.kind==='star')drawStarObject(x,y-45*s,s,o.spin);else drawBumper(x,y-33*s,s);
    }
    drawHero();
    for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ellipse(p.x,p.y,p.r,p.r,p.color)}ctx.globalAlpha=1;
    if(game.hitFlash>0){ctx.globalAlpha=game.hitFlash*.7;ctx.fillStyle='#ff3d85';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
    ctx.restore();
  }
  function frame(now){
    const dt=clamp((now-lastFrame)/1000,0,.045);lastFrame=now;worldTime+=dt;
    if(screen==='game'){poseTick(now);gameUpdate(dt,now);drawWorld()}
    else if(screen==='ready'||screen==='result')poseTick(now);
    requestAnimationFrame(frame);
  }
  window.addEventListener('beforeunload',()=>{stopCamera();try{landmarker?.close()}catch{}});
  updateHome();requestAnimationFrame(frame);
})();
