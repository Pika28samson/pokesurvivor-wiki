'use strict';
(()=>{
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.error);
 let prompt;const button=document.getElementById('install-app');
 window.addEventListener('beforeinstallprompt',e=>{if(!button)return;e.preventDefault();prompt=e;button.hidden=false;});
 button?.addEventListener('click',async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;prompt=null;button.hidden=true;});
 window.addEventListener('appinstalled',()=>{if(button)button.hidden=true;const help=document.getElementById('install-help');if(help)help.textContent='Wiki installed.';});
})();
