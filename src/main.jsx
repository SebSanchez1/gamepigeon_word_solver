// This is the entry point of the React app. Vite loads this file first
// (see the <script> tag in index.html), and it's responsible for
// mounting our React component tree onto the actual DOM.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// index.html has a single <div id="root"></div>.
// createRoot() tells React "this is the DOM element you control,"
// and .render() draws our <App /> component (and everything inside it) into it.
createRoot(document.getElementById('root')).render(
  // StrictMode doesn't render any visible UI. It's a development-only
  // helper that makes React double-invoke certain functions to help
  // surface bugs (like side effects that aren't cleaned up properly).
  <StrictMode>
    <App />
  </StrictMode>,
)
