# NodeGraph — Agent Editing Specification

> **If you are an AI agent editing a `.nodegraph.json` file, read this document first.**
> It defines every field, every syntax rule, and every constraint you must follow.
> Skipping it will produce broken graphs.

This document describes how AI agents (Claude Code, Cursor, Copilot, etc.)
should read and edit `.nodegraph.json` files used by the NodeGraph VSCode extension.

---

## Top-level schema (`NodeGraph`)

```jsonc
{
  "version": "1.0.0",          // always "1.0.0" — do not change
  "title": "Paper Title",       // display name shown in the UI
  "created": "2026-07-06T00:00:00.000Z",   // ISO 8601; set once on creation, never change again
  "modified": "2026-07-06T12:00:00.000Z",  // ISO 8601; UPDATE after EVERY edit session
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

Required top-level fields: `version`, `title`, `created`, `modified`, `nodeTemplates`, `nodes`, `edges`, `viewport`.
Optional: `source`, `canvasImages`.

---

## `nodeTemplates`

A map of template key → template definition. Every node's `"template"` field must match one of these keys.

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
  "template": "question",       // must match a key in nodeTemplates
  "title": "Short title",
  "content": "Main body text. Supports KaTeX, Markdown tables, and [[IMG:...]] tokens. See Content Syntax section.",
  "original": {                 // optional — verbatim source quote
    "title": "Custom label",    // optional override for the "Original" section header
    "text": "Exact verbatim quote from the PDF. Never paraphrase.",
    "location": "§3.2, p.7"    // "§N.M, p.X" format
  },
  "toggleItems": [              // optional — collapsible sub-sections inside the node
    {
      "id": "toggle_001",       // unique string within the file; use "toggle_NNN"
      "title": "Section label",
      "content": "Plain text or KaTeX math only. Tables and images NOT supported here.",
      "expanded": false
    }
  ],
  "contentExpanded": false,     // whether the content panel is open (default false)
  "originalExpanded": false,    // whether the original-quote panel is open (default false)
  "childrenExpanded": false,    // whether child nodes are shown (default false)
  "position": { "x": 400, "y": -60 },
  "children": [],               // list of child node IDs (for tree structure)
  "links": [],                  // NodeLink array — see below; use [] if empty
  "fontSize": 14,               // optional — per-node font size in px
  "nodeWidth": 320,             // optional — user-set minimum width in px
  "nodeHeight": null            // optional — user-set minimum height in px
}
```

### Fields NOT to set manually

- `nodeNaturalY` — internal layout bookkeeping written by the renderer. Do not add or modify.
- `images` — legacy field from earlier versions. If already present, leave as `[]`. Do not add image entries here. Inline images go in `content` as `[[IMG:filename:WxH]]` tokens (see Content Syntax).

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

Canvas image files also live in `.<basename>-imgs/` next to the JSON file.

---

## ID format rules

| Entity | Format | Example |
|--------|--------|---------|
| Node | `node_` + 3-digit zero-padded | `node_001`, `node_023` |
| Edge | `edge_` + 3-digit zero-padded | `edge_001`, `edge_015` |
| Toggle | `toggle_` + 3-digit zero-padded | `toggle_001` |
| CanvasImage | `cimg_` + any unique suffix | `cimg_001` |

Always use the **next available number**. IDs must be unique within the entire file.

---

## Content syntax

> **This section is critical. Read it carefully before writing any `content` value.**

### Where each syntax feature works

Different fields have different rendering capabilities:

| Feature | `node.content` | `toggleItems[].content` |
|---------|:--------------:|:------------------------:|
| KaTeX inline `$...$` | ✅ | ✅ |
| KaTeX block `$$...$$` | ✅ | ✅ |
| Markdown table | ✅ | ❌ plain text only |
| `[[IMG:filename:WxH]]` | ✅ | ❌ not rendered |

**Rule**: Put tables and images in `node.content` only. `toggleItems[].content` is for KaTeX math and plain text.

---

### KaTeX math

| Syntax | Renders as |
|--------|------------|
| `$d_k$` | inline math |
| `$$\text{Attention}(Q,K,V)=\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$` | block math |

**Critical**: Inside a JSON string, every backslash must be doubled:

```jsonc
// WRONG — will break JSON parsing or render incorrectly:
"content": "$\sqrt{d_k}$"
"content": "$$\frac{QK^T}{\sqrt{d_k}}$$"

// CORRECT:
"content": "$\\sqrt{d_k}$"
"content": "$$\\frac{QK^T}{\\sqrt{d_k}}$$"
```

Every `\text`, `\frac`, `\sqrt`, `\left`, `\right`, `\mathbb`, etc. → must be `\\text`, `\\frac`, `\\sqrt`, `\\left`, `\\right`, `\\mathbb`.

Surround block math with a blank line on each side for clean rendering.

---

### Markdown tables (GFM)

```
| Col A | Col B |
|-------|-------|
| val 1 | val 2 |
```

- The separator row (`|---|---|`) is **required** — tables without it will not render.
- Use `\n` for newlines inside JSON strings.
- Only works in `node.content`, **not** in `toggleItems[].content`.

---

### Inline images in `node.content`

To embed an image inside a node's content area:

```
[[IMG:filename.png:600x400]]
```

- `filename.png` — the image file name only (no path)
- `600x400` — display width × height in pixels
- The image file must exist in `.<basename>-imgs/` next to the JSON file

**Image folder naming**: if the JSON file is `paper.nodegraph.json`, the image folder is `.paper-imgs/`. The folder is hidden (starts with `.`).

**Only works in `node.content`**, not in `toggleItems[].content`.

Example full token: `[[IMG:fig_01_architecture.png:800x500]]`

When the user pastes or drags an image into the editor, the extension:
1. Saves the file as `img_<timestamp>.png` in the `.<basename>-imgs/` folder
2. Inserts the `[[IMG:...]]` token into the content automatically

If you are adding an image as an agent, copy the image file into the correct folder first, then insert the token manually.

---

## Position guidelines

- Backbone (main) nodes: arrange vertically, `y` spacing of ~300px, `x` = 0
- Sub-nodes: arrange to the right of their parent, `x` offset of ~400–500px
- Distribute sub-nodes vertically around their parent's y-center (~150px spacing)
- Check all existing node positions before placing new ones — avoid overlapping

---

## Language rules

- `content` may be in any language (English, Korean, etc.)
- Use a consistent language throughout one file
- English is preferred for files intended for sharing
- `original.text` must always be a verbatim quote from the source (never paraphrase)

---

## PDF → Backbone generation workflow

When asked to create a nodegraph from a PDF:

1. Read the entire PDF (all pages; chunk if >20 pages)
2. Identify major semantic themes (NOT section headings — idea units)
3. Create one `main_topic` node per theme
4. Arrange vertically: `position.y` = index × 300, `position.x` = 0
5. Connect backbone nodes with `arrow` edges
6. For each node: write `content` summary + `original.text` verbatim quote
7. Add `toggleItems` for tables, ablation results, or key statistics — **plain text / KaTeX only in toggle content**
8. For key figures: copy image file to `.<basename>-imgs/` → embed as `[[IMG:filename:WxH]]` in `node.content`
9. Add `question` / `gap` sub-nodes for deep questions and open issues (x offset ~400–500)
10. Update `"modified"` to the current ISO 8601 timestamp
11. Tell the user to click **↺ Reload** in the editor toolbar — this re-reads the file from disk without closing/reopening it

---

## Post-edit checklist

After any edit, verify:

- [ ] All `id` values are unique (nodes, edges, toggleItems, canvasImages)
- [ ] All `children` IDs reference existing nodes
- [ ] All `edges.source` and `edges.target` reference existing nodes
- [ ] `modified` timestamp updated (ISO 8601)
- [ ] No duplicate edges between the same pair of nodes
- [ ] KaTeX formulas: **every backslash doubled** (`\\frac`, `\\sqrt`, `\\text`, `\\left`, `\\right`)
- [ ] KaTeX braces balanced
- [ ] Markdown tables have a separator row (`|---|---|`) — only in `node.content`, not toggleItems
- [ ] `[[IMG:...]]` tokens only in `node.content`, image files exist in `.<basename>-imgs/`
- [ ] `toggleItems[].id` values are unique within the file
- [ ] `links` field present on every node (use `[]` if empty)
