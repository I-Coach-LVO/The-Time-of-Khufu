const $=s=>document.querySelector(s);const scene=$('#scene');
const state={room:0,score:1000,start:null,elapsed:0,timerStarted:false,timerRunning:false,timerStopped:false,inventory:[],solved:[],hints:0,hintUsage:{},hintHistory:{},hintLog:[],fxEnabled:true,musicVolume:80,mode:null};
function elapsedSeconds(){return state.elapsed+(state.timerRunning&&state.start?Math.floor((Date.now()-state.start)/1000):0)}
function save(){localStorage.setItem('khufuSave',JSON.stringify({...state,elapsed:elapsedSeconds(),start:null,timerRunning:false}))}
function startTimer(){if(state.timerStarted||state.timerStopped)return;state.timerStarted=true;state.timerRunning=true;state.start=Date.now();state.elapsed=0;save()}
function stopTimer(){if(!state.timerRunning||state.timerStopped)return;state.elapsed=elapsedSeconds();state.start=null;state.timerRunning=false;state.timerStopped=true;save()}
function load(){const x=localStorage.getItem('khufuSave');if(x){try{const saved=JSON.parse(x);Object.assign(state,saved);if(typeof saved.elapsed!=='number')state.elapsed=0;if(typeof saved.timerStarted!=='boolean')state.timerStarted=state.room>0;if(typeof saved.timerStopped!=='boolean')state.timerStopped=state.solved?.includes(10)||false;if(!saved.hintUsage||typeof saved.hintUsage!=='object')state.hintUsage={};if(!saved.hintHistory||typeof saved.hintHistory!=='object')state.hintHistory={};if(!Array.isArray(saved.hintLog))state.hintLog=[];if(state.timerStarted&&!state.timerStopped){state.timerRunning=true;state.start=Date.now()}else{state.timerRunning=false;state.start=null}}catch{}}AudioEngine.fxEnabled=state.fxEnabled!==false;AudioEngine.musicVolume=Math.max(0,Math.min(1,(Number(state.musicVolume)||0)/100));}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
function bg(url,extra=''){return `<div class="room-bg ${extra}" style="background-image:url('${url}')"></div><div class="dust ${extra}"></div>`}
function hintCost(room=state.room){const used=Number(state.hintUsage?.[room]||0);if(used===0)return 0;if(state.mode==='challenge')return used<3?100:150;return 100}
function updateHintButton(){const button=$('#hintBtn');if(!button)return;const cost=hintCost();button.textContent=cost?`HINT (-${cost})`:'HINT (1E GRATIS)';button.disabled=!state.room||!activeHint||state.solved.includes(state.room)}
function updateHUD(){ $('#score').textContent=Math.max(0,state.score);$('#roomLabel').textContent=state.room?`KAMER ${state.room}/10`:'START';const inv=$('#inventory');inv.innerHTML=state.inventory.length?state.inventory.map(i=>{const current=LEVELS.find(level=>level.reward?.name===i.name)?.reward,history=i.history||current?.history||'';return `<div class="item" title="${history||i.name}" aria-label="${i.name}. ${history}">${i.icon}<span>${i.name}</span></div>`}).join(''):'<span class="tiny">Nog geen voorwerpen gevonden.</span>';updateHintButton();save()}
function renderTimer(){const s=elapsedSeconds(),m=String(Math.floor(s/60)).padStart(2,'0'),r=String(s%60).padStart(2,'0');$('#timer').textContent=`${m}:${r}`}
setInterval(renderTimer,250);
let sceneRun=0;
let activeHint=null;
let scoreEventTimer=null;
function showScoreChange(amount,reason){
 const previous=$('.score-change');if(previous)previous.remove();
 const event=document.createElement('div');event.className=`score-change ${amount>0?'positive':amount<0?'negative':'neutral'}`;event.setAttribute('role','status');event.setAttribute('aria-live','assertive');
 const value=amount>0?`+${amount}`:amount<0?`−${Math.abs(amount)}`:'0';event.textContent=`${value} punten — ${reason}.`;$('#game').appendChild(event);
 clearTimeout(scoreEventTimer);scoreEventTimer=setTimeout(()=>event.remove(),2200);
}
function setActiveHints(source){activeHint=typeof source==='function'?source:()=>source;updateHintButton()}
function availableHints(){
 const source=activeHint?activeHint():[LEVELS[state.room-1]?.hint];
 return (Array.isArray(source)?source:[source]).filter(Boolean).map((hint,index)=>typeof hint==='string'?{key:`${state.room}:${hint}`,text:hint}:{key:hint.key||`${state.room}:${index}:${hint.text}`,text:hint.text});
}
function intro(){
 const run=++sceneRun;AudioEngine.startMusic('intro');state.room=0;updateHUD();
 scene.innerHTML=`<div class="intro-cinematic" aria-label="Introductie">
   <img class="intro-frame" data-intro-index="0" src="assets/images/000-Intro-Sam.png" alt="Sam vertelt dat die op vakantie naar Egypte wil">
   <img class="intro-frame" data-intro-index="1" src="assets/images/00001-Intro-Vliegtuig.png" alt="Vliegtuig onderweg naar Egypte">
   <img class="intro-frame" data-intro-index="2" src="assets/images/image1.jpeg" alt="Bus bij de piramides van Gizeh">
   <img class="intro-frame" data-intro-index="3" src="assets/images/Khufu-intro2.jpg" alt="Piramide bij zonsondergang">
   <img class="intro-frame intro-comic" data-intro-index="4" src="assets/images/001-Intro-Full.png" alt="Strip waarin Sam en gids Hapu de piramide betreden">
   <button id="skipIntro" class="intro-skip" type="button">INTRO OVERSLAAN</button>
 </div>`;
 const frames=[...scene.querySelectorAll('.intro-frame')];
 const nav=$('#introNavControls');nav.hidden=false;
 let index=0;
 const back=$('#introBack'),next=$('#introNext'),progress=$('#introProgress');
 const showFrame=(newIndex)=>{
  if(run!==sceneRun)return;
  index=Math.max(0,Math.min(frames.length-1,newIndex));
  frames.forEach((frame,i)=>frame.classList.toggle('is-visible',i===index));
  back.disabled=index===0;
  progress.textContent=`${index+1} / ${frames.length}`;
 };
 const finish=()=>{if(run===sceneRun){nav.hidden=true;sceneRun++;AudioEngine.rumble();showKhufuInfo()}};
 back.addEventListener('click',()=>showFrame(index-1));
 next.addEventListener('click',()=>index<frames.length-1?showFrame(index+1):finish());
 $('#skipIntro').addEventListener('click',finish);
 showFrame(0);
}
function showKhufuInfo(){
 $('#introNavControls').hidden=true;
 state.room=0;updateHUD();AudioEngine.startMusic('intro');
 scene.innerHTML=`<div class="khufu-info-screen"><section class="khufu-info-panel"><h1>Wie was Khufu?</h1><p><strong>Khufu (in het Nederlands Cheops)</strong> was een farao uit het Oude Egypte. Hij is wereldberoemd als de opdrachtgever voor de bouw van de Piramide van Cheops in Gizeh, het enige nog bestaande klassieke wereldwonder.</p><button id="khufuContinue" type="button">VERDER</button></section></div>`;
 $('#khufuContinue').addEventListener('click',chooseMode);
}

function chooseMode(){
 $('#introNavControls').hidden=true;
 state.room=0;updateHUD();AudioEngine.startMusic('intro');
 scene.innerHTML=`<div class="mode-screen"><div class="mode-panel"><h1>Hoe wil je spelen?</h1><p>Wil je verkennend oefenen of ga je voor de uitdaging?</p><div class="mode-options"><button class="mode-choice" data-mode="explore" type="button"><img src="assets/images/sam-happy.png" alt="Sam kijkt blij"><strong>VERKENNEN</strong><span>De basisopdrachten met duidelijke keuzes.</span></button><button class="mode-choice" data-mode="challenge" type="button"><img src="assets/images/sam-thinking.png" alt="Sam denkt na"><strong>UITDAGING</strong><span>Meer vragen, extra keuzes en moeilijkere koppelingen.</span></button></div></div></div>`;
 scene.querySelectorAll('.mode-choice').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;save();openRoom(1)}));
}
async function openRoom(n){
 $('#introNavControls').hidden=true;
 activeHint=null;
 const run=++sceneRun;if(n===1)startTimer();state.room=n;updateHUD();renderTimer();const L=LEVELS[n-1];AudioEngine.startMusic(n);
 scene.innerHTML=`<div class="room-transition">${bg(L.image,'room-reveal')}</div>`;
 await wait(50);if(run!==sceneRun)return;scene.querySelectorAll('.room-reveal').forEach(x=>x.classList.add('is-visible'));
 await wait(3000);if(run!==sceneRun)return;
 scene.insertAdjacentHTML('beforeend',`<div class="content game-layer"><section class="panel"><h1>Kamer ${L.id}: ${L.title}</h1><p>${roomIntro(L)}</p><div id="puzzle"></div><div id="feedback"></div></section></div>`);
 requestAnimationFrame(()=>$('.game-layer').classList.add('is-visible'));renderPuzzle(L);
}
function roomIntro(L){const intros={matching:'Waar staan deze tekens symbool voor?',timeline:state.mode==='challenge'?'Zet de vijf historische gebeurtenissen van oud naar jong. Gebruik de pijlen of sleep een kaart naar de juiste plek.':'Zet de vier perioden van oud naar jong. Gebruik de pijlen of sleep een kaart naar de juiste plek.',quiz:'Beantwoord de vragen, kies uit de 4 opties.',pyramid:'Welke route bewandel je van buiten naar binnen als je een piramide in gaat?',memory:'Koppel de vier goden aan hun betekenis.',sequence:'Zet de stappen van mummificatie in de juiste volgorde. Gebruik de pijlen of versleep de regels.',differences:state.mode==='challenge'?'Bekijk beide afbeeldingen nauwkeurig. Vind de tien verschillen.':'Bekijk beide afbeeldingen nauwkeurig. Vind de vijf verschillen.',numbers:state.mode==='challenge'?'Los vijf Egyptische rekensommen op. Je krijgt optellen, aftrekken, vermenigvuldigen en delen.':'Los drie Egyptische optelsommen op. De tekens staan extra groot en ruim zodat je ze goed kunt tellen.',riddle:'Los vier raadsels op. Pas na het laatste juiste antwoord geeft de kamer haar sleutel prijs.',final:'Leg alleen de voorwerpen in de kist die duidelijk bij de geschiedenis van Egypte horen.'};return intros[L.type]}
function feedback(msg,ok=false){$('#feedback').innerHTML=`<div class="feedback ${ok?'ok':'bad'}">${msg}</div>`}
function clearFeedback(){const box=$('#feedback');if(box)box.innerHTML=''}
function fail(msg){state.score-=50;AudioEngine.bad();feedback(`<strong>−50 punten — onjuist.</strong> ${msg}`,false);showScoreChange(-50,'Verkeerd antwoord');updateHUD()}
function solve(L){
 clearFeedback();if(state.solved.includes(L.id))return;if(L.id===10)stopTimer();
 state.solved.push(L.id);if(L.reward)state.inventory.push(L.reward);state.score+=100;AudioEngine.ok();showScoreChange(100,'Juiste oplossing');updateHUD();
 const target=()=>L.id<10?openRoom(L.id+1):showLearningRecap();
 $('#puzzle').innerHTML=`<div class="reward">${L.reward?L.reward.icon:'🚪'}</div><h2>${L.reward?'Voorwerp gevonden: '+L.reward.name:'De deur gaat open!'}</h2>${L.reward?`<p class="item-history">${L.reward.history}</p>`:''}<p>Lees de uitleg rustig door en ga verder wanneer je klaar bent.</p><button id="continueBtn">${L.id<10?'NAAR KAMER '+(L.id+1):'NAAR DE TERUGBLIK'}</button>`;
 $('#continueBtn').addEventListener('click',target,{once:true});
}
function renderPuzzle(L){const p=$('#puzzle');({matching,timeline,quiz,pyramid,memory,sequence,differences,numbers,riddle,final:finalPuzzle}[L.type])(p,L)}
function matching(p,L){
 const pairs=[['☀','Zon'],['≈','Water'],['𓂀','Oog'],['𓅃','Valk'],['☥','Leven'],['𓆣','Scarabee']],rows=shuffle(pairs);
 const distractors=['Nijl','Piramide','Farao'];
 const options=pairs.map(x=>x[1]).concat(state.mode==='challenge'?distractors:[]);
 p.innerHTML=rows.map(x=>`<div class="match-row"><div class="dropzone glyph">${x[0]}</div><select data-a="${x[1]}"><option value="">Kies betekenis</option>${shuffle(options).map(y=>`<option>${y}</option>`).join('')}</select></div>`).join('')+`<button id="check">CONTROLEER</button>`;
 setActiveHints(()=>{
  const hints=[{key:'matching-method',text:'Kijk eerst naar symbolen die je uit het dagelijks leven herkent.'}];
  [...p.querySelectorAll('select')].forEach((select,index)=>{if(select.value!==select.dataset.a)hints.push({key:`matching-${select.dataset.a}`,text:`Het symbool ${rows[index][0]} hoort bij “${select.dataset.a}”.`})});
  return hints;
 });
 if(state.mode==='explore')p.querySelectorAll('.match-row select').forEach(select=>select.addEventListener('change',()=>select.closest('.match-row').classList.toggle('correct',select.value===select.dataset.a)));
 $('#check').addEventListener('click',()=>[...p.querySelectorAll('select')].every(s=>s.value===s.dataset.a)?solve(L):fail('Nog niet alle tekens zijn juist gekoppeld.'))
}
function timeline(p,L){
 const challenge=state.mode==='challenge';
 const good=challenge?['De piramide van Khufu wordt gebouwd.','Mentuhotep II herenigt Egypte.','Hatsjepsoet wordt farao.','Toetanchamon wordt farao.','Cleopatra VII regeert over Egypte.']:['Oude Rijk','Middenrijk','Nieuwe Rijk','Rijk van Cleopatra'];
 p.innerHTML=`<div class="timeline-list" aria-label="Sorteerbare tijdlijn">${shuffle(good).map(x=>sortableRow(x)).join('')}</div><button id="check">CONTROLEER</button>`;
 setActiveHints(()=>{
  const current=readOrder(p).split('|');
  const method=challenge?'Begin met de bouw van de grote piramides en eindig bij Cleopatra; vergelijk de heersers daartussen.':'Werk van het oudste rijk bovenaan naar de tijd van Cleopatra onderaan.';
  return [{key:'timeline-method',text:method},...good.flatMap((period,index)=>current[index]===period?[]:[{key:`timeline-${period}`,text:`Op plaats ${index+1} hoort “${period.replace(/[.!?]+$/,'')}”.`}])];
 });
 enableDragSort(p.querySelector('.timeline-list'));
 $('#check').addEventListener('click',()=>readOrder(p)===good.join('|')?solve(L):fail(challenge?'De tijdlijn klopt nog niet. Plaats de gebeurtenissen vanaf de bouw van de piramide van Khufu tot de regering van Cleopatra.':'De tijdlijn klopt nog niet. Sleep de perioden van het Oude Rijk naar het rijk van Cleopatra.'))
}
function quiz(p,L){
 const base=[['Wie bestuurde Egypte?','Farao'],['Wie voerde religieuze rituelen uit?','Priester'],['Wie hield administratie bij?','Schrijver'],['Wie had de minste vrijheid?','Slaaf']];
 const extra=[['Wie gaf opdracht om grote monumenten en piramides te bouwen?','Farao'],['Wie verzorgde offers en ceremonies in de tempel?','Priester'],['Wie noteerde belastingen, graanvoorraden en bevelen?','Schrijver'],['Wie verrichtte vaak zwaar lichamelijk werk zonder zelf over zijn leven te beslissen?','Slaaf']];
 const qs=shuffle(state.mode==='challenge'?base.concat(extra):base);let i=0;
 const roleClues={Farao:'Deze persoon stond aan de top en bestuurde het rijk.',Priester:'Deze persoon werkte in de tempel en verzorgde rituelen.',Schrijver:'Deze persoon kon lezen en schrijven en hield gegevens bij.',Slaaf:'Deze persoon had de minste vrijheid en deed vaak zwaar werk.'};
 const show=()=>{const [question,answer]=qs[i],answers=shuffle(['Farao','Priester','Schrijver','Slaaf']),hintKey=`quiz-${question}`;setActiveHints(()=>[{key:`${hintKey}-method`,text:'Let op het werkwoord in de vraag: besturen, rituelen uitvoeren, schrijven of zwaar werk doen.'},{key:`${hintKey}-clue`,text:roleClues[answer]},{key:`${hintKey}-answer`,text:`Bij deze vraag is “${answer}” het juiste beroep.`}]);p.innerHTML=`<p class="progress">Vraag ${i+1} van ${qs.length}</p><h2>${question}</h2><div class="choices">${answers.map(a=>`<button class="choice">${a}</button>`).join('')}</div>`;p.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{if(b.textContent===answer){clearFeedback();i++;i===qs.length?solve(L):show()}else fail('Dat is niet de juiste rol.')}))};show()
}
function pyramid(p,L){
 const challenge=state.mode==='challenge';
 const good=challenge?['Ingang','Afdalende gang','Stijgende gang','Grote Galerij','Koningskamer']:['Ingang','Gang','Grote Galerij','Grafkamer'];
 const routeImage=challenge?'assets/images/kamer4-uitdagend.png':'assets/images/kamer4-verkennend.png';
 const routeAlt=challenge?'Doorsnede van de piramide met vijf genummerde onderdelen.':'Doorsnede van de piramide met vier genummerde onderdelen.';
 p.innerHTML=`<div class="pyramid-route-layout"><img class="pyramid-route-image" src="${routeImage}" alt="${routeAlt}"><div class="pyramid-slots">${good.map((a,i)=>`<label><b>${i+1}</b><select data-a="${a}"><option value="">Kies onderdeel</option>${shuffle(good).map(x=>`<option>${x}</option>`).join('')}</select></label>`).join('')}<button id="check">CONTROLEER</button></div></div>`;
 setActiveHints(()=>{
  const hints=[{key:'pyramid-method',text:'Volg de route op de afbeelding van buiten naar steeds dieper in de piramide.'}];
  [...p.querySelectorAll('select')].forEach((select,index)=>{if(select.value!==select.dataset.a)hints.push({key:`pyramid-${select.dataset.a}`,text:`Bij stap ${index+1} hoort “${select.dataset.a}”.`})});
  return hints;
 });
 $('#check').addEventListener('click',()=>[...p.querySelectorAll('select')].every(x=>x.value===x.dataset.a)?solve(L):fail('Volg de route vanaf de ingang steeds verder naar binnen.'))
}
function memory(p,L){
 const challenge=state.mode==='challenge';
 const gods=[
  {id:'ra',name:'Ra',meaning:'Zon',look:'Valkenkop',explanation:'Ra was de zonnegod en werd vaak afgebeeld met een valkenkop en een zonneschijf.'},
  {id:'anubis',name:'Anubis',meaning:'Doden',look:'Jakhalskop',explanation:'Anubis werd verbonden met balseming en de zorg voor de doden en had vaak een jakhalskop.'},
  {id:'osiris',name:'Osiris',meaning:'Onderwereld',look:'Mummievormig lichaam',explanation:'Osiris was de heerser van de onderwereld en werd vaak met een mummievormig lichaam afgebeeld.'},
  {id:'horus',name:'Horus',meaning:challenge?'Beschermer Farao':'Beschermer',look:'Valk',explanation:'Horus was een valkengod die nauw verbonden was met het koningschap en de bescherming van de farao.'}
 ];
 const fields=challenge?['name','meaning','look']:['name','meaning'];
 const cards=shuffle(gods.flatMap(g=>fields.map(field=>({pair:g.id,value:g[field],field}))));
 let open=[],done=new Set(),locked=false;
 p.innerHTML=`<div class="memory-grid ${challenge?'memory-grid-challenge':''}">${cards.map((c,i)=>`<button class="memory-card" data-i="${i}" type="button" aria-label="Gesloten memorykaart"><span class="memory-card-inner"><span class="memory-front" aria-hidden="true"><span class="memory-scarab">𓆣</span></span><span class="memory-back">${c.value}</span></span></button>`).join('')}</div>`;
 const needed=fields.length;
 const buttons=[...p.querySelectorAll('.memory-card')];
 setActiveHints(()=>{
  const remaining=gods.filter(g=>cards.some((card,index)=>card.pair===g.id&&!done.has(index)));
  return [{key:'memory-method',text:'Onthoud waar namen, betekenissen en afbeeldingen liggen. Kaarten van dezelfde god horen bij elkaar.'},...remaining.map(g=>({key:`memory-${g.id}`,text:challenge?`${g.name} hoort bij “${g.meaning}” en “${g.look}”.`:`${g.name} hoort bij “${g.meaning}”.`}))];
 });
 buttons.forEach(b=>b.addEventListener('click',()=>{
  const i=Number(b.dataset.i);
  if(locked||open.includes(i)||done.has(i))return;
  b.classList.add('flipped');
  b.setAttribute('aria-label',`Open kaart: ${cards[i].value}`);
  open.push(i);AudioEngine.click();
  if(open.length!==needed)return;
  locked=true;
  const selected=open.map(k=>cards[k]);
  const match=selected.every(c=>c.pair===selected[0].pair)&&new Set(selected.map(c=>c.field)).size===needed;
  if(match){
   const matchedGod=gods.find(g=>g.id===selected[0].pair);
   if(challenge)feedback(`<strong>Correct drietal.</strong> ${matchedGod.explanation}`,true);else clearFeedback();
   open.forEach(k=>{done.add(k);buttons[k].classList.add('matched');buttons[k].disabled=true});
   open=[];locked=false;
   if(done.size===cards.length)setTimeout(()=>solve(L),2000);
  }else{
   setTimeout(()=>{
    open.forEach(k=>{buttons[k].classList.remove('flipped');buttons[k].setAttribute('aria-label','Gesloten memorykaart')});
    open=[];locked=false;
    fail(needed===3?'Deze drie kaarten horen niet bij dezelfde god.':'Deze twee kaarten vormen geen koppel.');
   },1100);
  }
 }))
}
function sequence(p,L){
 const good=state.mode==='challenge'?['Lichaam wassen','Organen verwijderen','Lichaam drogen met natron','Lichaam verzorgen en vullen','Amuletten plaatsen','In linnen wikkelen','In sarcofaag leggen']:['Organen verwijderen','Lichaam drogen met natron','Lichaam verzorgen','In linnen wikkelen','In sarcofaag leggen'];
 p.innerHTML=`<div class="timeline-list" aria-label="Sorteerbare volgorde">${shuffle(good).map(x=>sortableRow(x)).join('')}</div><button id="check">CONTROLEER</button>`;
 setActiveHints(()=>{
  const current=readOrder(p).split('|');
  return [{key:'sequence-method',text:'Denk aan de volgorde: eerst het lichaam voorbereiden, daarna bewaren en als laatste begraven.'},...good.flatMap((step,index)=>current[index]===step?[]:[{key:`sequence-${step}`,text:`Op plaats ${index+1} hoort “${step}”.`}])];
 });
 enableDragSort(p.querySelector('.timeline-list'));
 $('#check').addEventListener('click',()=>readOrder(p)===good.join('|')?solve(L):fail('De mummificatie verloopt nog niet in de juiste volgorde.'))
}
function differences(p,L){
 const exploreSpots=[
  {x:50.5,y:10.5,r:7,label:'plafondteken'},
  {x:5.5,y:57.5,r:6,label:'teken op de linkerwand'},
  {x:25,y:88,r:7,label:'kleine piramide'},
  {x:69,y:95,r:5,label:'blauwe scarabee'},
  {x:75,y:88,r:8,label:'stenen tablet'}
 ];
 const challengeSpots=[
  {x:51.4,y:7.4,r:6.0,label:'Oog van Horus op het plafond'},
  {x:65.4,y:27.6,r:7.2,label:'detail rechts op de bovenverdieping'},
  {x:51.4,y:32.3,r:5.8,label:'hanglamp'},
  {x:4.8,y:56.2,r:5.4,label:'ankh op de linkerwand'},
  {x:36.1,y:68.7,r:4.2,label:'gekleurd wanddetail'},
  {x:7.7,y:83.0,r:6.1,label:'stenen blok links onder'},
  {x:27.4,y:88.5,r:7.3,label:'kleine piramide'},
  {x:67.5,y:88.1,r:5.7,label:'stenen tablet'},
  {x:50.8,y:96.4,r:4.1,label:'groene scarabee midden'},
  {x:69.5,y:96.2,r:4.1,label:'groene scarabee rechts'}
 ];
 const spots=state.mode==='challenge'?challengeSpots:exploreSpots;
 const total=spots.length;
 let found=0;const foundIndices=new Set();
 const left='assets/images/Zoek-de-verschillen020.jpg';
 const right=state.mode==='challenge'?'assets/images/Zoek-de-verschillen022.jpg':'assets/images/Zoek-de-verschillen021.jpg';
 const picture=(src,side)=>`<div class="difference-image-wrap"><img src="${src}" alt="Schattenkamer afbeelding ${side}">${spots.map((s,i)=>`<button class="difference-hotspot" data-i="${i}" style="left:${s.x}%;top:${s.y}%;width:${s.r*2}%" aria-label="Mogelijk verschil bij ${s.label}"><span aria-hidden="true">✦</span></button>`).join('')}</div>`;
 p.innerHTML=`<div class="difference-stage real-images">${picture(left,'links')}${picture(right,'rechts')}</div><p>Gevonden: <b id="found">0</b>/${total}</p>`;
 setActiveHints(()=>{
  const remaining=spots.map((spot,index)=>({spot,index})).filter(({index})=>!foundIndices.has(String(index)));
  return [{key:'differences-method',text:'Vergelijk telkens hetzelfde kleine gebied links en rechts, in plaats van de hele afbeeldingen tegelijk.'},...remaining.flatMap(({spot,index})=>[
   {key:`difference-${index}-area`,text:`Zoek het volgende verschil rond ${spot.y<35?'de bovenkant':spot.y>75?'de onderkant':'het midden'} van de afbeeldingen.`},
   {key:`difference-${index}-exact`,text:`Bekijk specifiek: ${spot.label}.`}
  ])];
 });
 p.querySelectorAll('.difference-hotspot').forEach(h=>h.addEventListener('click',()=>{
  const i=h.dataset.i;
  if(p.querySelector(`.difference-hotspot[data-i="${i}"].found`))return;
  p.querySelectorAll(`.difference-hotspot[data-i="${i}"]`).forEach(x=>x.classList.add('found'));
  foundIndices.add(i);found++;$('#found').textContent=found;AudioEngine.click();if(found===total)solve(L)
 }))
}

function egyptian(n){const hundreds=Math.floor(n/100),remainder=n%100;return '𓍢'.repeat(hundreds)+'𓎆'.repeat(Math.floor(remainder/10))+'𓏺'.repeat(remainder%10)}
function numbers(p,L){
 const add=()=>{let a=11+Math.floor(Math.random()*19),b=11+Math.floor(Math.random()*19);if(a+b>59)b=59-a;return {a,b,op:'+',total:a+b}};
 const subtract=()=>{const b=4+Math.floor(Math.random()*20),a=b+4+Math.floor(Math.random()*25);return {a,b,op:'−',total:a-b}};
 const multiply=()=>{const a=2+Math.floor(Math.random()*8),b=2+Math.floor(Math.random()*8);return {a,b,op:'×',total:a*b}};
 const divide=()=>{const b=2+Math.floor(Math.random()*8),total=2+Math.floor(Math.random()*8);return {a:b*total,b,op:'÷',total}};
 const hundredAdd=()=>{const a=110+Math.floor(Math.random()*20),b=11+Math.floor(Math.random()*19);return {a,b,op:'+',total:a+b}};
 const hundredSubtract=()=>{const b=11+Math.floor(Math.random()*19),total=100+Math.floor(Math.random()*30);return {a:total+b,b,op:'−',total}};
 const hundredDivide=()=>{const b=4,total=25+Math.floor(Math.random()*10);return {a:b*total,b,op:'÷',total}};
 let sums;
 if(state.mode==='challenge'){
  const openingMakers=shuffle([multiply,shuffle([add,subtract,divide])[0]]);
  sums=[...openingMakers.map(fn=>fn()),hundredAdd(),hundredSubtract(),hundredDivide()];
 }else sums=[add(),add(),hundredAdd()];
 let current=0;
 const show=()=>{const q=sums[current],hintKey=`numbers-${q.a}-${q.op}-${q.b}`,usesHundreds=q.a>=100||q.b>=100;const method=q.op==='+'?'Tel eerst de honderdtallen, dan de tientallen en daarna de eenheden.':q.op==='−'?'Trek eerst de eenheden af, daarna de tientallen en controleer het honderdtal.':q.op==='×'?'Denk aan herhaald optellen: hoeveel groepjes van hetzelfde getal?':'Zoek hoeveel keer het tweede getal in het eerste past.';const symbolHint=usesHundreds?'Het opgerolde touw 𓍢 is 100, een boog 𓎆 is 10 en een streep 𓏺 is 1. Zet de tekenreeksen eerst om in gewone getallen.':'Een boog 𓎆 is 10 en een streep 𓏺 is 1. Zet beide tekenreeksen eerst om in gewone getallen.';setActiveHints(()=>[{key:`${hintKey}-symbols`,text:symbolHint},{key:`${hintKey}-method`,text:method},{key:`${hintKey}-values`,text:`De Egyptische getallen zijn ${q.a} en ${q.b}.`},{key:`${hintKey}-answer`,text:`${q.a} ${q.op} ${q.b} = ${q.total}.`}]);p.innerHTML=`<p class="progress">Rekensom ${current+1} van ${sums.length}</p><div class="number-legend">${usesHundreds?'𓍢 = 100 &nbsp;&nbsp; ':''}𓎆 = 10 &nbsp;&nbsp; 𓏺 = 1</div><div class="number-board"><span>${egyptian(q.a)}</span><b> ${q.op} </b><span>${egyptian(q.b)}</span><b> = ?</b></div><label class="answer-label" for="answer">Jouw antwoord</label><input id="answer" inputmode="numeric" autocomplete="off" placeholder="typ het getal"><button id="check">CONTROLEER</button>`;
 $('#check').addEventListener('click',()=>{if(+$('#answer').value===q.total){clearFeedback();current++;current===sums.length?solve(L):(AudioEngine.ok(),show())}else fail('Bekijk de Egyptische getallen opnieuw en let goed op het rekenteken.')});
 $('#answer').addEventListener('keydown',e=>{if(e.key==='Enter')$('#check').click()});
 };
 show();
}

function riddle(p,L){
 const baseRiddles=[
  {text:'Ik bewaak de doden maar leef niet.<br>Ik kijk al duizenden jaren naar het oosten.',answers:['sfinx','de sfinx','sphinx','the sphinx'],subtle:'Zoek een beroemde bewaker bij de piramides.',hint:'Denk aan het enorme beeld bij de piramides met een leeuwenlichaam en mensenhoofd.'},
  {text:'Ik ben gebouwd om een ziel naar de sterren te sturen.<br>Hoe hoger ik reik, hoe dichter ik bij de zon eindig.',answers:['piramide','een piramide','pyramide','pyramid','a pyramid'],subtle:'Het antwoord is een stenen grafmonument.',hint:'Het is een groot driehoekig grafmonument van steen.'},
  {text:'Ik houd je organen veilig, maar niet je hart.<br>Vier kruiken bewaken wat ooit in jou leefde.',answers:['canope','canopen','canopische kruik','canopische kruiken','canopic jar','canopic jars'],subtle:'Denk terug aan de stappen van mummificatie.',hint:'Tijdens de mummificatie werden organen bewaard in vier speciale kruiken.'},
  {text:'Ik ben in linnen gewikkeld en wacht op het hiernamaals.<br>Mijn naam fluistert men met angst en ontzag.',answers:['mummie','een mummie','mummy','a mummy'],subtle:'Het gaat om een bewaard lichaam.',hint:'Het lichaam is geconserveerd en volledig in linnen doeken gewikkeld.'}
 ];
 const challengeRiddles=[
  {text:'Ik kronkel door het land, maar ben geen slang.<br>Zonder mij zou bijna niemand hier kunnen leven.<br>Wat ben ik?',answers:['nijl','de nijl','nile','the nile'],subtle:'Denk aan water en vruchtbare grond in Egypte.',hint:'Deze grote rivier stroomt door Egypte en maakte landbouw mogelijk.'},
  {text:'Ik ben een koning, maar draag geen kroon zoals jij die kent.<br>Mijn woord was wet en soms noemden mensen mij zelfs goddelijk.<br>Wie ben ik?',answers:['farao','een farao','pharaoh','a pharaoh'],subtle:'Denk aan de hoogste heerser van het Oude Egypte.',hint:'Deze Egyptische koning bestuurde het rijk en werd als goddelijk gezien.'}
 ];
 const riddles=state.mode==='challenge'?baseRiddles.concat(challengeRiddles):baseRiddles;
 const normalizeAnswer=value=>value.trim().toLocaleLowerCase('nl-NL').replace(/[.!?]+$/,'').trim();
 let i=0;
 const show=()=>{const r=riddles[i];setActiveHints(()=>[{key:`riddle-${i}-subtle`,text:r.subtle},{key:`riddle-${i}-concrete`,text:r.hint},{key:`riddle-${i}-answer`,text:`Het antwoord is “${r.answers[0]}”.`}]);p.innerHTML=`<p class="progress">Raadsel ${i+1} van ${riddles.length}</p><blockquote class="speech">${r.text}</blockquote><input id="answer" autocomplete="off" placeholder="jouw antwoord"><button id="check">CONTROLEER</button>`;$('#check').addEventListener('click',()=>{const value=normalizeAnswer($('#answer').value);if(r.answers.includes(value)){clearFeedback();i++;i===riddles.length?solve(L):(AudioEngine.ok(),show())}else fail('De oude stem zwijgt. Dat is niet het juiste antwoord.')});$('#answer').addEventListener('keydown',e=>{if(e.key==='Enter')$('#check').click()})};show()
}

function finalPuzzle(p,L){
 const all=LEVELS.slice(0,9).map(x=>x.reward);
 if(state.inventory.length<9){p.innerHTML=`<p>Je mist nog voorwerpen. Speel voor de echte ontsnapping alle kamers.</p><button id="back">TERUG NAAR KAMER 1</button>`;$('#back').addEventListener('click',()=>openRoom(1));return}
 const historical=['Gouden oog','Scarabee','Ankh','Canopische kruik'];
 const historicalSet=new Set(historical);
 const wrongMessage='Er gebeurt niets, je hebt niet alle historische voorwerpen in de kist gelegd of je hebt ook moderne voorwerpen erin gelegd. Leg alleen de voorwerpen in de kist die duidelijk bij de geschiedenis van Egypte horen en dan pas kun je ontsnappen.';
 const renderSelection=()=>{
  p.innerHTML=`<p>Selecteer de vier historische Egyptische voorwerpen en leg alleen die in de kist.</p><div class="final-chest" aria-label="Kist voor Egyptische voorwerpen"><div class="chest-lid">DE KIST VAN DE FARAO</div><div class="artifact-grid">${shuffle(all).map(x=>`<button class="artifact-choice" type="button" data-name="${x.name}"><span>${x.icon}</span><small>${x.name}</small></button>`).join('')}</div></div><button id="check">SLUIT DE KIST</button>`;
  setActiveHints(()=>{
   const selected=new Set([...p.querySelectorAll('.artifact-choice.selected')].map(x=>x.dataset.name));
   const hints=[{key:'final-method',text:'Kies alleen voorwerpen met een duidelijke religieuze, symbolische of mummificatiebetekenis in het Oude Egypte.'}];
   [...selected].filter(name=>!historicalSet.has(name)).forEach(name=>hints.push({key:`final-remove-${name}`,text:`“${name}” hoort niet in de historische selectie; haal dit voorwerp uit de kist.`}));
   historical.filter(name=>!selected.has(name)).forEach(name=>hints.push({key:`final-add-${name}`,text:`“${name}” is historisch Egyptisch en hoort wel in de kist.`}));
   return hints;
  });
  p.querySelectorAll('.artifact-choice').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('selected');clearFeedback();AudioEngine.click()}));
  $('#check').addEventListener('click',()=>{
   const selected=new Set([...p.querySelectorAll('.artifact-choice.selected')].map(x=>x.dataset.name));
   const correct=selected.size===historicalSet.size&&historical.every(x=>selected.has(x));
   if(!correct){fail(wrongMessage);return}
   clearFeedback();
   if(state.mode==='challenge')renderMeaningQuiz();else solve(L);
  });
 };
 const questions=shuffle([
  {item:'Gouden oog',correct:'Beschermingssymbool',hint:'Dit teken moest de drager behoeden voor kwaad en gevaar.'},
  {item:'Scarabee',correct:'Heilige mestkever, symbool van wedergeboorte',hint:'De kever werd verbonden aan de opkomende zon en een nieuw begin.'},
  {item:'Ankh',correct:'Egyptisch levenssymbool',hint:'Dit teken wordt vaak vastgehouden door goden en staat voor leven.'},
  {item:'Canopische kruik',correct:'Werd gebruikt bij mummificatie om organen in te bewaren',hint:'Tijdens de voorbereiding van een mummie werden verwijderde organen veilig opgeborgen.'}
 ]);
 const answerPool=questions.map(q=>q.correct);
 let questionIndex=0;
 const renderMeaningQuiz=()=>{
  const q=questions[questionIndex];
  setActiveHints(()=>[{key:`final-meaning-${q.item}-subtle`,text:`Denk terug aan de kamer waarin je de ${q.item} vond.`},{key:`final-meaning-${q.item}-concrete`,text:q.hint},{key:`final-meaning-${q.item}-answer`,text:`De juiste betekenis is: “${q.correct}”.`}]);
  p.innerHTML=`<p class="progress">Betekenisvraag ${questionIndex+1} van ${questions.length}</p><h2>Waarvoor diende de <strong>${q.item}</strong>?</h2><div class="choices">${shuffle(answerPool).map(answer=>`<button class="choice" type="button" data-answer="${answer}">${answer}</button>`).join('')}</div>`;
  p.querySelectorAll('.choice').forEach(button=>button.addEventListener('click',()=>{
   if(button.dataset.answer===q.correct){
    clearFeedback();AudioEngine.ok();questionIndex++;
    questionIndex===questions.length?solve(L):renderMeaningQuiz();
   }else fail(`Dat is niet de juiste betekenis van de ${q.item}.`);
  }));
 };
 renderSelection();
}
function sortableRow(label){const accessibleLabel=label.replace(/[.!?]+$/,'');return `<div class="draggable" draggable="true"><span class="drag-handle" aria-hidden="true">☰</span><span class="drag-label">${label}</span><span class="move-controls"><button class="move-button move-down" type="button" aria-label="${accessibleLabel} omlaag" title="Naar beneden">⇩</button><button class="move-button move-up" type="button" aria-label="${accessibleLabel} omhoog" title="Naar boven">⇧</button></span></div>`}
function enableDragSort(list){
 let dragged=null;
 const updateButtons=()=>{
  const rows=[...list.querySelectorAll('.draggable')];
  rows.forEach((row,index)=>{
   row.querySelector('.move-up').disabled=index===0;
   row.querySelector('.move-down').disabled=index===rows.length-1;
  });
 };
 list.querySelectorAll('.draggable').forEach(row=>{
  row.addEventListener('dragstart',e=>{if(e.target.closest?.('.move-button')){e.preventDefault();return}dragged=row;row.classList.add('dragging')});
  row.addEventListener('dragend',()=>{row.classList.remove('dragging');dragged=null;updateButtons()});
  row.addEventListener('dragover',e=>{e.preventDefault();if(!dragged||dragged===row)return;const box=row.getBoundingClientRect();const after=e.clientY>box.top+box.height/2;list.insertBefore(dragged,after?row.nextSibling:row)});
  row.addEventListener('touchstart',e=>{if(!e.target.closest('.move-button'))row.classList.add('touch-ready')},{passive:true});
  row.querySelector('.move-up').addEventListener('click',()=>{const previous=row.previousElementSibling;if(previous){list.insertBefore(row,previous);clearFeedback();updateButtons()}});
  row.querySelector('.move-down').addEventListener('click',()=>{const next=row.nextElementSibling;if(next){list.insertBefore(next,row);clearFeedback();updateButtons()}});
 });
 updateButtons();
}
function readOrder(p){return [...p.querySelectorAll('.draggable .drag-label')].map(x=>x.textContent.trim()).join('|')}
function showLearningRecap(){
 const run=++sceneRun;activeHint=null;updateHintButton();
 const usedHints=Object.values(state.hintUsage).reduce((total,count)=>total+Number(count||0),0);
 const hintPoints=state.hintLog.reduce((total,entry)=>total+Number(entry.cost||0),0);
 const topics=LEVELS.map(level=>`<li><span aria-hidden="true">✓</span> ${level.topic}</li>`).join('');
 scene.innerHTML=`<div class="learning-recap-screen"><section class="learning-recap-panel" aria-labelledby="recapTitle"><header class="recap-header"><p class="tiny">GOED GEDAAN!</p><h1 id="recapTitle">Je bent ontsnapt</h1><p>Je hebt alle tien kamers voltooid en de belangrijkste onderdelen van het Oude Egypte ontdekt.</p></header><div class="recap-stats"><p><strong>10/10</strong><span>kamers voltooid</span></p><p><strong>${usedHints}</strong><span>${usedHints===1?'hint gebruikt':'hints gebruikt'}${hintPoints?` (−${hintPoints} punten)`:''}</span></p></div><div class="recap-summary"><h2>Dit heb je ontdekt</h2><ul>${topics}</ul><p class="recap-takeaway"><strong>Onthoud:</strong> De Nijl maakte leven en landbouw mogelijk en vormde het hart van het Oude Egypte.</p></div><button id="startOutro" type="button">START DE OUTRO</button></section></div>`;
 $('#startOutro').addEventListener('click',()=>{if(run===sceneRun)ending()});
}
async function ending(){
 const run=++sceneRun;AudioEngine.startMusic('outro');const images=['assets/images/image20.jpeg','assets/images/image21.jpeg','assets/images/image22.jpeg','assets/images/image23.jpeg'];
 const elapsed=elapsedSeconds(),minutes=String(Math.floor(elapsed/60)).padStart(2,'0'),seconds=String(elapsed%60).padStart(2,'0');
 const rank=state.score>=1750?'Meesterarcheoloog':state.score>=1350?'Ontdekkingsreiziger':'Grafrover';
 scene.innerHTML=`<div class="outro-cinematic">${images.map((src,i)=>`<img class="outro-frame" data-i="${i}" src="${src}" alt="Eindscène ${i+1}">`).join('')}<button id="skipOutro" class="intro-skip" type="button">OUTRO OVERSLAAN</button></div>`;
 const showScore=()=>{if(run!==sceneRun)return;scene.innerHTML=`<div class="outro-score"><div class="score-card"><p class="tiny">ESCAPE VOLTOOID</p><h1>${rank}</h1><div class="final-score">${Math.max(0,state.score)}</div><p>punten</p><div class="final-time">Eindtijd: ${minutes}:${seconds}</div><button id="again">OPNIEUW SPELEN</button></div></div>`;$('#again').addEventListener('click',resetGame)};
 $('#skipOutro').addEventListener('click',()=>{if(run!==sceneRun)return;sceneRun++;const old=sceneRun;sceneRun=run;showScore();sceneRun=old});
 for(const frame of scene.querySelectorAll('.outro-frame')){await wait(80);if(run!==sceneRun)return;frame.classList.add('is-visible');await wait(7000);if(run!==sceneRun)return;frame.classList.remove('is-visible');await wait(2000);if(run!==sceneRun)return}showScore();
}
function resetGame(){sceneRun++;localStorage.removeItem('khufuSave');Object.assign(state,{room:0,score:1000,start:null,elapsed:0,timerStarted:false,timerRunning:false,timerStopped:false,inventory:[],solved:[],hints:0,hintUsage:{},hintHistory:{},hintLog:[],fxEnabled:AudioEngine.fxEnabled,musicVolume:Math.round(AudioEngine.musicVolume*100),mode:null});renderTimer();syncAudioControls();intro()}
$('#hintBtn').addEventListener('click',()=>{
 if(!state.room||state.solved.includes(state.room))return;
 const room=state.room,candidates=availableHints(),history=state.hintHistory[room]||[];
 const next=candidates.find(hint=>!history.includes(hint.key));
 if(!next){const latest=candidates[candidates.length-1];feedback(latest?`<strong>Hint (opnieuw):</strong> ${latest.text}`:'Er is op dit moment geen nieuwe hint nodig.',true);return}
 const cost=hintCost(room);
 state.score-=cost;state.hints++;state.hintUsage[room]=Number(state.hintUsage[room]||0)+1;
 state.hintHistory[room]=[...history,next.key];
 state.hintLog.push({room,key:next.key,text:next.text,cost});
 feedback(`<strong>${cost?`−${cost} punten — hint.`:'Gratis hint.'}</strong> ${next.text}`,true);showScoreChange(-cost,cost?'Hint gebruikt':'Eerste hint gratis');updateHUD();
});
function syncAudioControls(){const slider=$('#musicVolume'),out=$('#musicVolumeValue'),fx=$('#soundBtn');slider.value=state.musicVolume;out.value=`${state.musicVolume}%`;out.textContent=`${state.musicVolume}%`;fx.textContent=`FX: ${state.fxEnabled?'AAN':'UIT'}`;AudioEngine.fxEnabled=state.fxEnabled;AudioEngine.setMusicVolume(state.musicVolume/100)}
$('#soundBtn').addEventListener('click',e=>{state.fxEnabled=AudioEngine.toggleFX();e.target.textContent=`FX: ${state.fxEnabled?'AAN':'UIT'}`;save()});
$('#musicVolume').addEventListener('input',e=>{state.musicVolume=Number(e.target.value);AudioEngine.setMusicVolume(state.musicVolume/100);$('#musicVolumeValue').value=`${state.musicVolume}%`;$('#musicVolumeValue').textContent=`${state.musicVolume}%`;save()});
$('#resetBtn').addEventListener('click',()=>{if(confirm('Alle voortgang wissen?'))resetGame()});
const dlg=$('#debugDialog');$('#debugBtn').addEventListener('click',()=>dlg.showModal());$('#debugRooms').innerHTML=LEVELS.map(x=>`<button type="button" data-r="${x.id}">${x.id}</button>`).join('');$('#debugRooms').addEventListener('click',e=>{if(e.target.dataset.r){dlg.close();openRoom(+e.target.dataset.r)}});
load();syncAudioControls();renderTimer();state.room?openRoom(state.room):intro();
