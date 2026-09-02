const AudioEngine={
 fxEnabled:true,ctx:null,master:null,musicGain:null,musicTimer:null,fileMusic:null,introFadeFrame:null,step:0,currentRoom:null,musicVolume:.8,introMusicScale:.2,outroMusicScale:.3,
 init(){
  if(this.ctx)return;
  this.ctx=new (window.AudioContext||window.webkitAudioContext)();
  this.master=this.ctx.createGain();this.master.gain.value=.98;this.master.connect(this.ctx.destination);
  this.musicGain=this.ctx.createGain();this.musicGain.gain.value=this.musicVolume;this.musicGain.connect(this.master);
  this.fileMusic=new Audio('assets/audio/bilady_intro_outro.wav');
  this.fileMusic.loop=true;this.fileMusic.preload='auto';this.fileMusic.volume=this.musicVolume*this.introMusicScale;
 },
 unlock(){
  this.init();if(this.ctx.state==='suspended')this.ctx.resume();
  if(['intro','outro'].includes(this.currentRoom)&&this.musicVolume>0){this.playIntro(false);return}
  if(this.currentRoom!==null&&!this.musicTimer&&this.musicVolume>0)this.startMusic(this.currentRoom)
 },
 tone(freq=440,dur=.12,type='square',vol=.035,when=0,destination=null){
  const isMusic=destination===this.musicGain;if(!isMusic&&!this.fxEnabled)return;
  this.init();const start=this.ctx.currentTime+when,o=this.ctx.createOscillator(),g=this.ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,start);g.gain.setValueAtTime(Math.max(.0001,vol),start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);
  o.connect(g);g.connect(destination||this.master);o.start(start);o.stop(start+dur+.03)
 },
 click(){this.unlock();this.tone(250,.06,'square',.055)},
 ok(){this.unlock();[440,660,880].forEach((f,i)=>this.tone(f,.16,'square',.06,i*.09))},
 bad(){this.unlock();this.tone(120,.28,'sawtooth',.055)},
 rumble(){this.unlock();[70,55,45].forEach((f,i)=>this.tone(f,.45,'sawtooth',.09,i*.1))},
 roomPattern(room){
  // Originele 8-bit melodieën met een Egyptisch/mysterieus karakter.
  // Elke kamer behoudt een eigen hoofdthema, baslijn en tempo.
  const roots=[110,123.47,130.81,146.83,164.81,174.61,196,220,246.94,98];
  const melodies=[
   [0,2,3,6,5,3,2,0, 2,3,5,7,6,5,3,2, 0,2,3,5,3,2,1,0],
   [0,3,5,6,5,3,2,3, 0,2,3,7,6,5,3,2, 3,5,6,8,7,6,5,3],
   [0,2,5,3,6,5,3,2, 0,3,6,8,7,6,5,3, 2,3,5,6,5,3,2,0],
   [0,3,2,5,3,6,5,3, 2,0,2,3,5,7,6,5, 3,2,0,3,5,6,5,2],
   [0,2,3,6,8,7,6,5, 3,5,6,7,6,5,3,2, 0,3,5,6,5,3,2,0],
   [0,2,3,5,6,5,3,2, 0,3,5,8,7,6,5,3, 2,5,6,7,6,5,3,2],
   [0,3,6,5,3,2,0,2, 3,6,8,7,6,5,3,2, 0,2,5,6,5,3,2,0],
   [0,2,3,5,7,8,7,6, 5,3,2,3,5,6,5,3, 2,0,2,5,6,5,3,2],
   [0,3,5,6,8,7,6,5, 3,2,3,5,7,8,7,6, 5,3,2,0,2,3,5,3],
   [0,2,3,6,5,3,2,0, 3,5,6,5,3,2,1,0, 2,3,5,7,6,5,3,2]
  ];
  const harmonies=[
   [3,5,6,5,3,2], [5,6,8,6,5,3], [3,6,5,3,2,0], [5,3,6,5,3,2], [6,8,7,6,5,3],
   [3,5,6,8,6,5], [6,5,3,2,3,5], [5,7,8,7,6,5], [6,8,7,6,5,3], [3,6,5,3,2,0]
  ];
  const basses=[
   [0,-5,-3,-5,0,-5,-7,-5], [0,-5,-3,-5,0,-3,-5,-7], [0,-3,-5,-3,0,-5,-3,-5],
   [0,-5,0,-3,-5,-3,-5,0], [0,-3,-5,-3,0,-3,-7,-5], [0,-5,-3,0,-5,-3,-5,0],
   [0,-3,-5,0,-3,-5,0,-7], [0,-5,-3,-5,-3,0,-5,0], [0,-3,0,-5,-3,-5,0,-7], [0,-5,-7,-3,0,-3,-5,-7]
  ];
  const tempos=[300,315,290,325,285,305,295,280,300,340];
  return {root:roots[room-1],melody:melodies[room-1],harmony:harmonies[room-1],bass:basses[room-1],tempo:tempos[room-1]};
 },
 playIntro(restartFade=true){
  if(!this.fileMusic||this.musicVolume<=0)return;
  if(!restartFade&&this.introFadeFrame&&!this.fileMusic.paused)return;
  if(restartFade)this.fileMusic.volume=0;
  this.fileMusic.play().then(()=>{
   if(this.introFadeFrame)cancelAnimationFrame(this.introFadeFrame);
   const started=performance.now(),from=this.fileMusic.volume,duration=6000;
   const fade=now=>{
    if(!['intro','outro'].includes(this.currentRoom)||this.musicVolume<=0){this.introFadeFrame=null;return}
    const scale=this.currentRoom==='outro'?this.outroMusicScale:this.introMusicScale;
    const progress=Math.min(1,(now-started)/duration),target=this.musicVolume*scale;
    this.fileMusic.volume=Math.min(1,from+(target-from)*progress);
    if(progress<1)this.introFadeFrame=requestAnimationFrame(fade);else this.introFadeFrame=null;
   };
   this.introFadeFrame=requestAnimationFrame(fade);
  }).catch(()=>{});
 },
 startMusic(room){
  this.init();
  const previous=this.currentRoom;
  this.currentRoom=room;
  if(this.musicTimer){clearInterval(this.musicTimer);this.musicTimer=null}
  this.step=0;
  if(room==='intro'||room==='outro'){
   // Intro en outro gebruiken de door de gebruiker aangeleverde MIDI-compositie,
   // vooraf gerenderd naar WAV omdat browsers MIDI niet betrouwbaar rechtstreeks afspelen.
   if(previous!==room)this.fileMusic.currentTime=0;
   if(this.musicVolume>0)this.playIntro(previous!==room);
   return;
  }
  if(this.introFadeFrame){cancelAnimationFrame(this.introFadeFrame);this.introFadeFrame=null}
  if(this.fileMusic&&!this.fileMusic.paused){this.fileMusic.pause();this.fileMusic.currentTime=0}
  if(!this.ctx||this.ctx.state!=='running'||this.musicVolume<=0)return;
  const data=this.roomPattern(room),scale=[1,1.122,1.189,1.335,1.498,1.587,1.782,2,2.119];
  const tick=()=>{if(this.musicVolume<=0)return;const i=this.step%data.melody.length,degree=data.melody[i],freq=data.root*scale[degree];
   this.tone(freq,.3,'square',.085,0,this.musicGain);
   if(i%2===1){const hd=data.harmony[Math.floor(i/2)%data.harmony.length];this.tone(data.root*scale[hd]/2,.24,'triangle',.038,.08,this.musicGain)}
   if(i%4===0){const bassShift=data.bass[(i/4)%data.bass.length];this.tone(data.root*Math.pow(2,bassShift/12)/2,.62,'triangle',.085,0,this.musicGain)}
   if(i%8===6)this.tone(data.root*scale[data.melody[(i+3)%data.melody.length]],.16,'sine',.025,.13,this.musicGain);
   if(i%4===2)this.tone(700+room*16,.04,'square',.012,0,this.musicGain);
   this.step++;
  };
  tick();this.musicTimer=setInterval(tick,data.tempo);
 },
 stopMusic(){if(this.musicTimer)clearInterval(this.musicTimer);this.musicTimer=null;if(this.introFadeFrame)cancelAnimationFrame(this.introFadeFrame);this.introFadeFrame=null;if(this.fileMusic){this.fileMusic.pause();this.fileMusic.currentTime=0}this.currentRoom=null},
 setMusicVolume(value){
  this.musicVolume=Math.max(0,Math.min(1,Number(value)||0));this.init();
  this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
  this.musicGain.gain.setTargetAtTime(this.musicVolume,this.ctx.currentTime,.035);
  if(this.fileMusic&&!['intro','outro'].includes(this.currentRoom))this.fileMusic.volume=this.musicVolume*this.introMusicScale;
  if(this.musicVolume===0){
   if(this.musicTimer){clearInterval(this.musicTimer);this.musicTimer=null}
   if(this.fileMusic&&!this.fileMusic.paused)this.fileMusic.pause();
  }else if(['intro','outro'].includes(this.currentRoom)){
   if(this.fileMusic.paused)this.playIntro(true);
   else if(!this.introFadeFrame){const scale=this.currentRoom==='outro'?this.outroMusicScale:this.introMusicScale;this.fileMusic.volume=this.musicVolume*scale}
  }else if(this.currentRoom!==null&&!this.musicTimer){
   this.startMusic(this.currentRoom);
  }
  return this.musicVolume;
 },
 toggleFX(){this.fxEnabled=!this.fxEnabled;if(this.fxEnabled)this.unlock();return this.fxEnabled}
};
window.addEventListener('pointerdown',()=>AudioEngine.unlock(),{once:true});
window.addEventListener('keydown',()=>AudioEngine.unlock(),{once:true});
