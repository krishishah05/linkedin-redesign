/* ============================================================
   LOADINGSPINNER.JS — Simple loading state component
   ============================================================ */
function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: 12 }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--blue)',
        borderRadius: '50%',
        animation: 'li-spin 0.7s linear infinite',
      }} />
      <span style={{ color: 'var(--text-2)', fontSize: 14 }}>{text}</span>
      <style>{`@keyframes li-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorMessage({ message = 'Something went wrong', onRetry }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 32 }}>⚠️</span>
      <p style={{ color: 'var(--text-2)', fontSize: 14, margin: 0 }}>{message}</p>
      {onRetry && (
        <button className="li-btn li-btn--ghost li-btn--sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
