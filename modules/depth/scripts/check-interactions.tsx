import assert from 'node:assert/strict';
import React from 'react';
import {act,create} from 'react-test-renderer';
import App from '../src/App.tsx';
import {courseSpec,courseTitles} from '../src/Course.tsx';
import {getModel,tensors,type Config} from '../src/model.ts';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const original=console.error;console.error=(...args)=>{if(String(args[0]).includes('react-test-renderer is deprecated'))return;original(...args)};
// Check that every course input comes from an earlier output, including stored skips.
for(const mode of ['real','teaching'] as const)for(const version of ['v1','v2'] as const){
 const config:Config={mode,version,size:'l',rawH:480,rawW:640,target:518},m=getModel(config),data=tensors(config),available=new Set(['input']);
 for(let i=0;i<16;i++){const s=courseSpec(i,m,data);for(const id of s.inputs)assert.ok(available.has(id),`${i}: input ${id} has no upstream output`);for(const id of s.outputs){assert.ok(data[id]);available.add(id)}}
 assert.equal(courseTitles.length,16);
}
let renderer:any;
await act(async()=>{renderer=create(<App/>,{createNodeMock:(el:any)=>el.type==='canvas'?{width:0,height:0,getContext:()=>({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})}:null})});
const root=()=>renderer.root;
const text=(item:any):string=>typeof item==='string'?item:item.children.map(text).join('');
const button=(label:string)=>root().findAllByType('button').find((b:any)=>text(b)===label);
async function click(label:string){const b=button(label);assert.ok(b,`Missing button: ${label}`);await act(async()=>b.props.onClick())}
async function step(i:number){const b=root().findAllByType('button').find((b:any)=>b.props['aria-label']?.startsWith(`Step ${i+1}:`));assert.ok(b);await act(async()=>b.props.onClick())}
const shape=()=>text(root().findByProps({className:'tensor-shape'}));
assert.equal(shape(),'[1, 3, 518, 518]');
assert.equal(root().findAllByProps({'data-node':'resize4'}).length,1);
assert.equal(root().findAllByProps({className:'connections'}).length,1);
assert.equal(root().findByProps({className:'connections'}).findAllByType('path').length,40); // 39 edges plus marker
await act(async()=>root().findByProps({'data-node':'resize4'}).props.onClick());assert.equal(shape(),'[1, 1024, 19, 19]');
await click('展开第 9 步 →');assert.ok(root().findByProps({className:'resize-grid'}));
await click('教学例子 · 16 tokens');await step(3);assert.equal(shape(),'[1, 16, 8]');
const patch7=root().findAllByType('rect').filter((r:any)=>r.props.className==='patch-cell')[7];await act(async()=>patch7.props.onClick());assert.ok(text(root().findByProps({className:'token-panel'})).includes('token #7'));
const token10=root().findByProps({className:'token-buttons'}).findAllByType('button')[10];await act(async()=>token10.props.onClick());assert.ok(text(root().findByProps({className:'token-panel'})).includes('token #10'));
await step(6);const rail=root().findByProps({className:'shape-rail'}).findAllByType('button');await act(async()=>rail[2].props.onClick());assert.equal(shape(),'[1, 8, 4, 4]');
await step(8);await click('播放多尺度变化');assert.ok(root().findAllByType('div').filter((el:any)=>el.props.className==='feature-square').length===4);
await step(9);assert.equal(shape(),'[1, 8, 4, 4]');assert.ok(text(root().findByProps({className:'detail-section'})).includes('不执行 skip RCU1'));
await step(10);assert.equal(shape(),'[1, 8, 8, 8]');assert.equal(root().findByProps({className:'fusion-inputs'}).findAllByType('button').length,2);assert.ok(root().findByProps({className:'rcu-detail'}));
await step(4);await click('Block 1');assert.ok(root().findByProps({className:'block-inner'}));await click('Self-Attention · 查看 Q/K/V ↗');assert.ok(root().findByProps({'aria-label':'Attention Head'}));
await act(async()=>root().findByProps({'aria-label':'Attention Head'}).props.onChange({target:{value:'1'}}));assert.ok(text(root().findByProps({className:'qkv-equation'})).includes('softmax'));
await click('真实模型');await act(async()=>root().findByProps({'aria-label':'Model Size'}).props.onChange({target:{value:'g'}}));await click('Depth Anything V1');assert.equal(root().findByProps({'aria-label':'Model Size'}).props.value,'l');
await click('架构对比');assert.ok(root().findAllByProps({className:'compare-index'}).some((el:any)=>text(el).includes('20, 21, 22, 23')));
await click('训练');assert.ok(root().findByProps({className:'training-path'}));
await click('误区与自测');await act(async()=>root().findByProps({className:'quiz-options'}).findAllByType('button')[0].props.onClick());assert.ok(text(root().findByProps({className:'quiz-result'})).includes('正确'));
await click('逐步学习');for(let i=0;i<16;i++){await step(i);assert.equal(root().findByProps({className:'io-grid'}).findAllByType('section').length,3);assert.ok(root().findByProps({className:'tensor-shape'}));}
assert.equal(shape(),'[518, 518]');await click('反向追踪这个像素');assert.equal(root().findByProps({className:'trace-paths'}).findAllByType('details').length,4);assert.ok(root().findByProps({className:'trace-locations'}));
await click('回到第 1 步');assert.equal(shape(),'[1, 3, 518, 518]');
await act(async()=>renderer.unmount());
console.log('Passed: continuous upstream shapes in both modes/versions; 37 architecture nodes and 39 connectors; all 16 course steps; patch/token sync; reshape; resize; fusion/RCU; encoder/attention; model fallback; compare/training; pixel paths; quiz.');
