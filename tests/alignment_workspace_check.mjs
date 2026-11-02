import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),root=fileURLToPath(new URL('..',import.meta.url));
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const build=await require('esbuild').build({stdin:{contents:"export {default as Workspace} from './components/AlignmentWorkspace';export {fitRowsToCanvas} from './lib/alignment-geometry';export {scoreTemplateSchema,makeScoreTemplate} from './lib/score-template';export {liveAlignmentSchema} from './lib/live-presentation';",resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom','react/jsx-runtime']});
let slots=[],cursor=0;
const react={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},useEffect(){},useId(){return 'test-title';},useRef(value){const i=cursor++;return slots[i]??(slots[i]={current:value});}};
const module={exports:{}};new Function('require','module','exports',build.outputFiles[0].text)(name=>name==='react'?react:require(name),module,module.exports);
const {Workspace,fitRowsToCanvas,scoreTemplateSchema,makeScoreTemplate,liveAlignmentSchema}=module.exports;
for(let i=1;i<=100;i++){
 const seed={x:i*37-200,y:i*29,width:i*61,rowHeight:i*21,rowStep:i*41,rows:i};
 const live=fitRowsToCanvas(seed,{minHeight:8,minStep:8,maxHeight:200,maxStep:200,maxRows:100});
 liveAlignmentSchema.parse({detected:false,groups:[live],columns:{total:.6,logo:.03,teamName:.12,slot:.01,elims:.68,aliveCount:.86,damage:.55,placement:.47}});
 const score=fitRowsToCanvas(seed);const {rowStep,...g}=score;
 scoreTemplateSchema.parse(makeScoreTemplate('/score-templates/standing-neon.png','Test','total',[{...g,rowGap:rowStep,statsX:0,statsWidth:16}]));
 for(const v of [live,score]){assert.ok(v.x>=0&&v.y>=0);assert.ok(v.x+v.width<=1920);assert.ok(v.y+v.rowHeight+(v.rows-1)*v.rowStep<=1080.00001);}
}
let selected=0,groups=[{x:300,y:200,width:800,rowHeight:40,rowStep:60,rows:6}],columns=[{key:'teamName',label:'Tên đội',x:.12,anchor:'start'},{key:'total',label:'Tổng điểm',x:.7}],changedColumn;
const props=()=>({image:'/score-templates/standing-neon.png',groups,columns,selected,onSelect:i=>selected=i,onGroupChange:(i,p)=>groups=groups.map((g,j)=>i===j?{...g,...p}:g),onColumnChange:(key,x)=>changedColumn={key,x},children:React.createElement('label',null,'Cách mép trái ảnh (px)')});
const render=()=>{cursor=0;return Workspace(props());};
function all(node,predicate,found=[]){if(!node||typeof node!=='object')return found;if(predicate(node))found.push(node);const children=node.props?.children;for(const child of Array.isArray(children)?children:[children]){if(Array.isArray(child))child.forEach(n=>all(n,predicate,found));else all(child,predicate,found);}return found;}
let tree=render();assert.equal(all(tree,n=>n.props?.role==='dialog').length,0);
all(tree,n=>n.type==='button'&&n.props.children==='Mở khung căn chỉnh lớn')[0].props.onClick();tree=render();
assert.equal(all(tree,n=>n.props?.role==='dialog').length,1);
const html=renderToStaticMarkup(tree);assert.ok(html.includes('ĐỘI MẪU 1'));assert.ok(html.includes('Cách mép trái ảnh (px)'));assert.ok(html.includes('Dữ liệu minh họa'));
let svg=all(tree,n=>n.type==='svg')[0];const savedView=svg.props.viewBox;
globalThis.DOMPoint=class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return {x:this.x*2,y:this.y*2};}};
const svgNode={getScreenCTM:()=>({inverse:()=>({})}),getAttribute:()=>savedView};
const pointer=(x,y)=>({clientX:x,clientY:y,currentTarget:{ownerSVGElement:svgNode,setPointerCapture(){}},pointerId:1,preventDefault(){}});
all(tree,n=>n.type==='rect'&&n.props['aria-label']==='Kéo di chuyển khối đội 1')[0].props.onPointerDown(pointer(100,100));
svg.props.onPointerMove(pointer(115,110));assert.equal(groups[0].x,330);assert.equal(groups[0].y,220);
tree=render();svg=all(tree,n=>n.type==='svg')[0];assert.equal(svg.props.viewBox,savedView,'Zoom remains fixed during drag');svg.props.onPointerUp();
tree=render();svg=all(tree,n=>n.type==='svg')[0];
all(tree,n=>n.type==='circle'&&n.props['aria-label']==='Kéo cột Tổng điểm')[0].props.onPointerDown(pointer(100,100));svg.props.onPointerMove(pointer(140,100));assert.equal(changedColumn.key,'total');assert.ok(Math.abs(changedColumn.x-.8)<1e-9);svg.props.onPointerUp();
tree=render();svg=all(tree,n=>n.type==='svg')[0];
all(tree,n=>n.props?.['aria-label']==='Kéo đổi chiều rộng và chiều cao hàng')[0].props.onPointerDown(pointer(100,100));svg.props.onPointerMove(pointer(120,105));assert.equal(groups[0].width,840);assert.equal(groups[0].rowHeight,50);svg.props.onPointerUp();
tree=render();svg=all(tree,n=>n.type==='svg')[0];all(tree,n=>n.props?.['aria-label']==='Kéo đổi khoảng cách giữa các hàng')[0].props.onPointerDown(pointer(100,100));svg.props.onPointerMove(pointer(100,105));assert.equal(groups[0].rowStep,70);svg.props.onPointerUp();
tree=render();all(tree,n=>n.props?.role==='group')[0].props.onKeyDown({key:'ArrowRight',shiftKey:true,preventDefault(){}});assert.equal(groups[0].x,340);
tree=render();all(tree,n=>n.props?.role==='dialog')[0].props.onKeyDown({key:'Escape',stopPropagation(){}});assert.equal(all(render(),n=>n.props?.role==='dialog').length,0);
console.log('PASS: 100 boundary cases save through both schemas; editor opens/closes; sample labels render; screen coordinates convert correctly; row/column drag, resizing, row spacing, fixed zoom during drag, and keyboard movement. Component handler checks; browser QA remains separate.');
