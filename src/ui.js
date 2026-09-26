export function createLabUI(callbacks) {
  const root = document.querySelector('[data-lab-panel]');
  const stats = document.querySelector('[data-stats]');
  const status = document.querySelector('[data-status]');

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

  document.querySelector('[data-reset]')?.addEventListener('click', () => callbacks.onReset?.());
  document.querySelector('[data-fullscreen]')?.addEventListener('click', () => callbacks.onFullscreen?.());

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
