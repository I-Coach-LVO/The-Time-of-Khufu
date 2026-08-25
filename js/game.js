const $=s=>document.querySelector(s);const scene=$('#scene');
const state={room:0,score:1000,start:null,elapsed:0,timerStarted:false,timerRunning:false,timerStopped:false,inventory:[],solved:[],hints:0,fxEnabled:true,musicVolume:80,mode:null};
function elapsedSeconds(){return state.elapsed+(state.timerRunning&&state.start?Math.floor((Date.now()-state.start)/1000):0)}
function save(){localStorage.setItem('khufuSave',JSON.stringify({...state,elapsed:elapsedSeconds(),start:null,timerRunning:false}))}
function startTimer(){if(state.timerStarted||state.timerStopped)return;state.timerStarted=true;state.timerRunning=true;state.start=Date.now();state.elapsed=0;save()}
function stopTimer(){if(!state.timerRunning||state.timerStopped)return;state.elapsed=elapsedSeconds();state.start=null;state.timerRunning=false;state.timerStopped=true;save()}
function load(){const x=localStorage.getItem('khufuSave');if(x){try{const saved=JSON.parse(x);Object.assign(state,saved);if(typeof saved.elapsed!=='number')state.elapsed=0;if(typeof saved.timerStarted!=='boolean')state.timerStarted=state.room>0;if(typeof saved.timerStopped!=='boolean')state.timerStopped=state.solved?.includes(10)||false;if(state.timerStarted&&!state.timerStopped){state.timerRunning=true;state.start=Date.now()}else{state.timerRunning=false;state.start=null}}catch{}}AudioEngine.fxEnabled=state.fxEnabled!==false;AudioEngine.musicVolume=Math.max(0,Math.min(1,(Number(state.musicVolume)||0)/100));}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
function bg(url,extra=''){return `<div class="room-bg ${extra}" style="background-image:url('${url}')"></div><div class="dust ${extra}"></div>`}
function updateHUD(){ $('#score').textContent=Math.max(0,state.score);$('#roomLabel').textContent=state.room?`KAMER ${state.room}/10`:'START';const inv=$('#inventory');inv.innerHTML=state.inventory.length?state.inventory.map(i=>`<div class="item" title="${i.name}">${i.icon}<span>${i.name}</span></div>`).join(''):'<span class="tiny">Nog geen voorwerpen gevonden.</span>';save()}
function renderTimer(){const s=elapsedSeconds(),m=String(Math.floor(s/60)).padStart(2,'0'),r=String(s%60).padStart(2,'0');$('#timer').textContent=`${m}:${r}`}
setInterval(renderTimer,250);
let sceneRun=0;
let activeHint=null;
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
function roomIntro(L){const intros={matching:'Waar staan deze tekens symbool voor?',timeline:'Sleep de vier perioden van oud naar jong. Pak een kaart vast en zet hem op de juiste plek.',quiz:'Beantwoord de vragen, kies uit de 4 opties.',pyramid:'Welke route bewandel je van buiten naar binnen als je een piramide in gaat?',memory:'Koppel de vier goden aan hun betekenis.',sequence:'Zet de stappen van mummificatie in de juiste volgorde.',differences:state.mode==='challenge'?'Bekijk beide afbeeldingen nauwkeurig. Vind de tien verschillen.':'Bekijk beide afbeeldingen nauwkeurig. Vind de vijf verschillen.',numbers:state.mode==='challenge'?'Los vijf Egyptische rekensommen op. Je krijgt optellen, aftrekken, vermenigvuldigen en delen.':'Los drie Egyptische optelsommen op. De tekens staan extra groot en ruim zodat je ze goed kunt tellen.',riddle:'Los vier raadsels op. Pas na het laatste juiste antwoord geeft de kamer haar sleutel prijs.',final:'Leg alleen de voorwerpen in de kist die duidelijk bij de geschiedenis van Egypte horen.'};return intros[L.type]}
function feedback(msg,ok=false){$('#feedback').innerHTML=`<div class="feedback ${ok?'ok':'bad'}">${msg}</div>`}
function clearFeedback(){const box=$('#feedback');if(box)box.innerHTML=''}
function fail(msg){state.score-=25;AudioEngine.bad();feedback(msg,false);updateHUD()}
function solve(L){
 clearFeedback();if(state.solved.includes(L.id))return;if(L.id===10)stopTimer();
 state.solved.push(L.id);if(L.reward)state.inventory.push(L.reward);state.score+=100;AudioEngine.ok();updateHUD();
 let remaining=5;const target=()=>L.id<10?openRoom(L.id+1):ending();
 $('#puzzle').innerHTML=`<div class="reward">${L.reward?L.reward.icon:'🚪'}</div><h2>${L.reward?'Voorwerp gevonden: '+L.reward.name:'De deur gaat open!'}</h2><p class="auto-next">Automatisch verder over <b id="nextCount">${remaining}</b> seconden.</p><button id="continueBtn">${L.id<10?'NAAR KAMER '+(L.id+1):'NAAR BUITEN'}</button>`;
 let done=false;const go=()=>{if(done)return;done=true;clearInterval(tick);target()};$('#continueBtn').addEventListener('click',go);
 const tick=setInterval(()=>{remaining--;const c=$('#nextCount');if(c)c.textContent=remaining;if(remaining<=0)go()},1000);
}
function renderPuzzle(L){const p=$('#puzzle');({matching,timeline,quiz,pyramid,memory,sequence,differences,numbers,riddle,final:finalPuzzle}[L.type])(p,L)}
function matching(p,L){
 const pairs=[['☀','Zon'],['≈','Water'],['𓂀','Oog'],['𓅃','Valk'],['☥','Leven'],['𓆣','Scarabee']],rows=shuffle(pairs);
 const distractors=['Nijl','Piramide','Farao'];
 const options=shuffle(pairs.map(x=>x[1]).concat(state.mode==='challenge'?distractors:[]));
 p.innerHTML=rows.map(x=>`<div class="match-row"><div class="dropzone glyph">${x[0]}</div><select data-a="${x[1]}"><option value="">Kies betekenis</option>${options.map(y=>`<option>${y}</option>`).join('')}</select></div>`).join('')+`<button id="check">CONTROLEER</button>`;
 if(state.mode==='explore'){
  p.querySelectorAll('select').forEach(s=>s.addEventListener('change',()=>s.classList.toggle('match-correct',s.value===s.dataset.a)));
 }
 $('#check').addEventListener('click',()=>[...p.querySelectorAll('select')].every(s=>s.value===s.dataset.a)?solve(L):fail('Nog niet alle tekens zijn juist gekoppeld.'))
}
function timeline(p,L){
 const good=['Oude Rijk','Middenrijk','Nieuwe Rijk','Rijk van Cleopatra'];
 p.innerHTML=`<div class="timeline-list" aria-label="Versleepbare tijdlijn">${shuffle(good).map(x=>`<div class="draggable" draggable="true"><span class="drag-handle" aria-hidden="true">☰</span><span>${x}</span></div>`).join('')}</div><button id="check">CONTROLEER</button>`;
 enableDragSort(p.querySelector('.timeline-list'));
 $('#check').addEventListener('click',()=>readOrder(p)===good.join('|')?solve(L):fail('De tijdlijn klopt nog niet. Sleep de perioden van het Oude Rijk naar het rijk van Cleopatra.'))
}
function quiz(p,L){
 const base=[['Wie bestuurde Egypte?','Farao'],['Wie voerde religieuze rituelen uit?','Priester'],['Wie hield administratie bij?','Schrijver'],['Wie had de minste vrijheid?','Slaaf']];
 const extra=[['Wie gaf opdracht om grote monumenten en piramides te bouwen?','Farao'],['Wie verzorgde offers en ceremonies in de tempel?','Priester'],['Wie noteerde belastingen, graanvoorraden en bevelen?','Schrijver'],['Wie verrichtte vaak zwaar lichamelijk werk zonder zelf over zijn leven te beslissen?','Slaaf']];
 const qs=shuffle(state.mode==='challenge'?base.concat(extra):base);let i=0;
 const show=()=>{const [question,answer]=qs[i],answers=shuffle(['Farao','Priester','Schrijver','Slaaf']);p.innerHTML=`<p class="progress">Vraag ${i+1} van ${qs.length}</p><h2>${question}</h2><div class="choices">${answers.map(a=>`<button class="choice">${a}</button>`).join('')}</div>`;p.querySelectorAll('.choice').forEach(b=>b.addEventListener('click',()=>{if(b.textContent===answer){clearFeedback();i++;i===qs.length?solve(L):show()}else fail('Dat is niet de juiste rol.')}))};show()
}
function pyramid(p,L){
 const good=state.mode==='challenge'?['ingang','afdalende gang','stijgende gang','Grote Galerij','Koningskamer']:['ingang','gang','Grote Galerij','grafkamer'];
 const options=shuffle(good);
 p.innerHTML=`<div class="pyramid-route-layout"><img class="pyramid-route-image" src="assets/images/pyramid-route.png" alt="Piramide van buitenaf"><div class="pyramid-slots">${good.map((a,i)=>`<label><b>${i+1}</b><select data-a="${a}"><option value="">Kies onderdeel</option>${options.map(x=>`<option>${x}</option>`).join('')}</select></label>`).join('')}<button id="check">CONTROLEER</button></div></div>`;
 $('#check').addEventListener('click',()=>[...p.querySelectorAll('select')].every(x=>x.value===x.dataset.a)?solve(L):fail('Volg de route vanaf de ingang steeds verder naar binnen.'))
}
function memory(p,L){
 const challenge=state.mode==='challenge';
 const gods=[
  {id:'ra',name:'Ra',meaning:'Zon',look:'Valkenkop'},
  {id:'anubis',name:'Anubis',meaning:'Doden',look:'Jakhalskop'},
  {id:'osiris',name:'Osiris',meaning:'Onderwereld',look:'Mummievormig lichaam'},
  {id:'horus',name:'Horus',meaning:challenge?'Beschermer Farao':'Beschermer',look:'Valk'}
 ];
 const fields=challenge?['name','meaning','look']:['name','meaning'];
 const cards=shuffle(gods.flatMap(g=>fields.map(field=>({pair:g.id,value:g[field],field}))));
 let open=[],done=new Set(),locked=false;
 p.innerHTML=`<div class="memory-grid ${challenge?'memory-grid-challenge':''}">${cards.map((c,i)=>`<button class="memory-card" data-i="${i}" type="button" aria-label="Gesloten memorykaart"><span class="memory-card-inner"><span class="memory-front" aria-hidden="true"><span class="memory-scarab">𓆣</span></span><span class="memory-back">${c.value}</span></span></button>`).join('')}</div>`;
 const needed=fields.length;
 const buttons=[...p.querySelectorAll('.memory-card')];
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
   clearFeedback();
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
 const good=['Organen verwijderen','Lichaam drogen met natron','Lichaam verzorgen','In linnen wikkelen','In sarcofaag leggen'];
 p.innerHTML=`<div class="timeline-list" aria-label="Versleepbare volgorde">${shuffle(good).map(x=>`<div class="draggable" draggable="true"><span class="drag-handle" aria-hidden="true">☰</span><span>${x}</span></div>`).join('')}</div><button id="check">CONTROLEER</button>`;
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
 let found=0;
 const left='assets/images/Zoek-de-verschillen020.jpg';
 const right=state.mode==='challenge'?'assets/images/Zoek-de-verschillen022.jpg':'assets/images/Zoek-de-verschillen021.jpg';
 const picture=(src,side)=>`<div class="difference-image-wrap"><img src="${src}" alt="Schattenkamer afbeelding ${side}">${spots.map((s,i)=>`<button class="difference-hotspot" data-i="${i}" style="left:${s.x}%;top:${s.y}%;width:${s.r*2}%" aria-label="Mogelijk verschil bij ${s.label}"><span aria-hidden="true">✦</span></button>`).join('')}</div>`;
 p.innerHTML=`<div class="difference-stage real-images">${picture(left,'links')}${picture(right,'rechts')}</div><p>Gevonden: <b id="found">0</b>/${total}</p>`;
 p.querySelectorAll('.difference-hotspot').forEach(h=>h.addEventListener('click',()=>{
  const i=h.dataset.i;
  if(p.querySelector(`.difference-hotspot[data-i="${i}"].found`))return;
  p.querySelectorAll(`.difference-hotspot[data-i="${i}"]`).forEach(x=>x.classList.add('found'));
  found++;$('#found').textContent=found;AudioEngine.click();if(found===total)solve(L)
 }))
}

function egyptian(n){return '𓎆'.repeat(Math.floor(n/10))+'𓏺'.repeat(n%10)}
function numbers(p,L){
 const add=()=>{let a=11+Math.floor(Math.random()*19),b=11+Math.floor(Math.random()*19);if(a+b>59)b=59-a;return {a,b,op:'+',total:a+b}};
 const subtract=()=>{const b=4+Math.floor(Math.random()*20),a=b+4+Math.floor(Math.random()*25);return {a,b,op:'−',total:a-b}};
 const multiply=()=>{const a=2+Math.floor(Math.random()*8),b=2+Math.floor(Math.random()*8);return {a,b,op:'×',total:a*b}};
 const divide=()=>{const b=2+Math.floor(Math.random()*8),total=2+Math.floor(Math.random()*8);return {a:b*total,b,op:'÷',total}};
 let sums;
 if(state.mode==='challenge'){
  const makers=shuffle([add,subtract,multiply,divide]);
  sums=makers.map(fn=>fn());
  sums.push(shuffle([add,subtract,multiply,divide])[0]());
  sums=shuffle(sums);
 }else sums=[add(),add(),add()];
 let current=0;
 const show=()=>{const q=sums[current];activeHint=q.op==='+'?'Tel eerst de tientallen en daarna de eenheden.':q.op==='−'?'Trek eerst de eenheden af en daarna de tientallen.':q.op==='×'?'Denk aan herhaald optellen: hoeveel groepjes van hetzelfde getal?':'Zoek hoeveel keer het tweede getal in het eerste past.';p.innerHTML=`<p class="progress">Rekensom ${current+1} van ${sums.length}</p><div class="number-legend">𓎆 = 10 &nbsp;&nbsp; 𓏺 = 1</div><div class="number-board"><span>${egyptian(q.a)}</span><b> ${q.op} </b><span>${egyptian(q.b)}</span><b> = ?</b></div><label class="answer-label" for="answer">Jouw antwoord</label><input id="answer" inputmode="numeric" autocomplete="off" placeholder="typ het getal"><button id="check">CONTROLEER</button>`;
 $('#check').addEventListener('click',()=>{if(+$('#answer').value===q.total){clearFeedback();current++;current===sums.length?solve(L):(AudioEngine.ok(),show())}else fail('Bekijk de Egyptische getallen opnieuw en let goed op het rekenteken.')});
 $('#answer').addEventListener('keydown',e=>{if(e.key==='Enter')$('#check').click()});
 };
 show();
}

function riddle(p,L){
 const riddles=[
  {text:'Ik bewaak de doden maar leef niet.<br>Ik kijk al duizenden jaren naar het oosten.',answers:['sfinx'],hint:'Denk aan het enorme beeld bij de piramides met een leeuwenlichaam en mensenhoofd.'},
  {text:'Ik ben gebouwd om een ziel naar de sterren te sturen.<br>Hoe hoger ik reik, hoe dichter ik bij de zon eindig.',answers:['piramide','pyramide'],hint:'Het is een groot driehoekig grafmonument van steen.'},
  {text:'Ik houd je organen veilig, maar niet je hart.<br>Vier kruiken bewaken wat ooit in jou leefde.',answers:['canope','canopen','canopische kruik','canopische kruiken'],hint:'Tijdens de mummificatie werden organen bewaard in vier speciale kruiken.'},
  {text:'Ik ben in linnen gewikkeld en wacht op het hiernamaals.<br>Mijn naam fluistert men met angst en ontzag.',answers:['mummie'],hint:'Het lichaam is geconserveerd en volledig in linnen doeken gewikkeld.'}
 ];let i=0;
 const show=()=>{const r=riddles[i];activeHint=r.hint;p.innerHTML=`<p class="progress">Raadsel ${i+1} van 4</p><blockquote class="speech">${r.text}</blockquote><input id="answer" autocomplete="off" placeholder="jouw antwoord"><button id="check">SPREEK JE ANTWOORD UIT</button>`;$('#check').addEventListener('click',()=>{const value=$('#answer').value.trim().toLowerCase();if(r.answers.includes(value)){clearFeedback();i++;i===riddles.length?solve(L):(AudioEngine.ok(),show())}else fail('De oude stem zwijgt. Dat is niet het juiste antwoord.')});$('#answer').addEventListener('keydown',e=>{if(e.key==='Enter')$('#check').click()})};show()
}

function finalPuzzle(p,L){
 const all=LEVELS.slice(0,9).map(x=>x.reward);
 if(state.inventory.length<9){p.innerHTML=`<p>Je mist nog voorwerpen. Speel voor de echte ontsnapping alle kamers.</p><button id="back">TERUG NAAR KAMER 1</button>`;$('#back').addEventListener('click',()=>openRoom(1));return}
 const historical=['Gouden oog','Scarabee','Ankh','Canopische kruik'];
 const historicalSet=new Set(historical);
 const wrongMessage='Er gebeurt niets, je hebt niet alle historische voorwerpen in de kist gelegd of je hebt ook moderne voorwerpen erin gelegd. Leg alleen de voorwerpen in de kist die duidelijk bij de geschiedenis van Egypte horen en dan pas kun je ontsnappen.';
 const renderSelection=()=>{
  activeHint='Kijk naar voorwerpen die een duidelijke religieuze, symbolische of mummificatiebetekenis hadden in het Oude Egypte.';
  p.innerHTML=`<p>Selecteer de vier historische Egyptische voorwerpen en leg alleen die in de kist.</p><div class="final-chest" aria-label="Kist voor Egyptische voorwerpen"><div class="chest-lid">DE KIST VAN DE FARAO</div><div class="artifact-grid">${shuffle(all).map(x=>`<button class="artifact-choice" type="button" data-name="${x.name}"><span>${x.icon}</span><small>${x.name}</small></button>`).join('')}</div></div><button id="check">SLUIT DE KIST</button>`;
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
  activeHint=q.hint;
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
function enableDragSort(list){let dragged=null;list.querySelectorAll('.draggable').forEach(row=>{row.addEventListener('dragstart',()=>{dragged=row;row.classList.add('dragging')});row.addEventListener('dragend',()=>{row.classList.remove('dragging');dragged=null});row.addEventListener('dragover',e=>{e.preventDefault();if(!dragged||dragged===row)return;const box=row.getBoundingClientRect();const after=e.clientY>box.top+box.height/2;list.insertBefore(dragged,after?row.nextSibling:row)});row.addEventListener('touchstart',()=>row.classList.add('touch-ready'),{passive:true})})}
function readOrder(p){return [...p.querySelectorAll('.draggable span:last-child')].map(x=>x.textContent.trim()).join('|')}
async function ending(){
 const run=++sceneRun;AudioEngine.startMusic('intro');const images=['assets/images/image20.jpeg','assets/images/image21.jpeg','assets/images/image22.jpeg','assets/images/image23.jpeg'];
 const elapsed=elapsedSeconds(),minutes=String(Math.floor(elapsed/60)).padStart(2,'0'),seconds=String(elapsed%60).padStart(2,'0');
 const rank=state.score>=1750?'Meesterarcheoloog':state.score>=1350?'Ontdekkingsreiziger':'Grafrover';
 scene.innerHTML=`<div class="outro-cinematic">${images.map((src,i)=>`<img class="outro-frame" data-i="${i}" src="${src}" alt="Eindscène ${i+1}">`).join('')}<button id="skipOutro" class="intro-skip" type="button">OUTRO OVERSLAAN</button></div>`;
 const showScore=()=>{if(run!==sceneRun)return;scene.innerHTML=`<div class="outro-score"><div class="score-card"><p class="tiny">ESCAPE VOLTOOID</p><h1>${rank}</h1><div class="final-score">${Math.max(0,state.score)}</div><p>punten</p><div class="final-time">Eindtijd: ${minutes}:${seconds}</div><button id="again">OPNIEUW SPELEN</button></div></div>`;$('#again').addEventListener('click',resetGame)};
 $('#skipOutro').addEventListener('click',()=>{if(run!==sceneRun)return;sceneRun++;const old=sceneRun;sceneRun=run;showScore();sceneRun=old});
 for(const frame of scene.querySelectorAll('.outro-frame')){await wait(80);if(run!==sceneRun)return;frame.classList.add('is-visible');await wait(7000);if(run!==sceneRun)return;frame.classList.remove('is-visible');await wait(2000);if(run!==sceneRun)return}showScore();
}
function resetGame(){sceneRun++;localStorage.removeItem('khufuSave');Object.assign(state,{room:0,score:1000,start:null,elapsed:0,timerStarted:false,timerRunning:false,timerStopped:false,inventory:[],solved:[],hints:0,fxEnabled:AudioEngine.fxEnabled,musicVolume:Math.round(AudioEngine.musicVolume*100),mode:null});renderTimer();syncAudioControls();intro()}
$('#hintBtn').addEventListener('click',()=>{if(!state.room)return;state.score-=100;state.hints++;feedback(`<strong>Hint:</strong> ${activeHint||LEVELS[state.room-1].hint}`,true);updateHUD()});
function syncAudioControls(){const slider=$('#musicVolume'),out=$('#musicVolumeValue'),fx=$('#soundBtn');slider.value=state.musicVolume;out.value=`${state.musicVolume}%`;out.textContent=`${state.musicVolume}%`;fx.textContent=`FX: ${state.fxEnabled?'AAN':'UIT'}`;AudioEngine.fxEnabled=state.fxEnabled;AudioEngine.setMusicVolume(state.musicVolume/100)}
$('#soundBtn').addEventListener('click',e=>{state.fxEnabled=AudioEngine.toggleFX();e.target.textContent=`FX: ${state.fxEnabled?'AAN':'UIT'}`;save()});
$('#musicVolume').addEventListener('input',e=>{state.musicVolume=Number(e.target.value);AudioEngine.setMusicVolume(state.musicVolume/100);$('#musicVolumeValue').value=`${state.musicVolume}%`;$('#musicVolumeValue').textContent=`${state.musicVolume}%`;save()});
$('#resetBtn').addEventListener('click',()=>{if(confirm('Alle voortgang wissen?'))resetGame()});
const dlg=$('#debugDialog');$('#debugBtn').addEventListener('click',()=>dlg.showModal());$('#debugRooms').innerHTML=LEVELS.map(x=>`<button type="button" data-r="${x.id}">${x.id}</button>`).join('');$('#debugRooms').addEventListener('click',e=>{if(e.target.dataset.r){dlg.close();openRoom(+e.target.dataset.r)}});
load();syncAudioControls();renderTimer();state.room?openRoom(state.room):intro();
