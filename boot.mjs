try {
 await import('./app.mjs');
} catch(error) {
 const card=document.createElement('section');card.className='startup-card';
 const heading=document.createElement('h1');heading.textContent='Daycraft couldn’t open yet.';
 const message=document.createElement('p');message.textContent='Some app files could not load. If you have just updated Daycraft, wait for the GitHub deployment to finish, then try again. Your saved progress has not been cleared.';
 const retry=document.createElement('button');retry.className='btn primary';retry.textContent='Try again';retry.addEventListener('click',()=>location.reload());
 const detail=document.createElement('details'),label=document.createElement('summary'),reason=document.createElement('p');label.textContent='Technical detail';reason.textContent=error.message||'The app could not start.';detail.append(label,reason);
 card.append(heading,message,retry,detail);document.querySelector('#app').replaceChildren(card);
 console.error('Daycraft startup failed:',error);
}
if('serviceWorker' in navigator&&window.isSecureContext){
 const hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(!hadController||document.querySelector('#daycraft-update'))return;
  const notice=document.createElement('aside');notice.id='daycraft-update';notice.className='app-update';notice.setAttribute('role','status');
  const text=document.createElement('span');text.textContent='A newer Daycraft is ready. Finish any open form, then reload.';
  const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Reload update';button.addEventListener('click',()=>location.reload());
  notice.append(text,button);document.body.appendChild(notice);
 });
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>console.warn('Daycraft could not prepare offline access. Your tasks still save in this browser.'));
}
