// Runs before the first paint, so there is no light/dark flash. A file, not an inline script,
// so the Content-Security-Policy can stay strict.
try {
  const saved = localStorage.getItem('vigil:theme');
  const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = saved === 'light' || saved === 'dark' ? saved : system;
} catch {}
