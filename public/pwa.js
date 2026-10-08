if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });
let _ip = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); _ip = e;
  if (document.getElementById('pwabtn')) return;
  const b = document.createElement('button'); b.id = 'pwabtn'; b.textContent = '📲 تثبيت التطبيق';
  b.onclick = async () => { _ip.prompt(); await _ip.userChoice; _ip = null; b.remove(); };
  document.body.appendChild(b);
});
window.addEventListener('appinstalled', () => { const b = document.getElementById('pwabtn'); if (b) b.remove(); });
