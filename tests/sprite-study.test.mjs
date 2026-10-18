import assert from 'node:assert/strict';
import {build} from 'esbuild';
import * as F from '../app/sprite-forge/format.js';
const bundle=await build({entryPoints:['app/sprite-study/drawing.ts'],bundle:true,write:false,format:'esm',platform:'browser'});
const {validatePlan,compileLayer,drawingRequest}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const palette=Array.from({length:24},(_,i)=>'#'+(0x101010+i*0x050505).toString(16).padStart(6,'0'));
const plan={palette,layers:[{name:'native grid detail',shapes:[{kind:'rect',colour:palette[0],x:3,y:5,w:2,h:3},{kind:'polygon',colour:palette[1],points:[{x:9,y:7},{x:12,y:9},{x:9,y:12}]},{kind:'ellipse',colour:palette[2],cx:27,cy:31,rx:3,ry:4},{kind:'pixel',colour:palette[3],x:43,y:49}]}]};
validatePlan(plan);
const ops=compileLayer(plan.layers[0]);assert.ok(ops.every(o=>['line','rect','ellipse','pixel'].includes(o.op)),'Only native MCP draw operations may execute');
const sprite=F.newSprite({id:'study',name:'Native 192 test',width:192,height:192,palette}),frame=F.getFrame(sprite,'idle',0),grid=F.grid(frame);
for(const o of ops){const c=F.colorChar(sprite,o.color);if(o.op==='line')F.line(grid,o.x0,o.y0,o.x1,o.y1,c,sprite,false);else if(o.op==='rect')F.rect(grid,o.x,o.y,o.w,o.h,c,sprite,true,false);else if(o.op==='ellipse')F.ellipse(grid,o.cx,o.cy,o.rx,o.ry,c,sprite,true,false);else F.setPx(grid,o.x,o.y,c,sprite,false);}
F.ungrid(frame,grid);assert.equal(frame.rows.length,192);assert.ok(frame.rows.every(r=>r.length===192));assert.equal(frame.rows[5][3],'0');assert.equal(frame.rows[5][2],'.');assert.equal(frame.rows[5][5],'.');assert.equal(frame.rows[49][43],'3');assert.equal(frame.rows[49][42],'.','Individual odd-coordinate pixels must remain native, not 2x/3x/4x blocks');
for(const shape of [{kind:'rect',colour:palette[0],x:190,y:0,w:5,h:2},{kind:'pixel',colour:'#ff00ff',x:1,y:2},{kind:'import_png',colour:palette[0],x:1,y:2}])assert.throws(()=>validatePlan({palette,layers:[{name:'bad',shapes:[shape]}]}));
const request=drawingRequest('data:image/png;base64,original',undefined,undefined,'test');assert.equal(request.model,'gpt-6-astra');assert.equal(request.tools[0].type,'function');assert.equal(request.tools[0].name,'author_sprite_forge_drawing');assert.equal(request.input[0].content.filter(c=>c.type==='input_image').length,1);assert.ok(!JSON.stringify(request.tools).includes('image_generation'));
const finish=drawingRequest('original','actual-mcp-output',palette,'test');assert.equal(finish.input[0].content.at(-1).image_url,'actual-mcp-output');
console.log('PASS: native 192x192 coordinates, one-pixel detail, palette/bounds validation, polygon-to-native-MCP compilation, Astra drawing tool and rendered-output feedback.');
