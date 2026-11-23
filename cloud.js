/* No external visualization library. SVG cloud with overlap avoidance.
   Font sizes reflect suggestion order *within* each category, NOT comparable corpus frequencies. */
(() => {
  'use strict';
  const svg = document.getElementById('word-cloud');
  if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const W=1000, H=550, CX=W/2, CY=H/2;
  const configs = [
    {key:'synonyms',color:'#3768ce',name:'Synonyms'},
    {key:'antonyms',color:'#d45c72',name:'Antonyms'},
    {key:'family',color:'#278b6e',name:'Word Family'},
    {key:'collocations',color:'#c58535',name:'Word Partners'}
  ];
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  let dataset=null;
  let currentView='cloud';
  const cloudPanel=document.getElementById('cloud-panel');
  const mapPanel=document.getElementById('map-panel');
  function tag(name, attrs={}) {
    const n=document.createElementNS(ns,name);
    for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));
    return n;
  }
  function intersects(a,b,p=8){return a.x < b.x+b.w+p && a.x+a.w+p>b.x && a.y < b.y+b.h+p && a.y+a.h+p>b.y;}
  function within(b){return b.x>18 && b.y>12 && b.x+b.w<W-18 && b.y+b.h<H-12;}
  function measure(str,size,weight){
    ctx.font=`${weight} ${size}px Arial, sans-serif`;
    return ctx.measureText(str).width;
  }
  function addText(word,category,color,size,weight,x,y,isRoot=false){
    const group=tag('g',{class:isRoot?'cloud-root':'cloud-word',tabindex:isRoot?'-1':'0',role:isRoot?'img':'button'});
    const label=tag('text',{x,y,fill:color,'font-size':size,'font-weight':weight,'font-family':'Arial, Helvetica, sans-serif','text-anchor':'middle','dominant-baseline':'middle'});
    label.textContent=word;group.append(label);
    if(!isRoot){
      group.setAttribute('aria-label',`${word} (${category}) をコピー`);
      const title=tag('title');title.textContent=`${category}: ${word} — click to copy`;group.append(title);
      const copy=async()=>{
        const status=document.getElementById('cloud-status');
        try {
          if(!navigator.clipboard?.writeText)throw new Error('Unavailable');
          await navigator.clipboard.writeText(word);
          status.textContent=`Copied: ${word}`;
        }catch {status.textContent=`${word} — コピーできない場合は下の一覧から選択してください。`;}
        svg.querySelectorAll('.cloud-word.is-copied').forEach(n=>n.classList.remove('is-copied'));
        group.classList.add('is-copied');
      };
      group.addEventListener('click',copy);
      group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();copy();}});
    }
    svg.append(group);
  }
  function render(){
    if(!dataset)return;
    svg.replaceChildren();
    const root=dataset.word;
    const rootSize=Math.max(29,Math.min(53,560/Math.max(9,root.length)));
    const rw=measure(root,rootSize,800);
    const boxes=[{x:CX-rw/2-23,y:CY-rootSize/2-23,w:rw+46,h:rootSize+46}];
    // Interleave categories to keep the first placements balanced.
    const arranged=[];
    for(let j=0;j<3;j++)for(const cfg of configs){
      const w=(dataset[cfg.key]||[])[j];
      if(w && w.toLowerCase()!==root.toLowerCase())arranged.push({word:w,rank:j,cfg});
    }
    // Closer / larger labels represent approximate learner familiarity; not official Eiken grades.
    let placed=0;
    for(let i=0;i<arranged.length;i++){
      const item=arranged[i];
      const {word,cfg,rank}=item;
      let size=Math.max(14,29-rank*2);
      if(word.length>20)size=Math.min(size,16);
      else if(word.length>13)size=Math.min(size,20);
      const weight=rank<2?760:650;
      const width=measure(word,size,weight),height=size*1.3;
      if(width>W-55)continue;
      let location=null;
      // Deterministic spiral search; no randomness and no overlapping labels.
      const offset=((i*137.508)%360)*Math.PI/180;
      for(let t=0;t<2300;t++){
        const a=offset+t*0.115;
        const radius=78+Math.sqrt(t)*7.65;
        const x=CX+Math.cos(a)*radius*1.44;
        const y=CY+Math.sin(a)*radius*.83;
        const b={x:x-width/2-3,y:y-height/2-3,w:width+6,h:height+6};
        if(within(b) && boxes.every(other=>!intersects(b,other,9))){location={x,y,b};break;}
      }
      if(!location)continue;
      boxes.push(location.b);
      addText(word,cfg.name,cfg.color,size,weight,location.x,location.y);
      placed++;
    }
    addText(root,'Search word','#17273e',rootSize,800,CX,CY,true);
    svg.setAttribute('aria-label',`${root} の関連語ワードクラウド。${placed}個の候補。クリックでコピー。`);
    document.getElementById('cloud-status').textContent=`${placed} connected words · Closer = approximately easier · Click to copy.`;
  }
  function switchView(view){
    currentView=view;
    cloudPanel.hidden=view!=='cloud';
    mapPanel.hidden=view!=='map';
    for(const [id,active] of [['view-cloud',view==='cloud'],['view-map',view==='map']]){
      const btn=document.getElementById(id);btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active));
    }
    if(view==='cloud'){
      const sc=document.getElementById('cloud-scroll');
      if(sc.scrollWidth>sc.clientWidth)sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2;
    } else {
      const sc=document.getElementById('graph-scroll');
      if(sc.scrollWidth>sc.clientWidth)sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2;
    }
  }
  document.getElementById('view-cloud').addEventListener('click',()=>switchView('cloud'));
  document.getElementById('view-map').addEventListener('click',()=>switchView('map'));
  document.addEventListener('wordexplorer:render',e=>{
    const d=e.detail;
    dataset={word:d.word,synonyms:d.synonyms,antonyms:d.antonyms,family:d.family,collocations:d.collocations};
    render();
    switchView('cloud');
  });
  document.addEventListener('wordexplorer:reset',()=>{svg.replaceChildren();dataset=null;switchView('cloud');});
})();
