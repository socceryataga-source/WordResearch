/* Accessible, dependency-free SVG word map. No login, tracking or data storage. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const svg = $('word-graph');
  if (!svg) return;
  const configurations = [
    {key:'synonyms', label:'Synonyms', ja:'類義語', color:'#4776e6', pale:'#edf3ff', hub:[395,254], leafXs:[340,222,104], ys:[179,118,62]},
    {key:'antonyms', label:'Antonyms', ja:'反意語', color:'#db6672', pale:'#fff0f1', hub:[755,254], leafXs:[810,928,1046], ys:[179,118,62]},
    {key:'family', label:'Word Family', ja:'派生語', color:'#399b79', pale:'#e9f8f1', hub:[395,466], leafXs:[340,222,104], ys:[541,602,658]},
    {key:'collocations', label:'Word Partners', ja:'共起表現', color:'#d79442', pale:'#fff3e4', hub:[755,466], leafXs:[810,928,1046], ys:[541,602,658]}
  ];
  let current = null;
  let selection = null;
  const filters = () => Object.fromEntries([...document.querySelectorAll('[data-graph-group]')].map(el => [el.dataset.graphGroup, el.checked]));
  const make = (tag, attrs={}, text='') => {
    const el = document.createElementNS(ns,tag);
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v));
    if (text) el.textContent = text;
    return el;
  };
  const line = (x1,y1,x2,y2,color,root=false) => make('path',{
    d:`M ${x1} ${y1} Q ${(x1+x2)/2} ${(y1+y2)/2-5} ${x2} ${y2}`,
    stroke:color, class:`graph-edge ${root?'graph-root-edge':''}`
  });
  const putText = (parent,x,y,text,size,fill,weight='650') => {
    const el=make('text',{x,y,'font-family':'Inter, Arial, sans-serif','font-size':size,fill,'font-weight':weight,'text-anchor':'middle','dominant-baseline':'middle'},text);
    parent.append(el);return el;
  };
  const shorten = (word, max=22) => word.length>max ? word.slice(0,max-1)+'…' : word;
  function wrapNode(x,y,w,h,color,fill,word,subtitle='',cls='') {
    const g=make('g',{class:cls});
    g.append(make('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:Math.min(17,h/3),fill,stroke:color,'stroke-width':1.5}));
    putText(g,x,subtitle?y-8:y,shorten(word,w>170?24:19),w>170?16:15,color,'750');
    if(subtitle)putText(g,x,y+14,subtitle,12,color,'550');
    g.append(make('title',{},word));
    return g;
  }
  const status = txt => { $('graph-status').textContent=txt; };
  function select(word,category,group) {
    svg.querySelectorAll('.graph-leaf.is-selected').forEach(n=>n.classList.remove('is-selected'));
    group.classList.add('is-selected');
    selection={word,category};
    $('graph-explore').disabled=false;
    status(`${word} · ${category} — copied. Click Explore to search.`);
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(word).catch(()=>status(`${word} selected — use Explore to search.`));
    else status(`${word} selected — use Explore to search.`);
  }
  function draw() {
    if(!current)return;
    selection=null;
    $('graph-explore').disabled=true;
    const enabled=filters();
    const edges=make('g',{'aria-hidden':'true'});
    const nodes=make('g');
    const count=configurations.reduce((s,c)=>s+(enabled[c.key]?Math.min(5,(current[c.key]||[]).length):0),0);
    // Build only DOM text nodes (never innerHTML from remotely retrieved words).
    for (const cat of configurations) {
      if(!enabled[cat.key])continue;
      const [hx,hy]=cat.hub;
      edges.append(line(575,360,hx,hy,cat.color,true));
      const hub=wrapNode(hx,hy,174,68,cat.color,cat.pale,cat.label,cat.ja,'graph-hub');
      nodes.append(hub);
      const entries=(current[cat.key]||[]).slice(0,3);
      for(let i=0;i<entries.length;i++){
        const x=cat.leafXs[i],y=cat.ys[i];
        const label=entries[i];
        edges.append(line(hx,hy,x,y,cat.color));
        const g=wrapNode(x,y,190,49,cat.color,'#fff',label,'','graph-leaf');
        g.setAttribute('role','button');g.setAttribute('tabindex','0');
        g.setAttribute('aria-label',`${label} (${cat.label}): 選択してコピー`);
        const act=()=>select(label,cat.label,g);
        g.addEventListener('click',act);
        g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});
        nodes.append(g);
      }
      if(!entries.length)putText(nodes,hx,hy+(cat.key==='family'||cat.key==='collocations'?110:-107),'No results',13,'#9aa5b5','500');
    }
    const root = wrapNode(575,360,242,98,'#17273e','#17273e',current.word,'SEARCH WORD','graph-root');
    const rootLabels=root.querySelectorAll('text');
    rootLabels.forEach(t=>t.setAttribute('fill','#ffffff'));
    nodes.append(root);
    svg.replaceChildren(edges,nodes);
    svg.setAttribute('aria-label',`${current.word}を中心とした単語の関係図。${count}候補。クリックするとコピーできます。`);
    status(`${count} words · Near center ≈ easier; farther ≈ more advanced (estimated) · Click to copy.`);
  }
  document.addEventListener('wordexplorer:render',e=>{
    const d=e.detail;
    current={word:d.word,synonyms:d.synonyms,antonyms:d.antonyms,family:d.family,collocations:d.collocations};
    draw();
    const scroller=$('graph-scroll');
    if(scroller.scrollWidth>scroller.clientWidth) scroller.scrollLeft=(scroller.scrollWidth-scroller.clientWidth)/2;
  });
  document.addEventListener('wordexplorer:reset',()=>{
    svg.replaceChildren();current=null;selection=null;$('graph-explore').disabled=true;
  });
  document.querySelectorAll('[data-graph-group]').forEach(el=>el.addEventListener('change',draw));
  $('graph-reset').addEventListener('click',()=>{
    document.querySelectorAll('[data-graph-group]').forEach(el=>el.checked=true);
    draw();
    $('graph-scroll').scrollLeft=0;
  });
  $('graph-explore').addEventListener('click',()=>{
    if(!selection)return;
    const word=selection.word;
    $('word-input').value=word;
    document.getElementById('search-form').requestSubmit();
  });
})();
