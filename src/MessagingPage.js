import React, { useEffect, useContext } from 'react';
import { MessagingContext } from './MessagingContext';

const MessagingPage = () => {
  const { setUnreadMessages } = useContext(MessagingContext);

  // New useEffect hook to reset unread messages on mount
  useEffect(() => {
    setUnreadMessages(0);
  }, []);

  // other useEffects and component logic

  return (
    <div>
      {/* Your component JSX here */}
    </div>
  );
};

export default MessagingPage;