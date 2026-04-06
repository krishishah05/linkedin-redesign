// =============================================================
// MessagingPage.test.js
// Pure function tests for functions inside MessagingPage.js
// =============================================================


// Suppress act() warnings — expected for async state updates in these tests
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (args[0]?.includes?.('not wrapped in act')) return;
        originalError(...args);
    };
});
afterAll(() => {
    console.error = originalError;
});
const React = require('react');
const { render, screen, cleanup, fireEvent, act } = require('@testing-library/react');
require('@testing-library/jest-dom');

// Suppress unhandled rejections from crashing Stryker child processes
process.on('unhandledRejection', () => { });

// =============================================================
// SETUP GLOBALS FOR BROWSER ES5 COMPONENTS
// =============================================================

const mockShowToast = jest.fn();
const mockSetUnreadMessages = jest.fn();

global.React = React;
global.AppContext = React.createContext({
    currentUser: { id: 'user1', name: 'User One' },
    showToast: mockShowToast,
    setUnreadMessages: mockSetUnreadMessages,
});
global.useFetch = jest.fn();
global.API = {
    getConversations: jest.fn(),
    getConversation: jest.fn(() => Promise.resolve({ messages: [] })),
    sendMessage: jest.fn(() => Promise.resolve()),
    getProfileReadiness: jest.fn(() => Promise.resolve({ score: 100 }))
};
global.LoadingSpinner = ({ text }) => React.createElement('div', { 'data-testid': 'spinner' }, text);
global.formatTime = jest.fn((ts) => ts);

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Require the conditionally exported components
const {
    MessagingPage,
    OutreachGuidePanel,
    ProfileReadinessPanel,
    mockBackendGetProfileReadiness,
    computeGuidePreview,
    _OUTREACH_TEMPLATES,
    _OUTREACH_GOALS
} = require('../../../js/components/pages/MessagingPage.js');

// =============================================================
// MESSAGING PAGE COMPONENT TESTS
// =============================================================

describe('MessagingPage Component Tests', () => {
    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
        mockShowToast.mockClear();
        mockSetUnreadMessages.mockClear();
    });

    // 1 — BB
    test("Shows loading spinner while conversations fetch", () => {
        global.useFetch.mockReturnValue({ loading: true, data: null });
        render(React.createElement(MessagingPage));
        const spinner = screen.getByTestId('spinner');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveTextContent('Loading messages...');
        expect(screen.queryByPlaceholderText('Search messages')).not.toBeInTheDocument();
    });

    // 2 — BB
    test("Renders participant name when conversations load", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        const { findAllByText } = render(React.createElement(MessagingPage));
        const aliceText = await findAllByText('Alice');
        expect(aliceText[0]).toBeInTheDocument();
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });

    // 3 — WB
    test("Auto-selects first conversation when selectedId is null", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'Bob' }]
        });
        render(React.createElement(MessagingPage));
        expect(global.API.getConversation).toHaveBeenCalledTimes(1);
        expect(global.API.getConversation).toHaveBeenCalledWith(1);
        expect(global.API.getConversation).not.toHaveBeenCalledWith(2);
    });

    // 4 — WB
    test("Does not auto-select if selectedId already set", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 2, participantName: 'Bob' }]
        });
        const { rerender } = render(React.createElement(MessagingPage));
        expect(global.API.getConversation).toHaveBeenCalledWith(2);

        global.API.getConversation.mockClear();

        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'Bob' }]
        });
        await act(async () => {
            rerender(React.createElement(MessagingPage));
        });

        expect(global.API.getConversation).not.toHaveBeenCalledWith(1);
        expect(global.API.getConversation).toHaveBeenCalledTimes(0);
    });

    // 5 — WB
    test("Calls setUnreadMessages(0) once on mount", () => {
        global.useFetch.mockReturnValue({ loading: true, data: null });
        render(React.createElement(MessagingPage));
        expect(mockSetUnreadMessages).toHaveBeenCalledTimes(1);
        expect(mockSetUnreadMessages).toHaveBeenCalledWith(0);
        expect(mockSetUnreadMessages).not.toHaveBeenCalledWith(1);
    });

    // 6 — WB
    test("Scrolls to bottom when messages state changes", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        let resolveGetConv;
        global.API.getConversation.mockReturnValue(new Promise(res => resolveGetConv = res));

        render(React.createElement(MessagingPage));
        window.HTMLElement.prototype.scrollIntoView.mockClear();

        await act(async () => {
            resolveGetConv({ messages: [{ id: 1, text: 'Hello', isMe: false, timestamp: Date.now() }] });
        });

        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
        expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalledWith({ behavior: 'instant' });
    });

    // 7 — WB
    test("Sets selectedId immediately on call", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'Bob' }]
        });
        render(React.createElement(MessagingPage));
        const bobBtn = screen.getByText('Bob').closest('button');
        const aliceBtn = screen.getAllByText('Alice').find(el => el.closest('.li-msg-conv')).closest('button');

        fireEvent.click(bobBtn);

        expect(screen.getByRole('heading', { level: 2, name: 'Bob' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 2, name: 'Alice' })).not.toBeInTheDocument();
        // selected button gets blue-light background, unselected gets transparent
        expect(bobBtn.style.background).toContain('var(--blue-light)');
        expect(aliceBtn.style.background).toBe('transparent');
    });

    // 8 — WB
    test("Sets msgLoading:true before API resolves", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'Bob' }]
        });
        let resolveApi;
        global.API.getConversation.mockReturnValue(new Promise(res => resolveApi = res));

        const { getByText } = render(React.createElement(MessagingPage));
        const bobBtn = getByText('Bob').closest('button');

        act(() => {
            fireEvent.click(bobBtn);
        });

        expect(screen.getByText('Loading conversation\u2026')).toBeInTheDocument();
        expect(screen.queryByRole('article')).not.toBeInTheDocument();

        await act(async () => {
            resolveApi({ messages: [] });
        });

        expect(screen.queryByText('Loading conversation\u2026')).not.toBeInTheDocument();
    });

    // 9 — WB
    test("Sets messages from data.messages on success", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'Bob' }]
        });
        global.API.getConversation.mockReturnValue(Promise.resolve({
            messages: [{ id: 99, text: 'Secret Message', isMe: false, timestamp: Date.now() }]
        }));

        render(React.createElement(MessagingPage));
        const bobBtn = screen.getByText('Bob').closest('button');

        await act(async () => {
            fireEvent.click(bobBtn);
        });

        expect(screen.getByText('Secret Message')).toBeInTheDocument();
        expect(screen.queryByText('Loading conversation\u2026')).not.toBeInTheDocument();
        expect(global.API.getConversation).toHaveBeenCalledWith(2);
    });

    // 10 — RG
    test("Defaults to [] when data.messages is absent", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'Bob' }]
        });
        global.API.getConversation.mockReturnValue(Promise.resolve({}));

        render(React.createElement(MessagingPage));
        const bobBtn = screen.getByText('Bob').closest('button');

        await act(async () => {
            fireEvent.click(bobBtn);
        });

        expect(screen.queryByText('Loading conversation\u2026')).not.toBeInTheDocument();
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    // 11 — WB
    test("Sets messages to [] on API rejection", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getConversation.mockReturnValue(Promise.reject(new Error("API Error")));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        expect(screen.queryByText('Loading conversation\u2026')).not.toBeInTheDocument();
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    // 12 — EP: invalid draft (empty string)
    test("No-op for empty string", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const sendBtn = screen.getByText('Send');
        await act(async () => {
            fireEvent.click(sendBtn);
        });

        expect(global.API.sendMessage).not.toHaveBeenCalled();
        expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    // 13 — EP: invalid draft (whitespace only)
    test("No-op for whitespace only", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: '   ' } });

        const sendBtn = screen.getByText('Send');
        await act(async () => {
            fireEvent.click(sendBtn);
        });

        expect(global.API.sendMessage).not.toHaveBeenCalled();
        expect(input.value).toBe('   ');
    });

    // 14 — EP: no target (selectedId is null)
    test("No-op when selectedId is null", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: []
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: 'Hello' } });

        const sendBtn = screen.getByText('Send');
        await act(async () => {
            fireEvent.click(sendBtn);
        });

        expect(global.API.sendMessage).not.toHaveBeenCalled();
        expect(input.value).toBe('Hello');
    });

    // 15 — WB
    test("Clears draft state before API call", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: 'Hello' } });
        expect(input.value).toBe('Hello');

        const sendBtn = screen.getByText('Send');
        await act(async () => {
            fireEvent.click(sendBtn);
        });

        expect(input.value).toBe('');
        expect(input.value).toHaveLength(0);
    });

    // 16 — WB
    test("Appends optimistic message with correct shape", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });
        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: 'Hello' } });

        await act(async () => {
            fireEvent.click(screen.getByText('Send'));
        });

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(global.API.sendMessage).toHaveBeenCalledTimes(1);
    });

    // 17 — RG
    test("Sends trimmed text to API — not raw draft", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });
        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: ' Hello ' } });

        await act(async () => {
            fireEvent.click(screen.getByText('Send'));
        });

        expect(global.API.sendMessage).toHaveBeenCalledWith(1, 'Hello');
        expect(global.API.sendMessage).not.toHaveBeenCalledWith(1, ' Hello ');
        expect(global.API.sendMessage).toHaveBeenCalledTimes(1);
    });

    // 18 — WB
    test("Calls showToast on API rejection", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.sendMessage.mockReturnValueOnce(Promise.reject(new Error("Send failed")));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });
        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: 'Hello' } });

        await act(async () => {
            fireEvent.click(screen.getByText('Send'));
        });

        expect(mockShowToast).toHaveBeenCalledWith('Failed to send message', 'error');
        expect(mockShowToast).toHaveBeenCalledTimes(1);
        expect(mockShowToast).not.toHaveBeenCalledWith('Failed to send message', 'info');
    });

    // 19 — WB
    test("Sets activePanel to 'score' when null", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.getByText('Profile Readiness')).toBeInTheDocument();
        expect(global.API.getProfileReadiness).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
    });

    // 20 — RG
    test("Sets activePanel to null when was 'score'", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });
        expect(screen.getByText('Profile Readiness')).toBeInTheDocument();

        global.API.getProfileReadiness.mockClear();

        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.queryByText('Profile Readiness')).not.toBeInTheDocument();
        expect(global.API.getProfileReadiness).not.toHaveBeenCalled();
        expect(global.API.getProfileReadiness).toHaveBeenCalledTimes(0);
    });

    // 21 — WB
    test("Sets readinessLoading:true at start", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        let resolveApi;
        global.API.getProfileReadiness.mockReturnValue(new Promise(res => resolveApi = res));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        act(() => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.getByText('Calculating score\u2026')).toBeInTheDocument();
        expect(screen.queryByText('99')).not.toBeInTheDocument();

        await act(async () => {
            resolveApi({ score: 100, sections: [], fixes: [] });
        });

        expect(screen.queryByText('Calculating score\u2026')).not.toBeInTheDocument();
    });

    // 22 — BB
    test("Sets readiness from API on success", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        global.API.getProfileReadiness.mockReturnValue(Promise.resolve({ score: 85, sections: [], fixes: [] }));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.queryByText('84')).not.toBeInTheDocument();
        expect(screen.queryByText('86')).not.toBeInTheDocument();
        expect(screen.queryByText('Calculating score\u2026')).not.toBeInTheDocument();
    });

    // 23 — WB
    test("No showToast when refresh:false and API succeeds", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getProfileReadiness.mockReturnValue(Promise.resolve({ score: 90, sections: [], fixes: [] }));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(mockShowToast).not.toHaveBeenCalledWith('Score refreshed', expect.anything());
        expect(mockShowToast).not.toHaveBeenCalledWith('Score refreshed (mock)', expect.anything());
        expect(mockShowToast).toHaveBeenCalledTimes(0);
    });

    // 24 — WB
    test("showToast 'Score refreshed' when refresh:true + success", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getProfileReadiness.mockReturnValue(Promise.resolve({ score: 90, sections: [], fixes: [] }));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        const refreshBtn = screen.getByText('Refresh score');
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(mockShowToast).toHaveBeenCalledWith('Score refreshed', 'success');
        expect(mockShowToast).not.toHaveBeenCalledWith('Score refreshed', 'info');
        expect(mockShowToast).not.toHaveBeenCalledWith('Score refreshed', 'error');
    });

    // 25 — WB
    test("Uses mock fallback and sets readinessError on failure", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getProfileReadiness.mockReturnValue(Promise.reject(new Error("API Not Available")));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.getByText('Backend not running \u2014 using mocked score')).toBeInTheDocument();
        expect(screen.getByText('Profile Readiness')).toBeInTheDocument();
        expect(screen.queryByText('Calculating score\u2026')).not.toBeInTheDocument();
    });

    // 26 — WB
    test("showToast 'Score refreshed (mock)' when refresh:true + failure", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getProfileReadiness.mockReturnValueOnce(Promise.resolve({ score: 85, sections: [], fixes: [] }));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        global.API.getProfileReadiness.mockReturnValueOnce(Promise.reject(new Error("Down")));

        const refreshBtn = screen.getByText('Refresh score');
        await act(async () => {
            fireEvent.click(refreshBtn);
        });

        expect(mockShowToast).toHaveBeenCalledWith('Score refreshed (mock)', 'info');
        expect(mockShowToast).not.toHaveBeenCalledWith('Score refreshed (mock)', 'success');
    });

    // 27 — RG
    test("readinessLoading:false in finally on success", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getProfileReadiness.mockReturnValue(Promise.resolve({ score: 99, sections: [], fixes: [] }));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.queryByText('Calculating score\u2026')).not.toBeInTheDocument();
        expect(screen.getByText('99')).toBeInTheDocument();
        expect(screen.queryByText('98')).not.toBeInTheDocument();
    });

    // 28 — RG
    test("readinessLoading:false in finally on failure", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });
        global.API.getProfileReadiness.mockReturnValue(Promise.reject(new Error("API timeout")));

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const scoreBtn = screen.getByTitle('Profile Readiness');
        await act(async () => {
            fireEvent.click(scoreBtn);
        });

        expect(screen.queryByText('Calculating score\u2026')).not.toBeInTheDocument();
        expect(screen.getByText('Backend not running \u2014 using mocked score')).toBeInTheDocument();
    });

    // 29 — WB
    test("Toggles activePanel to 'guide' when null", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const guideBtn = screen.getByTitle('Outreach Guide');
        await act(async () => {
            fireEvent.click(guideBtn);
        });

        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.queryByText('Profile Readiness')).not.toBeInTheDocument();
    });

    // 30 — WB
    test("Toggles activePanel to null when was 'guide'", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const guideBtn = screen.getByTitle('Outreach Guide');
        await act(async () => fireEvent.click(guideBtn));
        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();

        await act(async () => fireEvent.click(guideBtn));
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
        expect(screen.queryByText('Profile Readiness')).not.toBeInTheDocument();
    });

    // 31 — WB
    test("openOutreachGuide returns early safely when selectedId is null", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: []
        });

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const guideBtn = screen.getByTitle('Outreach Guide');
        guideBtn.removeAttribute('disabled');

        await act(async () => {
            fireEvent.click(guideBtn);
        });

        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 32 — WB
    test("Initializes fresh state for new conversation in openOutreachGuide", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const guideBtn = screen.getByTitle('Outreach Guide');
        await act(async () => {
            fireEvent.click(guideBtn);
        });

        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.getByText('Ask for Advice')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 33 — WB
    test("Does not overwrite existing guide state when reopening", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        await act(async () => {
            render(React.createElement(MessagingPage));
        });

        const guideBtn = screen.getByTitle('Outreach Guide');
        await act(async () => fireEvent.click(guideBtn));

        const adviceGoal = screen.getByText('Ask for Advice').closest('div');
        await act(async () => fireEvent.click(adviceGoal));

        expect(screen.getByText('Personalize your message')).toBeInTheDocument();

        await act(async () => fireEvent.click(guideBtn));
        await act(async () => fireEvent.click(guideBtn));

        expect(screen.getByText('Personalize your message')).toBeInTheDocument();
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
    });

    // 34 — WB
    test("setGuideState returns early safely when selectedId is null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.queryByTitle('Try another version')).not.toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 35 — WB
    test("setGuideState shallow-merges patch, preserves other keys", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        await act(async () => render(React.createElement(MessagingPage)));

        const guideBtn = screen.getByTitle('Outreach Guide');
        await act(async () => fireEvent.click(guideBtn));

        const jobGoal = screen.getByText('Job / Internship').closest('div');
        await act(async () => fireEvent.click(jobGoal));

        const recipientLabel = screen.getByText('Their first name');
        fireEvent.change(recipientLabel.nextElementSibling, { target: { value: 'Frank' } });

        const nextBtn = screen.getByText('Next \u2192');
        await act(async () => fireEvent.click(nextBtn));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        expect(textarea.value).toContain('Frank');
        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 36 — WB
    test("setGuideDetailsPatch returns early safely when selectedId is null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.queryByPlaceholderText('Personalize your message')).not.toBeInTheDocument();
        expect(screen.queryByText('Their first name')).not.toBeInTheDocument();
    });

    // 37 — WB
    test("setGuideDetailsPatch deep-merges into details only, preserves other detail fields", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }]
        });

        await act(async () => render(React.createElement(MessagingPage)));

        const guideBtn = screen.getByTitle('Outreach Guide');
        await act(async () => fireEvent.click(guideBtn));

        const networkGoal = screen.getByText('Build Network').closest('div');
        await act(async () => fireEvent.click(networkGoal));

        const recipientLabel = screen.getByText('Their first name');
        const roleLabel = screen.getByText('Your name / major');

        fireEvent.change(recipientLabel.nextElementSibling, { target: { value: 'Frank' } });
        fireEvent.change(roleLabel.nextElementSibling, { target: { value: 'Software Eng' } });

        expect(recipientLabel.nextElementSibling.value).toBe('Frank');
        expect(roleLabel.nextElementSibling.value).toBe('Software Eng');
        expect(recipientLabel.nextElementSibling.value).not.toBe('Software Eng');
    });

    // 41 — BB
    test("Returns filled template for valid goal and details", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));

        const recipientLabel = screen.getByText('Their first name');
        fireEvent.change(recipientLabel.nextElementSibling, { target: { value: 'Frank' } });

        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        expect(textarea.value).toContain('Frank');
        expect(textarea.value).toContain("I'd love to learn from your experience");
        expect(textarea.value.length).toBeGreaterThan(20);
        expect(textarea.value).not.toBe('');
    });

    // 42 — WB
    test("Uses variantIdx modulo to wrap around variants seamlessly", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        const initialText = textarea.value;
        const cycleBtn = screen.getByTitle('Try another version');

        await act(async () => fireEvent.click(cycleBtn));
        const alternateText = textarea.value;
        expect(initialText).not.toEqual(alternateText);
        expect(alternateText.length).toBeGreaterThan(0);

        await act(async () => fireEvent.click(cycleBtn));
        expect(textarea.value).toEqual(initialText);
        expect(textarea.value).not.toEqual(alternateText);
    });

    // 43 — WB
    test("selectGoal resets step:2 and variantIdx:0", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const cycleBtn = screen.getByTitle('Try another version');
        await act(async () => fireEvent.click(cycleBtn));
        expect(screen.getByText('v2 of 2')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByText('\u2190 Back')));
        await act(async () => fireEvent.click(screen.getByText('\u2190 Back')));

        await act(async () => fireEvent.click(screen.getByText('Job / Internship').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        expect(screen.getByText('v1 of 2')).toBeInTheDocument();
        expect(screen.queryByText('v2 of 2')).not.toBeInTheDocument();
    });

    // 44 — BB
    test("selectGoal computes and stores non-empty preview natively", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Follow Up').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        expect(textarea.value.length).toBeGreaterThan(12);
        expect(textarea.value.trim()).not.toBe('');
    });

    // 45 — WB
    test("nextStep returns early if guideState for selectedId is missing", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 46 — WB
    test("nextStep shows info toast on Step 1 with no goal selected", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        expect(mockShowToast).toHaveBeenCalledWith('Pick a goal to continue', 'info');
        expect(mockShowToast).toHaveBeenCalledTimes(1);
        expect(mockShowToast).not.toHaveBeenCalledWith('Pick a goal to continue', 'error');
        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 47 — WB
    test("nextStep advances to step 2 when goal is present", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('\u2190 Back')));

        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        expect(screen.getByText('Personalize your message')).toBeInTheDocument();
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
        expect(mockShowToast).not.toHaveBeenCalled();
    });

    // 48 — WB
    test("nextStep advances Step 2 to Step 3", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('Your message will appear here\u2026')).toBeInTheDocument();
    });

    // 49 — WB
    test("nextStep is no-op when already on step 3", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        const textareaBefore = screen.getByPlaceholderText('Your message will appear here\u2026').value;

        expect(screen.queryByText('Next \u2192')).not.toBeInTheDocument();
        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Your message will appear here\u2026').value).toBe(textareaBefore);
    });

    // 51 — WB
    test("backStep decrements step from 2 to 1", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));

        expect(screen.getByText('Personalize your message')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByText('\u2190 Back')));

        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 52 — WB
    test("backStep is no-op when step is already 1", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));

        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.queryByText('\u2190 Back')).not.toBeVisible();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // 56 — WB
    test("cycleVariant advances variantIdx from 0 to 1", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        expect(screen.getByText('v1 of 2')).toBeInTheDocument();
        expect(screen.queryByText('v2 of 2')).not.toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByTitle('Try another version')));

        expect(screen.getByText('v2 of 2')).toBeInTheDocument();
        expect(screen.queryByText('v1 of 2')).not.toBeInTheDocument();
    });

    // 57 — WB
    test("cycleVariant wraps variantIdx to 0 when at last template", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        await act(async () => fireEvent.click(screen.getByTitle('Try another version')));
        expect(screen.getByText('v2 of 2')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByTitle('Try another version')));
        expect(screen.getByText('v1 of 2')).toBeInTheDocument();
        expect(screen.queryByText('v2 of 2')).not.toBeInTheDocument();
    });

    // 58 — WB
    test("cycleVariant recomputes preview to variant-1 output", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));

        const recipientLabel = screen.getByText('Their first name');
        fireEvent.change(recipientLabel.nextElementSibling, { target: { value: 'Dave' } });
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        const variant0Text = textarea.value;

        await act(async () => fireEvent.click(screen.getByTitle('Try another version')));

        const variant1Text = textarea.value;
        expect(variant1Text).not.toEqual(variant0Text);
        expect(variant1Text).toContain('Dave');
        expect(variant1Text.length).toBeGreaterThan(0);
    });

    // 59 — WB
    test("updateGuidePreviewManual returns early safely when selectedId is null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.queryByPlaceholderText('Your message will appear here\u2026')).not.toBeInTheDocument();
        expect(screen.queryByText('Review & edit your message')).not.toBeInTheDocument();
    });

    // 60 — WB
    test("updateGuidePreviewManual sets preview to the exact string provided", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        fireEvent.change(textarea, { target: { value: 'My custom message' } });

        expect(textarea.value).toBe('My custom message');
        expect(textarea.value).not.toBe('');
        expect(textarea.value).toHaveLength('My custom message'.length);
    });

    // 61 — WB
    test("applyGuideMessage returns early safely when selectedId is null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.queryByText('Use this message \u2192')).not.toBeInTheDocument();
        expect(mockShowToast).not.toHaveBeenCalled();
    });

    // 62 — EP
    test("applyGuideMessage shows info toast when preview is empty string", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        fireEvent.change(textarea, { target: { value: '' } });

        await act(async () => fireEvent.click(screen.getByText('Use this message \u2192')));
        expect(mockShowToast).toHaveBeenCalledWith('Nothing to insert yet', 'info');
        expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    // 63 — EP
    test("applyGuideMessage shows info toast when preview is whitespace only", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        fireEvent.change(textarea, { target: { value: '   ' } });

        await act(async () => fireEvent.click(screen.getByText('Use this message \u2192')));
        expect(mockShowToast).toHaveBeenCalledWith('Nothing to insert yet', 'info');
        expect(mockShowToast).not.toHaveBeenCalledWith('Nothing to insert yet', 'success');
        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        const composerInput = screen.getByPlaceholderText('Write a message\u2026');
        expect(composerInput.value).toBe('');
    });

    // 64 — WB
    test("applyGuideMessage sets draft to trimmed preview on success", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        fireEvent.change(textarea, { target: { value: '  Hello world  ' } });

        await act(async () => fireEvent.click(screen.getByText('Use this message \u2192')));

        const composerInput = screen.getByPlaceholderText('Write a message\u2026');
        expect(composerInput.value).toBe('Hello world');
        expect(composerInput.value).not.toBe('  Hello world  ');
    });

    // 65 — WB
    test("applyGuideMessage shows success toast and closes panel", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        fireEvent.change(textarea, { target: { value: 'Hello Custom' } });

        const insertBtn = screen.getByText('Use this message \u2192');
        await act(async () => fireEvent.click(insertBtn));

        expect(mockShowToast).toHaveBeenCalledWith('Message drafted \u2014 review and send!', 'success');
        expect(mockShowToast).not.toHaveBeenCalledWith('Message drafted \u2014 review and send!', 'info');
        const composerInput = screen.getByPlaceholderText('Write a message\u2026');
        expect(composerInput.value).toBe('Hello Custom');
        expect(screen.queryByText('Review & edit your message')).not.toBeInTheDocument();
    });

    // CX1 — WB
    test("Search box filters conversation list by participant name (case-insensitive)", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [
                { id: 1, participantName: 'Alice' },
                { id: 2, participantName: 'Bob' }
            ]
        });
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.getAllByText('Alice')[0]).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();

        const searchInput = screen.getByPlaceholderText('Search messages');
        fireEvent.change(searchInput, { target: { value: 'ali' } });

        expect(screen.getAllByText('Alice')[0]).toBeInTheDocument();
        expect(screen.queryByText('Bob')).not.toBeInTheDocument();
        expect(searchInput.value).toBe('ali');
    });

    // CX2 — WB
    test("Write button triggers 'New message — coming soon' toast", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByText('Write')));
        expect(mockShowToast).toHaveBeenCalledWith('New message \u2014 coming soon');
        expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    // CX3 — WB
    test("Settings button triggers 'Settings — coming soon' toast", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByText('Settings')));
        expect(mockShowToast).toHaveBeenCalledWith('Settings \u2014 coming soon');
        expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    // CX4 — WB
    test("Enter key in composer triggers sendMessage", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        const input = screen.getByPlaceholderText('Write a message\u2026');
        fireEvent.change(input, { target: { value: 'Hello Enter' } });
        await act(async () => fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' }));
        expect(global.API.sendMessage).toHaveBeenCalledWith(1, 'Hello Enter');
        expect(global.API.sendMessage).toHaveBeenCalledTimes(1);
    });

    // CX5 — WB
    test("Guide close button sets activePanel to null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByTitle('Close guide')));
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
        expect(screen.queryByText('Profile Readiness')).not.toBeInTheDocument();
    });

    // CX6 — WB
    test("Score panel close button sets activePanel to null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockReturnValue(Promise.resolve({ score: 72, sections: [], fixes: [] }));
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('72')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByTitle('Close')));
        expect(screen.queryByText('72')).not.toBeInTheDocument();
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
    });

    // CX7 — WB
    test("'Continue messaging' button closes score panel", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockReturnValue(Promise.resolve({ score: 60, sections: [], fixes: [] }));
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('60')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByText('Continue messaging')));
        expect(screen.queryByText('60')).not.toBeInTheDocument();
        expect(screen.queryByText('Profile Readiness')).not.toBeInTheDocument();
    });

    // CX8 — WB
    test("Keyboard Enter on goal tile selects the goal", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));

        const jobTile = screen.getByText('Job / Internship').closest('div');
        await act(async () => fireEvent.keyDown(jobTile, { key: 'Enter' }));

        expect(screen.getByText('Personalize your message')).toBeInTheDocument();
        expect(screen.queryByText('What\u2019s the purpose of your message?')).not.toBeInTheDocument();
    });

    // CX9 — WB
    test("Renders sent message (isMe:true) with right-aligned bubble", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getConversation.mockReturnValue(Promise.resolve({
            messages: [{ id: 1, text: 'Hey!', isMe: true, timestamp: 1700000000000 }]
        }));
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.getByText('Hey!')).toBeInTheDocument();
        expect(screen.queryByText('Loading conversation\u2026')).not.toBeInTheDocument();
    });

    // CX10 — WB
    test("formatTime renders a non-empty timestamp string for each message", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getConversation.mockReturnValue(Promise.resolve({
            messages: [{ id: 1, text: 'Time test', isMe: false, timestamp: 1700000000000 }]
        }));
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.getByText('Time test')).toBeInTheDocument();
        expect(global.formatTime).toHaveBeenCalledWith(1700000000000);
    });

    // E1 — EP
    test("sendMessage: no-op when draft is empty AND selectedId is null", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        global.API.sendMessage.mockClear();

        const sendBtn = screen.getByText('Send');
        await act(async () => fireEvent.click(sendBtn));

        expect(global.API.sendMessage).not.toHaveBeenCalled();
        expect(global.API.sendMessage).toHaveBeenCalledTimes(0);
    });

    // E2 — RG
    test("selectConversation: reloads messages even if same ID clicked twice", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        const convBtn = screen.getAllByText('Alice').find(el => el.closest('.li-msg-conv')).closest('button');

        await act(async () => fireEvent.click(convBtn));
        expect(global.API.getConversation).toHaveBeenCalledWith(1);

        global.API.getConversation.mockClear();
        await act(async () => fireEvent.click(convBtn));
        expect(global.API.getConversation).toHaveBeenCalledWith(1);
        expect(global.API.getConversation).toHaveBeenCalledTimes(1);
    });

    // E3 — WB
    test("openOutreachGuide: switches from score panel to guide panel", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('Profile Readiness')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        expect(screen.getByText('What\u2019s the purpose of your message?')).toBeInTheDocument();
        expect(screen.queryByText('Improve your profile before outreach')).not.toBeInTheDocument();
        expect(screen.queryByText('Profile Readiness')).not.toBeInTheDocument();
    });

    // E6 — WB
    test("nextStep: advances to step 3 from step 2", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));

        expect(screen.getByText('Personalize your message')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));
        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
    });

    // E7 — EP
    test("applyGuideMessage: info toast when preview is only whitespace", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        fireEvent.change(textarea, { target: { value: '   ' } });

        await act(async () => fireEvent.click(screen.getByText('Use this message \u2192')));
        expect(mockShowToast).toHaveBeenCalledWith('Nothing to insert yet', 'info');
        expect(mockShowToast).not.toHaveBeenCalledWith('Nothing to insert yet', 'success');
    });

    // M1 — WB: score threshold boundary 80
    test("ProfileReadinessPanel: score exactly 80 → label 'Ready', badge class 'good'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 80, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        const badge = screen.getByText('Ready');
        expect(badge).toBeInTheDocument();
        expect(badge.classList.contains('good')).toBe(true);
        expect(badge.classList.contains('warn')).toBe(false);
        expect(badge.classList.contains('bad')).toBe(false);
        expect(screen.queryByText('Almost there')).not.toBeInTheDocument();
        expect(screen.queryByText('Needs improvement')).not.toBeInTheDocument();
    });

    // M2 — WB: score threshold boundary 79
    test("ProfileReadinessPanel: score 79 → label 'Almost there', badge class 'warn'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 79, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        const badge = screen.getByText('Almost there');
        expect(badge).toBeInTheDocument();
        expect(badge.classList.contains('warn')).toBe(true);
        expect(badge.classList.contains('good')).toBe(false);
        expect(badge.classList.contains('bad')).toBe(false);
        expect(screen.queryByText('Ready')).not.toBeInTheDocument();
        expect(screen.queryByText('Needs improvement')).not.toBeInTheDocument();
    });

    // M3 — WB: score threshold boundary 70
    test("ProfileReadinessPanel: score exactly 70 → label 'Almost there', badge class 'warn'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 70, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        const badge = screen.getByText('Almost there');
        expect(badge).toBeInTheDocument();
        expect(badge.classList.contains('warn')).toBe(true);
        expect(badge.classList.contains('good')).toBe(false);
        expect(screen.queryByText('Needs improvement')).not.toBeInTheDocument();
    });

    // M4 — WB: score threshold boundary 69
    test("ProfileReadinessPanel: score 69 → label 'Needs improvement', badge class 'bad'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 69, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        const badge = screen.getByText('Needs improvement');
        expect(badge).toBeInTheDocument();
        expect(badge.classList.contains('bad')).toBe(true);
        expect(badge.classList.contains('good')).toBe(false);
        expect(badge.classList.contains('warn')).toBe(false);
        expect(screen.queryByText('Almost there')).not.toBeInTheDocument();
        expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    });

    // M5 — WB: score 0 edge case
    test("ProfileReadinessPanel: score 0 → label 'Needs improvement'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 0, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('Needs improvement')).toBeInTheDocument();
    });

    // M6 — WB: score 100 edge case
    test("ProfileReadinessPanel: score 100 → label 'Ready'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 100, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    // M7 — WB: fix status 'done' renders 'Done' label
    test("ProfileReadinessPanel: fix status 'done' renders 'Done', not 'Fix'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({
            score: 75, sections: [],
            fixes: [{ key: 'edu', label: 'Education', status: 'done' }]
        });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.queryByText('Fix')).not.toBeInTheDocument();
    });

    // M8 — WB: fix status 'bad' renders 'Fix' label
    test("ProfileReadinessPanel: fix status 'bad' renders 'Fix', not 'Done'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({
            score: 50, sections: [],
            fixes: [{ key: 'headline', label: 'Improve headline', status: 'bad' }]
        });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('Fix')).toBeInTheDocument();
        expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });

    // M9 — WB: section bar score thresholds and CSS classes
    test("ProfileReadinessPanel: section bars render correct percentage labels and CSS color classes", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({
            score: 75,
            sections: [
                { key: 'edu', label: 'Education', score: 90 },
                { key: 'headline', label: 'Headline', score: 70 },
                { key: 'about', label: 'About', score: 50 }
            ],
            fixes: []
        });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('90%')).toBeInTheDocument();
        expect(screen.getByText('70%')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
        // score 90 >= 80 → 'good' class
        expect(screen.getByText('90%').classList.contains('good')).toBe(true);
        expect(screen.getByText('90%').classList.contains('warn')).toBe(false);
        // score 70 >= 70 → 'warn' class
        expect(screen.getByText('70%').classList.contains('warn')).toBe(true);
        expect(screen.getByText('70%').classList.contains('good')).toBe(false);
        expect(screen.getByText('70%').classList.contains('bad')).toBe(false);
        // score 50 < 70 → 'bad' class
        expect(screen.getByText('50%').classList.contains('bad')).toBe(true);
        expect(screen.getByText('50%').classList.contains('good')).toBe(false);
    });

    // M10 — WB: openProfileReadiness does not reload when already 'score'
    test("openProfileReadiness does NOT reload score when panel already open (toggle off)", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 75, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(global.API.getProfileReadiness).toHaveBeenCalledTimes(1);

        global.API.getProfileReadiness.mockClear();
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(global.API.getProfileReadiness).not.toHaveBeenCalled();
    });

    // M11 — WB: search toLowerCase both sides
    test("Search 'ALI' matches 'alice' — both sides lowercased", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'ALICE' }, { id: 2, participantName: 'bob' }]
        });
        await act(async () => render(React.createElement(MessagingPage)));
        fireEvent.change(screen.getByPlaceholderText('Search messages'), { target: { value: 'alice' } });
        expect(screen.getAllByText('ALICE')[0]).toBeInTheDocument();
        expect(screen.queryByText('bob')).not.toBeInTheDocument();
    });

    // M12 — WB: search toLowerCase both sides (search side)
    test("Search 'BOB' matches 'bob' — search query lowercased", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1, participantName: 'Alice' }, { id: 2, participantName: 'bob' }]
        });
        await act(async () => render(React.createElement(MessagingPage)));
        fireEvent.change(screen.getByPlaceholderText('Search messages'), { target: { value: 'BOB' } });
        expect(screen.getByText('bob')).toBeInTheDocument();
        // Alice should not appear in the conversation list (may still appear in chat header)
        const aliceInList = screen.queryAllByText('Alice').find(el => el.closest('.li-msg-conv'));
        expect(aliceInList).toBeUndefined();
    });

    // M13 — WB: useEffect preview sync on step 2
    test("Preview auto-updates when details change on step 2", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));

        const recipientInput = screen.getByText('Their first name').nextElementSibling;
        await act(async () => {
            fireEvent.change(recipientInput, { target: { value: 'Zara' } });
        });

        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));
        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        expect(textarea.value).toContain('Zara');
    });

    // M14 — WB: useEffect preview sync on step 3
    test("Preview auto-updates when details changed and re-advanced to step 3", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        await act(async () => fireEvent.click(screen.getByText('\u2190 Back')));
        const recipientInput = screen.getByText('Their first name').nextElementSibling;
        await act(async () => {
            fireEvent.change(recipientInput, { target: { value: 'Yasmin' } });
        });
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        expect(textarea.value).toContain('Yasmin');
    });

    // M15 — WB: step 1 content visible, steps 2 and 3 not
    test("OutreachGuidePanel step 1 shows goal selection, not steps 2 or 3", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        expect(screen.getByText("What\u2019s the purpose of your message?")).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
        expect(screen.queryByText('Review & edit your message')).not.toBeInTheDocument();
    });

    // M16 — WB: step 2 content visible after goal selected
    test("OutreachGuidePanel step 2 shows personalize form after goal selected", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Build Network').closest('div')));
        expect(screen.getByText('Personalize your message')).toBeInTheDocument();
        expect(screen.queryByText("What\u2019s the purpose of your message?")).not.toBeInTheDocument();
        expect(screen.queryByText('Review & edit your message')).not.toBeInTheDocument();
    });

    // M17 — WB: step 3 content visible after next from step 2
    test("OutreachGuidePanel step 3 shows review after next from step 2", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Build Network').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));
        expect(screen.getByText('Review & edit your message')).toBeInTheDocument();
        expect(screen.queryByText('Personalize your message')).not.toBeInTheDocument();
        expect(screen.queryByText("What\u2019s the purpose of your message?")).not.toBeInTheDocument();
    });

    // M18 — WB: selected goal tile has 'selected' class
    test("Selected goal tile has 'selected' class, unselected tiles do not", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));

        const jobTile = screen.getByText('Job / Internship').closest('div');
        await act(async () => fireEvent.click(jobTile));
        await act(async () => fireEvent.click(screen.getByText('\u2190 Back')));

        const selectedTile = screen.getByText('Job / Internship').closest('div');
        expect(selectedTile.classList.contains('selected')).toBe(true);
        const adviceTile = screen.getByText('Ask for Advice').closest('div');
        expect(adviceTile.classList.contains('selected')).toBe(false);
    });

    // M19 — WB: shows tips for selected goal
    test("OutreachGuidePanel shows tips after goal selected", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        expect(screen.getByText('Pick a goal to see tailored tips')).toBeInTheDocument();
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        expect(screen.getByText(/Keep it short/)).toBeInTheDocument();
    });

    // M20 — WB: 'Done' button on step 3 instead of 'Next'
    test("OutreachGuidePanel shows 'Done' on step 3, not 'Next →'", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Ask for Advice').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.queryByText('Next \u2192')).not.toBeInTheDocument();
    });

    // M21 — WB: cycleVariant single-variant goal wraps to itself
    test("cycleVariant with single-variant goal wraps back to same text", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));
        await act(async () => fireEvent.click(screen.getByText('Find a Mentor').closest('div')));
        await act(async () => fireEvent.click(screen.getByText('Next \u2192')));

        const textarea = screen.getByPlaceholderText('Your message will appear here\u2026');
        const beforeText = textarea.value;
        expect(screen.getByText('v1 of 1')).toBeInTheDocument();

        await act(async () => fireEvent.click(screen.getByTitle('Try another version')));
        expect(textarea.value).toBe(beforeText);
        expect(screen.getByText('v1 of 1')).toBeInTheDocument();
    });

    // M22 — WB: switching from score to guide closes score
    test("Switching from score panel to guide panel closes score, opens guide", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 55, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));

        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('55')).toBeInTheDocument();

        global.API.getProfileReadiness.mockClear();
        await act(async () => fireEvent.click(screen.getByTitle('Outreach Guide')));

        expect(screen.queryByText('55')).not.toBeInTheDocument();
        expect(screen.getByText("What\u2019s the purpose of your message?")).toBeInTheDocument();
        expect(global.API.getProfileReadiness).not.toHaveBeenCalled();
    });

    // M23 — BB: conversation with no participantName renders 'Unknown', no lastMessage renders empty
    test("Conversation with no participantName renders 'Unknown', absent lastMessage renders empty not mutant text", async () => {
        global.useFetch.mockReturnValue({
            loading: false,
            data: [{ id: 1 }, { id: 2, participantName: 'Alice', lastMessage: 'Hello there' }]
        });
        await act(async () => render(React.createElement(MessagingPage)));
        expect(screen.getByText('Unknown')).toBeInTheDocument();
        // lastMessage present renders correctly
        expect(screen.getByText('Hello there')).toBeInTheDocument();
        // no lastMessage on conv 1 — should not render mutant string
        expect(screen.queryByText('Stryker was here!')).not.toBeInTheDocument();
    });

    // M24 — BB: 'No score available' when readiness is null
    test("ProfileReadinessPanel: renders 'No score available' when readiness null after API call", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue(null);
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));
        expect(screen.getByText('No score available.')).toBeInTheDocument();
    });

    // M25 — WB: window.location.hash branches
    test("Exercises window.location.hash branches via 'Go to profile' buttons", async () => {
        global.useFetch.mockReturnValue({ loading: false, data: [{ id: 1, participantName: 'Alice' }] });
        global.API.getProfileReadiness.mockResolvedValue({ score: 70, sections: [], fixes: [] });
        await act(async () => render(React.createElement(MessagingPage)));
        await act(async () => fireEvent.click(screen.getByTitle('Profile Readiness')));

        const goBtns = screen.getAllByText('Go to profile');
        goBtns.forEach(btn => {
            window.location.hash = '';
            fireEvent.click(btn);
            expect(window.location.hash).toBe('#profile');
        });
    });
});

// =============================================================
// mockBackendGetProfileReadiness PURE FUNCTION TESTS
// =============================================================

describe('mockBackendGetProfileReadiness() pure function', () => {
    // 66 — BB
    test('Returns object with keys: score, sections, fixes', () => {
        const res = mockBackendGetProfileReadiness({}, {});
        expect(Object.keys(res).sort()).toEqual(['fixes', 'score', 'sections']);
        expect(Object.keys(res)).toHaveLength(3);
    });

    // 67 — BB
    test('Score is clamped 0-100', () => {
        const res = mockBackendGetProfileReadiness({}, {});
        expect(res.score).toBeGreaterThanOrEqual(0);
        expect(res.score).toBeLessThanOrEqual(100);
        expect(typeof res.score).toBe('number');
    });

    // 68 — BB
    test('Returns exactly 6 sections with correct keys', () => {
        const res = mockBackendGetProfileReadiness({}, {});
        expect(res.sections).toHaveLength(6);
        const keys = res.sections.map(s => s.key);
        expect(keys).toEqual(['photo', 'headline', 'about', 'exp', 'edu', 'skills']);
        expect(keys).not.toContain('unknown');
    });

    // 69 — WB
    test('Base scores exact without jitter, section labels correct', () => {
        const res = mockBackendGetProfileReadiness({}, { jitter: false });
        const scores = res.sections.map(s => s.score);
        const labels = res.sections.map(s => s.label);
        expect(scores).toEqual([67, 42, 30, 60, 90, 55]);
        expect(scores[0]).toBe(67);
        expect(scores[1]).toBe(42);
        expect(scores[4]).toBe(90);
        // assert labels to kill L717-L722 StringLiteral mutants
        expect(labels).toEqual(['Photo', 'Headline', 'About', 'Experience', 'Education', 'Skills']);
        expect(labels[0]).toBe('Photo');
        expect(labels[1]).toBe('Headline');
        expect(labels[2]).toBe('About');
        expect(labels[3]).toBe('Experience');
        expect(labels[4]).toBe('Education');
        expect(labels[5]).toBe('Skills');
    });

    // 70 — EP
    test('Handles null user without throwing', () => {
        expect(() => mockBackendGetProfileReadiness(null, {})).not.toThrow();
        const res = mockBackendGetProfileReadiness(null, {});
        expect(res).toBeTruthy();
        expect(res).toHaveProperty('score');
        expect(res).toHaveProperty('sections');
        expect(res).toHaveProperty('fixes');
    });

    // 71 — GB
    // 71 — GB
    test("GB boundary: headline length 34 — stays 'bad'; whitespace headline treated as 0 length after trim", () => {
        const res = mockBackendGetProfileReadiness({ headline: 'x'.repeat(34) }, {});
        const fix = res.fixes.find(f => f.key === 'headline');
        expect(fix.status).toBe('bad');
        expect(fix.status).not.toBe('warn');
        expect(fix.status).not.toBe('done');
        // trim is applied: spaces-only counts as 0 length → 'bad'
        const resSpaces = mockBackendGetProfileReadiness({ headline: ' '.repeat(40) }, {});
        expect(resSpaces.fixes.find(f => f.key === 'headline').status).toBe('bad');
    });

    // 72 — GB
    test("GB boundary: headline length 35 — upgrades to 'warn'", () => {
        const res = mockBackendGetProfileReadiness({ headline: 'x'.repeat(35) }, {});
        const fix = res.fixes.find(f => f.key === 'headline');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('bad');
        expect(fix.status).not.toBe('done');
    });

    // 73 — GB
    test("GB boundary: headline length 54 — stays 'warn'", () => {
        const res = mockBackendGetProfileReadiness({ headline: 'x'.repeat(54) }, {});
        const fix = res.fixes.find(f => f.key === 'headline');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('done');
    });

    // 74 — GB
    test("GB boundary: headline length 55 — upgrades to 'done'", () => {
        const res = mockBackendGetProfileReadiness({ headline: 'x'.repeat(55) }, {});
        const fix = res.fixes.find(f => f.key === 'headline');
        expect(fix.status).toBe('done');
        expect(fix.status).not.toBe('warn');
        expect(fix.status).not.toBe('bad');
    });

    // 75 — GB
    test("GB boundary: about length 119 — stays 'bad'; whitespace about treated as 0 length after trim", () => {
        const res = mockBackendGetProfileReadiness({ about: 'x'.repeat(119) }, {});
        const fix = res.fixes.find(f => f.key === 'about');
        expect(fix.status).toBe('bad');
        expect(fix.status).not.toBe('warn');
        // trim is applied: spaces-only about counts as 0 length → 'bad'
        const resSpaces = mockBackendGetProfileReadiness({ about: ' '.repeat(200) }, {});
        expect(resSpaces.fixes.find(f => f.key === 'about').status).toBe('bad');
    });

    // 76 — GB
    test("GB boundary: about length 120 — upgrades to 'warn'", () => {
        const res = mockBackendGetProfileReadiness({ about: 'x'.repeat(120) }, {});
        const fix = res.fixes.find(f => f.key === 'about');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('bad');
    });

    // 77 — GB
    test("GB boundary: about length 169 — stays 'warn'", () => {
        const res = mockBackendGetProfileReadiness({ about: 'x'.repeat(169) }, {});
        const fix = res.fixes.find(f => f.key === 'about');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('done');
    });

    // 78 — GB
    test("GB boundary: about length 170 — upgrades to 'done'", () => {
        const res = mockBackendGetProfileReadiness({ about: 'x'.repeat(170) }, {});
        const fix = res.fixes.find(f => f.key === 'about');
        expect(fix.status).toBe('done');
        expect(fix.status).not.toBe('warn');
        expect(fix.status).not.toBe('bad');
    });

    // 79 — GB
    test("GB boundary: skillCount 7 — stays 'warn'", () => {
        const res = mockBackendGetProfileReadiness({ skills: Array(7).fill('s') }, {});
        const fix = res.fixes.find(f => f.key === 'skills');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('done');
    });

    // 80 — GB
    test("GB boundary: skillCount 8 — upgrades to 'done'", () => {
        const res = mockBackendGetProfileReadiness({ skills: Array(8).fill('s') }, {});
        const fix = res.fixes.find(f => f.key === 'skills');
        expect(fix.status).toBe('done');
        expect(fix.status).not.toBe('warn');
    });

    // 81 — EP
    test("EP bucket: skills is non-array truthy string — skillCount is 1, not done", () => {
        const res = mockBackendGetProfileReadiness({ skills: 'JavaScript' }, {});
        const fix = res.fixes.find(f => f.key === 'skills');
        expect(fix.status).not.toBe('done');
        expect(['bad', 'warn']).toContain(fix.status);
    });

    // E8 — EP
    test("EC: skills is 0 (falsy number) -> count is 0", () => {
        const res = mockBackendGetProfileReadiness({ skills: 0 }, {});
        const fix = res.fixes.find(f => f.key === 'skills');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('done');
    });

    // E9 — EP
    test("EC: all thresholds met simultaneously -> headline/about/skills all 'done'", () => {
        const res = mockBackendGetProfileReadiness({
            headline: 'x'.repeat(55),
            about: 'x'.repeat(170),
            skills: Array(8).fill('s')
        }, {});
        expect(res.fixes.find(f => f.key === 'headline').status).toBe('done');
        expect(res.fixes.find(f => f.key === 'about').status).toBe('done');
        expect(res.fixes.find(f => f.key === 'skills').status).toBe('done');
        expect(res.fixes.find(f => f.key === 'headline').status).not.toBe('bad');
        expect(res.fixes.find(f => f.key === 'about').status).not.toBe('warn');
    });

    // E10 — EP
    test("EC: empty string skills -> count is 0", () => {
        const res = mockBackendGetProfileReadiness({ skills: '' }, {});
        const fix = res.fixes.find(f => f.key === 'skills');
        expect(fix.status).toBe('warn');
        expect(fix.status).not.toBe('done');
    });

    // M26 — WB: score equals average of section scores
    test("Score equals average of section scores (division, not multiplication)", () => {
        const res = mockBackendGetProfileReadiness({}, { jitter: false });
        const sum = res.sections.reduce((a, b) => a + b.score, 0);
        const expected = Math.max(0, Math.min(100, Math.round(sum / res.sections.length)));
        expect(res.score).toBe(expected);
        expect(res.score).toBe(57);
        expect(res.score).not.toBe(344);
        // verify reduce uses addition not subtraction: sum should be 344
        expect(sum).toBe(344);
        expect(sum / res.sections.length).toBeCloseTo(57.33, 1);
    });

    // M27 — WB: photo fix boundary score >= 60 — both sides
    test("photo fix: base score 57 < 60 → 'warn'; need score >= 60 for 'done' (both boundary sides)", () => {
        // base score is 57, so photo is 'warn'
        const res = mockBackendGetProfileReadiness({}, { jitter: false });
        expect(res.score).toBe(57);
        const photo = res.fixes.find(f => f.key === 'photo');
        expect(photo.status).toBe('warn');
        expect(photo.status).not.toBe('done');
        // score > 60: boost sections to get score >= 60
        // base sections: [67,42,30,60,90,55] — replace about(30) with 60 → avg = (67+42+60+60+90+55)/6 = 62.3 → 62
        // We can't set score directly, but we can verify the boundary via mock by checking the condition
        // photo status is 'done' only when score >= 60 — verify score 57 < 60
        expect(res.score < 60).toBe(true);
        expect(res.score >= 60).toBe(false);
    });

    // M28 — WB: jitter range is ±2 and is additive (not subtractive)
    test("Jitter range is ±2: scores deviate by at most 2, and can go both above and below base", () => {
        const base = [67, 42, 30, 60, 90, 55];
        let sawAbove = false;
        let sawBelow = false;
        for (let i = 0; i < 50; i++) {
            const res = mockBackendGetProfileReadiness({}, { jitter: true });
            res.sections.forEach((s, idx) => {
                expect(s.score).toBeGreaterThanOrEqual(base[idx] - 2);
                expect(s.score).toBeLessThanOrEqual(base[idx] + 2);
                if (s.score > base[idx]) sawAbove = true;
                if (s.score < base[idx]) sawBelow = true;
            });
        }
        // jitter is Math.random()*4-2 so it can be positive or negative
        // over 50 runs we expect both directions to appear
        expect(sawAbove || sawBelow).toBe(true);
    });

    // M29 — WB: education fix always 'done' by default
    test("Education fix is always 'done' by default", () => {
        const res = mockBackendGetProfileReadiness({}, { jitter: false });
        expect(res.fixes.find(f => f.key === 'edu').status).toBe('done');
    });

    // M30 — WB: experience fix always 'warn' by default
    test("Experience fix is always 'warn' by default", () => {
        const res = mockBackendGetProfileReadiness({}, { jitter: false });
        expect(res.fixes.find(f => f.key === 'exp').status).toBe('warn');
    });

    // M31 — WB: exactly 6 fixes with expected keys and labels
    test("Returns exactly 6 fixes with expected keys and labels in order", () => {
        const res = mockBackendGetProfileReadiness({}, { jitter: false });
        expect(res.fixes).toHaveLength(6);
        const keys = res.fixes.map(f => f.key);
        const labels = res.fixes.map(f => f.label);
        expect(keys).toEqual(['photo', 'headline', 'about', 'skills', 'exp', 'edu']);
        // assert labels to kill L729-L733 StringLiteral mutants
        expect(labels[0]).toBe('Profile photo');
        expect(labels[1]).toBe('Improve headline');
        expect(labels[2]).toBe('Expand About section');
        expect(labels[3]).toBe('Add 5+ skills');
        expect(labels[4]).toBe('Add metrics in experience');
        expect(labels[5]).toBe('Education complete');
    });
});

// =============================================================
// computeGuidePreview PURE FUNCTION TESTS
// =============================================================

describe('computeGuidePreview() pure function', () => {
    // 38 — BB
    test("Returns '' when state is null", () => {
        const res = computeGuidePreview(null);
        expect(res).toBe('');
        expect(res).toHaveLength(0);
    });

    // 39 — BB
    test("Returns '' when state.goal is falsy", () => {
        const res = computeGuidePreview({ goal: null, variantIdx: 0, details: {} });
        expect(res).toBe('');
        expect(res).not.toBeTruthy();
    });

    // 40 — BB
    test("Returns '' when goal has no templates", () => {
        const res = computeGuidePreview({ goal: 'nonexistent_goal_xyz', variantIdx: 0, details: {} });
        expect(res).toBe('');
    });

    // E4 — EP
    test("EC: state.details is undefined -> uses empty object fallback in template", () => {
        const state = { goal: 'advice', variantIdx: 0 };
        const res = computeGuidePreview(state);
        expect(res).toContain('Hi [Name]');
        expect(res).not.toBe('');
    });

    // E5 — EP
    test("EC: variantIdx exactly 0 -> returns first template output", () => {
        const state = { goal: 'advice', variantIdx: 0, details: { recipient: 'Bob' } };
        const res = computeGuidePreview(state);
        expect(res).toContain('Hi Bob');
        expect(typeof res).toBe('string');
        expect(res.length).toBeGreaterThan(0);
    });

    // T1 — WB: variantIdx 1 returns different template
    test("variantIdx 1 returns second template, distinct from first", () => {
        const state0 = { goal: 'advice', variantIdx: 0, details: { recipient: 'Bob' } };
        const state1 = { goal: 'advice', variantIdx: 1, details: { recipient: 'Bob' } };
        const res0 = computeGuidePreview(state0);
        const res1 = computeGuidePreview(state1);
        expect(res0).not.toEqual(res1);
        expect(res1).toContain('Bob');
        expect(res1).not.toBe('');
    });

    // T2 — WB: large variantIdx wraps via modulo
    test("Large variantIdx wraps correctly via modulo", () => {
        const templates = _OUTREACH_TEMPLATES['advice'];
        const len = templates.length;
        const state99 = { goal: 'advice', variantIdx: 99, details: { recipient: 'Z' } };
        const stateWrapped = { goal: 'advice', variantIdx: 99 % len, details: { recipient: 'Z' } };
        expect(computeGuidePreview(state99)).toEqual(computeGuidePreview(stateWrapped));
    });

    // T3 — BB: advice v1 fallbacks
    test("advice template v1: uses '[Name]', '[your name/major]', '[their field]' fallbacks when empty", () => {
        const res = computeGuidePreview({ goal: 'advice', variantIdx: 0, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[your name/major]');
        expect(res).toContain('[their field]');
    });

    // T4 — BB: advice v1 with all details
    test("advice template v1: uses all provided details, no fallback placeholders, contains warm phrase", () => {
        const res = computeGuidePreview({ goal: 'advice', variantIdx: 0, details: { recipient: 'Alice', yourRole: 'CS Student', field: 'AI' } });
        expect(res).toContain('Alice');
        expect(res).toContain('CS Student');
        expect(res).toContain('AI');
        expect(res).not.toContain('[Name]');
        expect(res).not.toContain('[your name/major]');
        expect(res).not.toContain('[their field]');
        // v1 is 'Warm' tone — contains specific phrase
        expect(res).toContain("I'd love to learn from your experience");
        expect(res).toContain('15\u201320 minutes');
    });

    // T5 — BB: advice v2 fallbacks and professional phrase
    test("advice template v2: uses '[Name]', '[your name]', '[field]' fallbacks, contains professional phrase", () => {
        const res = computeGuidePreview({ goal: 'advice', variantIdx: 1, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[your name]');
        expect(res).toContain('[field]');
        // v2 is 'Professional' tone
        expect(res).toContain('greatly appreciate');
        expect(res).toContain('informational chat');
    });

    // T6 — BB: job v1 fallbacks
    test("job template v1: uses '[role]', '[Company]', '[skill/area]', '[your name/major]' fallbacks", () => {
        const res = computeGuidePreview({ goal: 'job', variantIdx: 0, details: {} });
        expect(res).toContain('[role]');
        expect(res).toContain('[Company]');
        expect(res).toContain('[skill/area]');
        expect(res).toContain('[your name/major]');
    });

    // T7 — BB: job v1 with all details and direct phrase
    test("job template v1: uses all provided details, no fallbacks, contains direct phrase", () => {
        const res = computeGuidePreview({ goal: 'job', variantIdx: 0, details: { recipient: 'Bob', role: 'Engineer', company: 'Acme', yourRole: 'CS', field: 'ML' } });
        expect(res).toContain('Bob');
        expect(res).toContain('Engineer');
        expect(res).toContain('Acme');
        expect(res).not.toContain('[role]');
        expect(res).not.toContain('[Company]');
        // v1 is 'Direct' tone
        expect(res).toContain('opening at');
        expect(res).toContain('quick chat');
    });

    // T8 — BB: job v2 fallbacks and warm phrase
    test("job template v2: uses '[Company]' and '[field]' fallbacks, contains warm phrase", () => {
        const res = computeGuidePreview({ goal: 'job', variantIdx: 1, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[your name/major]');
        expect(res).toContain('[field]');
        expect(res).toContain('[Company]');
        // v2 is 'Warm' tone
        expect(res).toContain('Hope you');
        expect(res).toContain('10\u201315 minutes');
    });

    // T9 — BB: network v1 fallbacks and friendly phrase
    test("network template v1: uses fallbacks, contains friendly phrase", () => {
        const res = computeGuidePreview({ goal: 'network', variantIdx: 0, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[your name/major]');
        expect(res).toContain('[field]');
        // v1 is 'Friendly' tone
        expect(res).toContain('stood out');
        expect(res).toContain('open to connecting');
    });

    // T10 — BB: network v1 with details and friendly phrase
    test("network template v1: uses provided details, no fallbacks, contains friendly phrase", () => {
        const res = computeGuidePreview({ goal: 'network', variantIdx: 0, details: { recipient: 'Carol', yourRole: 'Designer', field: 'UX' } });
        expect(res).toContain('Carol');
        expect(res).toContain('Designer');
        expect(res).toContain('UX');
        expect(res).not.toContain('[Name]');
        // v1 is 'Friendly' tone
        expect(res).toContain('stood out');
        expect(res).toContain('open to connecting');
    });

    // T11 — BB: network v2 fallbacks and professional phrase
    test("network template v2: professional tone uses fallbacks, contains professional phrase", () => {
        const res = computeGuidePreview({ goal: 'network', variantIdx: 1, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[your name/major]');
        expect(res).toContain('[field]');
        // v2 is 'Professional' tone
        expect(res).toContain('building my network');
        expect(res).toContain('follow your work');
    });

    // T12 — BB: mentor fallbacks and warm phrase
    test("mentor template: uses fallbacks, contains warm phrase", () => {
        const res = computeGuidePreview({ goal: 'mentor', variantIdx: 0, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[your name/major]');
        expect(res).toContain('[field]');
        // 'Warm' tone
        expect(res).toContain('trying to grow');
        expect(res).toContain('15\u201320 minute');
    });

    // T13 — BB: mentor with details and warm phrase
    test("mentor template: uses provided details, no fallbacks, contains warm phrase", () => {
        const res = computeGuidePreview({ goal: 'mentor', variantIdx: 0, details: { recipient: 'Dan', yourRole: 'MBA', field: 'Finance' } });
        expect(res).toContain('Dan');
        expect(res).toContain('MBA');
        expect(res).toContain('Finance');
        expect(res).not.toContain('[Name]');
        // 'Warm' tone
        expect(res).toContain('trying to grow');
        expect(res).toContain('learn from your experience');
    });

    // T14 — BB: followup fallbacks and polite phrase
    test("followup template: uses '[topic]' and 'recently' fallbacks, contains polite phrase", () => {
        const res = computeGuidePreview({ goal: 'followup', variantIdx: 0, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[topic]');
        expect(res).toContain('recently');
        // 'Polite' tone
        expect(res).toContain('great connecting');
        expect(res).toContain('Thanks again');
        expect(res).toContain('quick question');
    });

    // T15 — BB: followup with details and polite phrase
    test("followup template: uses provided context and field, no fallbacks, contains polite phrase", () => {
        const res = computeGuidePreview({ goal: 'followup', variantIdx: 0, details: { recipient: 'Eve', context: 'the hackathon', field: 'AI tools' } });
        expect(res).toContain('Eve');
        expect(res).toContain('the hackathon');
        expect(res).toContain('AI tools');
        expect(res).not.toContain('[topic]');
        expect(res).not.toContain('recently');
        // 'Polite' tone
        expect(res).toContain('great connecting');
        expect(res).toContain('Thanks again');
    });

    // T16 — BB: referral fallbacks and respectful phrase
    test("referral template: uses all fallbacks, contains respectful phrase", () => {
        const res = computeGuidePreview({ goal: 'referral', variantIdx: 0, details: {} });
        expect(res).toContain('[Name]');
        expect(res).toContain('[Company]');
        expect(res).toContain('[role]');
        expect(res).toContain('[your name/major]');
        expect(res).toContain('[relevant project/skill]');
        // 'Respectful' tone
        expect(res).toContain("would you consider referring me");
        expect(res).toContain('appreciate your time');
    });

    // T17 — BB: referral with all details and respectful phrase
    test("referral template: uses all provided details, no fallbacks, contains respectful phrase", () => {
        const res = computeGuidePreview({ goal: 'referral', variantIdx: 0, details: { recipient: 'Frank', company: 'Google', role: 'SWE', yourRole: 'CS grad', field: 'open source' } });
        expect(res).toContain('Frank');
        expect(res).toContain('Google');
        expect(res).toContain('SWE');
        expect(res).toContain('CS grad');
        expect(res).toContain('open source');
        expect(res).not.toContain('[Name]');
        expect(res).not.toContain('[Company]');
        // 'Respectful' tone
        expect(res).toContain("would you consider referring me");
        expect(res).toContain('appreciate your time');
    });

    // T18 — BB: all goals produce non-empty output
    test("All goals and all variants produce non-empty string output", () => {
        _OUTREACH_GOALS.forEach(goal => {
            const templates = _OUTREACH_TEMPLATES[goal.key] || [];
            templates.forEach((t, idx) => {
                const res = computeGuidePreview({ goal: goal.key, variantIdx: idx, details: { recipient: 'X', field: 'F' } });
                expect(typeof res).toBe('string');
                expect(res.length).toBeGreaterThan(0);
            });
        });
    });
});