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

- **Custom editor** for `.nodegraph.json` files — pan, zoom, drag nodes
- **Rich node content** — Markdown tables, LaTeX (KaTeX), inline images
- **Node types** — Main topic, Method, Result, Claim, Question, Gap/Idea, Reference, Memo
- **Image support** — paste or drag images directly onto a node; stored as `[[IMG:filename:WxH]]` tokens
- **Fold / Unfold** — click node title to toggle; right-click title to edit; drag via the tag badge
- **Ctrl+F Search** — live dropdown search by title/content; arrow keys preview nodes; Enter expands selected and collapses others
- **HTML export** — generate a self-contained HTML viewer with full search and navigation (toolbar → Export HTML)
- **Toggle sections** — collapsible sub-sections inside each node
- **Original text** — attach the verbatim source quote alongside your summary
- **Edge types** — `arrow` (causal flow) or `line` (reference / association)
- **Transitive reduction** — Reduce Edges button removes redundant A→C when A→B→C exists
- **Undo / Redo** — full history with `Ctrl+Z` / `Ctrl+Y`
- **Auto-save** — `Ctrl+S` writes to disk immediately
- **Reload from disk** — Reload button re-reads the JSON file; useful after an external agent edits it

## Mouse & Keyboard Controls

### Canvas

| Action | Control |
|--------|---------|
| Pan canvas | Left-drag on background |
| Deselect / close search | Left-click on background |
| Zoom | Scroll wheel |
| Box-select nodes | Right-drag on background |
| Select node | Left-click node header |
| **Drag node** | **Left-drag the tag badge** (e.g. "Gap / Idea") |
| Delete selected nodes | `Delete` or `Backspace` |
| Draw edge | Drag from port dot (appears on hover) |

### Node

| Action | Control |
|--------|---------|
| **Fold / Unfold content** | **Click node title** |
| **Edit node title** | **Right-click node title** |
| Edit content / original | Click text area |
| Add image | 📎 button in node header |

### Search (Ctrl+F)

| Action | Control |
|--------|---------|
| Open search | `Ctrl+F` (or `Cmd+F` on Mac) |
| Close search | `Escape` or ✕ button |
| Navigate results | `↑` / `↓` — moves dropdown highlight **and** flies viewport to that node |
| Select node | `Enter` — expands selected node, collapses other matches |
| Reopen after select | Click search input — resumes from last selected position |

## Getting Started

1. Install from the VS Code Marketplace (search **NodeGraph**).
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
