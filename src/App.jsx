// App is the top-level component. Right now it just renders a static
// 4x4 grid of boxes (no interactivity yet, no letters, no state).
function App() {
  // Instead of hand-writing 16 <div> elements, we make an array with 16 slots
  // and turn it into 16 boxes with .map(). Array.from({ length: 16 }) creates
  // an array like [undefined, undefined, ...] (16 items) just so we have
  // something to loop over — we don't actually use each item's value here.
  const boxes = Array.from({ length: 16 })

  return (
    <div className="page">
      <h1 className="title">GamePigeon Word Solver</h1>
      <div className="grid">
        {boxes.map((_, index) => (
          // React needs a unique "key" prop whenever you render a list of
          // elements from an array. It's how React tracks which element is
          // which if the list ever changes (e.g. reordering, adding/removing).
          // We don't render `key` on screen — it's just for React internally.
          <div className="tile" key={index}></div>
        ))}
      </div>
    </div>
  )
}

export default App
