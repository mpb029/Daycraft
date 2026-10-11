try {
 await import('./app.mjs');
} catch(error) {
 const card=document.createElement('section');card.className='startup-card';
 const heading=document.createElement('h1');heading.textContent='Your meadow couldn’t open yet.';
 const message=document.createElement('p');message.textContent='Some app files could not load. If you have just updated Daycraft, wait for the GitHub deployment to finish, then try again. Your saved progress has not been cleared.';
 const retry=document.createElement('button');retry.className='btn primary';retry.textContent='Try again';retry.addEventListener('click',()=>location.reload());
 const detail=document.createElement('details'),label=document.createElement('summary'),reason=document.createElement('p');label.textContent='Technical detail';reason.textContent=error.message||'The app could not start.';detail.append(label,reason);
 card.append(heading,message,retry,detail);document.querySelector('#app').replaceChildren(card);
 console.error('Daycraft startup failed:',error);
}
if('serviceWorker' in navigator&&window.isSecureContext){
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>console.warn('Daycraft could not prepare offline access. Your tasks still save in this browser.'));
}
