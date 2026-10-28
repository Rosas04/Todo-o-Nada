(function(){
 let active=null,timers=[];
 window.playDealAnimation=function(state,onComplete){
  if(state.phase!=='playing'||!state.dealId||!state.dealtAt||Date.now()-state.dealtAt>6000)return false;
  const key='todo-nada-shown-deal-'+state.code;
  try{if(sessionStorage.getItem(key)===state.dealId)return false;sessionStorage.setItem(key,state.dealId);}catch{}
  timers.forEach(clearTimeout);timers=[];active?.remove();
  const overlay=document.createElement('div');overlay.className='deal-overlay';overlay.setAttribute('role','status');
  overlay.innerHTML='<div class="shuffle-pack" aria-hidden="true"><img src="/Resource/Cartas%20normales/Carta-Trasera2.png" alt=""><img src="/Resource/Cartas%20normales/Carta-Trasera2.png" alt=""><img src="/Resource/Cartas%20normales/Carta-Trasera2.png" alt=""></div><p>Barajando las cartas…</p>';
  document.body.append(overlay);active=overlay;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  timers.push(setTimeout(()=>{overlay.classList.add('is-dealing');overlay.querySelector('p').textContent='Repartiendo 8 cartas por jugador…';},reduced?0:900));
  timers.push(setTimeout(()=>{overlay.remove();if(active===overlay)active=null;onComplete?.();},reduced?500:1900));
  return true;
 };
})();
