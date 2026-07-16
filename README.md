# NodeGraph

A VS Code extension for building node-based knowledge graphs from research papers and documents. Open any `.nodegraph.json` file to get an interactive canvas with rich content nodes, wires, and an exportable HTML viewer.

## Screenshots

<table>
<tr>
<td><img src="demo/screenshot-overview.png" alt="Graph overview — collapsed nodes with bus-routed wires" width="520"></td>
<td><img src="demo/screenshot-expanded.png" alt="Expanded nodes showing KaTeX formulas and original quotes" width="520"></td>
</tr>
<tr>
<td align="center"><sub>Graph overview — collapsed nodes with bus-routed wires</sub></td>
<td align="center"><sub>Expanded nodes — KaTeX math, original quotes, node types</sub></td>
</tr>
</table>

## Features

### Editing
- **Custom editor** for `.nodegraph.json` files — pan (left-drag), zoom (scroll wheel, 0.05×–8×, centered on the cursor), box-select (right-drag)
- **Rich node content** — Markdown (GFM) tables, LaTeX via KaTeX, `**bold**`, inline images; click any text to edit it in place (`Esc` cancels, clicking elsewhere commits)
- **Node types** — 8 templates: Main topic, Method, Result, Claim (sharp = from the paper) and Question, Gap/Idea, Reference, Memo (rounded = your own notes); change a selected node's type from the toolbar dropdown
- **Fold / Unfold** — click the node title; toolbar `Expand↓` / `Collapse↑` act on the selected node's whole subtree (expand stops at other main-topic nodes), or on every node when nothing is selected
- **Toggle sections** — collapsible sub-sections inside a node (`+ Toggle` button)
- **Original text** — verbatim source quote with an editable label and `§, p.` location (`+ Original` button); rendered in italics below the content
- **Links** — attach `url` / `pdf` / `obsidian` links to a node (`+ Link` button); click to open — PDFs are resolved relative to the JSON file
- **Edges** — drag from a port dot (appears on hover) onto any node body to create an `arrow` edge; duplicates are ignored; click a wire to select it (blue) and press `Delete` to remove it; `Reduce Edges` deletes transitively redundant A→C edges
- **Resize & typography** — drag an expanded node's right/bottom/corner handles (min 160×60); nodes widen automatically to fit tables and sized images; per-node font size 8–72px via the toolbar combo (with multiple nodes selected, sizes shift together preserving differences)
- **Undo / Redo** — full history with `Ctrl+Z` / `Ctrl+Y` (or `Ctrl+Shift+Z`)

### Layout & wires
- **Overlap-free layout** — saved positions are never rewritten by the layout; at render time an expanded node pushes overlapping neighbors down (adaptive 20/30/48px gaps) and sideways (60px minimum), and everything returns to place when folded — identical in the editor and the exported HTML
- **Smart wire routing** — wires are planned on a 24px cost grid (A*): node interiors are heavily penalized (crossed only when a node is fully enclosed), wires keep clearance from node borders and spread into free space instead of stacking; while dragging a node a light heuristic keeps rendering smooth and the precise routes return 150ms after the layout settles
- **Bus routing** — one source with 2+ `line` targets clearly to its right renders as a single trunk with per-target branches

### Find & focus
- **Ctrl+F search** — live dropdown over title, content, and original text; `↑`/`↓` flies the viewport to each match, `Enter` expands the chosen node and collapses the other matches; the matched text itself is marked inside the node in the inverse of its template color
- **Generation highlight** — click a node's tag badge to outline the node, its parents/children, and the connecting wires in red; background clicks keep it pinned, `Esc` clears it

### Images
- **Paste into a node** — copy any image and press `Ctrl+V` with a node selected or hovered (or inside the content editor, at the cursor); the file is saved as `img_<timestamp>.<ext>` in `.<name>-imgs/` and referenced as an `[[IMG:filename:WxH]]` token
- **Canvas images** — paste on the background to get a floating, draggable, aspect-preserving-resizable image; drop it onto a node (or a specific table cell) to move it into that content; `Ctrl+C`/`X`/`V` copies, cuts, and clones canvas images
- **Lightbox** — click any image to zoom it full-screen; `Esc` or a click closes

### Files & export
- **HTML export** — writes a self-contained `<name>.html` next to the JSON with all referenced images inlined as base64 and offers *Open in Browser / Show in Explorer*; the viewer reproduces search with inline marks, generation highlight, wire routing, the fold layout, node dragging, and window-resize recentering (KaTeX loads from a CDN, so formulas need internet; floating canvas images are not exported)
- **Save** — `Ctrl+S` writes pretty-printed JSON to disk immediately; image insertion saves automatically
- **External edits** — when the file changes outside the webview the graph reloads automatically; `↺ Reload` force-re-reads from disk (useful after an AI agent edits the JSON)
- **Slidable toolbar** — on narrow windows the toolbar keeps its button positions and slides horizontally (`Shift`+wheel on desktop, swipe on touch)

## Mouse & Keyboard Controls

### Canvas

| Action | Control |
|--------|---------|
| Pan canvas | Left-drag on background |
| Deselect / close search | Left-click on background |
| Zoom (0.05×–8×) | Scroll wheel — centered on the cursor |
| Box-select nodes & images | Right-drag on background |
| Select node | Left-click anywhere on the node |
| Add to selection | `Shift`/`Ctrl`+click |
| **Drag node** | **Left-drag the tag badge** (e.g. "Gap / Idea"); with a multi-selection, all selected nodes move together |
| Pin generation highlight | Click the tag badge — node + parents + children + wires turn red |
| Clear highlight / selection | `Escape` (background clicks keep the highlight) |
| Delete selection | `Delete` or `Backspace` — canvas images first, then a selected wire, then nodes |
| Select wire | Left-click a wire (turns blue) |
| Draw edge | Drag from a port dot (appears on hover) onto the target node body — creates an `arrow` edge |

### Node

| Action | Control |
|--------|---------|
| **Fold / Unfold content** | **Click node title** |
| **Edit node title** | **Right-click node title** |
| Edit content / original | Click text area |
| Add image | Copy an image, then `Ctrl+V` with the node selected or hovered — inserted as an `[[IMG:...]]` token; pasting on the background creates a floating canvas image, which can be dragged onto a node or table cell |
| Add toggle / original / link | `+ Toggle` · `+ Original` · `+ Link` buttons at the bottom of an expanded node |
| Resize node | Drag the right / bottom / corner handles of an expanded node (min 160×60) |

### Toolbar

| Control | Description |
|---------|-------------|
| ↩ Undo / Redo ↪ | History (also `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`) |
| Template dropdown + `+ Add Node` | Creates a node of the chosen type in the nearest free spot around the view center |
| Delete | Deletes all selected nodes |
| Type & font controls | Shown while nodes are selected — switch the node's template; set font size by typing a number or picking a preset (8–72) |
| Collapse↑ / Expand↓ | Fold/unfold the selected subtree, or everything when nothing is selected |
| Fit View | Zoom to fit all nodes |
| Reduce Edges | Remove A→C when a path A→B→C already exists |
| Export HTML | Write `<name>.html` next to the JSON |
| ↺ Reload | Re-read the JSON from disk |

When the window is narrower than the toolbar content, the toolbar slides horizontally (`Shift`+wheel or touch swipe) — button positions never change.

### Search (Ctrl+F)

| Action | Control |
|--------|---------|
| Open search | `Ctrl+F` (or `Cmd+F` on Mac) |
| Close search | `Escape` or ✕ button |
| Navigate results | `↑` / `↓` — moves dropdown highlight **and** flies viewport to that node |
| Select node | `Enter` — expands selected node, collapses other matches |
| Reopen after select | Click search input — resumes from last selected position |

Matched text inside each node is additionally marked (inverse template color + underline), so you can see *where* in the node the query appears — in the editor and in the exported HTML.

## Getting Started

1. Install from the packaged `.vsix`: `code --install-extension nodegraph-<version>.vsix` (not yet published to the Marketplace).
2. Run **NodeGraph: New Graph** (`Ctrl+Shift+P`) to create a new `.nodegraph.json` file.
3. The custom editor opens automatically for any `*.nodegraph.json` file.
4. **Drag nodes** by grabbing the colored tag badge; **click the title** to fold/unfold content; **right-click the title** to edit it.
5. Use the toolbar — **Expand↓ / Collapse↑ / Fit View / Reduce Edges / Export HTML / ↺ Reload**.
6. Press **Ctrl+F** to search nodes by title or content.

## Node Content Syntax

| Feature | Syntax |
|---------|--------|
| Markdown table | `\| col \| col \|` (GFM style) |
| Inline LaTeX | `$formula$` |
| Block LaTeX | `$$formula$$` |
| Bold | `**text**` (markers hidden when rendered) |
| Literal dollar (currency) | `\$` — a bare `$` would open an inline-math region (in JSON strings write `\\$`) |
| Image token | `[[IMG:filename.png:400x300]]` |

Images are stored in a `.<graphname>-imgs/` folder next to the JSON file.

## File Format

```jsonc
{
  "version": "1.0.0",
  "title": "My Research Graph",
  "created": "2026-07-06T00:00:00.000Z",
  "modified": "2026-07-06T00:00:00.000Z",
  "source": {
    "pdf": "paper.pdf",
    "authors": "Author et al.",
    "venue": "NeurIPS 2017",
    "doi": "arXiv:1706.03762",
    "pages": 15
  },
  "nodeTemplates": {
    "main_topic": { "label": "Main topic", "color": "#4B8BBE", "icon": "file-text", "shape": "sharp" },
    "question":   { "label": "Question",   "color": "#E5A835", "icon": "help-circle", "shape": "rounded" }
  },
  "nodes": [
    {
      "id": "node_001",
      "template": "main_topic",
      "title": "Introduction",
      "content": "Summary text with $\\LaTeX$ and\n[[IMG:figure1.png:500x300]]",
      "original": { "text": "Exact quote from paper.", "location": "§1, p.1" },
      "toggleItems": [
        { "id": "toggle_001", "title": "Table 1", "content": "| Col | Val |\n|-----|-----|\n| A | 1 |", "expanded": false }
      ],
      "contentExpanded": true,
      "originalExpanded": false,
      "childrenExpanded": false,
      "position": { "x": 0, "y": 0 },
      "children": ["node_002"],
      "links": []
    }
  ],
  "edges": [
    { "id": "edge_001", "source": "node_001", "target": "node_002", "type": "arrow", "label": "" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

## Agent / AI Editing

> **AI agents: read these two files before doing anything:**
> 1. `.agent/NODEGRAPH_SPEC.md` — full JSON schema, syntax rules, and constraints
> 2. `.agent/ENVIRONMENT.md` — auto-generated at extension activation; lists which Python libraries and CLI tools are installed on this machine (PDF reading, image processing, etc.)
>
> Key rules from the spec:
> - Backslashes in KaTeX **must be doubled** in JSON strings (`\\frac`, `\\sqrt`, `\\text`)
> - Prefer `$$...$$` display blocks for formulas — inline `$...$` only for short in-sentence symbols
> - Literal currency dollars must be escaped: `\$4.28/GB` (in JSON strings: `\\$4.28/GB`) — a bare `$` opens an inline-math region
> - When writing in Korean, include the English term alongside key technical expressions — e.g. "주의 메커니즘(attention mechanism)"
> - The Killer Application is not limited to one — capture every genuinely remarkable contribution
> - `[[IMG:filename:WxH]]` tokens only work in `node.content`, not in `toggleItems[].content`
> - `toggleItems[].content` supports KaTeX math only — no Markdown tables, no images
> - Always update the `"modified"` timestamp after every edit

The file `.agent/NODEGRAPH_SPEC.md` (included in the extension) is a machine-readable specification for AI agents. It documents the full JSON schema, ID conventions, KaTeX/Markdown syntax rules, rendering support per field, and a step-by-step workflow for generating a nodegraph from a PDF.

A worked example is included at `test-demo-v2/attention-is-all-you-need.nodegraph.json` — the full "Attention Is All You Need" paper rendered as a nodegraph with KaTeX formulas, Markdown tables, toggle sections, and deep question nodes.

**Typical agent workflow:**
1. Read `.agent/NODEGRAPH_SPEC.md`
2. Read or create the target `.nodegraph.json`
3. Edit the JSON directly
4. Click **↺ Reload** in the toolbar to see the updated graph without closing/reopening the file

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `NodeGraph: New Graph` | — | Create a new empty graph |
| `NodeGraph: Fit to View` | — | Fit all nodes in the viewport |
| `NodeGraph: Expand All` | — | Expand all node bodies |
| `NodeGraph: Collapse All` | — | Collapse all node bodies |
| `NodeGraph: Search Nodes` | `Ctrl+F` / `Cmd+F` | Open search dropdown |

## License

MIT
