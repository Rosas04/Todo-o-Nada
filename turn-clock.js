(function(){
 let current=null,receivedAt=0,serverAt=0;
 const clocks=[];
 for(const selector of ['.turn-banner','.turn-chip','#cardDialog','#mobileCardDialog','#mobileDiceDialog']){
  const parent=document.querySelector(selector);if(!parent)continue;
  const clock=document.createElement('span');clock.className='turn-countdown';clock.hidden=true;clock.setAttribute('role','timer');parent.append(clock);clocks.push(clock);
 }
 function render(){
  const remaining=current?Math.max(0,Math.ceil((current.deadline-(serverAt+performance.now()-receivedAt))/1000)):0;
  for(const clock of clocks){clock.hidden=!current;clock.textContent=current?'◷ '+remaining+' s':'';clock.classList.toggle('urgent',Boolean(current&&remaining<=5));clock.setAttribute('aria-label','Tiempo restante: '+remaining+' segundos');}
 }
 window.updateTurnClock=state=>{current=state.phase==='playing'?state.turnClock:null;serverAt=state.serverNow||Date.now();receivedAt=performance.now();render();};
 setInterval(render,100);document.addEventListener('visibilitychange',render);
})();
