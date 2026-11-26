let renderer = () => {};
export const setRenderer = fn => { renderer = fn; };
export const go = path => {
  const target = '#/' + path;
  if (location.hash === target) renderer({});
  else location.hash = target;
};
// Re-render the current screen without resetting scroll or replaying the entry animation.
export const refresh = () => renderer({ soft: true });
export const currentPath = () => location.hash.replace(/^#\/?/, '') || 'home';
