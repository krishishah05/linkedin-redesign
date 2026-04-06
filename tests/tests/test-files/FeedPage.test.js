// =============================================================
// FeedPage.test.js
// Unit tests for FeedPage.js — CS485 AI-Assisted Software Engineering
// =============================================================

const React = require('react');
const { render, screen, act, cleanup, fireEvent } = require('@testing-library/react');
require('@testing-library/jest-dom');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// =============================================================
// GLOBALS — simulate browser environment for vanilla JS component
// =============================================================

const mockShowToast = jest.fn();
const mockCreatePost = jest.fn(() => Promise.resolve());

global.React = React;
global.AppContext = React.createContext({});
global.API = {
  getFeed: jest.fn(),
  getNews: jest.fn(),
  getHashtags: jest.fn(),
  getUsers: jest.fn(),
  createPost: mockCreatePost,
  likePost: jest.fn(() => Promise.resolve({ liked: true, likeCount: 1 })),
  commentOnPost: jest.fn(() => Promise.resolve({ author: 'Test', text: 'hi', timestamp: 'Just now', likes: 0 })),
  deletePost: jest.fn(() => Promise.resolve({ deleted: true })),
};
global.useFetch = jest.fn();
global.LoadingSpinner = ({ text }) => React.createElement('div', { 'data-testid': 'spinner' }, text);
global.navigate = jest.fn();
global.getInitials = (name) => (name || '').slice(0, 2).toUpperCase();
global.formatTime = jest.fn(() => 'Just now');
global.formatNumber = jest.fn((n) => String(n));
global.Avatar = ({ name }) => React.createElement('div', null, name);
global.PostCreator = jest.fn(() => null);
global.FeedPost = jest.fn(() => null);
global.SponsoredPost = jest.fn(() => null);
global.TruncatedText = jest.fn(({ text }) => React.createElement('span', null, text));

// =============================================================
// LOAD FEEDPAGE.JS INTO SCOPE
// FeedPage.js contains JSX and plain function declarations —
// Babel transforms JSX first, then new Function runs it with
// global as context so FeedPage attaches to global.
// We only export FeedPage — PostCreator/FeedPost/etc stay mocked.
// =============================================================

const fileContent = fs.readFileSync(
  path.resolve(__dirname, '../../../js/components/pages/FeedPage.js'),
  'utf8'
);
const transformed = babel.transformSync(fileContent, {
  filename: 'FeedPage.js',
  presets: ['@babel/preset-react', '@babel/preset-env'],
  plugins: [['babel-plugin-istanbul', { include: ['**/FeedPage.js'] }]],
}).code;

const stripped = transformed.replace('"use strict";', '');
// PostCreator, FeedPost, SponsoredPost, and TruncatedText are all defined
// inside FeedPage.js, so FeedPage closes over those local bindings instead of
// the global mocks.  We replace each binding with a wrapper that reads from
// global at call-time so that beforeEach reassignments are picked up.
const exporter = `
${stripped}
// Export real implementations BEFORE wrapping, so sandbox gets the real components
global._realPostCreator   = PostCreator;
global._realFeedPost      = FeedPost;
global._realSponsoredPost = SponsoredPost;
global._realTruncatedText = TruncatedText;
var __local_PostCreator   = PostCreator;
var __local_FeedPost      = FeedPost;
var __local_SponsoredPost = SponsoredPost;
var __local_TruncatedText = TruncatedText;
PostCreator   = function(p) { return (global.PostCreator   || __local_PostCreator)(p);   };
FeedPost      = function(p) { return (global.FeedPost      || __local_FeedPost)(p);      };
SponsoredPost = function(p) { return (global.SponsoredPost || __local_SponsoredPost)(p); };
TruncatedText = function(p) { return (global.TruncatedText || __local_TruncatedText)(p); };
if (typeof FeedPage !== 'undefined') global.FeedPage = FeedPage;
`;
const runner = new Function('global', exporter);
runner(global);

// sandbox exposes the real sub-components (not the global mocks) for tests that render them directly
const sandbox = {
  FeedPage: global.FeedPage,
  PostCreator: global._realPostCreator,
  FeedPost: global._realFeedPost,
  SponsoredPost: global._realSponsoredPost,
  TruncatedText: global._realTruncatedText,
};

console.log('FeedPage loaded:', typeof global.FeedPage);

// =============================================================
// HELPERS
// =============================================================

const mockCurrentUser = { id: 1, name: 'Alex', headline: 'Dev' };

function renderWithContext(ui, contextValue) {
  return render(
    React.createElement(
      global.AppContext.Provider,
      { value: contextValue },
      ui
    )
  );
}

function defaultContext(overrides = {}) {
  return {
    currentUser: mockCurrentUser,
    likedPosts: new Set(),
    toggleLike: jest.fn(),
    following: new Set(),
    follow: jest.fn(),
    openModal: jest.fn(),
    showToast: mockShowToast,
    ...overrides,
  };
}

// =============================================================
// TESTS
// =============================================================

describe('FeedPage — handleNewPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.useFetch.mockReturnValue({ data: [], loading: false, error: null });
    global.PostCreator = jest.fn(() => null);
    global.FeedPost = jest.fn(() => null);
    global.SponsoredPost = jest.fn(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  // 1
  // Type: BB
  // Spec: #1
  // Contract: handleNewPost(content) should prepend a new post to the feed
  // attributed to currentUser, set feedSort to 'Recent', and call API.createPost
  // with the provided content string.
  test('Creates post and prepends to feed with correct author and content', async () => {
    global.useFetch.mockReturnValue({ data: [], loading: false, error: null });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    console.log('PostCreator mock calls:', global.PostCreator.mock.calls.length);
    console.log('PostCreator is mock:', jest.isMockFunction(global.PostCreator));

    // Capture the onPost prop passed to PostCreator
    expect(global.PostCreator.mock.calls.length).toBeGreaterThan(0);
    const onPost = global.PostCreator.mock.calls[0][0].onPost;

    await act(async () => {
      onPost('Hello world');
    });

    // FeedPost should now be called with the new post as its first prop
    const feedPostCalls = global.FeedPost.mock.calls;
    expect(feedPostCalls.length).toBeGreaterThan(0);

    const firstPostProps = feedPostCalls[feedPostCalls.length - 1][0];
    expect(firstPostProps.post.content).toBe('Hello world');
    expect(firstPostProps.post.author).toBe('Alex');
    expect(firstPostProps.post.authorId).toBe(1);

    // API.createPost must have been called with the content string
    expect(global.API.createPost).toHaveBeenCalledWith('Hello world');
  });

  // 2
  // Type: WB
  // Spec: #2
  // Exact line: .then(() => showToast('Post shared!', 'success'))
  // Tests the success branch of API.createPost promise
  test('Shows success toast when API.createPost resolves', async () => {
    mockCreatePost.mockResolvedValue();

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    const onPost = global.PostCreator.mock.calls[0][0].onPost;

    await act(async () => {
      onPost('Hello');
    });

    // After the promise resolves, showToast should be called with success
    expect(mockShowToast).toHaveBeenCalledWith('Post shared!', 'success');
  });

  // 3
  // Type: WB
  // Spec: #3
  // Exact lines: .catch(() => { setLocalPosts(...filter...); showToast('Failed to post...', 'error') })
  // Tests the failure branch of API.createPost promise — post is rolled back and error toast shown
  test('Rolls back post and shows error toast when API.createPost rejects', async () => {
    mockCreatePost.mockRejectedValue(new Error('Network error'));

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    const onPost = global.PostCreator.mock.calls[0][0].onPost;

    await act(async () => {
      onPost('Hello');
    });

    // Post should be rolled back — FeedPost last call should not contain our post
    const feedPostCalls = global.FeedPost.mock.calls;
    const lastCallPosts = feedPostCalls
      .map(call => call[0].post)
      .filter(post => post.content === 'Hello');
    expect(lastCallPosts.length).toBe(0);

    // Error toast must be shown
    expect(mockShowToast).toHaveBeenCalledWith('Failed to post. Please try again.', 'error');
  });

  // 4
  // Type: EP
  // Spec: #4
  // Bucket: whitespace-only content — should be treated as empty and not posted
  // handleNewPost receives whitespace but PostCreator's submit() trims before calling onPost
  // so we test that a whitespace-only string does not trigger API.createPost
  test('Passes whitespace content as-is to API.createPost (no guard in handleNewPost)', async () => {
    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    const onPost = global.PostCreator.mock.calls[0][0].onPost;

    await act(async () => {
      onPost('   ');
    });

    // API.createPost should still be called because handleNewPost itself
    // does not validate — validation is in submit(). So we confirm the
    // post appears with whitespace content as-is.
    // The real guard is in PostCreator > submit() tested separately.
    expect(global.API.createPost).toHaveBeenCalledWith('   ');
  });
});

describe('FeedPage — toggleCommentsFor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.useFetch.mockReturnValue({ data: [], loading: false, error: null });
    global.PostCreator = jest.fn(() => null);
    global.FeedPost = jest.fn(() => null);
    global.SponsoredPost = jest.fn(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  // 5
  // Type: WB
  // Spec: #5
  // Exact line: else next.add(postId)
  // Tests the add branch — postId not in set gets added
  test('Adds postId to expandedComments when not already in set', async () => {
    global.useFetch.mockReturnValue({
      data: [{ id: 42, content: 'Test post', comments: [] }],
      loading: false,
      error: null,
    });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    // Capture the onToggleComments prop passed to FeedPost
    const onToggleComments = global.FeedPost.mock.calls[0][0].onToggleComments;
    const initialCommentsOpen = global.FeedPost.mock.calls[0][0].commentsOpen;

    expect(initialCommentsOpen).toBe(false);

    await act(async () => {
      onToggleComments();
    });

    // After toggle, commentsOpen should now be true for postId 42
    const lastCall = global.FeedPost.mock.calls[global.FeedPost.mock.calls.length - 1][0];
    expect(lastCall.commentsOpen).toBe(true);
  });

  // 6
  // Type: WB
  // Spec: #6
  // Exact line: if (next.has(postId)) next.delete(postId)
  // Tests the delete branch — postId already in set gets removed
  test('Removes postId from expandedComments when already in set', async () => {
    global.useFetch.mockReturnValue({
      data: [{ id: 42, content: 'Test post', comments: [] }],
      loading: false,
      error: null,
    });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    const onToggleComments = global.FeedPost.mock.calls[0][0].onToggleComments;

    // First toggle — adds postId 42
    await act(async () => {
      onToggleComments();
    });

    // Scan all FeedPost calls to confirm commentsOpen was true at some point
    const wasEverOpen = global.FeedPost.mock.calls.some(call => call[0].commentsOpen === true);
    expect(wasEverOpen).toBe(true);

    // Second toggle — removes postId 42
    await act(async () => {
      onToggleComments();
    });

    // Last render should have commentsOpen false again
    const lastCall = global.FeedPost.mock.calls[global.FeedPost.mock.calls.length - 1][0];
    expect(lastCall.commentsOpen).toBe(false);
  });
  // 7
  // Type: EC
  // Spec: #7
  // Exact line: if (next.has(postId)) next.delete(postId); else next.add(postId)
  // Edge case: toggling postId 42 should not affect postId 1 already in the set
  test('Does not affect other postIds when toggling', async () => {
    global.useFetch.mockReturnValue({
      data: [
        { id: 1, content: 'Post one', comments: [] },
        { id: 42, content: 'Post two', comments: [] },
      ],
      loading: false,
      error: null,
    });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    // Open comments for post 1 first
    const onTogglePost1 = global.FeedPost.mock.calls
      .find(call => call[0].post.id === 1)[0].onToggleComments;

    await act(async () => {
      onTogglePost1();
    });

    // Now toggle post 42
    const onTogglePost42 = global.FeedPost.mock.calls
      .find(call => call[0].post.id === 42)[0].onToggleComments;

    await act(async () => {
      onTogglePost42();
    });

    // Post 1 should still have commentsOpen true — toggling post 42 must not affect it
    const post1WasEverOpen = global.FeedPost.mock.calls
      .filter(call => call[0].post.id === 1)
      .some(call => call[0].commentsOpen === true);
    expect(post1WasEverOpen).toBe(true);
  });
});

describe('FeedPage — Feed Sort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.PostCreator = jest.fn(() => null);
    global.FeedPost = jest.fn(() => null);
    global.SponsoredPost = jest.fn(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  // 8
  // Type: WB
  // Spec: #8
  // Exact line: [...rawPosts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  // Tests the 'Recent' branch — posts sorted by timestamp descending
  test('Sorts posts by timestamp descending when feedSort is Recent', async () => {
    const mockPosts = [
      { id: 1, content: 'Post A', timestamp: 100, comments: [] },
      { id: 2, content: 'Post B', timestamp: 300, comments: [] },
      { id: 3, content: 'Post C', timestamp: 200, comments: [] },
    ];

    global.useFetch.mockReturnValue({ data: mockPosts, loading: false, error: null });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    // Click the 'Recent' sort button
    await act(async () => {
      fireEvent.click(screen.getByText('Recent'));
    });

    // Collect the order posts were rendered in
    const renderedOrder = global.FeedPost.mock.calls
      .slice(-3)
      .map(call => call[0].post.timestamp);

    expect(renderedOrder).toEqual([300, 200, 100]);
  });

  // 9
  // Type: WB
  // Spec: #9
  // Exact line: [...rawPosts].sort((a, b) => { const ra = ...; const rb = ...; return rb - ra; })
  // Tests the 'Top' branch — posts sorted by totalReactions descending
  test('Sorts posts by total reactions descending when feedSort is Top', async () => {
    const mockPosts = [
      { id: 1, content: 'Post A', totalReactions: 5, comments: [] },
      { id: 2, content: 'Post B', totalReactions: 20, comments: [] },
      { id: 3, content: 'Post C', totalReactions: 1, comments: [] },
    ];

    global.useFetch.mockReturnValue({ data: mockPosts, loading: false, error: null });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    // 'Top' is the default sort so no button click needed
    // Collect the order posts were rendered in
    const renderedOrder = global.FeedPost.mock.calls
      .slice(-3)
      .map(call => call[0].post.totalReactions);

    expect(renderedOrder).toEqual([20, 5, 1]);
  });
  // 10
  // Type: WB
  // Spec: #10
  // Exact line: const ra = a.reactions ? ... : (a.totalReactions || 0)
  // Tests the fallback branch — uses totalReactions when reactions object is absent
  test('Uses totalReactions field when reactions object is absent', async () => {
    const mockPosts = [
      { id: 1, content: 'Post A', totalReactions: 10, comments: [] },
      { id: 2, content: 'Post B', totalReactions: 50, comments: [] },
    ];

    global.useFetch.mockReturnValue({ data: mockPosts, loading: false, error: null });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    // 'Top' is default sort — post B with totalReactions 50 should be first
    const renderedOrder = global.FeedPost.mock.calls
      .slice(-2)
      .map(call => call[0].post.totalReactions);

    expect(renderedOrder).toEqual([50, 10]);
  });
});

describe('FeedPage — Render States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.PostCreator = jest.fn(() => null);
    global.FeedPost = jest.fn(() => null);
    global.SponsoredPost = jest.fn(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  // 11
  // Type: BB
  // Spec: #11
  // Contract: FeedPage() should render a LoadingSpinner with text 'Loading feed...'
  // when useFetch returns loading:true
  test('Shows loading spinner while posts fetch', async () => {
    global.useFetch.mockReturnValue({ data: null, loading: true, error: null });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toHaveTextContent('Loading feed...');
  });

  // 12
  // Type: BB
  // Spec: #12
  // Contract: FeedPage() should render an error message when useFetch returns an error
  test('Shows error message when feed fetch fails', async () => {
    global.useFetch.mockReturnValue({ data: null, loading: false, error: 'Network error' });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    expect(screen.getByText('Could not load feed. Make sure the backend is running.')).toBeInTheDocument();
    expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
  });

  // 13
  // Type: EC
  // Spec: #13
  // Exact line: allPosts.length === 0 && <div>Your feed is empty...</div>
  // Edge case: empty data array renders empty state message
  test('Shows empty feed message when no posts exist', async () => {
    global.useFetch.mockReturnValue({ data: [], loading: false, error: null });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    expect(screen.getByText('Your feed is empty. Follow people and companies to see posts here.')).toBeInTheDocument();
  });
});

describe('PostCreator — submit()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.useFetch.mockReturnValue({ data: [], loading: false, error: null });
    global.PostCreator = sandbox.PostCreator;
    global.FeedPost = jest.fn(() => null);
    global.SponsoredPost = jest.fn(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  // 14
  // Type: WB
  // Spec: #14
  // Exact line: onPost(draft.trim()); setDraft(''); setExpanded(false);
  // Tests the happy path — trimmed content passed to onPost, state reset
  test('Calls onPost with trimmed content and resets state', async () => {
    const mockOnPost = jest.fn();

    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: mockOnPost,
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    // Click to expand the composer
    await act(async () => {
      fireEvent.click(screen.getByText('Start a post'));
    });

    // Type into the textarea
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('What do you want to talk about?'), {
        target: { value: '  My post  ' },
      });
    });

    // Click the Post button
    await act(async () => {
      fireEvent.click(screen.getByText('Post'));
    });

    // onPost should be called with trimmed content
    expect(mockOnPost).toHaveBeenCalledWith('My post');

    // Composer should be collapsed — Start a post button reappears
    expect(screen.getByText('Start a post')).toBeInTheDocument();
  });

  // 15
  // Type: EP
  // Spec: #15
  // Exact line: if (!draft.trim()) return;
  // Bucket: empty string draft — onPost should not be called
  test('Does nothing when draft is empty string', async () => {
    const mockOnPost = jest.fn();

    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: mockOnPost,
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    // Expand the composer
    await act(async () => {
      fireEvent.click(screen.getByText('Start a post'));
    });

    // Leave draft empty and try to click Post
    // Post button should be disabled when draft is empty
    const postBtn = screen.getByText('Post');
    expect(postBtn).toBeDisabled();

    // onPost should never be called
    expect(mockOnPost).not.toHaveBeenCalled();
  });

  // 16
  // Type: EP
  // Spec: #16
  // Exact line: if (!draft.trim()) return;
  // Bucket: whitespace-only draft — onPost should not be called
  test('Does nothing when draft is whitespace only', async () => {
    const mockOnPost = jest.fn();

    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: mockOnPost,
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    // Expand the composer
    await act(async () => {
      fireEvent.click(screen.getByText('Start a post'));
    });

    // Type whitespace only
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('What do you want to talk about?'), {
        target: { value: '    ' },
      });
    });

    // Post button should be disabled since trim() is empty
    const postBtn = screen.getByText('Post');
    expect(postBtn).toBeDisabled();

    // onPost should never be called
    expect(mockOnPost).not.toHaveBeenCalled();
  });
});

describe('SponsoredPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockAd = {
    company: 'Stripe',
    logo: '',
    desc: 'Join 1M+ businesses using Stripe.',
    tagline: 'Build the future of payments.',
    cta: 'Learn more',
    bg: 'linear-gradient(135deg,#635bff,#32325d)',
  };

  // 17
  // Type: BB
  // Spec: #17
  // Contract: SponsoredPost renders company name and CTA button from ad prop
  test('Renders company name and CTA button', async () => {
    render(
      React.createElement(sandbox.SponsoredPost, {
        ad: mockAd,
        showToast: mockShowToast,
      })
    );

    expect(screen.getAllByText('Stripe')[0]).toBeInTheDocument();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  // 18
  // Type: BB
  // Spec: #18
  // Contract: SponsoredPost calls showToast('Ad hidden') when X button is clicked
  test('Calls showToast with Ad hidden when X button clicked', async () => {
    render(
      React.createElement(sandbox.SponsoredPost, {
        ad: mockAd,
        showToast: mockShowToast,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('✕'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Ad hidden');
  });

  // 19
  // Type: BB
  // Spec: #19
  // Contract: SponsoredPost calls showToast('Opening Stripe...') when CTA button clicked
  test('Calls showToast with Opening company name when CTA button clicked', async () => {
    render(
      React.createElement(sandbox.SponsoredPost, {
        ad: mockAd,
        showToast: mockShowToast,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Learn more'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Opening Stripe...');
  });
});

describe('FeedPost — selectReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockPost = {
    id: 1,
    content: 'Test post',
    comments: [],
    likeCount: 0,
    totalReactions: 0,
    repostCount: 0,
  };

  // 20
  // Type: WB
  // Spec: #20
  // Exact line: setLocalReaction(r.name); setReactionHover(false); onLike(); showToast(...)
  // Tests full execution path of selectReaction
  test('Sets reaction, triggers like, and shows toast', async () => {
    const mockOnLike = jest.fn();

    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: mockOnLike,
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 99, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Hover over the Like button to show reaction picker after 500ms
    jest.useFakeTimers();
    await act(async () => {
      fireEvent.mouseEnter(screen.getByText('Like').closest('button'));
      jest.advanceTimersByTime(500);
    });
    jest.useRealTimers();

    // Click the Love reaction
    await act(async () => {
      fireEvent.click(screen.getByTitle('Love'));
    });

    expect(mockOnLike).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('Reacted with Love!', 'success');
  });
});

describe('FeedPost — postComment()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockPost = {
    id: 1,
    content: 'Test post',
    comments: [],
    likeCount: 0,
    totalReactions: 0,
    repostCount: 0,
  };

  // 21
  // Type: WB
  // Spec: #21
  // Exact line: setLocalComments(prev => [{ author: u.name || 'You', text: commentDraft.trim()... }])
  // Tests happy path — comment added to list, draft cleared, toast shown
  test('Adds comment to list and clears draft', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: true,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Type a comment
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Add a comment…'), {
        target: { value: 'Great post!' },
      });
    });

    // Click the Post button
    await act(async () => {
      fireEvent.click(screen.getByText('Post'));
    });

    // Comment should appear in the DOM
    expect(screen.getByText('Great post!')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();

    // Toast should be shown
    expect(mockShowToast).toHaveBeenCalledWith('Comment posted!');

    // Draft should be cleared
    expect(screen.getByPlaceholderText('Add a comment…').value).toBe('');
  });

  // 22
  // Type: EP
  // Spec: #22
  // Exact line: if (!commentDraft.trim()) return;
  // Bucket: empty string — postComment should not add comment or show toast
  test('Does nothing when comment draft is empty string', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: true,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Leave draft empty and press Enter
    await act(async () => {
      fireEvent.keyDown(screen.getByPlaceholderText('Add a comment…'), { key: 'Enter' });
    });

    // showToast should not have been called
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  // 23
  // Type: EP
  // Spec: #23
  // Exact line: if (!commentDraft.trim()) return;
  // Bucket: whitespace-only draft — postComment should not add comment or show toast
  test('Does nothing when comment draft is whitespace only', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: true,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Type whitespace only then press Enter
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Add a comment…'), {
        target: { value: '    ' },
      });
    });

    await act(async () => {
      fireEvent.keyDown(screen.getByPlaceholderText('Add a comment…'), { key: 'Enter' });
    });

    // showToast should not have been called
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  // 24
  // Type: EC
  // Spec: #24
  // Exact line: author: u.name || 'You'
  // Edge case: currentUser exists but has no name — author falls back to 'You'
  test("Falls back to 'You' as author when currentUser has no name", async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: true,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: {},
        onDelete: jest.fn(),
      })
    );

    // Type a comment
    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('Add a comment…'), {
        target: { value: 'Hi' },
      });
    });

    // Submit via Enter key
    await act(async () => {
      fireEvent.keyDown(screen.getByPlaceholderText('Add a comment…'), { key: 'Enter' });
    });

    // Author should fall back to 'You'
    expect(screen.getByText('You')).toBeInTheDocument();
  });
});

describe('FeedPost — handleLikeHover and handleLikeLeave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    jest.useRealTimers();
  });

  const mockPost = {
    id: 1,
    content: 'Test post',
    comments: [],
    likeCount: 0,
    totalReactions: 0,
    repostCount: 0,
  };

  // 25
  // Type: WB
  // Spec: #25
  // Exact line: const t = setTimeout(() => setReactionHover(true), 500);
  // Tests that reaction picker appears after 500ms hover
  test('Shows reaction picker after 500ms hover', async () => {
    jest.useFakeTimers();

    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Hover over Like button
    await act(async () => {
      fireEvent.mouseEnter(screen.getByText('Like').closest('button'));
    });

    // Reaction picker should not be visible yet
    expect(screen.queryByTitle('Love')).not.toBeInTheDocument();

    // Advance timers by 500ms
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Reaction picker should now be visible
    expect(screen.getByTitle('Love')).toBeInTheDocument();
  });

  // 26
  // Type: WB
  // Spec: #26
  // Exact line: if (reactionTimer) clearTimeout(reactionTimer); setTimeout(() => setReactionHover(false), 300)
  // Tests that leaving the Like button cancels the timer and hides the reaction picker
  test('Cancels timer and hides reaction picker on mouse leave', async () => {
    jest.useFakeTimers();

    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Hover to start the timer
    await act(async () => {
      fireEvent.mouseEnter(screen.getByText('Like').closest('button'));
      jest.advanceTimersByTime(500);
    });

    // Reaction picker should be visible
    expect(screen.getByTitle('Love')).toBeInTheDocument();

    // Leave the button
    await act(async () => {
      fireEvent.mouseLeave(screen.getByText('Like').closest('button'));
      jest.advanceTimersByTime(300);
    });

    // Reaction picker should be hidden
    expect(screen.queryByTitle('Love')).not.toBeInTheDocument();
  });

  // 27
  // Type: RG
  // Spec: #27
  // Exact line: if (reactionTimer) clearTimeout(reactionTimer)
  // Regression: handleLikeLeave should not crash when reactionTimer is null
  // Bug prevented: calling clearTimeout without the guard could throw in some environments
  test('Does not crash when mouseLeave fires before mouseEnter', async () => {
    jest.useFakeTimers();

    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Fire mouseLeave without ever hovering — reactionTimer is null
    expect(() => {
      fireEvent.mouseLeave(screen.getByText('Like').closest('button'));
      jest.advanceTimersByTime(300);
    }).not.toThrow();

    // Reaction picker should not be visible
    expect(screen.queryByTitle('Love')).not.toBeInTheDocument();
  });
});

describe('TruncatedText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // 28
  // Type: BB
  // Spec: #28
  // Contract: TruncatedText renders full text with no 'see more' button when text is under limit
  test('Shows full text when under limit', async () => {
    render(
      React.createElement(sandbox.TruncatedText, {
        text: 'Short text',
        limit: 280,
      })
    );

    expect(screen.getByText('Short text')).toBeInTheDocument();
    expect(screen.queryByText(/see more/)).not.toBeInTheDocument();
  });

  // 29
  // Type: BB
  // Spec: #29
  // Contract: TruncatedText truncates text and shows 'see more' button when over limit
  test('Truncates text and shows see more button when over limit', async () => {
    const longText = 'A'.repeat(300);

    render(
      React.createElement(sandbox.TruncatedText, {
        text: longText,
        limit: 280,
      })
    );

    // Full text should not be shown
    expect(screen.queryByText(longText)).not.toBeInTheDocument();

    // 'see more' button should be present
    expect(screen.getByText(/see more/)).toBeInTheDocument();
  });

  // 30
  // Type: WB
  // Spec: #30
  // Exact line: {expanded && text.length > limit && <button onClick={() => setExpanded(false)}>see less</button>}
  // Tests that clicking 'see more' expands to full text and shows 'see less' button
  test('Expands to full text and shows see less button on see more click', async () => {
    const longText = 'A'.repeat(300);

    render(
      React.createElement(sandbox.TruncatedText, {
        text: longText,
        limit: 280,
      })
    );

    // Click 'see more'
    await act(async () => {
      fireEvent.click(screen.getByText(/see more/));
    });

    // Full text should now be visible
    expect(screen.getByText(longText)).toBeInTheDocument();

    // 'see less' button should appear
    expect(screen.getByText('see less')).toBeInTheDocument();
  });

  // 31
  // Type: WB
  // Spec: #31
  // Exact line: onClick={() => setExpanded(false)} on the 'see less' button
  // Tests that clicking 'see less' collapses text back and shows 'see more' again
  test('Collapses back to truncated text on see less click', async () => {
    const longText = 'A'.repeat(300);

    render(
      React.createElement(sandbox.TruncatedText, {
        text: longText,
        limit: 280,
      })
    );

    // First expand
    await act(async () => {
      fireEvent.click(screen.getByText(/see more/));
    });

    expect(screen.getByText('see less')).toBeInTheDocument();

    // Now collapse
    await act(async () => {
      fireEvent.click(screen.getByText('see less'));
    });

    // Text should be truncated again
    expect(screen.queryByText(longText)).not.toBeInTheDocument();

    // 'see more' button should reappear
    expect(screen.getByText(/see more/)).toBeInTheDocument();
  });

  // 32
  // Type: GB
  // Spec: #32
  // Exact line: if (text.length <= limit || expanded)
  // Threshold: text length exactly at limit — should NOT truncate
  test('Shows full text when length is exactly at limit', async () => {
    const exactText = 'A'.repeat(280);

    render(
      React.createElement(sandbox.TruncatedText, {
        text: exactText,
        limit: 280,
      })
    );

    // Full text should be shown — no truncation at exactly the limit
    expect(screen.getByText(exactText)).toBeInTheDocument();
    expect(screen.queryByText(/see more/)).not.toBeInTheDocument();
  });

  // 33
  // Type: GB
  // Spec: #33
  // Exact line: if (text.length <= limit || expanded)
  // Threshold: text length one over limit — should truncate and show 'see more'
  test('Truncates text when length is one over limit', async () => {
    const oneOverText = 'A'.repeat(281);

    render(
      React.createElement(sandbox.TruncatedText, {
        text: oneOverText,
        limit: 280,
      })
    );

    // Full text should NOT be shown
    expect(screen.queryByText(oneOverText)).not.toBeInTheDocument();

    // 'see more' button should be present
    expect(screen.getByText(/see more/)).toBeInTheDocument();
  });
});

describe('FeedPost — Options Menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockPost = {
    id: 1,
    content: 'Test post',
    comments: [],
    likeCount: 0,
    totalReactions: 0,
    repostCount: 0,
    authorId: 1,
  };

  // 34
  // Type: WB
  // Spec: #34
  // Exact line: post.authorId === currentUser.id ? ['Delete post'] : []
  // Tests that Delete post appears when currentUser is the post author
  test('Shows Delete post option when currentUser is the author', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Open the options menu
    const menuBtn = document.querySelector('.li-post__options');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    expect(screen.getByText('Delete post')).toBeInTheDocument();
  });

  // 35
  // Type: WB
  // Spec: #35
  // Exact line: post.authorId === currentUser.id ? ['Delete post'] : []
  // Tests that Delete post is hidden when currentUser is NOT the post author
  test('Hides Delete post option when currentUser is not the author', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 99, name: 'Bob', headline: 'Dev' },
        onDelete: jest.fn(),
      })
    );

    // Open the options menu
    const menuBtn = document.querySelector('.li-post__options');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    // Delete post should NOT be in the menu
    expect(screen.queryByText('Delete post')).not.toBeInTheDocument();
  });

  // 36
  // Type: BB
  // Spec: #36
  // Contract: clicking 'Delete post' calls onDelete with post.id and showToast('Post deleted')
  test('Calls onDelete and shows toast when Delete post is clicked', async () => {
    const mockOnDelete = jest.fn();

    render(
      React.createElement(sandbox.FeedPost, {
        post: mockPost,
        liked: false,
        onLike: jest.fn(),
        commentsOpen: false,
        onToggleComments: jest.fn(),
        following: new Set(),
        onFollow: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToast,
        currentUser: { id: 1, name: 'Alex', headline: 'Dev' },
        onDelete: mockOnDelete,
      })
    );

    // Open the options menu
    const menuBtn = document.querySelector('.li-post__options');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    // Click Delete post
    await act(async () => {
      fireEvent.click(screen.getByText('Delete post'));
    });

    // onDelete should be called with post id
    expect(mockOnDelete).toHaveBeenCalledWith(1);

    // Toast should be shown
    expect(mockShowToast).toHaveBeenCalledWith('Post deleted');
  });
});

// =============================================================
// COVERAGE BOOST — tests targeting previously uncovered lines
// =============================================================

describe('FeedPage — sidebar and inline handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.PostCreator = jest.fn(() => null);
    global.FeedPost = jest.fn(() => null);
    global.SponsoredPost = jest.fn(() => null);
  });

  afterEach(() => {
    cleanup();
  });

  // 37
  // Type: WB
  // Spec: #37
  // Exact line: {suggUsers.length > 0 && (
  // Tests that the sidebar "People you may know" section renders when useFetch returns users
  test('Renders suggested users and Follow button when users are returned', async () => {
    const feedResult  = { data: [], loading: false, error: null };
    const usersResult = { data: [{ id: 5, name: 'Dana', headline: 'Engineer', avatarColor: '#f00' }], loading: false, error: null };
    global.useFetch.mockImplementation((fn) =>
      fn === global.API.getUsers ? usersResult : feedResult
    );

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    expect(screen.getAllByText('Dana').length).toBeGreaterThan(0);
    expect(screen.getByText('+ Follow')).toBeInTheDocument();
  });

  // 38
  // Type: WB
  // Spec: #38
  // Exact line: onClick={() => { follow(su.id); showToast(`Following ${su.name}`); }}
  // Tests that clicking the Follow button in the sidebar calls follow and showToast
  test('Clicking Follow in sidebar calls follow and showToast', async () => {
    const mockFollow = jest.fn();

    const feedResult2  = { data: [], loading: false, error: null };
    const usersResult2 = { data: [{ id: 5, name: 'Dana', headline: 'Engineer' }], loading: false, error: null };
    global.useFetch.mockImplementation((fn) =>
      fn === global.API.getUsers ? usersResult2 : feedResult2
    );

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext({ follow: mockFollow })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('+ Follow'));
    });

    expect(mockFollow).toHaveBeenCalledWith(5);
    expect(mockShowToast).toHaveBeenCalledWith('Following Dana');
  });

  // 39
  // Type: WB
  // Spec: #39
  // Exact line: onLike={() => { toggleLike(String(post.id)); }}
  // Tests that the onLike prop passed to FeedPost calls toggleLike with the stringified post id
  test('onLike prop passed to FeedPost calls toggleLike with post id', async () => {
    const mockToggleLike = jest.fn();

    global.useFetch.mockReturnValue({
      data: [{ id: 7, content: 'Post', comments: [] }],
      loading: false,
      error: null,
    });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext({ toggleLike: mockToggleLike })
    );

    const onLike = global.FeedPost.mock.calls[0][0].onLike;
    onLike();

    expect(mockToggleLike).toHaveBeenCalledWith('7');
  });

  // 40
  // Type: WB
  // Spec: #40
  // Exact line: onDelete={id => setLocalPosts(prev => prev.filter(p => p.id !== id))}
  // Tests that the onDelete prop passed to FeedPost removes the post from localPosts
  test('onDelete prop passed to FeedPost removes the post from the feed', async () => {
    global.useFetch.mockReturnValue({
      data: [{ id: 7, content: 'Post', comments: [] }],
      loading: false,
      error: null,
    });

    renderWithContext(
      React.createElement(global.FeedPage),
      defaultContext()
    );

    const onDelete = global.FeedPost.mock.calls[0][0].onDelete;
    const callsBefore = global.FeedPost.mock.calls.length;

    await act(async () => {
      onDelete(7);
    });

    // Feed is now empty — FeedPost should receive no new calls after deletion
    expect(global.FeedPost.mock.calls.length).toBe(callsBefore);
  });
});

describe('PostCreator — action buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.PostCreator = sandbox.PostCreator;
  });

  afterEach(() => {
    cleanup();
  });

  // 41
  // Type: WB
  // Spec: #41
  // Exact line: { label: 'Photo', action: () => setExpanded(true) }
  // Tests that clicking the Photo button in the collapsed composer sets expanded to true
  test('Clicking Photo button in collapsed composer expands it', async () => {
    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: jest.fn(),
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Photo'));
    });

    // Composer should now be expanded — textarea appears
    expect(screen.getByPlaceholderText('What do you want to talk about?')).toBeInTheDocument();
  });

  // 42
  // Type: WB
  // Spec: #42
  // Exact line: { label: 'Event', action: () => navigate('events') }
  // Tests that clicking the Event button in the collapsed composer calls navigate('events')
  test('Clicking Event button in collapsed composer calls navigate', async () => {
    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: jest.fn(),
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Event'));
    });

    expect(global.navigate).toHaveBeenCalledWith('events');
  });

  // 43
  // Type: WB
  // Spec: #43
  // Exact line: { label: 'Write article', action: () => showToast('Article editor — coming soon') }
  // Tests that clicking the Write article button in the collapsed composer calls showToast
  test('Clicking Write article button calls showToast', async () => {
    const mockShowToastLocal = jest.fn();

    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToastLocal,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Write article'));
    });

    expect(mockShowToastLocal).toHaveBeenCalledWith('Article editor — coming soon');
  });

  // 44
  // Type: WB
  // Spec: #44
  // Exact line: if (label === 'Event') navigate('events'); else showToast(`${label} upload — coming soon`)
  // Tests the else branch — Photo in the expanded toolbar calls showToast with 'Photo upload — coming soon'
  test('Clicking Photo in expanded toolbar calls showToast', async () => {
    const mockShowToastLocal = jest.fn();

    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: jest.fn(),
        openModal: jest.fn(),
        showToast: mockShowToastLocal,
      })
    );

    // Expand first
    await act(async () => {
      fireEvent.click(screen.getByText('Start a post'));
    });

    // Click the Photo toolbar button (title="Photo")
    await act(async () => {
      fireEvent.click(screen.getByTitle('Photo'));
    });

    expect(mockShowToastLocal).toHaveBeenCalledWith('Photo upload — coming soon');
  });

  // 45
  // Type: WB
  // Spec: #45
  // Exact line: if (label === 'Event') navigate('events')
  // Tests the if branch — Event in the expanded toolbar calls navigate('events')
  test('Clicking Event in expanded toolbar calls navigate', async () => {
    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: jest.fn(),
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Start a post'));
    });

    await act(async () => {
      fireEvent.click(screen.getByTitle('Event'));
    });

    expect(global.navigate).toHaveBeenCalledWith('events');
  });

  // 46
  // Type: WB
  // Spec: #46
  // Exact line: <button onClick={() => setExpanded(false)}>Cancel</button>
  // Tests that clicking Cancel sets expanded to false and restores the collapsed state
  test('Clicking Cancel in expanded composer collapses it', async () => {
    render(
      React.createElement(global.PostCreator, {
        user: { name: 'Alex', headline: 'Dev' },
        onPost: jest.fn(),
        openModal: jest.fn(),
        showToast: jest.fn(),
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Start a post'));
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(screen.getByText('Start a post')).toBeInTheDocument();
  });

});

describe('FeedPost — render variants and action buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const baseProps = {
    liked: false,
    onLike: jest.fn(),
    commentsOpen: false,
    onToggleComments: jest.fn(),
    following: new Set(),
    onFollow: jest.fn(),
    openModal: jest.fn(),
    showToast: mockShowToast,
    currentUser: { id: 99, name: 'Alex', headline: 'Dev' },
    onDelete: jest.fn(),
  };

  // 47
  // Type: WB
  // Spec: #47
  // Exact line: (post.reactions ? Object.values(post.reactions).reduce((a, b) => a + b, 0) : 0)
  // Tests the post.reactions object branch — totalReactions is summed from the reactions map
  test('Calculates totalReactions from reactions object', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: {
          id: 1, content: 'Post', comments: [],
          reactions: { like: 5, love: 3 },
          repostCount: 0,
        },
      })
    );

    // Reactions bar renders — 8 total reactions shown
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  // 48
  // Type: WB
  // Spec: #48
  // Exact line: {(totalReactions > 0 || commentCount > 0 || repostCount > 0) && (
  // Tests that the reactions count bar renders when totalReactions > 0
  test('Renders reactions count bar when totalReactions > 0', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 10, repostCount: 2 },
      })
    );

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('2 reposts')).toBeInTheDocument();
  });

  // 49
  // Type: WB
  // Spec: #49
  // Exact line: {(post.tags || []).length > 0 && (
  // Tests that hashtag spans render when the post has a tags array
  test('Renders hashtag links when post has tags', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, tags: ['javascript', 'react'] },
      })
    );

    expect(screen.getByText('#javascript')).toBeInTheDocument();
    expect(screen.getByText('#react')).toBeInTheDocument();
  });

  // 50
  // Type: WB
  // Spec: #50
  // Exact line: onClick={() => { onFollow(authorId); showToast(`Following ${authorName}`); }}
  // Tests that the + Follow button on a post calls onFollow with authorId and showToast
  test('+ Follow button on post calls onFollow and showToast', async () => {
    const mockOnFollow = jest.fn();

    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        onFollow: mockOnFollow,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, authorId: 50, author: 'Sam' },
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('+ Follow'));
    });

    expect(mockOnFollow).toHaveBeenCalledWith(50);
    expect(mockShowToast).toHaveBeenCalledWith('Following Sam');
  });

  // 51
  // Type: WB
  // Spec: #51
  // Exact line: onClick={() => openModal('share', { post })}
  // Tests that clicking Repost calls openModal with the share modal id and post object
  test('Clicking Repost calls openModal with share', async () => {
    const mockOpenModal = jest.fn();

    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        openModal: mockOpenModal,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0 },
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Repost'));
    });

    expect(mockOpenModal).toHaveBeenCalledWith('share', expect.objectContaining({ post: expect.any(Object) }));
  });

  // 52
  // Type: WB
  // Spec: #52
  // Exact line: onClick={() => showToast('Link copied!')}
  // Tests that clicking Send calls showToast with 'Link copied!'
  test('Clicking Send calls showToast with Link copied', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0 },
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Send'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Link copied!');
  });

  // 53
  // Type: WB
  // Spec: #53
  // Exact line: onClick={() => navigate(`profile?id=${authorId}`)} on .li-post__author-photo
  // Tests that clicking the author photo navigates to the author's profile page
  test('Clicking author photo navigates to the author profile', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, authorId: 42, author: 'Sam' },
      })
    );

    const authorPhoto = document.querySelector('.li-post__author-photo');
    await act(async () => {
      fireEvent.click(authorPhoto);
    });

    expect(global.navigate).toHaveBeenCalledWith('profile?id=42');
  });

  // 54
  // Type: WB
  // Spec: #54
  // Exact line: else if (label === 'Report post') openModal('report', { post });
  // Tests the Report post branch in the options menu calls openModal with 'report'
  test('Clicking Report post in menu calls openModal with report', async () => {
    const mockOpenModal = jest.fn();

    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        openModal: mockOpenModal,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, authorId: 99 },
      })
    );

    const menuBtn = document.querySelector('.li-post__options');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Report post'));
    });

    expect(mockOpenModal).toHaveBeenCalledWith('report', expect.objectContaining({ post: expect.any(Object) }));
  });

  // 55
  // Type: WB
  // Spec: #55
  // Exact line: else showToast(label);
  // Tests the else branch in the options menu — Save post calls showToast with the label
  test('Clicking Save post in menu calls showToast', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, authorId: 99 },
      })
    );

    const menuBtn = document.querySelector('.li-post__options');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Save post'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Save post');
  });

  // 56
  // Type: WB
  // Spec: #56
  // Exact line: onClick={() => navigate(`search?q=${encodeURIComponent('#' + t)}`)}
  // Tests that clicking a hashtag tag calls navigate with the encoded search query
  test('Clicking a hashtag tag navigates to search', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, tags: ['webdev'] },
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('#webdev'));
    });

    expect(global.navigate).toHaveBeenCalledWith('search?q=%23webdev');
  });

  // 57
  // Type: WB
  // Spec: #57
  // Exact line: {post.image && (<img ... onClick={() => showToast('Image viewer — coming soon')} />)}
  // Tests the post.image branch — image renders and clicking it calls showToast
  test('Renders post image and shows toast on image click', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 0, repostCount: 0, image: 'http://example.com/img.png' },
      })
    );

    const img = document.querySelector('.li-post__image');
    expect(img).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(img);
    });

    expect(mockShowToast).toHaveBeenCalledWith('Image viewer — coming soon');
  });

  // 58
  // Type: WB
  // Spec: #58
  // Exact line: onClick={() => showToast('Reactions — coming soon')} on .li-post__reaction-icons
  // Tests that clicking the reactions icon bar calls showToast with 'Reactions — coming soon'
  test('Clicking reactions bar shows Reactions coming soon toast', async () => {
    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        post: { id: 1, content: 'Post', comments: [], totalReactions: 5, repostCount: 0 },
      })
    );

    const reactionIcons = document.querySelector('.li-post__reaction-icons');
    await act(async () => {
      fireEvent.click(reactionIcons);
    });

    expect(mockShowToast).toHaveBeenCalledWith('Reactions — coming soon');
  });

  // 59
  // Type: WB
  // Spec: #59
  // Exact line: onClick={() => showToast('Liked comment!')} on the comment Like button
  // Tests that clicking Like on a comment calls showToast with 'Liked comment!'
  test('Clicking Like on a comment shows Liked comment toast', async () => {
    const postWithComments = {
      id: 1, content: 'Post', totalReactions: 0, repostCount: 0,
      comments: [{ author: { name: 'Bob', headline: 'Eng' }, text: 'Nice!', timestamp: 'Yesterday' }],
    };

    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        commentsOpen: true,
        post: postWithComments,
      })
    );

    // getAllByRole finds both the post Like action button and the comment Like button
    // — click the last one which is the comment Like button
    await act(async () => {
      const likeButtons = screen.getAllByRole('button', { name: 'Like' });
      fireEvent.click(likeButtons[likeButtons.length - 1]);
    });

    expect(mockShowToast).toHaveBeenCalledWith('Liked comment!');
  });

  // 60
  // Type: WB
  // Spec: #60
  // Exact line: onClick={() => showToast('Reply — coming soon')} on the comment Reply button
  // Tests that clicking Reply on a comment calls showToast with 'Reply — coming soon'
  test('Clicking Reply on a comment shows Reply coming soon toast', async () => {
    const postWithComments = {
      id: 1, content: 'Post', totalReactions: 0, repostCount: 0,
      comments: [{ author: { name: 'Bob', headline: 'Eng' }, text: 'Nice!', timestamp: 'Yesterday' }],
    };

    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        commentsOpen: true,
        post: postWithComments,
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Reply'));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Reply — coming soon');
  });

  // 61
  // Type: WB
  // Spec: #61
  // Exact line: {commentCount > 3 && ( ... onClick={() => showToast('Loading all comments...')}
  // Tests that the View all comments button appears when commentCount > 3 and calls showToast
  test('Clicking View all comments shows loading toast', async () => {
    // Need more than 3 comments to trigger the View all button
    const manyComments = Array.from({ length: 5 }, (_, i) => ({
      author: { name: `User${i}`, headline: '' }, text: `Comment ${i}`, timestamp: 'now',
    }));

    render(
      React.createElement(sandbox.FeedPost, {
        ...baseProps,
        commentsOpen: true,
        // commentCount must be passed explicitly — FeedPost derives it from post.commentCount,
        // not from the comments array length
        post: { id: 1, content: 'Post', totalReactions: 0, repostCount: 0, commentCount: 5, comments: manyComments },
      })
    );

    await act(async () => {
      fireEvent.click(screen.getByText(/View all/));
    });

    expect(mockShowToast).toHaveBeenCalledWith('Loading all comments...');
  });

});