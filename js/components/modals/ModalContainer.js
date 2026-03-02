/* ============================================================
   MODALCONTAINER.JS — Renders the active modal from AppContext
   ============================================================ */
function ModalContainer() {
  const { activeModal, closeModal } = React.useContext(AppContext);

  if (!activeModal) return null;

  const modalMap = {
    'post':          <PostModal />,
    'image-viewer':  <ImageViewerModal />,
    'connect':       <ConnectModal />,
    'share':         <ShareModal />,
    'apply':         <ApplyModal />,
    'edit-profile':  <EditProfileModal />,
    'add-exp':       <AddExpModal />,
    'report':        <ReportModal />,
    'create-event':  <CreateEventModal />,
  };

  const modal = modalMap[activeModal];
  if (!modal) return null;
  return modal;
}
