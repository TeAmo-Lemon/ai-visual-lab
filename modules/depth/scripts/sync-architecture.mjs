import fs from 'node:fs/promises';
const get = async (url) => {let raw=url.match(/^https:\/\/raw.githubusercontent.com\/([^/]+\/[^/]+)\/([^/]+)\/(.+)$/);const target=raw?`https://api.github.com/repos/${raw[1]}/contents/${raw[3]}?ref=${raw[2]}`:url;const r=await fetch(target,{headers:{'User-Agent':'Depth-Anything-Visual-Lab'},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error(`${r.status} ${target}`);if(raw){const j=await r.json();return Buffer.from(j.content,'base64').toString('utf8')}return r.text()};
const repositories={v1:'LiheYoung/Depth-Anything',v2:'DepthAnything/Depth-Anything-V2'};
const refs={};const sources={};
for(const [version,repo] of Object.entries(repositories)){
  refs[version]=JSON.parse(await get(`https://api.github.com/repos/${repo}/commits/main`)).sha;
  const files=version==='v2'?['depth_anything_v2/dpt.py','depth_anything_v2/dinov2.py','depth_anything_v2/util/blocks.py','depth_anything_v2/util/transform.py','depth_anything_v2/dinov2_layers/patch_embed.py','depth_anything_v2/dinov2_layers/attention.py','depth_anything_v2/dinov2_layers/block.py','run.py']:['depth_anything/dpt.py','run.py','README.md','torchhub/facebookresearch_dinov2_main/dinov2/models/vision_transformer.py'];
  for(const file of files)sources[`${version}/${file}`]={url:`https://github.com/${repo}/blob/${refs[version]}/${file}`,text:await get(`https://raw.githubusercontent.com/${repo}/${refs[version]}/${file}`)};
}
const dpt=sources['v2/depth_anything_v2/dpt.py'].text;
const dino=sources['v2/depth_anything_v2/dinov2.py'].text;
const run=sources['v2/run.py'].text;
const models={};
for(const size of ['s','b','l','g']){
  const key=`vit${size}`;
  const layers=JSON.parse(dpt.match(new RegExp(`'${key}': (\\[[^\\]]+\\])`))[1]);
  const fn=dino.slice(dino.indexOf(`def vit_${{s:'small',b:'base',l:'large',g:'giant2'}[size]}(`));
  const body=fn.slice(0,fn.indexOf('\n\ndef ')<0?fn.length:fn.indexOf('\n\ndef '));
  const dim=Number(body.match(/embed_dim=(\d+)/)[1]);const blocks=Number(body.match(/depth=(\d+)/)[1]);const heads=Number(body.match(/num_heads=(\d+)/)[1]);
  const config=run.match(new RegExp(`'${key}': \\{[^\\n]+`))[0];
  const channels=JSON.parse(config.match(/'out_channels': (\[[^\]]+\])/)[1]);const features=Number(config.match(/'features': (\d+)/)[1]);
  let v1=null;
  if(size!=='g'){
    const config1=sources['v1/README.md'].text.match(new RegExp(`'${key}': \\{[^\\n]+`))[0];
    v1={channels:JSON.parse(config1.match(/'out_channels': (\[[^\]]+\])/)[1]),features:Number(config1.match(/'features': (\d+)/)[1]),layers:[blocks-4,blocks-3,blocks-2,blocks-1]};
    const v1Dino=sources['v1/torchhub/facebookresearch_dinov2_main/dinov2/models/vision_transformer.py'].text;
    const fn1=v1Dino.slice(v1Dino.indexOf(`def vit_${{s:'small',b:'base',l:'large'}[size]}(`));
    if(Number(fn1.match(/embed_dim=(\d+)/)[1])!==dim||Number(fn1.match(/depth=(\d+)/)[1])!==blocks)throw Error('V1 encoder dimensions differ');
  }
  models[size]={dim,blocks,heads,layers,channels,features,v1};
}
if(!dpt.includes('kernel_size=4')||!dpt.includes('padding=1')||!sources['v1/depth_anything/dpt.py'].text.includes('get_intermediate_layers(x, 4'))throw Error('Official architecture changed; inspect resize or extraction manually.');
const patchSize=Number(dino.slice(dino.indexOf('def DINOv2(')).match(/patch_size=(\d+)/)[1]);
const resizeSection=dpt.slice(dpt.indexOf('self.resize_layers ='),dpt.indexOf('if use_clstoken:'));
const resizeOperations=[...resizeSection.matchAll(/nn\.(ConvTranspose2d|Conv2d|Identity)\(([\s\S]*?)\)/g)].map(([,op,args])=>({op,kernel:Number(args.match(/kernel_size=(\d+)/)?.[1]??1),stride:Number(args.match(/stride=(\d+)/)?.[1]??1),padding:Number(args.match(/padding=(\d+)/)?.[1]??0)}));
const resizeFactors=resizeOperations.map(op=>op.op==='Conv2d'?1/op.stride:op.op==='Identity'?1:op.stride);
const normalization={mean:JSON.parse(dpt.match(/mean=(\[[^\]]+\])/)[1]),std:JSON.parse(dpt.match(/std=(\[[^\]]+\])/)[1])};
if(patchSize!==14||JSON.stringify(resizeFactors)!=='[4,2,1,0.5]'||Number(dpt.match(/head_features_2 = (\d+)/)[1])!==32)throw Error('Patch, resize or head architecture changed. Review before publishing.');
const constants={verifiedAt:new Date().toISOString(),refs,models,patchSize,resizeFactors,resizeOperations,normalization};
await fs.writeFile('src/architecture.json',JSON.stringify(constants,null,2));
// Short verbatim excerpts are extracted at runtime by the application; full source stays outside the browser bundle.
await fs.mkdir('scripts/official',{recursive:true});
for(const [file,source] of Object.entries(sources))await fs.writeFile(`scripts/official/${file.replaceAll('/','__')}`,source.text);
const excerpt=(key,needle,count=4)=>{const source=sources[key];const lines=source.text.split('\n');const index=lines.findIndex(x=>x.includes(needle));if(index<0)throw Error(`Missing ${needle}`);return{url:source.url+`#L${index+1}`,line:index+1,code:lines.slice(index,index+count).join('\n')};};
const mapping={
 encoder:excerpt('v2/depth_anything_v2/dpt.py','self.pretrained = DINOv2',3),
 encoderV1:excerpt('v1/depth_anything/dpt.py',"if localhub:",4),
 extract:excerpt('v2/depth_anything_v2/dpt.py','features = self.pretrained.get_intermediate_layers',3),
 extractV1:excerpt('v1/depth_anything/dpt.py','features = self.pretrained.get_intermediate_layers',3),
 reshape:excerpt('v2/depth_anything_v2/dpt.py','x = x.permute',4),
 project:excerpt('v2/depth_anything_v2/dpt.py','self.projects = nn.ModuleList',8),
 resize:excerpt('v2/depth_anything_v2/dpt.py','self.resize_layers = nn.ModuleList',8),
 scratch:excerpt('v2/depth_anything_v2/util/blocks.py','scratch.layer1_rn',3),
 fusion:excerpt('v2/depth_anything_v2/dpt.py','path_4 =',4),
 fusionInner:excerpt('v2/depth_anything_v2/util/blocks.py','output = xs[0]',6),
 rcu:excerpt('v2/depth_anything_v2/util/blocks.py','out = self.activation(x)',8),
 head:excerpt('v2/depth_anything_v2/dpt.py','out = self.scratch.output_conv1',3),
 headLayers:excerpt('v2/depth_anything_v2/dpt.py','self.scratch.output_conv2 = nn.Sequential',7),
 squeeze:excerpt('v2/depth_anything_v2/dpt.py','depth = F.relu(depth)',3),
 output:excerpt('v2/depth_anything_v2/dpt.py','depth = F.interpolate(depth[:, None]',3),
 outputV1:excerpt('v1/run.py','depth = F.interpolate(depth[None]',3),
 preprocess:excerpt('v2/depth_anything_v2/dpt.py','keep_aspect_ratio=True',4),
 preprocessV1:excerpt('v1/run.py','keep_aspect_ratio=True',4),
 patch:excerpt('v2/depth_anything_v2/dinov2_layers/patch_embed.py','self.proj =',3),
 token:excerpt('v2/depth_anything_v2/dinov2.py','x = torch.cat((self.cls_token',3),
 attention:excerpt('v2/depth_anything_v2/dinov2_layers/attention.py','qkv = self.qkv(x)',8)
};
await fs.writeFile('src/code-map.json',JSON.stringify(mapping,null,2));
console.log(JSON.stringify({verified:true,refs,models}));
