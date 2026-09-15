import { useRef, useState } from 'react'

// Describes the 3 tabs: a unique "id" (used internally to track which is
// active) and a "label" (the text actually shown on screen).
const TABS = [
  { id: 'wordhunt', label: 'Word Hunt' },
  { id: 'temp1', label: 'Temp' },
  { id: 'temp2', label: 'Temp' },
]

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
    </div>
  )
}

export default App
