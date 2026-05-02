/* ============================================================
   MODALCONTAINER.JS — Renders the active modal from AppContext
   ============================================================ */
function ModalContainer() {
  const { activeModal, closeModal } = React.useContext(AppContext);

  if (!activeModal) return null;

  const modalMap = {
    'post':          <PostModal />,
    'image-viewer':  <ImageViewerModal />,
    'imageViewer':   <ImageViewerModal />,
    'connect':       <ConnectModal />,
    'share':         <ShareModal />,
    'apply':         <ApplyModal />,
    'edit-profile':  <EditProfileModal />,
    'add-exp':       <AddExpModal />,
    'add-education': <AddEducationModal />,
    'add-skill':     <AddSkillModal />,
    'create-group':  <CreateGroupModal />,
    'report':        <ReportModal />,
    'create-event':  <CreateEventModal />,
    'add-project':   <AddProjectModal />,
    'add-volunteer': <AddVolunteerModal />,
    'add-honor':     <AddHonorModal />,
  };

  const modal = modalMap[activeModal];
  if (!modal) return null;
  return modal;
}
