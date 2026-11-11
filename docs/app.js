'use strict';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE='wishbrary.v2.';
function readStore(key,fallback){try{const data=JSON.parse(localStorage.getItem(STORE+key));return data===null?fallback:data}catch{return fallback}}
function writeStore(key,data){try{localStorage.setItem(STORE+key,JSON.stringify(data));return true}catch{toast('目前無法儲存，請下載書籤留存。');return false}}
const validResult=x=>x&&typeof x.id==='string'&&Number.isInteger(x.cat)&&CATEGORIES[x.cat]&&SCENARIOS.some(s=>s.id===x.scenario)&&BOOKS.some(b=>b.id===x.book);
let saved=readStore('saved',[]);saved=Array.isArray(saved)?saved.filter(validResult).slice(0,100):[];
let recent=readStore('recent',[]);recent=Array.isArray(recent)?recent.filter(x=>typeof x==='string'&&BOOKS.some(b=>b.id===x)).slice(0,10):[];
let feedback=readStore('feedback',[]);feedback=Array.isArray(feedback)?feedback.slice(-50):[];
let cat=0,screen='home',current=null,analysis=null,skippedBooks=new Set(),animationTimer=null,toastTimer=null;
let magicFramesTimer=null;
let reduced=readStore('reduced',false)||matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500)}
function syncCount(){$('#saved-count').textContent=saved.length}
function setMotion(){document.body.classList.toggle('still',!!reduced);$('#motion-toggle').setAttribute('aria-pressed',String(!!reduced));$('#motion-toggle').innerHTML=`${reduced?'◍':'◌'} <span>${reduced?'已減少動態':'微光動態'}</span>`}
$('#motion-toggle').onclick=()=>{reduced=!reduced;writeStore('reduced',reduced);setMotion();if(reduced&&animationTimer)finishMagic();if(screen==='guide')scheduleGuide()};setMotion();syncCount();
function showScreen(name,{focus=true}={}){if(screen==='magic'&&name!=='magic')leaveMagic();if(screen==='guide'&&name!=='guide'){clearTimeout(guideTimer);guideRun++;storySound.stop()}screen=name;document.body.dataset.screen=name;$$('.screen').forEach(s=>s.classList.toggle('hidden',s.id!==name+'-screen'));$$('nav button').forEach(b=>b.classList.remove('active'));$('#nav-'+(name==='saved'?'saved':name==='about'?'about':'home')).classList.add('active');if(name==='saved')renderSaved();window.scrollTo({top:0,behavior:'instant'});if(focus){const h=$('#'+name+'-screen').querySelector('h1,h2');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true})}}}
function leaveMagic(){clearTimeout(animationTimer);clearInterval(magicFramesTimer);animationTimer=null;magicFramesTimer=null}
function home(){leaveMagic();showScreen('home')}
$('#home-link').onclick=e=>{e.preventDefault();home()};$('#nav-home').onclick=home;$('#nav-saved').onclick=()=>{leaveMagic();showScreen('saved')};$('#nav-about').onclick=()=>{leaveMagic();showScreen('about')};$('#footer-about').onclick=()=>{leaveMagic();showScreen('about')};$('#how-button').onclick=enterRoom;
$('#enter').onclick=startGuide;
$('#choose-back').onclick=enterRoom;
$('#welcome-next').onclick=()=>{renderDeck();showScreen('choose')};
$('#welcome-screen').addEventListener('animationend',event=>{if(event.animationName==='room-arrival')$('#welcome-screen').classList.remove('room-arrival')});
$('#leave-room').onclick=()=>showScreen('farewell');
$('#farewell-home').onclick=home;
$('#farewell-result').onclick=()=>showScreen('result');

const GUIDE = [
  { art:'crossroads', caption:'雨夜裡，你在十字路口停了一下。', duration:1500 },
  { art:'look', caption:'路燈下，一雙琥珀色的眼睛抬了起來。', duration:1100 },
  { art:'step', caption:'阿墨沿著人行道往前走。', duration:670 },
  { art:'wait', caption:'阿墨：「還沒想好嗎？那就先來坐坐。」', action:'跟上阿墨' },
  { art:'turn', caption:'你跟著阿墨拐進窄巷。', duration:1280 },
  { art:'approach', caption:'巷子深處，還亮著一盞燈。', duration:1200 },
  { art:'key', caption:'鑰匙輕輕碰了一下木門。', duration:880 },
  { art:'crack', caption:'一線暖光落在門檻上。', duration:780 },
  { art:'door', caption:'阿墨在門邊等你。', action:'走進書房' }
];
let guideIndex=0,guideTimer=null,guideRun=0,guidePending=false;
const guideImages=[];
function enterRoom(){showScreen('welcome')}
function startGuide(){
  const camera=$('#guide-camera');
  if(!camera.children.length){
    GUIDE.forEach(({art},index)=>{
      const frame=document.createElement('div');
      frame.className='cinema-shot';
      frame.dataset.art=art;
      const picture=new Image();
      picture.alt='';
      picture.decoding='async';
      picture.fetchPriority=index===0?'high':index>3?'low':'auto';
      picture.src='assets/story/guide/'+String(index+1).padStart(2,'0')+'.webp';
      frame.append(picture);
      camera.append(frame);
      guideImages.push(picture.decode().catch(()=>{}));
    });
  }
  $$('.cinema-shot').forEach(shot=>shot.classList.remove('is-current','was-current'));
  $('#guide-cat').classList.add('hidden');
  $('#guide-next').classList.add('hidden');
  $('#guide-caption').textContent='稍等一下，街燈就亮了。';
  showScreen('guide');
  showGuide(0);
}
async function showGuide(index){
  clearTimeout(guideTimer);
  const run=++guideRun;
  guidePending=true;
  await guideImages[index];
  if(run!==guideRun||screen!=='guide')return;
  guidePending=false;
  const previous=guideIndex;
  guideIndex=index;
  const frame=GUIDE[index];
  const stage=$('#guide-screen');
  stage.dataset.shot=frame.art;
  storySound.play(frame.art);
  $$('.cinema-shot').forEach((shot,i)=>{
    shot.classList.toggle('is-current',i===index);
    shot.classList.toggle('was-current',i===previous&&previous!==index&&index!==0);
  });
  $('#guide-caption').textContent=frame.caption;
  scheduleGuide();
}
function scheduleGuide(){
  clearTimeout(guideTimer);
  const frame=GUIDE[guideIndex];
  $('#guide-caption').classList.toggle('interlude',!frame.action&&!reduced);
  $('#guide-sound').setAttribute('aria-pressed',String(storySound.enabled));
  $('#guide-sound').textContent=storySound.enabled?'關閉音效':'開啟音效';
  $('#guide-motion').setAttribute('aria-pressed',String(reduced));
  $('#guide-motion').textContent=reduced?'恢復動態':'減少動態';
  $('#guide-cat').classList.toggle('hidden',frame.art!=='wait');
  const next=$('#guide-next');
  next.classList.toggle('hidden',!frame.action&&!reduced);
  next.textContent=(frame.action||'下一幕')+' →';
  if(!guidePending&&!frame.action&&!reduced){
    if(document.activeElement===next)$('#guide-title').focus({preventScroll:true});
    guideTimer=setTimeout(()=>showGuide(guideIndex+1),frame.duration);
  }
}
function advanceGuide(){
  if(guidePending)return;
  if(guideIndex===GUIDE.length-1){
    if(!reduced)$('#welcome-screen').classList.add('room-arrival');
    enterRoom();
    return;
  }
  showGuide(guideIndex+1);
}
$('#guide-next').onclick=advanceGuide;
$('#guide-cat').onclick=()=>{
  $('#guide-title').focus({preventScroll:true});
  advanceGuide();
};
$('#guide-skip').onclick=enterRoom;
$('#guide-motion').onclick=()=>$('#motion-toggle').click();
$('#guide-sound').onclick=()=>{
  if(storySound.enabled)storySound.stop();
  else if(storySound.unlock())storySound.play($('#guide-screen').dataset.shot);
  else {toast('這個瀏覽器目前無法播放音效。');return}
  $('#guide-sound').setAttribute('aria-pressed',String(storySound.enabled));
  $('#guide-sound').textContent=storySound.enabled?'關閉音效':'開啟音效';
};

const leaf=(x,y,rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation})"><path d="M0 0 Q-17 -20 -8 -36 Q10 -25 0 0 M0 0L-6 -29" fill="currentColor" fill-opacity=".35" stroke="currentColor" stroke-width=".8"/></g>`;
function botanical(motif){let drawing='';if(motif==='plum'){drawing='<path d="M-5 270Q55 210 42 162T96 52M34 185L7 126M46 146L92 107M70 80L59 32" fill="none" stroke="currentColor" stroke-width="3"/>';[[20,137],[44,162],[85,112],[94,57],[59,34],[57,100]].forEach(([x,y])=>{drawing+=`<g transform="translate(${x} ${y})" fill="#ded6c7" stroke="currentColor" stroke-width=".7"><circle cx="0" cy="-6" r="6"/><circle cx="6" cy="-1" r="6"/><circle cx="3" cy="6" r="6"/><circle cx="-5" cy="5" r="6"/><circle cx="-7" cy="-2" r="6"/><circle r="2" fill="currentColor"/></g>`})}else if(motif==='crane'){drawing='<circle cx="83" cy="43" r="20" fill="#c7bda3" opacity=".65"/><path d="M23 98 Q30 75 50 82 Q70 58 49 40 Q77 45 67 77 Q76 69 98 73 Q91 93 66 98 Q72 117 55 132 Q47 114 45 100Z" fill="#ece9db" stroke="currentColor" stroke-width="1.2"/><path d="M50 84Q57 72 58 58L65 43L69 46L62 64Q63 81 58 93M68 44L82 46L68 49M55 127L43 157M59 128L61 154M37 95L19 114M43 96L24 121" stroke="currentColor" fill="none" stroke-width="1"/>';drawing+=leaf(17,265,-25)+leaf(105,290,30)}else if(motif==='pine'){drawing='<path d="M85 276Q53 209 66 170T49 92Q40 64 54 37M64 169L27 139M61 130L97 104M49 86L20 65" stroke="currentColor" stroke-width="4" fill="none"/>';[[52,39],[23,62],[51,84],[97,103],[28,138],[66,165]].forEach(([x,y])=>{drawing+=`<path d="M${x-19} ${y+5} Q${x-26} ${y-2} ${x-12} ${y-6} Q${x-10} ${y-19} ${x} ${y-11} Q${x+12} ${y-20} ${x+16} ${y-6} Q${x+30} ${y-5} ${x+23} ${y+5}Z" fill="currentColor" fill-opacity=".65" stroke="currentColor" stroke-width=".6"/>`});drawing+='<path d="M0 275L30 253L60 264L85 247L120 275" fill="none" stroke="currentColor"/>'}else if(motif==='iris'){drawing='<path d="M0 72L26 45L47 59L73 26L120 67M0 82Q40 67 60 79T120 77" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/>';[[26,270],[70,286],[100,268]].forEach(([x,y])=>{drawing+=`<g transform="translate(${x} ${y})"><path d="M0 0Q-16 -40 -5 -81M0 0Q18 -45 24 -59M0 0Q-35 -40 -23 -55" stroke="currentColor" stroke-width="2" fill="none"/><path d="M-5 -81Q-30 -97 -21 -110Q-4 -110 -5 -91Q10 -114 19 -103Q23 -90 -5 -81Z" fill="currentColor" fill-opacity=".5" stroke="currentColor"/></g>`})}else{drawing='<rect width="120" height="300" fill="#526374" opacity=".82"/><circle cx="88" cy="47" r="15" fill="#ded8b8"/><circle cx="94" cy="40" r="15" fill="#60707d"/><path d="M0 274L31 244L57 258L84 219L120 264M0 289L42 265L72 279L120 248" fill="none" stroke="#c4ccb9" stroke-width="1.2"/>';[[22,35],[40,77],[12,116],[88,107],[74,162],[104,183],[30,203]].forEach(([x,y],i)=>drawing+=`<path d="M${x-3} ${y}h6M${x} ${y-3}v6" stroke="#d6cfaf" stroke-width="1"/>`);drawing+='<path d="M22 35L40 77L12 116M88 107L74 162L104 183L30 203" stroke="#c9ccb8" fill="none" opacity=".45"/>'}return `<svg viewBox="0 0 120 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="color:var(--card-ink)">${drawing}</svg>`}
function flowerHTML(i){const c=CATEGORIES[i];return `<div class="flower" style="--card-ink:${c.color}"><span class="tassel"></span><span class="flower-hole"></span><div class="flower-inner"><div class="flower-illustration">${botanical(c.motif)}</div><span class="flower-label">${c.name}</span><span class="flower-stamp">心</span></div></div>`}
function renderDeck(){$('#card-deck').innerHTML=CATEGORIES.map((c,i)=>`<button type="button" class="flower-choice ${cat===i?'selected':''}" data-cat="${i}" aria-pressed="${cat===i}" aria-label="${c.name}花牌：${c.subtitle}">${flowerHTML(i)}<span class="flower-number">0${i+1} / ${c.subtitle}</span><span class="selected-mark">${cat===i?'已選擇 · '+c.name:''}</span></button>`).join('');$('#choice-caption').textContent=CATEGORIES[cat].desc;$$('[data-cat]').forEach(b=>b.onclick=()=>{cat=+b.dataset.cat;renderDeck();$('#card-deck').querySelector(`[data-cat="${cat}"]`).focus({preventScroll:true})})}
function prepareWrite(){$('#selected-card').innerHTML=flowerHTML(cat);$('#category-badge').textContent=CATEGORIES[cat].name+'花牌';$('#examples').innerHTML=CATEGORIES[cat].examples.map((x,i)=>`<button type="button" data-example="${i}">${escapeHTML(x.length>19?x.slice(0,18)+'…':x)}</button>`).join('');$$('[data-example]').forEach(b=>b.onclick=()=>{$('#wish').value=CATEGORIES[cat].examples[+b.dataset.example];updateInput();$('#wish').focus()});$('#input-error').textContent=''}
$('#choose-next').onclick=()=>{prepareWrite();showScreen('write')};$('#write-back').onclick=()=>{renderDeck();showScreen('choose')};function updateInput(){$('#char-count').textContent=$('#wish').value.length+' / 500';$('#input-error').textContent=''}$('#wish').addEventListener('input',updateInput);
function analyze(text,category){const normalized=text.normalize('NFKC').replace(/ＡＩ/gi,'AI');const scores=SCENARIOS.map((s,i)=>{const matches=s.patterns.filter(p=>(p==='AI'?/\bai\b/i.test(normalized):normalized.toLowerCase().includes(p.toLowerCase())));let score=matches.reduce((sum,p)=>sum+(p.length>=4?4:3),0);if(matches.length&&s.cat===category)score+=1;return {s,score,matches,order:i}}).filter(x=>x.matches.length).sort((a,b)=>b.score-a.score||a.order-b.order);if(!scores.length)return null;const top=scores[0];const topics=[...top.s.topics];const related=scores.slice(1).filter(x=>x.score>=top.score*.65).slice(0,1);related.forEach(r=>r.s.topics.forEach(t=>{if(!topics.includes(t))topics.push(t)}));return {scenario:top.s.id,topics,tags:[top.s.label,...related.map(x=>x.s.label)].slice(0,2),scores}}
function candidates(a){const primary=SCENARIOS.find(s=>s.id===a.scenario);return BOOKS.map(b=>({b,score:b.topics.reduce((n,t)=>n+(t===primary.topics[0]?8:t===primary.topics[1]?6:a.topics.includes(t)?2:0),0)})).filter(x=>x.score>=6).sort((a,b)=>b.score-a.score)}
function chooseBook(a,allowRecent=false){return candidates(a).find(x=>!skippedBooks.has(x.b.id)&&(allowRecent||!recent.includes(x.b.id)))?.b||null}
function registerRecent(bookId){recent=[bookId,...recent.filter(id=>id!==bookId)].slice(0,10);writeStore('recent',recent)}
function newResult(a,b){return {id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),cat,scenario:a.scenario,book:b.id,tags:a.tags,date:new Date().toISOString()}}
function detectUrgency(text){return /自殺|自残|自殘|不想活|想死|傷害自己|杀死自己|殺死自己/.test(text)&&!/沒有.{0,3}(自殺|自殘)|不會.{0,3}(自殺|自殘)/.test(text)}
$('#wish-form').onsubmit=e=>{
  e.preventDefault();
  const text=$('#wish').value.trim();
  if(text.length<4){$('#input-error').textContent='再多說一點點，例如發生了什麼，或希望哪一件事有所改變。';$('#wish').focus();return}
  if(detectUrgency(text)){renderSupport();return}
  const match=analyze(text,cat);
  skippedBooks=new Set();
  if(!match){analysis=null;renderNoMatch('unknown');return}
  const specific=match.scores.filter(x=>x.s.id!=='uncertainty'&&x.s.id!=='emotion');
  if(specific.length>1&&specific[1].score>=specific[0].score*.7){
    clarify(specific.slice(0,2));return;
  }
  useMatch(match);
};
function clarify(options){
  const container=$('#clarify-options');
  container.replaceChildren();
  options.forEach(({s})=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='secondary';
    button.textContent=s.label;
    button.onclick=()=>useMatch({scenario:s.id,topics:s.topics,tags:[s.label]});
    container.append(button);
  });
  showScreen('clarify');
}
$('#clarify-back').onclick=()=>{prepareWrite();showScreen('write');$('#wish').focus()};
function useMatch(match){
  analysis=match;
  const book=chooseBook(match);
  if(!book){renderNoMatch('recent');return}
  current=newResult(match,book);
  startMagic();
}
const AURORA=[
  '書籤透出微光，光絲慢慢升起。',
  '青綠與藍紫的極光，在書房上空展開。',
  '阿墨抬起頭，領著光帶轉向書架。',
  '書脊依序亮起，幾頁紙輕輕翻動。',
  '光聚在一本書上，把它送到你眼前。',
  '極光收進書籤與書頁。桌燈仍然亮著。'
];
function showAuroraFrame(index){
  $('#aurora-frames').dataset.frame=String(index);
  $('#magic-caption').textContent=AURORA[index];
}
function startMagic(){
  if(reduced){finishMagic();return}
  $('#aurora-frames').innerHTML=AURORA.map((_,i)=>'<img src="assets/story/aurora-'+(i+1)+'.webp" alt="">').join('');
  $('#magic-card').innerHTML=flowerHTML(cat);
  let index=0;
  showAuroraFrame(index);
  showScreen('magic');
  magicFramesTimer=setInterval(()=>{if(index<AURORA.length-1)showAuroraFrame(++index)},900);
  animationTimer=setTimeout(finishMagic,5500);
}
function finishMagic(){leaveMagic();if(!current)return;registerRecent(current.book);renderResult(current);showScreen('result');$('#result-content').classList.add('result-reveal');setTimeout(()=>$('#result-content').classList.remove('result-reveal'),1400)}
$('#skip-animation').onclick=()=>{if(screen==='magic')finishMagic()};
function renderNoMatch(reason){current=null;$('#result-content').innerHTML=reason==='recent'?`<article class="paper no-match"><p class="eyebrow">讓每一次推薦，都有意義</p><h3>相近的書，最近已和你見過面。</h3><p>目前書庫裡，與這個問題切合的作品已在近期推薦中。我們不想用無關的書填補。你可以再補充一個具體情境，或選擇重讀其中一本相符的書。</p><div class="no-match-options"><button class="primary" id="refine">再補充一點 →</button><button class="secondary" id="allow-repeat">重讀一本相關的書</button></div></article>`:`<article class="paper no-match"><p class="eyebrow">先把問題，再靠近一點</p><h3>讓書櫃多聽懂你一些。</h3><p>目前還沒有足夠線索找到適合的書。可以再寫一件具體發生的事，或選一個接近的示例。我們會依你提供的問題配對，不只依花牌選書。</p><div class="no-match-options"><button class="primary" id="refine">回去補充心事 →</button></div><p class="micro">本版提供生活、人際、關係與職涯的閱讀探索；書庫尚未涵蓋所有問題。</p></article>`;$('#refine').onclick=()=>{prepareWrite();showScreen('write');$('#wish').focus()};if($('#allow-repeat'))$('#allow-repeat').onclick=()=>{const b=chooseBook(analysis,true);if(b){current=newResult(analysis,b);startMagic()}};showScreen('result')}
function renderSupport(){leaveMagic();current=null;$('#result-content').innerHTML='<article class="paper no-match"><p class="eyebrow">此刻，先照顧你的安全</p><h3>這份難受，值得有真人陪你。</h3><p>謝謝你把心事說出來。如果你可能立即傷害自己，請聯絡當地緊急服務，或請可信任的人陪你前往急診。可以先傳一句：「我現在很不好受，希望你陪我一下。」</p><p>盡可能與可能傷害自己的物品保持距離，讓身邊的人知道你需要支持。這間書房無法即時監測危機，此刻先不以抽籤代替真人的陪伴。</p><button class="primary" id="support-home">回到書房</button></article>';$('#support-home').onclick=home;showScreen('result')}
function getParts(r){return {s:SCENARIOS.find(x=>x.id===r.scenario),b:BOOKS.find(x=>x.id===r.book)}}
function isSaved(r){return saved.some(x=>x.scenario===r.scenario&&x.book===r.book)}
function renderResult(r){current=r;const {s,b}=getParts(r);const tags=Array.isArray(r.tags)?r.tags.filter(t=>typeof t==='string').slice(0,2):[s.label];$('#result-content').innerHTML=`<div class="result-layout"><article class="paper bookmark-paper"><div class="bookmark-top"><span>${CATEGORIES[r.cat].name}花牌 / 一頁方向</span><span>✧</span></div><h3 class="bookmark-title">${s.title}</h3><p class="original-label">心事書櫃 · 原創格言</p><p class="comfort-copy">${s.comfort}</p><div class="matched-tags" aria-label="這次辨識到的主題">${tags.map(t=>`<span>${escapeHTML(t)}</span>`).join('')}</div><details><summary>格言的延伸與小故事</summary><p class="story-label">書房原創寓言 · 非作者生平或書中情節</p><p class="story">${s.story}</p><p class="story">${s.explain}</p></details><div class="small-action"><span>✎ 今天的一小步</span><p>${s.action}</p></div><div class="bookmark-actions"><button id="save-bookmark" class="primary">${isSaved(r)?'✓ 已收藏':'收藏這張書籤'}</button><button id="copy-bookmark" class="secondary">複製</button><button id="download-bookmark" class="secondary">下載文字 ↓</button></div></article><aside class="book-panel" aria-label="一本推薦書"><p class="book-eyebrow">為這個問題，遇見一本書</p><div class="book-header"><div class="book-art" style="background:linear-gradient(125deg,${b.color},#2b3c32)"><span>${b.title}</span></div><div><h3 class="book-title">${b.title}</h3><p class="book-author">${b.author}<br>${b.translator}</p><div class="book-meta">${b.publisher} · ${b.year} · 繁體中文<br>${b.isbn?'ISBN '+b.isbn:'版本請以館藏頁為準'}</div></div></div><div class="book-explanation"><h4>✧ 為什麼適合你</h4><p>這次的線索是「${escapeHTML(s.label)}」。${b.reason}</p><h4>從這裡開始閱讀</h4><p>${b.start}</p></div><button class="primary" id="find-library">⌑ 查詢圖書館館藏 <span>↗</span></button><div class="book-secondary"><button id="swap-book" class="text-button">↻ 讀過了，換一本</button><button id="wrong-book" class="text-button">不太符合我的問題</button></div><div class="source-note">書目依據：<a href="${b.source}" target="_blank" rel="noopener noreferrer">${b.sourceName} ↗</a><br>推薦理由與閱讀提示為本站撰寫；裝飾封面非實際書封。未查詢即時在架狀態。</div><div class="feedback"><span>這一頁，有靠近你的心事嗎？</span><div class="feedback-buttons">${['符合','部分符合','不符合'].map(t=>`<button data-feedback="${t}" aria-pressed="false">${t}</button>`).join('')}</div><p id="feedback-status" class="saved-info" role="status"></p></div></aside></div>`;
$('#save-bookmark').onclick=()=>{if(isSaved(r)){toast('這一頁已經在你的收藏裡。');return}const next=[r,...saved].slice(0,100);if(writeStore('saved',next)){saved=next;syncCount();$('#save-bookmark').textContent='✓ 已收藏';toast('已收藏。這一頁，留給需要的時候。')}};
$('#copy-bookmark').onclick=()=>copyText(bookmarkText(r),'書籤已複製，不包含原始心事。');$('#download-bookmark').onclick=()=>downloadText(bookmarkText(r),'心事書籤_'+s.id+'.txt');$('#find-library').onclick=()=>openLibrary(r);$('#swap-book').onclick=swapBook;$('#wrong-book').onclick=()=>{writeFeedback(r,'不符合');prepareWrite();showScreen('write');$('#input-error').textContent='可以補充：你最在意的是哪個部分？書櫃會重新尋找相符的線索。';$('#wish').focus()};$$('[data-feedback]').forEach(button=>button.onclick=()=>{writeFeedback(r,button.dataset.feedback);$$('[data-feedback]').forEach(x=>{x.classList.toggle('selected',x===button);x.setAttribute('aria-pressed',String(x===button))});$('#feedback-status').textContent='已記錄於本機。謝謝你告訴書房。'})}
function writeFeedback(r,rating){feedback=[...feedback,{scenario:r.scenario,book:r.book,rating,date:new Date().toISOString()}].slice(-50);writeStore('feedback',feedback)}
function swapBook(){if(!current)return;const old=current;const {s}=getParts(old);if(!analysis||analysis.scenario!==s.id)analysis={scenario:s.id,topics:s.topics,tags:[s.label]};skippedBooks.add(old.book);const b=chooseBook(analysis);if(!b){toast('目前其他相符作品已看過。可以補充問題，書櫃不會隨意配書。');return}current=newResult(analysis,b);registerRecent(b.id);renderResult(current);toast('已換成另一本相關作品，書籤仍為這個問題而寫。')}
$('#another-wish').onclick=()=>{current=null;analysis=null;skippedBooks=new Set();$('#wish').value='';updateInput();renderDeck();showScreen('choose')};
async function copyText(text,message='已複製。'){try{await navigator.clipboard.writeText(text);toast(message)}catch{toast('此瀏覽器無法使用剪貼簿，請下載文字後複製。')}}
function bookmarkText(r){const {s,b}=getParts(r);return `心事書櫃｜日式深夜解憂書房\n${CATEGORIES[r.cat].name}花牌\n\n${s.title}\n（本站原創格言）\n\n${s.comfort}\n\n格言的延伸與小故事（原創寓言）\n${s.story}\n${s.explain}\n\n今天的一小步\n${s.action}\n\n一個問題，一本書\n${b.title}${b.subtitle?'：'+b.subtitle:''}\n${b.author}｜${b.translator}\n${b.publisher}，${b.year}\n${b.isbn?'ISBN：'+b.isbn:''}\n\n推薦理由\n${b.reason}\n\n閱讀提示\n${b.start}\n\n書目來源\n${b.sourceName}\n${b.source}\n${b.holding?'館藏入口\n'+b.holding.url:''}\n\n格言、寓言與練習為本站原創，非書中引文。借閱資格與館藏狀態以各館為準。此書籤不包含原始心事。`}
function downloadText(text,name){const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function renderSaved(){$('#saved-summary').textContent=saved.length+' 張留給自己的書籤';$('#export-saved').disabled=!saved.length;$('#saved-list').innerHTML=saved.length?saved.map((r,i)=>{const {s,b}=getParts(r);return `<article class="paper saved-item"><small>${CATEGORIES[r.cat].name}花牌 / ${new Date(r.date).toLocaleDateString('zh-TW')}</small><h3>${s.title}</h3><p>${s.comfort.slice(0,75)}…</p><div class="item-book">閱讀方向 / ${b.title}</div><div class="saved-item-actions"><button class="text-button" data-open="${i}">翻開書籤 →</button><button class="text-button" data-remove="${i}" aria-label="移除書籤：${s.title}">移除</button></div></article>`}).join(''):`<div class="empty-state"><div class="empty-icon">冊</div><h3>為下一個小小的啟發，留個位置。</h3><p>遇見喜歡的書籤，再把它收進這裡。</p><button class="secondary" id="empty-start">選一張花牌 →</button></div>`;$$('[data-open]').forEach(b=>b.onclick=()=>{const r=saved[+b.dataset.open];cat=r.cat;analysis=null;skippedBooks=new Set();renderResult(r);showScreen('result')});$$('[data-remove]').forEach(b=>b.onclick=()=>{const idx=+b.dataset.remove,next=saved.filter((_,i)=>i!==idx);if(writeStore('saved',next)){saved=next;syncCount();renderSaved();toast('已移除書籤。')}});if($('#empty-start'))$('#empty-start').onclick=()=>{renderDeck();showScreen('choose')}}
$('#export-saved').onclick=()=>downloadText(saved.map(bookmarkText).join('\n\n──────────────\n\n'),'我的心事書籤.txt');
function openLibrary(r){const {b}=getParts(r);$('#library-book').innerHTML=`<p class="library-book-name">${b.title}</p><div class="library-book-isbn">${b.author}${b.isbn?' · ISBN '+b.isbn:''}</div>`;$('#library-select').innerHTML=LIBRARIES.map((l,i)=>`<option value="${i}">${l.name}</option>`).join('');const pref=readStore('library',0);$('#library-select').value=LIBRARIES[pref]?pref:0;setLibraryLink();$('#copy-title').onclick=()=>copyText(b.title,'書名已複製，可以貼到館藏查詢。');$('#copy-isbn').disabled=!b.isbn;$('#copy-isbn').onclick=()=>{if(b.isbn)copyText(b.isbn,'ISBN 已複製。')};$('#direct-holding').innerHTML=b.holding?`<p>也可以直接查看已查得的書目：</p><a href="${b.holding.url}" target="_blank" rel="noopener noreferrer">${b.holding.name}・這本書 ↗</a><p class="micro">電子書可能需要該館借閱證、等待或預約。這是書目入口，不代表此刻可借。</p>`:'<p class="micro">目前未收錄這本書的公共圖書館直達頁。請使用書名或 ISBN 到所選館別查詢；查無時可換其他館別。</p>';$('#library-dialog').showModal()}
function setLibraryLink(){const i=+$('#library-select').value;$('#library-go').href=LIBRARIES[i].url;$('#library-go').textContent='前往'+LIBRARIES[i].name+' ↗'}$('#library-select').onchange=()=>{setLibraryLink();writeStore('library',+$('#library-select').value)};$('.dialog-close').onclick=()=>$('#library-dialog').close();$('#library-dialog').addEventListener('click',e=>{if(e.target===$('#library-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
$('#source-list').innerHTML=BOOKS.map(b=>`<div class="source-list-item"><span>${b.title} · ${b.publisher} ${b.year}</span><a href="${b.source}" target="_blank" rel="noopener noreferrer">核對書目 ↗</a></div>`).join('');$('#source-list').setAttribute('aria-label','書目查證來源');
$('#clear-data').onclick=()=>$('#confirm-dialog').showModal();$('#cancel-clear').onclick=()=>$('#confirm-dialog').close();$('#confirm-clear').onclick=()=>{try{['saved','recent','feedback'].forEach(key=>localStorage.removeItem(STORE+key));saved=[];recent=[];feedback=[];syncCount();$('#confirm-dialog').close();$('#clear-status').textContent='已清除本機收藏、推薦紀錄與回饋。';toast('紀錄已清除。')}catch{$('#confirm-dialog').close();$('#clear-status').textContent='無法清除，請使用瀏覽器網站資料設定。'}};
renderDeck();

document.body.dataset.screen='home';
