export function createLabUI(callbacks) {
  const root = document.querySelector('[data-lab-panel]');
  const stats = document.querySelector('[data-stats]');
  const status = document.querySelector('[data-status]');
  const panelToggle = document.querySelector('[data-panel-toggle]');

  function activate(selector, value) {
    root.querySelectorAll(selector).forEach((el) => {
      el.classList.toggle('is-active', el.dataset.value === value);
    });
  }

  root.querySelectorAll('[data-display]').forEach((el) => {
    el.addEventListener('click', () => {
      activate('[data-display]', el.dataset.value);
      callbacks.onDisplay?.(el.dataset.value);
    });
  });

  root.querySelectorAll('[data-shape]').forEach((el) => {
    el.addEventListener('click', () => {
      activate('[data-shape]', el.dataset.value);
      callbacks.onShape?.(el.dataset.value);
    });
  });

  document.querySelector('[data-density]')?.addEventListener('input', (event) => {
    callbacks.onDensity?.(Number(event.target.value) / 100);
  });

  document.querySelector('[data-quality]')?.addEventListener('change', (event) => {
    callbacks.onQuality?.(event.target.value);
  });

  document.querySelector('[data-bloom]')?.addEventListener('change', (event) => {
    callbacks.onBloom?.(event.target.checked);
  });

  document.querySelector('[data-rotate]')?.addEventListener('change', (event) => {
    callbacks.onAutoRotate?.(event.target.checked);
  });

  document.querySelector('[data-motion]')?.addEventListener('change', (event) => {
    callbacks.onMotion?.(event.target.checked);
  });

  document.querySelector('[data-reset]')?.addEventListener('click', () => callbacks.onReset?.());
  document.querySelector('[data-fullscreen]')?.addEventListener('click', () => callbacks.onFullscreen?.());

  panelToggle?.addEventListener('click', () => {
    root.classList.toggle('is-collapsed');
    panelToggle.setAttribute('aria-expanded', String(!root.classList.contains('is-collapsed')));
  });

  return {
    setStatus(text) {
      if (status) status.textContent = text;
    },
    setStats({ fps, particles, quality, mode }) {
      if (!stats) return;
      stats.innerHTML = [
        ['FPS', Math.round(fps)],
        ['Particles', particles.toLocaleString()],
        ['Quality', quality],
        ['Mode', mode]
      ].map(([k, v]) => '<span><b>' + v + '</b><small>' + k + '</small></span>').join('');
    },
    activateDisplay(value) { activate('[data-display]', value); },
    activateShape(value) { activate('[data-shape]', value); }
  };
}
