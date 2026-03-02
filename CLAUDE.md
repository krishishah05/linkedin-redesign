# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A LinkedIn clone SPA (Single Page Application) built with vanilla JavaScript, HTML5, and CSS3. No build tools, no package manager, no external dependencies. This is a CS485 class project.
22
## Running the App

- Open `index.html` in a browser to start at the login/signup page
- Open `app.html` directly to access the main application
- No server, build step, or npm install required

## Architecture

### Entry Points
- **`index.html`** — Auth UI: login, forgot password, and a 9-step signup wizard
- **`app.html`** — Main SPA shell with all page content and modal dialogs

### Core Files
- **`js/data.js`** — All mock data: current user profile, users array (21 users), companies array (10), and posts array. Acts as the simulated data layer.
- **`js/app.js`** — All application logic: routing, state management, page renderers, event handlers, and modal controllers (~1,800 lines)
- **`css/style.css`** — Complete stylesheet with CSS custom properties design system (~2,500 lines)

### Routing
Client-side routing via `window.location.hash` (e.g., `#feed`, `#profile`, `#network`, `#jobs`, `#messaging`, `#notifications`). A `hashchange` event listener dispatches to page renderer functions.

### State Management
A single global `App` object holds all state in `App.state` (current page, liked posts, saved jobs, connections, notifications, etc.). State is mutated directly; pages re-render from state on navigation.

### Data Flow
`data.js` → `App.state` (on init) → event handlers mutate state → page renderers read state and update the DOM.

## CSS Design System

All design tokens are CSS variables on `:root`:
- Primary blue: `--color-primary` (`#0A66C2`)
- Layout columns: 225px left sidebar, 554px center, 300px right sidebar
- Responsive breakpoints: 900px (tablet), 600px (mobile)
- Mobile gets a bottom nav bar; desktop uses the top nav

## Key Patterns

- **Avatars** — Generated as inline SVGs via `generateAvatar()` using `getInitials()` and `getAvatarColor()` (hash-based color)
- **Modals** — Opened/closed via `openModal(id)` / `closeModal(id)`; modal HTML lives in `app.html`
- **XSS prevention** — Use `escapeHtml()` when inserting user-provided content into the DOM
- **Toast notifications** — `createToast(message, type)` for user feedback

## Lessons Learned

### Development Patterns
- **Issue**: [Brief description of what went wrong]
  - **Root cause**: [Why it happened]
  - **Solution**: [What fixed it]
  - **Prevention**: [How to avoid repeating]

### Performance Gotchas
- [Add specific performance lessons as they're discovered]

### Browser Compatibility Notes
- [Add cross-browser issues encountered]