// =============================================================
// ArticlePage.test.js
// Unit tests for ArticlePage.js — CS485 AI-Assisted Software Engineering
// =============================================================

const React = require('react');
const { render, screen, act, fireEvent, cleanup } = require('@testing-library/react');
require('@testing-library/jest-dom');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// =============================================================
// GLOBALS
// =============================================================

const mockShowToast = jest.fn();

global.React = React;
global.AppContext = React.createContext({});
global.navigate = jest.fn();
global.Avatar = ({ name }) => React.createElement('div', { 'data-testid': 'avatar' }, name);

// Load ArticlePage into scope
const fileContent = fs.readFileSync(
  path.resolve(__dirname, '../../../js/components/pages/ArticlePage.js'),
  'utf8'
);
const transformed = babel.transformSync(fileContent, {
  filename: 'ArticlePage.js',
  presets: ['@babel/preset-react', '@babel/preset-env'],
}).code;

// eslint-disable-next-line no-new-func
new Function('global', transformed + '\nglobal.ArticlePage = ArticlePage;')(global);

// =============================================================
// HELPERS
// =============================================================

const DEFAULT_CTX = {
  currentUser: { name: 'Test User', avatarColor: '#abc' },
  showToast: mockShowToast,
};

function renderArticlePage(ctxOverrides = {}) {
  const ctx = { ...DEFAULT_CTX, ...ctxOverrides };
  return render(
    React.createElement(
      AppContext.Provider,
      { value: ctx },
      React.createElement(global.ArticlePage)
    )
  );
}

// =============================================================
// TESTS
// =============================================================

beforeEach(() => {
  jest.clearAllMocks();
  cleanup();
});

describe('ArticlePage — initial state', () => {
  test('renders the Publish button in disabled state when inputs are empty', () => {
    renderArticlePage();
    const publishBtns = screen.getAllByRole('button', { name: /publish/i });
    publishBtns.forEach(btn => expect(btn).toBeDisabled());
  });

  test('renders Back button', () => {
    renderArticlePage();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  test('renders Save draft button', () => {
    renderArticlePage();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });
});

describe('ArticlePage — publish button disabled state', () => {
  test('Publish button stays disabled when only body is filled (no title)', () => {
    renderArticlePage();
    const bodyArea = screen.getByPlaceholderText(/write your article/i);
    fireEvent.change(bodyArea, { target: { value: 'Some body text' } });

    const publishBtns = screen.getAllByRole('button', { name: /publish/i });
    publishBtns.forEach(btn => expect(btn).toBeDisabled());
  });

  test('Publish button stays disabled when only title is filled (no body)', () => {
    renderArticlePage();
    const titleArea = screen.getByPlaceholderText(/headline/i);
    fireEvent.change(titleArea, { target: { value: 'My Title' } });

    const publishBtns = screen.getAllByRole('button', { name: /publish/i });
    publishBtns.forEach(btn => expect(btn).toBeDisabled());
  });
});

describe('ArticlePage — Publish enabled + success flow', () => {
  test('Publish button becomes enabled when both title and body are filled', () => {
    renderArticlePage();
    const titleArea = screen.getByPlaceholderText(/headline/i);
    const bodyArea  = screen.getByPlaceholderText(/write your article/i);

    fireEvent.change(titleArea, { target: { value: 'My Article Title' } });
    fireEvent.change(bodyArea,  { target: { value: 'Article body content here.' } });

    const publishBtns = screen.getAllByRole('button', { name: /publish/i });
    publishBtns.forEach(btn => expect(btn).not.toBeDisabled());
  });

  test('clicking Publish shows success toast and switches to published confirmation UI', () => {
    renderArticlePage();
    const titleArea = screen.getByPlaceholderText(/headline/i);
    const bodyArea  = screen.getByPlaceholderText(/write your article/i);

    fireEvent.change(titleArea, { target: { value: 'My Article Title' } });
    fireEvent.change(bodyArea,  { target: { value: 'Article body here.' } });

    const publishBtn = screen.getAllByRole('button', { name: /publish/i })[0];
    fireEvent.click(publishBtn);

    expect(mockShowToast).toHaveBeenCalledWith('Article published!', 'success');
    expect(screen.getByText(/article published!/i)).toBeInTheDocument();
    expect(screen.getByText(/My Article Title/)).toBeInTheDocument();
  });
});

describe('ArticlePage — published confirmation UI', () => {
  function publishArticle() {
    renderArticlePage();
    fireEvent.change(screen.getByPlaceholderText(/headline/i),        { target: { value: 'Test Title' } });
    fireEvent.change(screen.getByPlaceholderText(/write your article/i), { target: { value: 'Body text.' } });
    fireEvent.click(screen.getAllByRole('button', { name: /publish/i })[0]);
  }

  test('shows "Write another" and "Back to feed" buttons after publish', () => {
    publishArticle();
    expect(screen.getByRole('button', { name: /write another/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to feed/i })).toBeInTheDocument();
  });

  test('"Write another" resets the form back to the editor', () => {
    publishArticle();
    fireEvent.click(screen.getByRole('button', { name: /write another/i }));
    expect(screen.getByPlaceholderText(/headline/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/write your article/i)).toBeInTheDocument();
  });

  test('"Back to feed" navigates to feed', () => {
    publishArticle();
    fireEvent.click(screen.getByRole('button', { name: /back to feed/i }));
    expect(global.navigate).toHaveBeenCalledWith('feed');
  });
});

describe('ArticlePage — navigation', () => {
  test('Back button navigates to feed', () => {
    renderArticlePage();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(global.navigate).toHaveBeenCalledWith('feed');
  });

  test('Save draft button shows success toast', () => {
    renderArticlePage();
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    expect(mockShowToast).toHaveBeenCalledWith('Draft saved', 'success');
  });
});
