/* Native DOM adaptation of the Gooey interaction patterns.
   Decorative layers are isolated from text, controls, and extension data. */
(() => {
  const watched = new WeakSet();
  const svgNS = 'http://www.w3.org/2000/svg';
  function enhance(root = document) {
    if (!document.getElementById('atelier-liquid-filter')) {
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.cssText = 'position:absolute;pointer-events:none';
      svg.innerHTML = '<defs><filter id="atelier-liquid-filter" x="-30%" y="-60%" width="160%" height="220%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"/></filter></defs>';
      document.body.append(svg);
    }
    root.querySelectorAll('#all-notes, #edit-save, #solvenotes-panel [data-save]').forEach(button => {
      button.classList.add('atelier-gooey');
      if (!watched.has(button)) {
        watched.add(button);
        new MutationObserver(() => { if (button.isConnected && !button.querySelector('.atelier-liquid')) enhance(button.parentElement); }).observe(button, { childList:true });
      }
      if (button.querySelector('.atelier-liquid')) return;
      const layer = document.createElement('span');
      layer.className = 'atelier-liquid'; layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML = '<i></i><i></i>';
      button.append(layer);
    });
    root.querySelectorAll('.view-switch').forEach(group => {
      group.classList.add('atelier-gooey-switch');
      if (group.querySelector('.atelier-liquid')) return;
      const layer = document.createElement('span');
      layer.className = 'atelier-liquid'; layer.setAttribute('aria-hidden', 'true');
      layer.innerHTML = '<i></i><i></i>';
      group.prepend(layer);
    });
  }
  globalThis.AtelierEffects = { enhance };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhance(), { once:true });
  else enhance();
})();
