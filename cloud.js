'use strict';
class MatheCloud {
 constructor(client,ui){this.client=client;this.ui=ui;this.user=null;this.revision=0;this.dirty=false;this.saving=false;this.ready=false;this.epoch=0;this.seq=0;this.conflict=null;this.timer=null;this.loadingUser=null;this.pulling=false}
 key(id){return 'mathe-cloud:'+this.client.storageNamespace+':'+id}
 cache(){if(!this.user)return;try{localStorage.setItem(this.key(this.user.id),JSON.stringify({state:this.ui.get(),revision:this.revision,dirty:this.dirty}))}catch{this.ui.status('Gerätesicherung nicht möglich. Bitte Spielstand herunterladen.')}}
 readCache(id){try{return JSON.parse(localStorage.getItem(this.key(id)))}catch{return null}}
 async session(session){
  const user=session?.user||null;if(user?.id===this.user?.id&&(this.ready||this.loadingUser===user?.id))return;
  const epoch=++this.epoch;this.ui.gate(true);this.ready=false;this.conflict=null;clearTimeout(this.timer);this.user=user;this.loadingUser=user?.id||null;this.revision=0;this.dirty=false;this.seq=0;
  this.ui.account(user);this.ui.conflict(null);
  if(!user){this.ui.set(this.ui.guest());this.ready=true;this.ui.gate(false);this.ui.status('Gastmodus · Fortschritt bleibt auf diesem Gerät.');return}
  this.ui.set(defaults());this.ui.status('Spielstand wird geladen …');const cached=this.readCache(user.id);
  try{
   const {data,error}=await this.client.from('mathe_game_saves').select('state,revision').eq('user_id',user.id).maybeSingle();if(epoch!==this.epoch)return;if(error)throw error;
   const rev=data?.revision||0;
   if(cached?.dirty){this.ui.set(cached.state);this.revision=cached.revision||0;this.dirty=true;if(this.revision!==rev){this.setConflict({revision:rev,state:data?.state||defaults()});return}}
   else{this.revision=rev;this.ui.set(data?.state||defaults())}
   this.ready=true;this.loadingUser=null;this.cache();this.ui.gate(false);this.ui.status(data?'Cloud-Spielstand geladen.':'Neues Konto · bereit für dein Abenteuer.');if(this.dirty)await this.flush();
  }catch(err){if(epoch!==this.epoch)return;this.loadingUser=null;if(cached){this.revision=cached.revision||0;this.dirty=!!cached.dirty;this.ui.set(cached.state);this.ready=true;this.ui.gate(false);this.ui.status('Cloud nicht erreichbar. Du übst mit der Gerätesicherung weiter. Bitte später synchronisieren.')}else{this.ui.status('Spielstand konnte nicht geladen werden. Bitte Verbindung/Einrichtung prüfen und „Synchronisieren“ drücken.')}}
 }
 changed(){if(!this.user||!this.ready||this.conflict)return;this.seq++;this.dirty=true;this.cache();this.ui.status('Auf diesem Gerät gesichert · Cloud-Speicherung läuft …');clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),400)}
 setConflict(data){this.conflict=data;this.ready=false;this.ui.gate(true);this.ui.conflict(data);this.ui.status('Auf einem anderen Gerät wurde ein anderer Stand gespeichert. Bitte einen Stand auswählen.');this.cache()}
 async flush(){
  if(!this.user||!this.ready||this.conflict||this.saving||!this.dirty)return;
  const epoch=this.epoch,seq=this.seq,userId=this.user.id,snapshot=JSON.parse(JSON.stringify(this.ui.get()));this.saving=true;
  try{const {data,error}=await this.client.rpc('mathe_save',{p_state:snapshot,p_revision:this.revision});if(epoch!==this.epoch)return;if(error)throw error;if(!data||typeof data.revision!=='number')throw Error('Ungültige Serverantwort');if(data.conflict){this.setConflict(data);return}this.revision=data.revision;if(seq===this.seq)this.dirty=false;this.cache();this.ui.status(this.dirty?'Weitere Änderungen warten auf Synchronisierung.':'In der Cloud gespeichert.');}
  catch(err){if(epoch===this.epoch)this.ui.status('Cloud-Speicherung fehlgeschlagen. Fortschritt bleibt auf diesem Gerät; bitte später synchronisieren.')}
  finally{this.saving=false;if(epoch===this.epoch&&this.ready&&this.dirty&&seq!==this.seq&&!this.conflict)this.timer=setTimeout(()=>this.flush(),400)}
 }
 async sync(){if(this.saving)return;if(!this.ready&&!this.conflict){const {data,error}=await this.client.auth.getSession();if(error){this.ui.status('Anmeldung konnte nicht geprüft werden.');return}await this.session(data.session);return}if(this.dirty)await this.flush();else if(this.user&&!this.conflict)await this.pull()}
 async pull(){
  if(this.pulling||this.dirty||this.saving||!this.user||!this.ready)return;
  const epoch=this.epoch,seq=this.seq;this.pulling=true;
  try{const {data,error}=await this.client.from('mathe_game_saves').select('state,revision').eq('user_id',this.user.id).maybeSingle();if(epoch!==this.epoch||seq!==this.seq||this.dirty)return;if(error)throw error;if((data?.revision||0)!==this.revision){this.revision=data?.revision||0;this.ui.set(data?.state||defaults());this.cache();this.ui.status('Aktueller Stand vom anderen Gerät geladen.')}else this.ui.status('Cloud-Spielstand ist aktuell.')}catch{if(epoch===this.epoch)this.ui.status('Cloud nicht erreichbar. Dein Gerätestand bleibt erhalten.')}finally{this.pulling=false}
 }
 async resolve(useLocal){if(!this.conflict)return;const remote=this.conflict;this.revision=remote.revision;this.conflict=null;this.ui.conflict(null);if(!useLocal)this.ui.set(remote.state||defaults());this.ready=true;this.dirty=useLocal;this.seq++;this.cache();this.ui.gate(false);if(useLocal)await this.flush();else this.ui.status('Cloud-Spielstand übernommen. Deine vorherige Gerätesicherung kannst du vor der Auswahl herunterladen.')}
}
window.MatheCloud=MatheCloud;
(async function initCloud(){
 const cfg=window.MATHE_CLOUD_CONFIG||{};const status=message=>$('cloudStatus').textContent=message;
 const gate=locked=>{$('gameFields').disabled=locked};
 const guest=()=>{try{return validateState(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('mathe-abenteuer-v1')))}catch{return defaults()}};
 const set=value=>{state=validateState(value);syncLearningSelectors(window.learningChoice);battle=null;$('difficulty').disabled=false;$('topic').disabled=false;$('grade').disabled=false;$('battleStatus').dataset.result='';unlockAchievements();render();newTask()};
 const ui={get:()=>state,guest,set,status,gate,account:user=>{window.welcomeFlow?.account(user);$('accountLabel').textContent=user?'Angemeldet: '+user.email:'Du spielst als Gast';$('loginFields').hidden=!!user;$('logout').hidden=!user;$('adoptGuest').hidden=!user},conflict:data=>{$('conflictFields').hidden=!data;if(data){const r=validateState(data.state);$('conflictSummary').textContent=`Dieses Gerät: ${state.xp} XP, ${state.correct} richtige Aufgaben. Cloud: ${r.xp} XP, ${r.correct} richtige Aufgaben.`}}};
 $('conflictBackup').onclick=()=>$('backup').onclick();
 if(!cfg.url||!cfg.publishableKey){status('Gastmodus. Die Cloud-Verbindung muss noch eingerichtet werden.');$('authActions').hidden=true;return}
 if(cfg.publishableKey.startsWith('sb_secret_')){status('Falscher Schlüsseltyp in config.js. Verwende den öffentlichen publishable/anon-Schlüssel.');$('authActions').hidden=true;return}
 try{if(cfg.publishableKey.startsWith('eyJ')){const payload=JSON.parse(atob(cfg.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(payload.role!=='anon')throw Error('Privater Schlüssel ist nicht erlaubt')}}catch(err){status('Ungültiger oder privater Schlüssel in config.js.');$('authActions').hidden=true;return}
 if(!window.supabase){status('Anmeldedienst konnte nicht geladen werden. Du kannst als Gast üben.');$('authActions').hidden=true;return}
 try{const u=new URL(cfg.url);if(u.protocol!=='https:')throw Error()}catch{status('Ungültige Supabase-Projektadresse in config.js.');$('authActions').hidden=true;return}
 const client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{storageKey:'mathe-auth-'+new URL(cfg.url).hostname}});client.storageNamespace=new URL(cfg.url).hostname;
 const cloud=new MatheCloud(client,ui);window.matheCloud=cloud;gate(true);
 client.auth.onAuthStateChange((event,session)=>{if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT'].includes(event))setTimeout(()=>cloud.session(session),0)});
 const {data,error}=await client.auth.getSession();if(error){await cloud.session(null);status('Anmeldung konnte nicht geprüft werden. Du spielst als Gast.')}else await cloud.session(data.session);
 async function authAction(signup){
  const email=$('email').value.trim(),password=$('password').value;if(!email||!password){status('Bitte E-Mail und Passwort eingeben.');return}
  $('login').disabled=true;$('register').disabled=true;
  try{const result=signup?await client.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;$('password').value='';if(signup&&!result.data.session)status('Bitte E-Mail öffnen und die Registrierung bestätigen. Danach anmelden.');else await cloud.session(result.data.session)}catch(err){status('Anmeldung/Registrierung fehlgeschlagen: '+err.message)}finally{$('login').disabled=false;$('register').disabled=false}
 }
 $('login').onclick=()=>authAction(false);$('register').onclick=()=>authAction(true);$('authForm').onsubmit=e=>{e.preventDefault();authAction(false)};
 $('logout').onclick=async()=>{if(cloud.saving){status('Bitte die laufende Speicherung abwarten.');return}if(cloud.dirty){await cloud.flush();if(cloud.dirty&&!confirm('Änderungen sind noch nicht in der Cloud. Sie bleiben diesem Konto auf diesem Gerät zugeordnet. Trotzdem abmelden?'))return}const {error}=await client.auth.signOut({scope:'local'});if(error)status('Abmeldung fehlgeschlagen: '+error.message);else await cloud.session(null)};
 $('sync').onclick=()=>cloud.sync();$('useCloud').onclick=()=>cloud.resolve(false);$('useLocal').onclick=()=>{if(confirm('Diesen Gerätestand in die Cloud übernehmen? Der andere Cloud-Stand wird dadurch ersetzt.'))cloud.resolve(true)};
 $('adoptGuest').onclick=()=>{if(!cloud.ready||cloud.conflict)return;const s=guest();if(confirm(`Gast-Spielstand mit ${s.xp} XP in dieses Konto übernehmen? Der aktuelle Kontostand wird ersetzt.`)){set(s);save()}};
 window.addEventListener('online',()=>cloud.sync());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!battle)cloud.sync()});
 setInterval(()=>{if(cloud.ready&&cloud.user&&!cloud.dirty&&!cloud.saving&&!battle)cloud.sync()},30000);
})();
