import {chapters,glossary,quizzes,stages,architectureMap,lessonContent} from './lessons.js';
import {POINTS,OCCLUDED,TEACHERS,targetAt,illustrativeTrack,onlineWindow,teacherForBatch,safeChapter} from './state.js';
import {scene,frameStrip,patchGrid,pairMatrix,pairReadout,attentionGrid,windowsDiagram,featureMap} from './diagrams.js';
const $=id=>document.getElementById(id);
const ids=chapters.map(c=>c.id),storageKey='cotracker3:guided-lesson:v2';
let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};}catch{}
const visited=new Set(Array.isArray(saved.visited)?saved.visited.filter(x=>ids.includes(x)):[]);
const answers={};for(const [id,q] of Object.entries(quizzes)){if(Number.isInteger(saved.answers?.[id])&&saved.answers[id]>=0&&saved.answers[id]<q.choices.length)answers[id]=saved.answers[id];}
const state={query:0,point:0,view:'result',taskFrame:0,stage:0,scale:0,qCell:4,tCell:4,attention:'time',time:2,tokenPoint:1,iteration:0,frame:5,window:0,training:'train',teacher:teacherForBatch(),batch:1};
let current='task';
const coords=p=>`(${Math.round(p.x)}, ${Math.round(p.y)})`;
function save(){try{localStorage.setItem(storageKey,JSON.stringify({visited:[...visited],answers}));}catch{}}
function pressed(selector,value){document.querySelectorAll(selector).forEach(el=>el.setAttribute('aria-pressed',String(el.dataset[Object.keys(el.dataset)[0]]===String(value))));}
function nav(){
  $('chapter-nav').innerHTML=chapters.map((c,i)=>`<a href="#${c.id}" ${c.id===current?'aria-current="step"':''}><span class="nav-index">${String(i+1).padStart(2,'0')}</span><span>${c.title}<small>${c.question}</small></span>${visited.has(c.id)?'<span class="visited" aria-label="已浏览">✓</span>':''}</a>`).join('');
  $('progress-label').textContent=`${visited.size} / ${chapters.length}`;$('progress').value=visited.size;
}
function render(){
  current=safeChapter(location.hash.slice(1),ids);const index=ids.indexOf(current),chapter=chapters[index];
  visited.add(current);save();nav();document.title=`${chapter.title} · CoTracker3`;
  $('lesson').innerHTML=`<div class="chapter-heading"><p class="eyebrow">CHAPTER ${String(index+1).padStart(2,'0')} / 09 <span>约 ${chapter.time}</span></p><h1>${chapter.question}</h1><p class="chapter-subtitle">${chapter.title}</p></div><div class="chapter-content">${lessonContent(current)}</div><nav class="lesson-pagination" aria-label="章节翻页">${index?`<a href="#${ids[index-1]}">← ${chapters[index-1].title}</a>`:'<span>按顺序学，也可以从左侧跳转</span>'}${index<ids.length-1?`<a class="primary" href="#${ids[index+1]}">下一章 · ${chapters[index+1].title} →</a>`:'<a class="primary" href="#architecture">再走一遍架构 →</a>'}</nav><p class="lesson-footnote">教学示意 · 不运行模型权重 · 来源可在第 9 章核对</p>`;
  if(current==='task'){$('query-frame').value=state.query;$('query-point').value=state.point;renderTask();}
  if(current==='architecture')renderStage();
  if(current==='features')renderFeatures();
  if(current==='correlation')renderPairs();
  if(current==='joint')renderAttention();
  if(current==='refinement'){$('iteration').value=state.iteration;$('refine-frame').value=state.frame;renderRefinement();}
  if(current==='modes')renderWindows();
  if(current==='training')renderTraining();
  if(current==='recap'){$('quiz-summary').textContent=`理解检查：已答 ${Object.keys(answers).length} / 5 题，答对 ${Object.entries(answers).filter(([id,a])=>quizzes[id].answer===a).length} / 5 题。可回到各章节重新作答。`;}
  if(quizzes[current]&&Object.hasOwn(answers,current))renderAnswer(current);
  if(matchMedia('(max-width:760px)').matches)document.querySelector('#chapter-nav [aria-current]').scrollIntoView({block:'nearest',inline:'center'});
}
function renderTask(){
  const initial=state.view==='initial',origin=targetAt(state.query,state.point);
  pressed('[data-view]',state.view);
  renderTaskFrame();
  $('task-frames').innerHTML=frameStrip({query:state.query,point:state.point,iteration:initial?0:4,reference:true});
  $('task-readout').innerHTML=`<b>已知起点：${POINTS[state.point]}，第 ${state.query+1} 帧，${coords(origin)}</b><p>${initial?'初始化：把这个位置复制到全部六帧，先猜每帧都在同一坐标。它不包含正确的运动轨迹。':'输出示例：每帧一个位置。第 3、4 帧被遮挡，仍维护估计位置，可见性应降低。'}</p>`;
}
function renderTaskFrame(){
  const initial=state.view==='initial',frame=state.taskFrame,p=illustrativeTrack(initial?0:4,state.query,state.point)[frame];
  $('task-scene').innerHTML=scene(frame,{query:state.query,point:state.point,iteration:initial?0:4,reference:true});
  $('task-frame').value=frame;$('task-frame-label').textContent=`第 ${frame+1} 帧`;
  $('task-frame-state').innerHTML=`<p><b>P · 位置：</b>${coords(p)}</p><p><b>V · 可见性：</b>${initial?'初始 logit = 0 → 概率 0.5':OCCLUDED.includes(frame)?'此帧被遮挡，可见性应较低':'此帧可见，可见性应较高'}</p><p><b>C · 位置置信度：</b>${initial?'初始 logit = 0 → 概率 0.5':'由另一个输出值表达，不能从 V 直接推导'}</p>`;
}
function renderStage(){
  const s=stages[state.stage];$('architecture-diagram').innerHTML=architectureMap(state.stage);
  $('stage-count').textContent=`步骤 ${state.stage+1} / ${stages.length}`;$('stage-title').textContent=s.title;
  $('stage-explanation').innerHTML=`<dt>拿到什么</dt><dd>${s.input}</dd><dt>做了什么</dt><dd>${s.action}</dd><dt>交出什么</dt><dd>${s.output}</dd>`;
  $('stage-prev').disabled=state.stage===0;$('stage-next').textContent=state.stage===5?'回到采样，看下一轮 ↶':'下一步 →';
  $('stage-dots').innerHTML=stages.map((_,i)=>`<button data-stage="${i}" aria-label="转到架构步骤 ${i+1}" aria-pressed="${state.stage===i}">${i+1}</button>`).join('');
}
function renderFeatures(){
  pressed('[data-scale]',state.scale);$('feature-scene').innerHTML=scene(1,{estimates:false});$('feature-map').innerHTML=featureMap(state.scale);
  $('scale-scene').innerHTML=scene(5,{query:0,iteration:2,patch:true,scale:state.scale});
  $('scale-title').textContent=`尺度 ${state.scale+1}：原图的 1/${4*2**state.scale}`;
  $('scale-explanation').textContent=['较细的特征图保留更多空间细节，适合细化位置。紫色框表示当前位置周围的采样范围。','同样取 7×7 个特征位置，但每个格点在原图里对应更大的区域，能覆盖更大的位移。','空间格点更稀疏；相同大小的局部邻域获得更广的上下文，但定位更粗。','最粗尺度覆盖更大的原图范围。各尺度互相补充，最终的匹配证据会拼接起来。'][state.scale];
}
function renderPairs(){
  $('query-patch').innerHTML=patchGrid('q',state.qCell);$('current-patch').innerHTML=patchGrid('t',state.tCell);
  $('pair-matrix').innerHTML=pairMatrix(state.qCell,state.tCell);$('pair-readout').innerHTML=pairReadout(state.qCell,state.tCell);
}
function renderAttention(){
  pressed('[data-attention]',state.attention);$('attention-grid').innerHTML=attentionGrid(state.attention,state.time,state.tokenPoint);
  const p=POINTS[state.tokenPoint],t=state.time+1;
  $('attention-readout').innerHTML=state.attention==='time'?`<b>选中 ${p}，第 ${t} 帧：沿着 ${p} 这一行跨时间交流。</b><p>同一个物理点在六帧中的状态参与时间注意力。这里行是点、列是帧；高亮整行表示信息范围，不表示实际 attention 权重。</p>`:`<b>选中 ${p}，第 ${t} 帧：同一列的点通过代理交流。</b><p>A、B、C 的当前状态被代理读取，代理之间交流，再由真实点读取代理。高亮同列表示参与通信的 token，不表示真实点直接做完整两两空间 attention。</p>`;
  $('proxy-explanation').innerHTML=state.attention==='group'?'<div class="proxy-route">真实点 → 代理读取 → 代理自注意力 → 真实点读取代理</div>':'<p class="caption">代理也分别参与时间注意力；此处高亮所选真实点的跨帧路径，帮助区分两种交流方向。</p>';
}
function renderRefinement(){
  const track=illustrativeTrack(state.iteration,state.query,state.point),previous=illustrativeTrack(Math.max(0,state.iteration-1),state.query,state.point),p=track[state.frame],old=previous[state.frame];
  $('iteration-label').textContent=`m = ${state.iteration}${state.iteration===0?' · 初始':''}`;
  $('refine-query').innerHTML=scene(state.query,{query:state.query,point:state.point,estimates:false,patch:true,iteration:0});
  $('refine-current').innerHTML=scene(state.frame,{query:state.query,point:state.point,iteration:state.iteration,reference:true,patch:true});
  const dx=Math.round(p.x)-Math.round(old.x),dy=Math.round(p.y)-Math.round(old.y),signed=n=>n>=0?'+'+n:String(n);
  $('refine-numbers').innerHTML=`<span>${state.iteration===0?'复制 Query':'上一轮 P'}<b>${coords(old)}</b></span><strong>+</strong><span>示意 ΔP<b>(${signed(dx)}, ${signed(dy)})</b></span><strong>=</strong><span>本轮 P<b>${coords(p)}</b></span>`;
}
function renderWindows(){
  pressed('[data-window]',state.window);$('windows-diagram').innerHTML=windowsDiagram(state.window);const w=onlineWindow(state.window);
  $('window-readout').innerHTML=`<b>窗口 ${state.window+1}：第 ${w.start+1}–${w.end+1} 帧</b><p>${state.window===0?'第一窗从 Query 初始化轨迹。':'第 '+(w.inherited[0]+1)+'–'+(w.inherited.at(-1)+1)+' 帧继承前窗预测；第 '+(w.introduced[0]+1)+'–'+(w.end+1)+' 帧用重叠末尾状态延展初始化。'}然后执行同样的局部匹配与联合迭代。</p>`;
}
function renderTraining(){
  pressed('[data-training]',state.training);const train=state.training==='train';
  $('training-diagram').innerHTML=train?`<div class="training-input"><b>真实视频 Video</b><span>→ SIFT 选起点 → Q</span><small>同一份 Video / Q 同时送到教师和学生</small></div><div class="training-branches"><div class="teacher-branch"><span class="badge gold">参数冻结</span><h3>本 batch 教师</h3><b>${TEACHERS[state.teacher]}</b><p>预测伪轨迹 Pteacher 与可见性</p></div><div class="student-branch"><span class="badge green">继续训练</span><h3>Student：CoTracker3</h3><p>运行刚才学过的完整追踪架构，预测 Pstudent</p></div></div><div class="loss-path"><b>Pstudent ↔ Pteacher → 轨迹损失 → 更新学生参数 ↶</b><span>CNN / 共享 Transformer / 位置头更新；vis_conf_head 参数冻结。</span></div>`:'<div class="inference-path"><b>视频 Video + 用户或网格指定的 Q</b><span>↓</span><b>已训练好的 CoTracker3</b><p>特征 → 局部匹配 → 联合更新 ↶ 重新采样</p><span>↓</span><b>轨迹 P / 可见性 V / 置信度 C</b><small>便捷 predictor 对外返回值见第 1 章。</small></div>';
  $('teacher-pool').innerHTML=TEACHERS.map((name,i)=>`<div class="teacher ${i===state.teacher?'selected':''}"><small>教师 ${i+1}</small><b>${name}</b><span>${i===state.teacher?'本 batch 被选中':'本 batch 不参与'}</span></div>`).join('');
  $('batch-count').textContent=`Batch ${state.batch}`;$('batch-readout').textContent=`本 batch 只由 ${TEACHERS[state.teacher]} 生成伪标签。下一次随机选择可能重复选中同一个教师。`;
}
function renderAnswer(id){
  const answer=answers[id],q=quizzes[id],correct=answer===q.answer;
  document.querySelectorAll(`[data-answer^="${id}:"]`).forEach(el=>{const i=Number(el.dataset.answer.split(':')[1]);el.setAttribute('aria-pressed',String(i===answer));el.classList.toggle('answer-correct',i===answer&&correct);el.classList.toggle('answer-wrong',i===answer&&!correct);});
  const feedback=$('feedback-'+id);feedback.className='quiz-feedback '+(correct?'correct':'incorrect');feedback.textContent=(correct?'答对了。':'再想一步：')+q.why;
}
function showGlossary(key){
  const entries=key?[[key,glossary[key]]]:Object.entries(glossary);
  $('glossary-title').textContent=key?glossary[key][0]:'术语速查';
  $('glossary-content').innerHTML=entries.map(([name,[title,text]])=>`<section><h3>${name}<small>${title}</small></h3><p>${text}</p></section>`).join('');$('glossary-dialog').showModal();
}
document.addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  const d=el.dataset;
  if(d.term){showGlossary(d.term);return;}
  if(d.view){state.view=d.view;renderTask();}
  if(d.stage!==undefined){const fromMap=el.classList.contains('arch-node');state.stage=Number(d.stage);renderStage();document.querySelector(`.stage-dots [data-stage="${state.stage}"]`).focus({preventScroll:true});if(fromMap&&matchMedia('(max-width:1100px)').matches)document.querySelector('.stage-panel').scrollIntoView({block:'start'});}
  if(d.scale!==undefined){state.scale=Number(d.scale);renderFeatures();}
  if(d.patchQ!==undefined){state.qCell=Number(d.patchQ);renderPairs();document.querySelector(`[data-patch-q="${state.qCell}"]`).focus({preventScroll:true});}
  if(d.patchT!==undefined){state.tCell=Number(d.patchT);renderPairs();document.querySelector(`[data-patch-t="${state.tCell}"]`).focus({preventScroll:true});}
  if(d.pair){[state.qCell,state.tCell]=d.pair.split(':').map(Number);renderPairs();document.querySelector(`[data-pair="${d.pair}"]`).focus({preventScroll:true});}
  if(d.attention){state.attention=d.attention;renderAttention();}
  if(d.token){[state.time,state.tokenPoint]=d.token.split(':').map(Number);renderAttention();document.querySelector(`[data-token="${d.token}"]`).focus({preventScroll:true});}
  if(d.window!==undefined){state.window=Number(d.window);renderWindows();}
  if(d.training){state.training=d.training;renderTraining();}
  if(d.answer){const [id,value]=d.answer.split(':');answers[id]=Number(value);save();renderAnswer(id);}
  if(el.id==='stage-prev'){state.stage=Math.max(0,state.stage-1);renderStage();}
  if(el.id==='stage-next'){state.stage=state.stage===5?2:state.stage+1;renderStage();}
  if(el.id==='stage-return'){const node=document.querySelector(`.arch-node[data-stage="${state.stage}"]`);node.scrollIntoView({block:'center'});node.focus({preventScroll:true});}
  if(el.id==='next-batch'){state.teacher=teacherForBatch();state.batch++;renderTraining();}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='query-frame'){state.query=Number(el.value);renderTask();}
  if(el.id==='query-point'){state.point=Number(el.value);renderTask();}
  if(el.id==='refine-frame'){state.frame=Number(el.value);renderRefinement();}
});
document.addEventListener('input',event=>{if(event.target.id==='iteration'){state.iteration=Number(event.target.value);renderRefinement();}if(event.target.id==='task-frame'){state.taskFrame=Number(event.target.value);renderTaskFrame();}});
$('show-map').addEventListener('click',()=>{if(current==='architecture'){$('lesson').focus();window.scrollTo(0,0);}else location.hash='architecture';});
$('show-glossary').addEventListener('click',()=>showGlossary());
$('close-glossary').addEventListener('click',()=>$('glossary-dialog').close());
$('glossary-dialog').addEventListener('click',event=>{if(event.target===$('glossary-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);$('lesson').focus({preventScroll:true});});
render();
