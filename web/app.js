'use strict';
const modules={transformer:'Transformer',attention:'U-Net Attention',depth:'Depth Anything',cotracker:'CoTracker3'};
const frames=new Map();
let active='home';
const home=document.getElementById('home');
const classroom=document.getElementById('classroom');
const loading=document.getElementById('loading');
const continueLink=document.getElementById('continue');
document.querySelector('.skip').addEventListener('click',event=>{
  event.preventDefault();
  document.getElementById('main').focus();
});
function remember(id){try{localStorage.setItem('ai-visual-lab:last-module',id);}catch{}}
function lastModule(){try{return localStorage.getItem('ai-visual-lab:last-module');}catch{return null;}}
function navigate(){
  const hash=location.hash.slice(1);
  const id=Object.hasOwn(modules,hash)?hash:'home';
  const previous=active;
  active=id;
  document.querySelectorAll('[data-module]').forEach(link=>{
    const selected=link.dataset.module===id;
    if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  });
  home.hidden=id!=='home';
  classroom.hidden=id==='home';
  document.body.classList.toggle('in-classroom',id!=='home');
  for(const [key,frame]of frames)frame.hidden=key!==id;
  document.title=id==='home'?'AI Visual Lab · 模型交互课堂':`${modules[id]} · AI Visual Lab`;
  if(id==='home'){
    loading.hidden=true;
    const last=lastModule();
    continueLink.hidden=!Object.hasOwn(modules,last);
    if(!continueLink.hidden){continueLink.href='#'+last;continueLink.textContent=`继续 ${modules[last]} →`;}
  }else{
    remember(id);
    document.getElementById('classroom-title').textContent=modules[id];
    document.getElementById('expand').href=`./modules/${id}/`;
    if(!frames.has(id)){
      const frame=document.createElement('iframe');
      frame.title=`${modules[id]} 交互课堂`;
      frame.src=`./modules/${id}/`;
      frame.addEventListener('load',()=>{
        frame.dataset.ready='true';
        if(active===id)loading.hidden=true;
      });
      frames.set(id,frame);
      document.getElementById('frames').append(frame);
    }
    frames.get(id).hidden=false;
    loading.hidden=frames.get(id).dataset.ready==='true';
  }
  if(previous!==id)window.scrollTo(0,0);
}
window.addEventListener('hashchange',navigate);
navigate();
