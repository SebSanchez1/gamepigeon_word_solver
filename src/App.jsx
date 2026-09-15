import { useRef, useState } from 'react'

// Describes the 3 tabs: a unique "id" (used internally to track which is
// active) and a "label" (the text actually shown on screen).
const TABS = [
  { id: 'wordhunt', label: 'Word Hunt' },
  { id: 'temp1', label: 'Temp' },
  { id: 'temp2', label: 'Temp' },
]

// A reusable "16 slots" array for the tiny 4x4 grid icon shown next to each
// found word. Defined once out here (not inside App) since it never
// changes — no reason to recreate it on every render of every word.
const MINI_GRID_CELLS = Array.from({ length: 16 })

// These two numbers must match the CSS: .mini-tile is 8px square, .mini-grid
// has an 8px gap between tiles. Keeping them here as named constants (instead
// of "magic numbers" scattered in the math below) means if the CSS size ever
// changes, there's one obvious place to update the matching JS math too.
const MINI_TILE_SIZE = 8
const MINI_TILE_GAP = 2
// How far apart two tile centers are, center-to-center: one tile's width
// plus one gap.
const MINI_TILE_STEP = MINI_TILE_SIZE + MINI_TILE_GAP

// Converts a flat 0-15 grid index into the pixel (x, y) coordinates of that
// tile's CENTER, for drawing the path line through it.
function miniTileCenter(index) {
  const col = index % 4
  const row = Math.floor(index / 4)
  const x = col * MINI_TILE_STEP + MINI_TILE_SIZE / 2
  const y = row * MINI_TILE_STEP + MINI_TILE_SIZE / 2
  return [x, y]
}

// Turns a word's path (e.g. [4, 0, 8]) into the "x1,y1 x2,y2 x3,y3" string
// format an SVG <polyline> expects for its `points` attribute.
function pathToPolylinePoints(path) {
  return path.map((index) => miniTileCenter(index).join(',')).join(' ')
}

function App() {
  // useState gives us a piece of "state" — a value React remembers between
  // re-renders, plus a function to update it. `activeTab` is the current
  // value (starts as 'wordhunt'); `setActiveTab` is how we change it.
  // Whenever setActiveTab is called, React automatically re-renders the
  // component using the new value — that's what makes clicking a tab work.
  const [activeTab, setActiveTab] = useState('wordhunt')

  // The 16 letters typed into the grid, one per tile. Starts as 16 empty
  // strings. This is the ONE place the grid's letters live — later, other
  // input methods (like a camera) would update this exact same state, not
  // a separate copy, which is why we set it up this way from the start.
  const [letters, setLetters] = useState(Array(16).fill(''))

  // useRef gives us a box that holds a value WITHOUT causing a re-render
  // when it changes (unlike useState). We use it here to keep a plain
  // array of the actual <input> DOM elements, so we can call .focus() on
  // one of them directly — something state alone can't do, since state
  // only controls what's rendered, not imperative actions like moving
  // keyboard focus. inputRefs.current[i] will be tile i's real DOM node.
  const inputRefs = useRef([])

  // Results of calling the Python solver. `words` is `null` until we've
  // solved at least once (so we can tell "never tried" apart from "tried,
  // found zero words"). `isLoading` drives the button's text/disabled
  // state while we're waiting on the network request. `error` holds a
  // message to show if something goes wrong (empty tiles, server down).
  const [words, setWords] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Called when the Calculate button is clicked. It's an `async` function
  // because talking to the server takes time — we don't want to freeze
  // the page while waiting, so this runs without blocking anything else.
  async function handleCalculate() {
    setError(null)

    // Don't even bother contacting the server if the grid isn't full —
    // solve_grid() on the Python side requires exactly 16 letters.
    if (letters.some((letter) => letter === '')) {
      setError('Fill in all 16 boxes first.')
      return
    }

    setIsLoading(true)
    try {
      // fetch() sends an HTTP request. `await` pauses this function (not
      // the whole app) until the response comes back.
      const response = await fetch('http://localhost:8000/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The server expects JSON text, not a raw JS array/object, so we
        // convert `letters` into a JSON string before sending it.
        body: JSON.stringify({ letters }),
      })

      if (!response.ok) {
        throw new Error('Server responded with an error')
      }

      // The response body arrives as JSON text; .json() parses it back
      // into a normal JS object, e.g. { words: ["cat", "act", ...] }.
      const data = await response.json()
      setWords(data.words)
    } catch (err) {
      // This runs if fetch() itself fails (e.g. the Python server isn't
      // running at all) or if we threw the error above.
      setError('Could not reach the solver. Is the Python server running?')
    } finally {
      // finally always runs, whether the request succeeded or failed —
      // guarantees we never get stuck showing "Solving..." forever.
      setIsLoading(false)
    }
  }

  // Called whenever the user types in tile number `index`.
  // `rawValue` is whatever the browser's <input> currently contains.
  function handleLetterChange(index, rawValue) {
    // An <input> can technically contain more than one character (e.g. if
    // the user pastes text or types fast before maxLength kicks in), so we
    // only ever keep the LAST character typed.
    const char = rawValue.slice(-1)

    // Ignore anything that isn't a single letter (numbers, symbols, etc.)
    // — but still allow an empty string through, so backspace can clear a tile.
    if (char && !/[a-zA-Z]/.test(char)) {
      return
    }

    const value = char.toUpperCase()

    // We never mutate state directly (e.g. letters[index] = value would be
    // wrong). Instead we build a NEW array that's a copy of the old one
    // with just this one slot changed, and hand that to setLetters.
    // This is a core React rule: treat state as read-only, always replace it.
    setLetters((previousLetters) => {
      const nextLetters = [...previousLetters]
      nextLetters[index] = value
      return nextLetters
    })

    // If a letter was actually typed (not a backspace clearing the box)
    // and this isn't the last tile, move focus to the next one.
    // The "?" in "?.focus()" is optional chaining — it skips the call
    // instead of crashing if that ref happens to be null.
    if (value && index < letters.length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  return (
    <div className="page">
      <h1 className="title">Game Pigeon Word Solver</h1>

      {/* Tab bar: one button per entry in TABS. */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            // Every tab gets the base "tab" class. The active one also gets
            // "tab-active", which we'll use in CSS to visually highlight it.
            // Template literals (backticks) let us build a string that
            // includes a variable — here, conditionally adding a class.
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content: only the Word Hunt tab has anything in it (the grid).
          The other two tabs are intentionally empty for now. */}
      <div className="tab-content">
        {activeTab === 'wordhunt' && (
          <div className="grid">
            {letters.map((letter, index) => (
              // This is a "controlled input": its displayed value always
              // comes from React state (`letter`), never from the DOM
              // itself. Typing doesn't change the box directly — it calls
              // onChange, which updates state, which causes React to
              // re-render the input with the new value. Slower to reason
              // about at first, but it means `letters` is always the single
              // source of truth for what's on screen.
              <input
                key={index}
                // React calls this function with the actual DOM element once
                // it's created, and again with null if it's ever removed.
                // We store it in our refs array so handleLetterChange can
                // reach it later to call .focus().
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                className="tile"
                value={letter}
                onChange={(event) => handleLetterChange(index, event.target.value)}
                maxLength={1}
              />
            ))}
          </div>
        )}
        {/* No content for 'temp1' or 'temp2' — nothing renders for those. */}
      </div>

      {activeTab === 'wordhunt' && (
        <>
          <button className="calculate-button" onClick={handleCalculate} disabled={isLoading}>
            {isLoading ? 'Solving...' : 'Calculate'}
          </button>

          {error && <p className="error-message">{error}</p>}

          {/* Only show results once we actually have some (words !== null),
              and only if there was no error. */}
          {words !== null && !error && (
            <div className="results">
              <p>{words.length} words found</p>
              <ul className="word-list">
                {/* Each `word` from the server is now an object, not a plain
                    string: { word: "cat", path: [4, 0, 8] }. `path` is the
                    ordered list of the 16-cell indices that spell it out —
                    path[0] is the tile the word STARTS on. */}
                {words.map((entry) => (
                  <li key={entry.word} className="word-item">
                    <span className="word-text">{entry.word}</span>
                    <div className="mini-grid">
                      {MINI_GRID_CELLS.map((_, index) => {
                        // Which color (if any) does THIS cell get for THIS
                        // word? The very first tile in the path is the
                        // starting letter; every other tile on the path is
                        // the rest of the word; anything not in the path
                        // stays the default black (no extra class).
                        const isStart = entry.path[0] === index
                        const isOnPath = entry.path.includes(index)

                        let tileClass = 'mini-tile'
                        if (isStart) {
                          tileClass += ' mini-tile-start'
                        } else if (isOnPath) {
                          tileClass += ' mini-tile-path'
                        }

                        return <div className={tileClass} key={index}></div>
                      })}

                      {/* An SVG overlay drawn on top of the tiles (CSS gives
                          .mini-grid position: relative and this svg
                          position: absolute, so it sits exactly over the
                          4x4 area). viewBox uses the grid's actual pixel
                          size — 4 tiles + 3 gaps = 38px — so the polyline's
                          coordinates line up with the real tile centers. */}
                      <svg className="mini-grid-path" viewBox="0 0 38 38">
                        <polyline
                          points={pathToPolylinePoints(entry.path)}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
