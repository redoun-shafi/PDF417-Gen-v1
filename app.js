let mode='upload';let generatedImages=[];
function setMode(m){
document.getElementById('uploadSection').style.display=m==='upload'?'block':'none';
document.getElementById('manualSection').style.display=m==='manual'?'block':'none';
}

function normalizeGender(g){
if(!g)return null;
g=g.toLowerCase();
if(g==='m'||g==='male')return'M';
if(g==='f'||g==='female')return'F';
return null;
}

function generate(list){
generatedImages=[];
let out=document.getElementById('output');
out.innerHTML='';

list.forEach(d=>{
if(!d.name||!d.dl)return;

let canvas=document.createElement('canvas');
PDF417.draw(d.name,canvas);

let file=d.name.replace(/\s+/g,'_')+'_'+d.gender+'_'+d.height+'.png';

let btn=document.createElement('button');
btn.innerText='Download';
btn.onclick=()=>{
let a=document.createElement('a');
a.href=canvas.toDataURL();
a.download=file;
a.click();
};

out.appendChild(canvas);
out.appendChild(btn);

generatedImages.push({canvas,file});
});

document.getElementById('controls').style.display='block';
}

function handleFile(){
let f=document.getElementById('fileInput').files[0];
if(!f){alert('upload file');return;}
let r=new FileReader();
r.onload=e=>{
let t=e.target.result;
let rows=t.split('\n').slice(1);

let list=rows.map(r=>{
let c=r.split(',');
return {name:c[0],dl:c[5],gender:normalizeGender(c[10]),height:c[11]};
});

generate(list);
};
r.readAsText(f);
}

function handleManual(){
let t=document.getElementById('manualText').value;
let rows=t.split('\n');

let list=rows.map(r=>{
let c=r.split('\t');
return {name:c[0],dl:c[5],gender:normalizeGender(c[10]),height:c[11]};
});

generate(list);
}

async function downloadAll(){
let zip=new JSZip();
generatedImages.forEach(i=>{
let d=i.canvas.toDataURL().split(',')[1];
zip.file(i.file,d,{base64:true});
});
let blob=await zip.generateAsync({type:'blob'});
let a=document.createElement('a');
a.href=URL.createObjectURL(blob);
a.download='all.zip';
a.click();
}
