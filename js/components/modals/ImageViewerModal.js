/* ============================================================
   IMAGEVIEWERMODAL.JS — Full-screen image viewer
   ============================================================ */
function ImageViewerModal() {
  const { closeModal, modalData } = React.useContext(AppContext);
  const src = modalData && modalData.src ? modalData.src : '';

  return (
    <div
      className="li-modal-overlay"
      style={{ display: 'flex', background: 'rgba(0,0,0,0.9)' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
    >
      <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
        <button
          style={{ position: 'absolute', top: -40, right: 0, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 28 }}
          onClick={closeModal}
        >
          ×
        </button>
        <img
          src={src}
          alt=""
          style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', display: 'block', borderRadius: 4 }}
        />
      </div>
    </div>
  );
}
