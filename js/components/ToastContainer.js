/* ============================================================
   TOASTCONTAINER.JS — Renders toast notifications from context
   ============================================================ */
function ToastContainer() {
  const { toasts } = React.useContext(AppContext);

  if (!toasts.length) return null;

  return (
    <div className="li-toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`li-toast li-toast--${toast.type || 'success'}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
