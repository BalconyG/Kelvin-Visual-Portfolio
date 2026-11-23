import { captions } from './captions.js';
const $ = id => document.getElementById(id);
const labels = {
  work:['作品目錄','Work index'], about:['關於','About'], top:['返回頁首','Back to top'],
  all:['全部系列','All collections'], film:['短片','Short films'], design:['平面設計','Graphic design'],
  photo:['攝影','Photography'], personal:['個人攝影','Personal photography'], documentary:['紀實攝影','Documentary photography'],
  events:['活動與演出攝影','Event & performance photography'], chill:['山Chill · 社交媒體攝影','山Chill · Social photography'],
  festival:['音樂藝術節','Arts & Music Festival'], livecoding:['Live Coding 活動','Live Coding Workshop'], projects:['項目策劃案','Project proposals']
};
const projectYears = {festival:2021, livecoding:2024};
const photoGroups = ['personal','documentary','events','chill'];
let lang = localStorage.getItem('kelvin-language') === 'en' ? 1 : 0;
const label = key => labels[key][lang];
const pick = (zh,en) => lang ? en : zh;
let category = 'all', sub = 'all', viewItems = [], viewIndex = 0;
const el = (name,cls,txt) => {const n=document.createElement(name); if(cls)n.className=cls; if(txt)n.textContent=txt; return n;};
const works = await fetch('works.json').then(r=>r.json());
const list = group => works.filter(w=>w.group===group);
const num = n => String(n).padStart(2,'0');
const duration = n => Math.floor(n/60)+':'+num(n%60);
function title(w){
  if(photoGroups.includes(w.group)){const id=w.src.match(/-(\d+)\./)?.[1];return captions[id]?.[lang]||label(w.group)+' '+num(list(w.group).indexOf(w)+1);}
  return (lang?w.titleEn:w.titleZh)||w.title;
}
function kind(w){
  if(w.group==='film'){
    if(w.typeZh) return pick(w.typeZh,w.typeEn);
    if(w.src==='media/film-70.mp4') return pick('個人短片','Personal film');
    if(w.src==='media/film-71.mp4') return pick('商業廣告','Commercial film');
    return label('film');
  }
  if(w.group==='projects') return label(w.project)+' / '+projectYears[w.project];
  return label(w.group);
}
const preferred = {
  personal:'media/personal-61.webp',
  documentary:'media/documentary-21.webp',
  events:'media/events-29.webp',
  chill:'media/chill-72.webp',
  film:'media/film-70.mp4'
};
const cover = group => list(group).find(w=>w.src===preferred[group]) || list(group)[0];
function filterButton(key,active,onClick){
  const b=el('button',active?'active':'',label(key));
  b.setAttribute('aria-pressed',String(active)); b.onclick=onClick;return b;
}
function choose(cat,group='all',scroll=false){
  category=cat;sub=group;renderGrid();
  if(scroll){$('work').scrollIntoView();$('filters').querySelector('.active')?.focus({preventScroll:true});}
}
function addCard(w,heading,meta,onClick,isGroup=false){
  const b=el('button','card '+w.group+(isGroup?' group-cover':''));
  const frame=el('div','frame');const img=el('img'); img.src=w.thumb;img.alt='';img.loading='lazy';frame.append(img);
  if(w.kind==='video'&&!isGroup)frame.append(el('span','tag','▶ '+duration(w.duration)));
  if(w.kind==='pdf'&&!isGroup)frame.append(el('span','tag','PDF'));
  b.append(frame);
  if(isGroup||!photoGroups.includes(w.group)){
    const info=el('div','card-info');
    info.append(el('small','',meta),el('h3','',heading));
    b.append(info);
  }else{
    b.setAttribute('aria-label',pick('查看照片','View photograph')+' · '+title(w));
  }
  b.onclick=onClick;
  $('gallery').append(b);
}
function renderGrid(){
  $('filters').replaceChildren(...['all','film','design','photo','projects'].map(k=>filterButton(k,k===category,()=>choose(k))));
  $('subgroups').replaceChildren();
  if(category==='photo')$('subgroups').append(...['all',...photoGroups].map(k=>filterButton(k,k===sub,()=>choose('photo',k))));
  $('gallery').replaceChildren();
  if(category==='all'||category==='photo'&&sub==='all'){
    const groups=category==='all'?['film','design','documentary','personal','events','chill','projects']:photoGroups;
    for(const g of groups){
      const w=cover(g);if(!w)continue;
      const meta=photoGroups.includes(g)?pick('攝影系列','Photo series'):pick('作品系列','Collection');
      addCard(w,label(g),meta+' / '+num(g==='projects'?Object.keys(projectYears).length:list(g).length),()=>photoGroups.includes(g)?choose('photo',g,true):choose(g,'all',true),true);
    }
    return;
  }
  if(category==='projects'){
    if(sub==='all'){
      for(const [key,year] of Object.entries(projectYears)){
        const first=list('projects').find(w=>w.project===key);
        addCard(first,label(key),pick('昆山杜克大學','Duke Kunshan University')+' / '+year,()=>choose('projects',key,true),true);
      }
    }else{
      $('subgroups').append(filterButton('projects',false,()=>choose('projects')));
      const items=list('projects').filter(w=>w.project===sub);
      items.forEach((w,i)=>addCard(w,title(w),kind(w),()=>openViewer(items,i)));
    }
    return;
  }
  const items=list(category==='photo'?sub:category);
  items.forEach((w,i)=>addCard(w,title(w),kind(w),()=>openViewer(items,i)));
}
function showMedia(){
  const w=viewItems[viewIndex];
  const isPhoto=photoGroups.includes(w.group);
  $('view-info').hidden=isPhoto;
  $('viewer').setAttribute('aria-label',isPhoto?title(w):pick('作品預覽','Work preview'));
  $('view-title').textContent=isPhoto?'':title(w);
  $('view-cat').textContent=isPhoto?'':kind(w);
  $('counter').textContent=num(viewIndex+1)+' / '+num(viewItems.length);
  $('previous').textContent=pick('上一件','Previous');$('next').textContent=pick('下一件','Next');
  $('stage').replaceChildren();let node;
  if(w.kind==='document'){
    const note=el('div','workshop-note');
    note.append(el('h3','',pick('用程式碼即興作曲','Making music with live code')),
      el('p','',pick('這份三小時的工作坊策劃案，把聲音合成、節奏編寫與集體即興串成三節練習。','This three-hour workshop proposal moves from synthesizing sounds to writing rhythms and improvising together.')));
    const agenda=el('ol');
    for(const step of [
      pick('用 SuperCollider 合成聲音，即時調整音色。','Synthesize sounds in SuperCollider and change their timbre in real time.'),
      pick('用 TidalCycles 編寫節奏與旋律，與同伴修改樂句。','Write rhythmic and melodic patterns in TidalCycles and vary them with a partner.'),
      pick('在 Estuary 裏使用 miniTidal，共同完成一段 Algorave 即興演出。','Use miniTidal in Estuary for a collaborative Algorave jam.')
    ])agenda.append(el('li','',step));
    const link=el('a','pdf-link',pick('下載完整策劃案（Word）','Download the full proposal (Word)'));
    link.href=w.src;link.download='WorkshopLiveCoding.docx';note.append(agenda,link);$('stage').append(note);return;
  }
  if(w.kind==='video'){node=el('video');node.controls=true;node.playsInline=true;node.poster=w.thumb;node.preload='metadata';}
  else if(w.kind==='pdf'){node=el('iframe');node.title=title(w);}
  else{node=el('img');node.alt=(lang?w.altEn:w.altZh)||title(w);}
  node.src=w.src;$('stage').append(node);
  if(w.src.endsWith('projects-10.pdf'))$('stage').append(el('p','detail-note',pick('《迷宮》是昆山杜克大學 2021 年藝術及音樂節的遊戲策劃。黃庚鴻參與設計遊戲線索。','Labyrinth was a game proposal for the 2021 Arts & Music Festival at Duke Kunshan University. Kelvin contributed to the clue design.')));
  if(w.src.endsWith('projects-11.pdf'))$('stage').append(el('p','detail-note',pick('這份雙語節目選錄涵蓋 2021 年 4 月 19 至 25 日的 13 項活動。','A bilingual selection of 13 festival events from 19 to 25 April 2021.')));
  if(w.kind==='pdf'){const a=el('a','pdf-link',pick('另開 PDF 文件','Open PDF in a new tab'));a.href=w.src;a.target='_blank';a.rel='noopener';$('stage').append(a);}
}
function openViewer(items,i){viewItems=items;viewIndex=i;showMedia();$('viewer').showModal();document.body.style.overflow='hidden';}
function shiftView(delta){viewIndex=(viewIndex+delta+viewItems.length)%viewItems.length;showMedia();}
$('close').onclick=()=>$('viewer').close();
$('viewer').addEventListener('close',()=>{$('stage').replaceChildren();document.body.style.overflow='';});
$('viewer').addEventListener('click',e=>{if(e.target!==$('viewer'))return;const r=$('viewer').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('viewer').close();});
$('previous').onclick=()=>shiftView(-1);$('next').onclick=()=>shiftView(1);
document.addEventListener('keydown',e=>{if(!$('viewer').open||e.target.tagName==='VIDEO')return;if(e.key==='ArrowRight')shiftView(1);if(e.key==='ArrowLeft')shiftView(-1);});
function render(){
  document.documentElement.lang=lang?'en':'zh-HK';document.querySelectorAll('[data-label]').forEach(n=>n.textContent=label(n.dataset.label));
  $('bio-zh').hidden=Boolean(lang);$('bio-en').hidden=!lang;$('en').setAttribute('aria-pressed',String(!!lang));$('zh').setAttribute('aria-pressed',String(!lang));renderGrid();
}
['zh','en'].forEach((id,i)=>$(id).onclick=()=>{lang=i;localStorage.setItem('kelvin-language',id);render();});
render();
