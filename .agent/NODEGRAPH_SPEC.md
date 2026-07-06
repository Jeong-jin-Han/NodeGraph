# NodeGraph — Agent Editing Specification

This document describes how AI agents (Claude Code, Cursor, Copilot, etc.)
should read and edit `.nodegraph.json` files used by the NodeGraph VSCode extension.

---

## Top-level schema (`NodeGraph`)

```jsonc
{
  "version": "1.0.0",          // always "1.0.0"
  "title": "Paper Title",       // display name shown in the UI
  "created": "2026-07-06T00:00:00.000Z",   // ISO 8601; set once on creation
  "modified": "2026-07-06T12:00:00.000Z",  // ISO 8601; update after EVERY edit
  "source": {                   // optional — paper / document metadata
    "pdf": "paper.pdf",
    "authors": "Vaswani et al.",
    "venue": "NeurIPS 2017",
    "doi": "arXiv:1706.03762",
    "pages": 15
  },
  "nodeTemplates": { ... },     // required — see below
  "nodes": [ ... ],             // required
  "edges": [ ... ],             // required
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "canvasImages": []            // optional — floating images on canvas background
}
```

All fields at the top level are required except `source` and `canvasImages`.

---

## `nodeTemplates`

A map of template key → template definition. All nodes reference one of these keys.

```jsonc
"nodeTemplates": {
  "main_topic": { "label": "Main topic",  "color": "#4B8BBE", "icon": "file-text",    "shape": "sharp"   },
  "method":     { "label": "Method",      "color": "#5C9E6E", "icon": "cpu",           "shape": "sharp"   },
  "result":     { "label": "Result",      "color": "#9B59B6", "icon": "bar-chart-2",   "shape": "sharp"   },
  "claim":      { "label": "Claim",       "color": "#E74C3C", "icon": "alert-circle",  "shape": "sharp"   },
  "question":   { "label": "Question",    "color": "#E5A835", "icon": "help-circle",   "shape": "rounded" },
  "gap":        { "label": "Gap / Idea",  "color": "#1ABC9C", "icon": "lightbulb",     "shape": "rounded" },
  "reference":  { "label": "Reference",   "color": "#95A5A6", "icon": "book-open",     "shape": "rounded" },
  "memo":       { "label": "Memo",        "color": "#BDC3C7", "icon": "edit-3",        "shape": "rounded" }
}
```

| `shape` value | When to use |
|---------------|-------------|
| `"sharp"`     | Content from the paper (topics, methods, results, claims) |
| `"rounded"`   | Content outside the paper (questions, gaps, memos, references) |

---

## Node schema (`GraphNode`)

```jsonc
{
  "id": "node_015",             // "node_" + zero-padded 3-digit number; must be unique
  "template": "question",       // key in nodeTemplates
  "title": "Short title",
  "content": "Summary text. Supports $inline math$ and $$block math$$ and\n| Markdown | tables |\n|----------|--------|\n| val 1    | val 2  |",
  "original": {                 // optional — verbatim source quote
    "title": "Custom label",    // optional override for the "Original" section header
    "text": "Exact verbatim quote from the PDF. Never paraphrase.",
    "location": "§3.2, p.7"    // "§N.M, p.X" format
  },
  "toggleItems": [              // optional — collapsible sub-sections inside the node
    {
      "id": "toggle_001",       // unique string within the file; suggest "toggle_NNN"
      "title": "Table 2: BLEU Scores",
      "content": "| System | EN-DE |\n|--------|-------|\n| Big | 28.4 |",
      "expanded": false
    }
  ],
  "contentExpanded": false,     // whether the content panel is open
  "originalExpanded": false,    // whether the original-quote panel is open
  "childrenExpanded": false,    // whether child nodes are shown (not used in rendering)
  "position": { "x": 400, "y": -60 },
  "children": [],               // list of child node IDs (for tree structure)
  "links": [],                  // NodeLink array — see below
  "fontSize": 14,               // optional — per-node font size in px
  "nodeWidth": 320,             // optional — user-set minimum width in px
  "nodeHeight": null            // optional — user-set minimum height in px
}
```

### Fields NOT to set manually

- `nodeNaturalY` — internal layout bookkeeping; the renderer writes this during auto-layout. Do not add or modify.
- `images` — legacy field from earlier versions. If present, leave as `[]`; do not add image entries here. Images are embedded in `content` as `[[IMG:filename:WxH]]` tokens.

---

## Edge schema (`GraphEdge`)

```jsonc
{
  "id": "edge_015",      // "edge_" + zero-padded 3-digit number; must be unique
  "source": "node_001",
  "target": "node_015",
  "type": "arrow",       // "arrow" (directed, causal/flow) | "line" (undirected, reference)
  "label": ""
}
```

Edge type guidelines:
- `"arrow"`: backbone connections between main nodes (sequence / flow)
- `"line"`: main→sub, sub→sub, or cross-references

---

## NodeLink schema

Nodes can have a `links` array for external references:

```jsonc
{
  "type": "url",              // "pdf" | "obsidian" | "url" | "internal"
  "target": "https://...",   // URL, file path, or Obsidian URI
  "label": "arXiv paper"
}
```

---

## CanvasImage schema

Floating images placed on the canvas background (not inside a node):

```jsonc
{
  "id": "cimg_001",
  "filename": "architecture.png",
  "position": { "x": 800, "y": 200 },
  "width": 600,
  "height": 400
}
```

Image files live in `.<basename>-imgs/` next to the JSON file.

---

## ID format rules

| Entity | Format | Example |
|--------|--------|---------|
| Node | `node_` + 3-digit zero-padded | `node_001`, `node_023` |
| Edge | `edge_` + 3-digit zero-padded | `edge_001`, `edge_015` |
| Toggle | `toggle_` + 3-digit zero-padded | `toggle_001` |
| CanvasImage | `cimg_` + any unique suffix | `cimg_001` |

Always use the next available number. IDs must be unique within the file.

---

## Content syntax

### KaTeX math

| Syntax | Renders as |
|--------|------------|
| `$d_k$` | inline math |
| `$$\text{Attention}(Q,K,V) = \text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$` | block math |

Surround formulas with spaces so they render cleanly. Inside JSON strings, use `\\` for a single backslash: `"$\\sqrt{d_k}$"`.

### Markdown tables (GFM)

```
| Col A | Col B |
|-------|-------|
| val 1 | val 2 |
```

The separator row (`|---|---|`) is required.

### Inline images

```
[[IMG:fig_001.png:600x400]]
```

Image files are stored in `.<basename>-imgs/`. The dimensions (`WxH`) are in pixels and used to set the display size.

---

## Position guidelines

- Backbone (main) nodes: arrange vertically, `y` spacing of ~300px
- Sub-nodes: arrange to the right of their parent, `x` offset of ~400–500px
- Distribute sub-nodes vertically around their parent's y-center (~150px spacing)
- Avoid overlapping with existing nodes (check all positions before placing)

---

## Language rules

- `content` may be in any language (English, Korean, etc.)
- Use a consistent language throughout one file
- English is preferred for files intended for sharing
- `original.text` must always be a verbatim English quote from the source paper

---

## PDF → Backbone generation workflow

When asked to create a nodegraph from a PDF:

1. Read the entire PDF (all pages; chunk if >20 pages)
2. Identify major semantic themes (NOT section headings — idea units)
3. Create one `main_topic` node per theme
4. Arrange vertically: `position.y` = index × 300, `position.x` = 0
5. Connect backbone nodes with `arrow` edges
6. For each node: write `content` summary + `original.text` verbatim quote
7. Add `toggleItems` for tables, ablation results, or key statistics
8. For key figures: copy image to `.<basename>-imgs/` → embed as `[[IMG:...]]` in `content`
9. Add `question` / `gap` sub-nodes for deep questions and open issues (x offset ~500)
10. Set `"modified"` to current ISO 8601 timestamp
11. Tell the user to click **↺ Reload** in the editor toolbar — this re-reads the file from disk without closing/reopening it

---

## Post-edit checklist

After any edit, verify:
- [ ] All `id` values are unique (nodes, edges, toggleItems, canvasImages)
- [ ] All `children` IDs reference existing nodes
- [ ] All `edges.source` and `edges.target` reference existing nodes
- [ ] `modified` timestamp updated (ISO 8601)
- [ ] No duplicate edges between the same pair of nodes
- [ ] KaTeX formulas: backslashes doubled (`\\frac`, `\\sqrt`), braces balanced
- [ ] Markdown tables have a separator row (`|---|---|`)
- [ ] `toggleItems[].id` values are unique within the file
