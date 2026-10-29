(function(){
 let state=null,serverAt=0,receivedAt=0;
 const clocks=[];
 for(const selector of ['.turn-banner','.turn-chip','#cardDialog','#mobileCardDialog','#mobileDiceDialog','#virtualCardDialog']){
  const parent=document.querySelector(selector);if(!parent)continue;
  const element=document.createElement('span');element.className='action-countdown';element.hidden=true;element.setAttribute('role','timer');parent.append(element);clocks.push(element);
 }
 function render(){
  const clock=state?.phase==='playing'?state.actionClock:null;
  const remaining=clock?Math.max(0,Math.ceil((clock.deadline-serverAt-performance.now()+receivedAt)/1000)):0;
  for(const element of clocks){
   element.hidden=!clock;
   const evaluation=clock?.expired&&clock.type==='task'&&state.pending?.judgeId;
   element.textContent=!clock?'':evaluation?'◷ Evaluación final':clock.expired?'◷ Tiempo terminado':'◷ '+Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0');
   element.classList.toggle('urgent',Boolean(clock&&(remaining<=5||clock.expired)));
   element.setAttribute('aria-label',evaluation?'Tiempo terminado. Esperando evaluación final.':'Tiempo restante: '+remaining+' segundos');
  }
 }
 window.updateActionClock=next=>{state=next;serverAt=next.serverNow||Date.now();receivedAt=performance.now();render();};
 setInterval(render,100);document.addEventListener('visibilitychange',render);
})();
