/* ============================================================
   AVATAR.JS — Inline SVG avatar component
   ============================================================ */
function Avatar({ name, size = 40, colorOverride, className = '', photo }) {
  const [photoFailed, setPhotoFailed] = React.useState(false);
  const initials = getInitials(name);
  const color = colorOverride || getAvatarColor(name);
  const fontSize = Math.round(size * 0.38);

  React.useEffect(() => {
    setPhotoFailed(false);
  }, [photo]);

  if (photo && !photoFailed) {
    return (
      <img
        src={photo}
        alt={name || 'avatar'}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          display: 'block',
        }}
        onError={() => setPhotoFailed(true)}
      />
    );
  }

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
