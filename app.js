/* Word Explorer — static GitHub Pages website; no credentials or student data collection. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('word-input');
  const form = $('search-form');
  const submit = form.querySelector('[type="submit"]');
  const message = $('message-panel');
  const results = $('results');
  const tip = $('initial-tip');
  const cache = new Map();
  const familyIndex = new Map();
  for (const family of (window.WORD_FAMILIES || [])) {
    for (const w of family) familyIndex.set(w.toLowerCase(), family);
  }
  let current = null;
  let timer = null;
  let seq = 0;
  let toastTimer;
  const pauseMs = 900;
  const maxChips = 3;
  const rank = window.WordDifficulty;
  const MAX_BULK = 20;
  const batch = {words:[], index:0};
  const stopwords = new Set('the a an this that these those your his her its their our my and or but of for to in on at by with from as is are was were be been being has have had do does did can will would should it he she they we you i not no more most very much many so such than then some any all one two three who which what when where while'.split(' '));
  const cleanWord = w => (w || '').toLowerCase().trim().replace(/\s+/g, ' ');
  const isValid = w => /^[a-z][a-z' -]{0,44}$/i.test(w) && !/\s{2}/.test(w);
  const unique = (values, target, max=maxChips) => [...new Set(values.map(v => String(v || '').trim().toLowerCase()).filter(v => v && v !== target && v.length < 45 && /^[a-z][a-z' -]*$/.test(v)))].slice(0, max);
  function showMessage(text, type='info') { message.textContent=text; message.className=`message-panel ${type==='error'?'error':''}`; message.hidden=false; }
  function hideMessage() { message.hidden=true; }
  function toast(text) { const el=$('toast'); el.textContent=text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2000); }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard!'); }
    catch { toast('コピーできませんでした。ブラウザの権限を確認してください。'); }
  }
  function chip(label, container) {
    const btn=document.createElement('button'); btn.className='chip'; btn.type='button'; btn.textContent=label;
    btn.title=`Copy: ${label}`; btn.setAttribute('aria-label',`${label} をコピー`);
    btn.addEventListener('click',()=>copyText(label)); container.appendChild(btn);
  }
  function fillChips(id, words, emptyText) {
    const el=$(id); el.replaceChildren();
    if (!words.length) { const p=document.createElement('span');p.className='empty';p.textContent=emptyText;el.appendChild(p);return; }
    words.forEach(w=>chip(w,el));
  }
  function buildDefinitions(meanings) {
    const panel=$('definition-panel'); const inner=$('definitions'); inner.replaceChildren();
    if (!meanings.length) { panel.hidden=true; return; }
    panel.hidden=false;
    for(const m of meanings.slice(0,3)) {
      const row=document.createElement('div'); row.className='definition-row';
      const pos=document.createElement('span');pos.className='pos';pos.textContent=m.pos;
      const desc=document.createElement('span');desc.textContent=m.def;
      row.append(pos,desc); inner.appendChild(row);
    }
  }
  function buildCollocations(word, parts, before, after, adjectives, nouns) {
    const phrases=[];
    const isNoun=parts.includes('noun');
    const isAdj=parts.includes('adjective');
    const isVerb=parts.includes('verb');
    const add=(left,right)=>{ const phrase=`${left} ${right}`; if(!phrases.includes(phrase)) phrases.push(phrase); };
    function eligible(w) { return w && w !== word && /^[a-z][a-z'-]*$/.test(w) && !stopwords.has(w) && w.length>2; }
    // Grammar-based collocates are preferable to neighboring-word statistics.
    if(isNoun || (!isAdj && !isVerb)) adjectives.filter(eligible).slice(0,5).forEach(w=>add(w,word));
    if(isAdj || (!isNoun && !isVerb)) nouns.filter(eligible).slice(0,5).forEach(w=>add(word,w));
    if(isVerb || isNoun || (!isAdj)) before.filter(eligible).slice(0,5).forEach(w=>add(w,word));
    if(isVerb || (!isAdj && !isNoun)) after.filter(eligible).slice(0,4).forEach(w=>add(word,w));
    // When dictionary POS is unavailable, rely on statistically related pairs as suggestions.
    if(!phrases.length) before.filter(eligible).slice(0,4).forEach(w=>add(w,word));
    return unique(phrases,'',maxChips);
  }
  async function getJson(url) {
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),8500);
    try {const r=await fetch(url,{signal:controller.signal,headers:{'Accept':'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json();}
    finally {clearTimeout(timeout);}
  }
  const dm=(param,word,max=18)=>getJson(`https://api.datamuse.com/words?${param}=${encodeURIComponent(word)}&max=${max}&md=f`);
  const fd=word=>getJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  const list=(settled)=>settled.status==='fulfilled'&&Array.isArray(settled.value)?settled.value:[];
  const words=(settled)=>list(settled).map(item=>item.word);
  const frequencies=(settled)=>new Map(list(settled).map(item=>[String(item.word||'').toLowerCase(),Number((item.tags||[]).find(tag=>tag.startsWith('f:'))?.slice(2))||0]));
  function prioritized(values,target,frequencyMap,limit=3,isPhrase=false) {
    const candidates=unique(values,target,40).map(word=>({word,frequency:frequencyMap.get(word)??-1}));
    return rank.order(candidates,isPhrase).slice(0,limit).map(item=>item.word);
  }
  async function retrieve(word) {
    if(cache.has(word)) return cache.get(word);
    const keys=['dictionary','syn','ant','meaning','before','after','adjectives','nouns'];
    const out=await Promise.allSettled([
      fd(word),dm('rel_syn',word,20),dm('rel_ant',word,15),dm('ml',word,18),
      dm('rel_bgb',word,25),dm('rel_bga',word,25),dm('rel_jjb',word,20),dm('rel_jja',word,20)
    ]);
    const data=Object.fromEntries(keys.map((key,i)=>[key,out[i]]));
    const successful=out.filter(x=>x.status==='fulfilled').length;
    const d=list(data.dictionary);
    const meanings=[]; const synDict=[];const antDict=[];const parts=[];
    let phonetic='';
    for(const entry of d){
      if(!phonetic)phonetic=entry.phonetic||entry.phonetics?.find(p=>p.text)?.text||'';
      for(const m of entry.meanings||[]){
        if(m.partOfSpeech && !parts.includes(m.partOfSpeech))parts.push(m.partOfSpeech);
        synDict.push(...(m.synonyms||[]));antDict.push(...(m.antonyms||[]));
        for(const def of m.definitions||[]){
          synDict.push(...(def.synonyms||[]));antDict.push(...(def.antonyms||[]));
          if(def.definition && !meanings.some(x=>x.pos===m.partOfSpeech))meanings.push({pos:m.partOfSpeech||'word',def:def.definition});
        }
      }
    }
    const synonyms=prioritized([...synDict,...words(data.syn)],word,frequencies(data.syn));
    const antonyms=prioritized([...antDict,...words(data.ant)],word,frequencies(data.ant));
    const family=prioritized((familyIndex.get(word)||[]),word,new Map());
    const corpusPhrases=buildCollocations(word,parts,words(data.before),words(data.after),words(data.adjectives),words(data.nouns));
    const collocations=prioritized(corpusPhrases,'',new Map(),3,true);
    const value={word,phonetic,parts,meanings,synonyms,antonyms,family,collocations,successful,datamuseOk:out.slice(1).some(x=>x.status==='fulfilled'),dictionaryOk:out[0].status==='fulfilled'};
    if(successful>0)cache.set(word,value);
    return value;
  }
  function render(data) {
    $('result-word').textContent=data.word;
    $('visual-word').textContent=data.word;
    $('phonetic').textContent=data.phonetic;
    $('parts-of-speech').textContent=data.parts.join(' · ');
    buildDefinitions(data.meanings);
    fillChips('synonyms',data.synonyms,'候補を取得できませんでした。');
    fillChips('antonyms',data.antonyms,'候補を取得できませんでした。');
    fillChips('families',data.family,'この語の登録済み派生語はありません。');
    fillChips('collocations',data.collocations,'共起語の候補を取得できませんでした。');
    const notices=[];
    if(!data.datamuseOk) notices.push('コーパス関連の検索サービスに接続できませんでした。');
    if(!data.dictionaryOk) notices.push('辞書の語義データは取得できませんでした。');
    notices.push('易しい順の並びは参考推定です（英検公式級別の判定ではありません）。本文の意味と一致するか必ず確認してください。');
    $('data-notice').textContent=notices.join(' ');
    results.hidden=false;tip.hidden=true;
    current=data;
    document.dispatchEvent(new CustomEvent('wordexplorer:render',{detail:data}));
  }
  function updateBatchNav() {
    const nav=$('batch-nav');
    nav.hidden=!batch.words.length;
    if(!batch.words.length)return;
    $('batch-progress').textContent=`${batch.index+1} / ${batch.words.length}`;
    $('batch-current').textContent=batch.words[batch.index];
    $('batch-prev').disabled=batch.index===0;
    $('batch-next').disabled=batch.index===batch.words.length-1;
    $('batch-list').replaceChildren();
    batch.words.forEach((word,i)=>{
      const btn=document.createElement('button');btn.type='button';btn.className='batch-pill'+(i===batch.index?' is-current':'');
      btn.textContent=`${i+1}. ${word}`;btn.setAttribute('aria-current',i===batch.index?'true':'false');
      btn.addEventListener('click',()=>goBatch(i));$('batch-list').append(btn);
    });
  }
  function goBatch(i) {if(i<0||i>=batch.words.length)return;batch.index=i;updateBatchNav();search(batch.words[i],true);}
  function clearBatch() {batch.words=[];batch.index=0;updateBatchNav();}
  async function search(raw, fromBatch=false) {
    if(!fromBatch && batch.words.length)clearBatch();
    clearTimeout(timer);
    const word=cleanWord(raw);
    if(!word) {showMessage('英単語を入力してください。','error');return;}
    if(!isValid(word)) {showMessage('アルファベットの英単語を入力してください。','error');return;}
    hideMessage();
    const localSeq=++seq;
    input.value=word;
    submit.disabled=true;submit.textContent='SEARCHING…';
    results.hidden=true;
    tip.hidden=true;
    showMessage(`Searching “${word}”…`);
    const data=await retrieve(word).catch(()=>null);
    if(localSeq!==seq)return;
    submit.disabled=false;submit.innerHTML='EXPLORE <span aria-hidden="true">↗</span>';
    if(!data || data.successful===0){
      showMessage('検索サービスにつながりませんでした。インターネット接続を確認し、少し後で再検索してください。','error');tip.hidden=false;return;
    }
    hideMessage();render(data);
    const url=new URL(location.href);url.searchParams.set('word',word);history.replaceState(null,'',url);
  }
  form.addEventListener('submit', e=>{e.preventDefault();search(input.value);});
  const modeSingle=$('mode-single'),modeBulk=$('mode-bulk');
  function switchMode(mode){
    const bulk=mode==='bulk';
    $('bulk-controls').hidden=!bulk; $('search-form').hidden=bulk;
    modeBulk.classList.toggle('is-active',bulk);modeSingle.classList.toggle('is-active',!bulk);
    modeBulk.setAttribute('aria-pressed',String(bulk));modeSingle.setAttribute('aria-pressed',String(!bulk));
  }
  modeSingle.addEventListener('click',()=>switchMode('single'));modeBulk.addEventListener('click',()=>switchMode('bulk'));
  const parseBatch=str=>[...new Set(str.split(/[\r\n\t,;]+/).map(cleanWord).filter(Boolean))];
  $('bulk-start').addEventListener('click',()=>{
    const items=parseBatch($('bulk-input').value);
    if(!items.length){showMessage('単語を貼り付けてください。','error');return;}
    if(items.length>MAX_BULK){showMessage(`一度に検索できるのは最大${MAX_BULK}語です。`,`error`);return;}
    const invalid=items.find(w=>!isValid(w)||w.includes(' '));
    if(invalid){showMessage(`「${invalid}」を確認してください。1行につき英単語1語を入力してください。`,'error');return;}
    batch.words=items;batch.index=0;updateBatchNav();goBatch(0);
  });
  $('batch-prev').addEventListener('click',()=>goBatch(batch.index-1));
  $('batch-next').addEventListener('click',()=>goBatch(batch.index+1));
  $('batch-clear').addEventListener('click',()=>{clearBatch();switchMode('bulk');});
  input.addEventListener('input',()=>{
    clearTimeout(timer); const word=cleanWord(input.value);
    if(!word || batch.words.length)return;
    if(isValid(word) && word.length>=2)timer=setTimeout(()=>search(word),pauseMs);
  });
  document.querySelectorAll('[data-example]').forEach(btn=>btn.addEventListener('click',()=>search(btn.dataset.example)));
  $('reset-button').addEventListener('click',()=>{clearBatch();switchMode('single');seq++;clearTimeout(timer);results.hidden=true;message.hidden=true;tip.hidden=false;current=null;document.dispatchEvent(new Event('wordexplorer:reset'));input.value='';input.focus();const url=new URL(location.href);url.searchParams.delete('word');history.replaceState(null,'',url);});
  $('copy-all').addEventListener('click',()=>{
    if(!current)return;
    const d=current;
    copyText([d.word,`Synonyms: ${d.synonyms.join(', ')||'—'}`,`Antonyms: ${d.antonyms.join(', ')||'—'}`,`Word Family: ${d.family.join(', ')||'—'}`,`Word Partners: ${d.collocations.join(', ')||'—'}`].join('\n'));
  });
  const starting=new URLSearchParams(location.search).get('word');
  if(starting && isValid(cleanWord(starting)))search(starting);
})();
