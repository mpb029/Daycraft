// Hide the interface without rebuilding forms, changing the camera, or saving data.
export function acceptsMeadowShortcut(event, doc) {
 if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
 if (doc.querySelector('dialog[open]')) return false;
 const target = event.target;
 if (target?.isContentEditable || target?.closest?.('input, textarea, select, button, a, summary, [contenteditable="true"], [role="textbox"], [role="button"], [role="slider"]')) return false;
 return event.code === 'Space' || event.key === ' ';
}
export function createMeadowOverlay(doc) {
 let visible = true, previousFocus = null;
 function mount() {
  const panel = doc.querySelector('#meadow-interface'), button = doc.querySelector('#panel-toggle');
  if (panel) { panel.hidden = !visible; panel.inert = !visible; }
  if (button) {
   button.setAttribute?.('aria-expanded', String(visible));
   button.innerHTML = `${visible ? 'Hide panels' : 'Show panels'} <kbd>Space</kbd>`;
  }
  doc.body?.classList?.toggle?.('panels-hidden', !visible);
 }
 function setVisible(next) {
  if (visible === next) return;
  if (!next) previousFocus = doc.activeElement;
  visible = next; mount();
  if (next && previousFocus?.isConnected) previousFocus.focus?.({preventScroll:true});
  else doc.querySelector('#panel-toggle')?.focus?.({preventScroll:true});
 }
 function toggle() { setVisible(!visible); }
 doc.addEventListener('keydown', event => {
  if (acceptsMeadowShortcut(event, doc)) { event.preventDefault(); toggle(); }
  else if (event.key === 'Escape' && !visible && !doc.querySelector('dialog[open]')) { event.preventDefault(); setVisible(true); }
 });
 return {mount, toggle, show:()=>setVisible(true), get visible(){return visible;}};
}
