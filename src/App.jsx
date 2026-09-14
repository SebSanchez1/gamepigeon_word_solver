import { useState } from 'react'

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

  // Instead of hand-writing 16 <div> elements, we make an array with 16 slots
  // and turn it into 16 boxes with .map(). Array.from({ length: 16 }) creates
  // an array like [undefined, undefined, ...] (16 items) just so we have
  // something to loop over — we don't actually use each item's value here.
  const boxes = Array.from({ length: 16 })

  return (
    <div className="page">
      <h1 className="title">GamePigeon Word Solver</h1>

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
            {boxes.map((_, index) => (
              // React needs a unique "key" prop whenever you render a list of
              // elements from an array. It's how React tracks which element
              // is which if the list ever changes (e.g. reordering, adding).
              // We don't render `key` on screen — it's just for React internally.
              <div className="tile" key={index}></div>
            ))}
          </div>
        )}
        {/* No content for 'temp1' or 'temp2' — nothing renders for those. */}
      </div>
    </div>
  )
}

export default App
