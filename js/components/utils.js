/* ============================================================
   UTILS.JS — Shared utilities and hooks for React components
   Loaded as type="text/babel" before any component files.
   ============================================================ */

// ── Formatting helpers ────────────────────────────────────────
function formatTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (weeks < 4) return `${weeks}w`;
  return new Date(ts).toLocaleDateString();
}

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  const colors = [
    '#0F5DBD', '#057642', '#8F5849', '#915907', '#6B46C1',
    '#DD2590', '#E67E22', '#16A085', '#2C3E50', '#7F8C8D'
  ];
  if (!name) return colors[0];
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return colors[h % colors.length];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Navigation ────────────────────────────────────────────────
function navigate(path) {
  window.location.hash = path;
}
// Expose globally for any legacy onclick="" attributes
window.navigate = navigate;

// ── Clipboard helper ──────────────────────────────────────────
// Tries navigator.clipboard first; falls back to execCommand.
// On clipboard rejection it retries via execCommand before surfacing error.
function copyLink(url, showToast) {
  function execCopy() {
    let ta;
    try {
      ta = document.createElement('textarea');
      ta.value = url;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const copied = document.execCommand('copy');
      if (copied) { showToast('Link copied!'); }
      else { showToast('Failed to copy link', 'error'); }
    } catch (_) {
      showToast('Failed to copy link', 'error');
    } finally {
      if (ta && ta.parentNode) { ta.parentNode.removeChild(ta); }
    }
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Link copied!'))
      .catch(() => execCopy());
  } else {
    execCopy();
  }
}

// ── useFetch hook ─────────────────────────────────────────────
// Shared data-fetching hook used by every page component.
// Usage: const { data, loading, error } = useFetch(API.getFeed);
//        const { data } = useFetch(() => API.getUser(userId), [userId]);
function useFetch(apiFn, deps) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFn()
      .then(d => {
        if (!cancelled) { setData(d); setLoading(false); }
      })
      .catch(e => {
        if (!cancelled) { setError(e.message || 'Failed to load'); setLoading(false); }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || []);

  return { data, loading, error };
}

// ── useHash hook ──────────────────────────────────────────────
// Listens to window.location.hash changes and returns the current hash.
function useHash() {
  const getHash = () => window.location.hash.replace('#', '') || 'feed';
  const [hash, setHash] = React.useState(getHash);

  React.useEffect(() => {
    function onHashChange() {
      setHash(getHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return hash;
}
