import './app.mjs';
if('serviceWorker' in navigator&&window.isSecureContext){
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>console.warn('Daycraft could not prepare offline access. Your tasks still save in this browser.'));
}
