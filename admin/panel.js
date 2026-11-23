'use strict';
const toggle=document.querySelector('.sidebar-toggle');
const sidebar=document.querySelector('.sidebar');
const overlay=document.querySelector('.sidebar-overlay');
function closeSidebar(){document.body.classList.remove('sidebar-open');if(toggle)toggle.setAttribute('aria-expanded','false');if(overlay)overlay.hidden=true;}
toggle?.addEventListener('click',()=>{const open=!document.body.classList.contains('sidebar-open');document.body.classList.toggle('sidebar-open',open);toggle.setAttribute('aria-expanded',String(open));overlay.hidden=!open;});
overlay?.addEventListener('click',()=>{closeSidebar();toggle.focus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('sidebar-open')){closeSidebar();toggle.focus();}});
document.addEventListener('focusin',event=>{if(document.body.classList.contains('sidebar-open')&&!sidebar.contains(event.target)&&!toggle.contains(event.target))closeSidebar();});
window.matchMedia('(min-width:1001px)').addEventListener('change',closeSidebar);
