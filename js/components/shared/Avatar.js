/* ============================================================
   AVATAR.JS — Inline SVG avatar component
   ============================================================ */
function Avatar({ name, size = 40, colorOverride, className = '' }) {
  const initials = getInitials(name);
  const color = colorOverride || getAvatarColor(name);
  const fontSize = Math.round(size * 0.38);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
        fontWeight: 700,
        fontSize: fontSize,
        fontFamily: 'Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
}
