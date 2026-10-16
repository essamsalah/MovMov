// Screen layout and browser fullscreen controls shared by every page.
(() => {
  'use strict';
  const body=document.body,stage=document.querySelector('.game'),canvas=document.getElementById('gameCanvas');
  const status=document.createElement('div');status.className='experience-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');body.append(status);
  let messageTimer;
  function message(text){status.textContent=text;clearTimeout(messageTimer);messageTimer=setTimeout(()=>status.textContent='',4500);}
  const fullscreenButtons=document.querySelectorAll('.fullscreen-toggle');
  function updateFullscreen(){const on=!!(document.fullscreenElement||document.webkitFullscreenElement);for(const button of fullscreenButtons){button.textContent=on?'⛶ خروج من ملء الشاشة':'⛶ ملء الشاشة';button.setAttribute('aria-pressed',String(on));button.title='ملء الشاشة (F) — Escape للخروج';}}
  async function fullscreen(){try{if(document.fullscreenElement||document.webkitFullscreenElement){const exit=document.exitFullscreen||document.webkitExitFullscreen;if(exit)await exit.call(document);}else{const enter=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;if(!enter){message('ملء الشاشة مش متاح هنا. جرّب فتح اللعبة في Chrome أو كبّر نافذة المتصفح.');return;}await enter.call(document.documentElement);}updateFullscreen();}catch{message('تعذر ملء الشاشة. جرّب زر ملء الشاشة في متصفحك.');}}
  for(const button of fullscreenButtons)button.addEventListener('click',fullscreen);
  document.addEventListener('fullscreenchange',updateFullscreen);document.addEventListener('webkitfullscreenchange',updateFullscreen);updateFullscreen();
  const help=document.getElementById('detailsToggle'),aside=document.querySelector('.aside');
  const inputToggle=document.getElementById('inputToggle'),pauseButton=document.getElementById('pause');
  inputToggle?.addEventListener('click',()=>{const open=body.classList.toggle('choose-input');inputToggle.setAttribute('aria-expanded',String(open));if(open&&pauseButton&&!pauseButton.disabled&&pauseButton.textContent.includes('إيقاف'))pauseButton.click();});
  function syncSession(){body.classList.toggle('session-active',!!pauseButton&&!pauseButton.disabled);}
  if(pauseButton&&typeof MutationObserver!=='undefined')new MutationObserver(syncSession).observe(pauseButton,{attributes:true,attributeFilter:['disabled']});
  syncSession();
  const guide=document.getElementById('poseGuide'),guideButton=document.getElementById('helpToggle');
  function openGuide(){if(!guide||guide.open)return;closeHelp();body.classList.remove('choose-input');inputToggle?.setAttribute('aria-expanded','false');if(pauseButton&&!pauseButton.disabled&&pauseButton.textContent.includes('إيقاف'))pauseButton.click();guide.showModal();}
  function closeGuide(){if(guide?.open)guide.close();guideButton?.focus();}
  guideButton?.addEventListener('click',openGuide);
  const zoom=document.getElementById('poseGuideZoom');
  zoom?.addEventListener('click',()=>{const on=guide.classList.toggle('zoomed');zoom.setAttribute('aria-pressed',String(on));zoom.textContent=on?'🔍 تصغير الرسم':'🔍 تكبير الرسم';});
  guide?.addEventListener('close',()=>{guide.classList.remove('zoomed');zoom?.setAttribute('aria-pressed','false');if(zoom)zoom.textContent='🔍 تكبير الرسم';});
  document.getElementById('detailsClose')?.addEventListener('click',()=>{closeHelp();guideButton?.focus();});
  document.getElementById('poseGuideClose')?.addEventListener('click',closeGuide);
  document.getElementById('poseGuideReturn')?.addEventListener('click',()=>{closeGuide();if(pauseButton&&!pauseButton.disabled&&pauseButton.textContent.startsWith('▶'))pauseButton.click();});
  guide?.addEventListener('click',event=>{if(event.target===guide){const r=guide.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeGuide();}});
  document.getElementById('poseGuideImage')?.addEventListener('error',()=>{document.getElementById('poseGuideError').hidden=false;});
  // Consume modal keys before the game can treat Escape as an instruction to resume.
  document.addEventListener('keydown',event=>{if(!guide?.open)return;event.stopPropagation();if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeGuide();}},true);
  function closeHelp(){body.classList.remove('help-open');help?.setAttribute('aria-expanded','false');if(help)help.textContent='الكاميرا والتعليمات';}
  help?.addEventListener('click',()=>{if(guide?.open)guide.close();const open=body.classList.toggle('help-open');help.setAttribute('aria-expanded',String(open));help.textContent=open?'✕ إغلاق التعليمات':'الكاميرا والتعليمات';if(open){const pause=document.getElementById('pause');if(pause&&!pause.disabled&&pause.textContent.includes('إيقاف'))pause.click();}});
  document.addEventListener('pointerdown',event=>{if(body.classList.contains('help-open')&&aside&&!aside.contains(event.target)&&!help.contains(event.target))closeHelp();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeHelp();if(event.key.toLowerCase()==='f'&&!event.repeat&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();fullscreen();}});
  function mode(input){body.dataset.input=input;body.classList.remove('choose-input');inputToggle?.setAttribute('aria-expanded','false');closeHelp();}
  document.getElementById('startDemo')?.addEventListener('click',()=>mode('demo'));
  document.getElementById('startCamera')?.addEventListener('click',()=>mode('camera'));
  // Size the actual canvas element, avoiding letterboxing inside its pointer hit area.
  function fitStage(){if(!stage||!canvas)return;const box=stage.getBoundingClientRect(),ratio=canvas.width/canvas.height;const width=Math.max(1,Math.floor(Math.min(box.width,box.height*ratio)));const height=Math.max(1,Math.floor(width/ratio));if(canvas.style.width!==width+'px')canvas.style.width=width+'px';if(canvas.style.height!==height+'px')canvas.style.height=height+'px';}
  if(stage&&canvas){if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitStage).observe(stage);window.addEventListener('resize',fitStage);document.addEventListener('fullscreenchange',fitStage);requestAnimationFrame(fitStage);}
})();
