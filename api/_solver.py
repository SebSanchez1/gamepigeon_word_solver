"""
solver.py — finds every valid word hidden in a 4x4 letter grid.

This mirrors how GamePigeon's Word Hunt works: you form a word by tracing a
path through adjacent tiles (including diagonals), never reusing the same
tile twice in one word. This file is a standalone piece for now — it takes
letters in, prints/returns words out. Later, a small web layer will call
solve_grid() and hand the result to the React frontend, but none of that
exists yet, and this file doesn't need it to be useful and testable on its
own.

Run it directly to see it work on an example grid:
    python3 solver.py
"""

import os

# Words shorter than this aren't counted as valid finds (matches how
# most word-search games — including Word Hunt — ignore 1-2 letter words).
MIN_WORD_LENGTH = 3

# The dictionary file sits next to this script, so we build an absolute
# path from this file's own location. os.path.abspath() guarantees a full,
# unambiguous path regardless of what __file__ happens to look like in a
# given environment (a bare filename vs. a full path) — safer than relying
# on __file__ alone, since Vercel's docs specifically warn that relative
# paths resolve against your PROJECT ROOT, not this file's own folder.
WORDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "words.txt")


# ---------------------------------------------------------------------------
# Step 1: A Trie (prefix tree) — the data structure that makes this fast.
# ---------------------------------------------------------------------------
#
# The naive approach — "for every possible path through the grid, build a
# string, then check if it's in the dictionary" — wastes huge amounts of
# time exploring paths that can never become a real word (e.g. "ZQX...").
#
# A Trie fixes this by storing the dictionary as a tree of LETTERS instead
# of a flat list of words. Each node represents "the path taken to get
# here forms a valid prefix." That lets us check, one letter at a time
# while walking the grid, "is this still even a valid prefix of ANY word?"
# and immediately abandon a path the instant the answer is no — instead of
# exploring it to the end first.
#
# Example: the words "CAT" and "CAR" share a Trie path C -> A, which then
# splits into two branches: T and R.
class TrieNode:
    def __init__(self):
        # Maps a single letter to the next TrieNode in the path.
        # e.g. root.children['c'].children['a'].children['t'] is the
        # node you reach after walking "c", "a", "t" from the root.
        self.children = {}
        # True only on the node where a complete word ends.
        # e.g. "car" and "card" share nodes up through 'r', but only the
        # 'r' node (for "car") and the 'd' node (for "card") have
        # is_word = True — everything in between does not.
        self.is_word = False


def build_trie(words):
    """Takes a list of words and returns the root TrieNode of a Trie
    containing all of them."""
    root = TrieNode()
    for word in words:
        node = root
        for letter in word:
            # setdefault: "give me children[letter] if it exists,
            # otherwise create a new TrieNode there first." This is what
            # lets multiple words share the same prefix path automatically.
            node = node.children.setdefault(letter, TrieNode())
        node.is_word = True
    return root


def load_dictionary():
    """Reads words.txt (one lowercase word per line) into a plain list."""
    with open(WORDS_FILE, "r") as file:
        return [line.strip() for line in file]


# ---------------------------------------------------------------------------
# Step 2: Board adjacency — which tiles touch which.
# ---------------------------------------------------------------------------
def neighbors(row, col, num_rows, num_cols):
    """Yields every valid (row, col) that touches (row, col), including
    diagonals — 8 directions max, fewer on edges/corners."""
    for delta_row in (-1, 0, 1):
        for delta_col in (-1, 0, 1):
            if delta_row == 0 and delta_col == 0:
                continue  # skip the tile itself
            new_row, new_col = row + delta_row, col + delta_col
            if 0 <= new_row < num_rows and 0 <= new_col < num_cols:
                yield new_row, new_col


# ---------------------------------------------------------------------------
# Step 3: The search itself — DFS with backtracking, guided by the Trie.
# ---------------------------------------------------------------------------
def find_words(board, trie_root):
    """board is a list of rows, each row a list of single lowercase letters,
    e.g. [["c","a","t","s"], [...], [...], [...]] for a 4x4 grid.
    Returns a dict mapping each found word to the ordered list of (row, col)
    positions that spell it out — its "path" through the board."""
    num_rows = len(board)
    num_cols = len(board[0])
    # word -> [(row, col), (row, col), ...], one entry per unique word.
    found_words = {}

    def walk(row, col, trie_node, path_so_far, path_positions, visited_tiles):
        letter = board[row][col]

        # If the Trie has no branch for this letter, no word down this path
        # can possibly exist — stop exploring immediately. This is the
        # pruning step that makes the Trie worth using.
        if letter not in trie_node.children:
            return

        next_node = trie_node.children[letter]
        new_path = path_so_far + letter
        # A NEW list, not path_positions.append(...) — appending in place
        # would corrupt the path for sibling branches of the search that
        # share this same prefix, since they'd all be mutating one shared list.
        new_positions = path_positions + [(row, col)]

        if next_node.is_word and len(new_path) >= MIN_WORD_LENGTH:
            # Only keep the FIRST path found for a given word — if the same
            # word is spellable multiple ways on this board, we just need
            # one path to illustrate it, not every possible one.
            if new_path not in found_words:
                found_words[new_path] = new_positions

        # Mark this tile as used for the current path, so the word can't
        # reuse the same physical tile twice.
        visited_tiles.add((row, col))

        for next_row, next_col in neighbors(row, col, num_rows, num_cols):
            if (next_row, next_col) not in visited_tiles:
                walk(next_row, next_col, next_node, new_path, new_positions, visited_tiles)

        # Backtracking: once we're done exploring everything that starts
        # with this tile, un-mark it — a DIFFERENT path (starting from a
        # different tile) is allowed to use this same tile again.
        visited_tiles.discard((row, col))

    # A word can start at any tile, so kick off a search from all 16.
    for row in range(num_rows):
        for col in range(num_cols):
            walk(row, col, trie_root, "", [], set())

    return found_words


# ---------------------------------------------------------------------------
# Step 4: Public entry point — this is what other code (eventually the web
# layer) will call.
# ---------------------------------------------------------------------------
def solve_grid(letters):
    """letters: a flat list of 16 single letters, reading left-to-right,
    top-to-bottom (row 0, then row 1, ...) — the same order the React grid
    fills its tiles in. Returns a list of dicts, longest word first then
    alphabetically, each shaped like:
        {"word": "cat", "path": [4, 0, 8]}
    "path" is the list of FLAT indices (0-15, same order as `letters`) that
    spell the word out in order — index 0 is where the word starts."""
    if len(letters) != 16:
        raise ValueError("solve_grid expects exactly 16 letters")

    # Turn the flat list of 16 into a 4x4 board of rows, and lowercase
    # everything so it matches the dictionary file's casing.
    board = []
    for row_index in range(4):
        row = letters[row_index * 4 : row_index * 4 + 4]
        board.append([letter.lower() for letter in row])

    dictionary_words = load_dictionary()
    trie_root = build_trie(dictionary_words)
    found_words = find_words(board, trie_root)  # word -> [(row, col), ...]

    sorted_words = sorted(found_words.keys(), key=lambda word: (-len(word), word))

    results = []
    for word in sorted_words:
        positions = found_words[word]
        # Convert each (row, col) back into a single flat index, the same
        # scheme the 16-letter input list uses: index = row * 4 + col.
        flat_path = [row * 4 + col for row, col in positions]
        results.append({"word": word, "path": flat_path})

    return results


# ---------------------------------------------------------------------------
# Only runs when you execute this file directly (python3 solver.py) — lets
# us test the solver right now, without any web server or frontend involved.
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    example_letters = list("CATSDOGRBIRDXFEY")  # a made-up 16-letter grid
    results = solve_grid(example_letters)

    print("Grid:")
    for row_index in range(4):
        print(" ".join(example_letters[row_index * 4 : row_index * 4 + 4]))

    print(f"\nFound {len(results)} words:")
    print(", ".join(entry["word"] for entry in results))

    # Show one example path in detail, to make the "path" field concrete.
    if results:
        example = results[0]
        print(f"\nExample path for '{example['word']}': {example['path']}")
