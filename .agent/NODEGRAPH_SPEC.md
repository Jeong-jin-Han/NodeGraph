# NodeGraph — Agent Editing Specification

> **If you are an AI agent editing a `.nodegraph.json` file, read this document first.**
> It defines every field, every syntax rule, and every constraint you must follow.
> Skipping it will produce broken graphs.
>
> **Before reading PDFs or extracting images**, also read `.agent/ENVIRONMENT.md` —
> it is auto-generated each time the extension activates and lists exactly which Python
> libraries and CLI tools are installed on this machine, along with ready-to-use code snippets.

This document describes how AI agents (Claude Code, Cursor, Copilot, etc.)
should read and edit `.nodegraph.json` files used by the NodeGraph VSCode extension.

---

## Quick start: "NodeGraph 적용해"

When the user says **"NodeGraph 적용해"** (or "apply NodeGraph") and provides a PDF path, execute the full workflow below without asking for further clarification.

**One-sentence goal**: Find what this paper does that no one did before, and structure it so a reader can grasp why it matters in under 5 minutes.

**Writing principles** (apply throughout):
- **영문 표현 병기**: When writing content in Korean, include the English term alongside key technical expressions — e.g. "주의 메커니즘(attention mechanism)", "잔차 연결(residual connection)". Readers should never have to guess what the original English term was.
- **Killer Application은 1개로 제한하지 않음**: Papers often have more than one remarkable contribution. Capture all of them (see Step 2).
- **수식은 display block 권장**: Prefer `$$...$$` block math over `$...$` inline for formulas. Use inline only for short symbols inside a sentence (see Step 5).

---

## PDF → NodeGraph workflow

### Step 0 — Setup
1. Read `.agent/ENVIRONMENT.md` to know which PDF/image tools are available.
2. Identify the target file: `<name>.nodegraph.json` (create it if it does not exist).
3. If the JSON already exists, read it first so you don't clobber existing work.

### Step 1 — Read the PDF
- Read the **entire PDF** (all pages; chunk if >20 pages).
- Extract key text, equations, tables, and figure captions.
- Identify figures/diagrams worth saving as images (architecture diagrams, performance charts, ablation plots).

### Step 2 — Find the Killer Application(s)
Answer this question: **"What concrete problem does this paper solve that makes it remarkable?"**

This becomes the framing of the first backbone node and the lens through which everything else is presented. It is NOT a generic description like "We propose a new model." It is specific: "Replace RNNs entirely with attention so translation can be fully parallelised."

**You do not need to limit yourself to exactly one.** Many papers have 2–3 genuinely remarkable contributions. If so:
- List all of them in the Killer Application node's `content` (each as a `**bold**` heading with a short explanation), or
- If they are truly independent storylines, add an extra backbone node per killer application.

Do not force weak contributions into the list — only include what is genuinely remarkable.

### Step 3 — Build the backbone (5 nodes)

Create exactly **5 backbone `main_topic` nodes** at `x: 0`, spaced `y: 300` apart:

| # | Node title (Korean file) | Node title (English file) | What to put in `content` |
|---|-------------------------|---------------------------|--------------------------|
| 1 | **Killer Application** | **Killer Application** | The problem(s) solved and why remarkable. Be concrete and specific. |
| 2 | **필요한 이유 (Why)** | **Why It's Needed** | What existing approaches fail to do, and why. Include key limitation equations in KaTeX. |
| 3 | **해결책 (Solution)** | **Solution** | The core technical contribution. Key equations in KaTeX, architecture description. Embed architecture diagram image if available. |
| 4 | **결과 (Results)** | **Results** | Quantitative evidence. Benchmark tables in Markdown. Embed performance charts as images. |
| 5 | **결론 (Conclusion)** | **Conclusion** | What this enables. Future directions, limitations, broader impact. |

**Graph language**: Write the whole graph in Korean or entirely in English — both are fully supported. Follow the user's request; if unspecified, default to Korean with English terms alongside (per Language rules). For an English-only graph, use the English column titles and skip the 병기 rule.

Connect backbone nodes in sequence with `arrow` edges (1→2→3→4→5).

### Step 4 — Add sub-nodes (x: 500–550)

For each backbone node, add **sub-nodes branching to the right**. Use the appropriate template:

| What | Template | When to add |
|------|----------|-------------|
| Key equation explained in depth | `method` (sharp) | Every important formula deserves its own node |
| Data table from the paper | `method` (sharp) | Put the markdown table directly in `content` |
| Figure / diagram image | `method` (sharp) | Embed `[[IMG:filename:WxH]]` in `content` |
| Deep question or gap | `gap` (rounded) | "Why did they choose X?", "What if Y instead?" |
| Related prior work | `reference` (rounded) | Papers that are cited as baselines or inspirations |
| Design decision memo | `memo` (rounded) | Choices that seem arbitrary but have a reason |

Space sub-nodes at ~`y: 150` intervals around their parent's y-center, at `x: 500`.

Connect each sub-node to its parent backbone node with a `line` edge.

### Step 5 — Equations, tables, images

**Equations (KaTeX)**
- **Prefer `$$block$$` (display) over `$inline$`** — every important formula should stand on its own line as `$$...$$`. Inline `$...$` is only for short symbols referenced inside a sentence (e.g. `$d_k$`, `$O(n^2)$`).
- In JSON strings, every backslash must be doubled: `\\frac`, `\\sqrt`, `\\text`, etc.
- Never use Unicode math symbols (α β × →) outside `$...$`.

**Tables (Markdown)**
- Use GFM table syntax with a separator row (`|---|---|`).
- Only in `node.content`, not in `toggleItems[].content`.
- Benchmark tables, ablation results, and hyperparameter tables all deserve their own node.

**Images (figures and diagrams)**
- For any figure, chart, or architecture diagram: extract from the PDF and save to `.<basename>-imgs/`.
- Even diagrams (not just graphs) should be saved as images — a good diagram is worth a thousand words.
- Embed with `[[IMG:filename.png:WxH]]` in `node.content`.
- Use Pillow or ImageMagick to crop/save (see ENVIRONMENT.md).

**Bold text**
- Use `**word or phrase**` inside any `content` or `original.text` to make text bold and slightly larger in the viewer.
- The `**` markers are hidden in the rendered view; they appear only during editing.

### Step 6 — Write `original` quotes

For every backbone node, add the verbatim quote from the PDF that best supports that node's claim:
```jsonc
"original": {
  "text": "Exact verbatim quote from the PDF. Never paraphrase.",
  "location": "§3.2, p.7"
}
```

### Step 7 — Finalize
- Update `"modified"` to the current ISO 8601 timestamp.
- Tell the user: **"Click ↺ Reload in the editor toolbar to see the updated graph."**

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
  "content": "Main body text. Supports KaTeX, Markdown tables, [[IMG:...]] tokens, and **bold**. See Content Syntax section.",
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
| `**bold**` | ✅ | ✅ |

**Rule**: Put tables and images in `node.content` only. `toggleItems[].content` is for KaTeX math, bold text, and plain text.

---

### KaTeX math

| Syntax | Renders as |
|--------|------------|
| `$d_k$` | inline math |
| `$$\text{Attention}(Q,K,V)=\text{softmax}\!\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$` | block math |

> **Recommendation: write formulas as `$$...$$` display blocks**, not inline.
> Display math is easier to read, easier to edit, and renders larger.
> Reserve inline `$...$` for short symbols mentioned mid-sentence (`$d_k$`, `$O(n \log n)$`).

> ⚠️ **Never use Unicode math characters.** Always use KaTeX syntax instead.
> The renderer only processes `$...$` and `$$...$$` blocks — Unicode symbols outside these
> blocks appear as raw characters and look inconsistent or broken.

> 💲 **Literal dollar signs (currency) must be escaped as `\$`** — e.g. `**\$4.28/GB**`.
> A bare `$` opens an inline-math region and swallows the text up to the next `$`,
> breaking both the math renderer (red error text) and `**bold**` pairing.
> The renderer displays `\$` as a plain `$`.
> In JSON strings the backslash must be doubled, like every other backslash:
> `"content": "DDR5 DRAM **\\$4.28/GB**"`.

| ❌ Unicode (do NOT use) | ✅ KaTeX (always use this) |
|------------------------|--------------------------|
| `α β γ δ θ λ μ σ φ ω` | `$\alpha$ $\beta$ $\gamma$ $\delta$ $\theta$ $\lambda$ $\mu$ $\sigma$ $\phi$ $\omega$` |
| `² ³` | `$x^2$ $x^3$` |
| `× ÷` | `$\times$ $\div$` |
| `→ ← ↑ ↓` | `$\rightarrow$ $\leftarrow$ $\uparrow$ $\downarrow$` |
| `≈ ≤ ≥ ≠ ∈` | `$\approx$ $\leq$ $\geq$ $\neq$ $\in$` |
| `∑ ∏ ∫ √ ∞` | `$\sum$ $\prod$ $\int$ $\sqrt{}$ $\infty$` |
| `ℝ ℕ ℤ` | `$\mathbb{R}$ $\mathbb{N}$ $\mathbb{Z}$` |
| `d_k d_v` (subscript) | `$d_k$ $d_v$` |

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

---

### Bold text

Wrap text in double asterisks to render it **bold** with a slightly larger size:

```
**key term** or **important point**
```

- The `**` markers are **hidden in the rendered view** — they appear only when editing.
- Renders as `<strong>` with `font-size: 1.1em` relative to the node's font size.
- Can be combined with KaTeX: `**Scaled Dot-Product**: $\\text{Attention}(Q,K,V)$`
- Works in `node.content`, `original.text`, and `toggleItems[].content`.

---

## Position guidelines

- Backbone (main) nodes: arrange vertically, `y` spacing of ~300px, `x` = 0
- Sub-nodes: arrange to the right of their parent, `x` offset of ~500–550px (default node width is 432px — keep sub-nodes clear of the backbone column)
- Distribute sub-nodes vertically around their parent's y-center (~150px spacing)
- Check all existing node positions before placing new ones — avoid overlapping
- The overlap-prevention algorithm runs automatically in the editor and HTML viewer, but clean initial placement still helps

---

## Language rules

- `content` may be in any language (English, Korean, etc.)
- Use a consistent language throughout one file
- English is preferred for files intended for sharing
- **When writing in Korean, always include the English term alongside key technical expressions** — e.g. "다중 헤드 주의(multi-head attention)", "위치 인코딩(positional encoding)". This applies to node titles and content.
- `original.text` must always be a verbatim quote from the source (never paraphrase)

---

## Editor interaction (for reference)

> This section describes UI behaviour — not JSON schema. Agents editing JSON do not need to reproduce this, but knowing it helps when setting `contentExpanded`.

| Interaction | Behaviour |
|-------------|-----------|
| Click **tag badge** (e.g. "Gap / Idea") | Drag node + pin **generation highlight** — the node, its parents/children, and connecting wires turn red; background clicks keep it, `Esc` clears it |
| Click **node title** | Toggle `contentExpanded` (fold / unfold) |
| Right-click **node title** | Edit title inline |
| Click a **wire** | Select edge (blue); `Delete` removes it |
| Drag from a **port dot** onto a node body | Create an edge |
| `Ctrl+F` / `Cmd+F` | Open search dropdown (live filter by title + content); matched text inside nodes is marked in the inverse template color |
| `↑` / `↓` in search | Preview node (viewport flies to it); dropdown stays open |
| `Enter` in search | Confirm: expands selected node, collapses all other matches |
| `Shift`+wheel on toolbar | Slide the toolbar horizontally when the window is narrow |

**Overlap prevention**: When a node is unfolded (expanded), nodes below it in the same visual column are automatically pushed down, and horizontally adjacent nodes keep a minimum gap. When it is folded again, they pull back to their original positions. Wires are routed around nodes automatically. This works in both the editor and the exported HTML viewer.

When an agent sets `"contentExpanded": true` on nodes it wants to highlight, those nodes will open automatically when the file is loaded or reloaded.

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
- [ ] Literal currency dollars escaped: `\\$` in JSON strings (never a bare `$` outside math)
- [ ] Important formulas written as `$$...$$` display blocks (inline `$...$` only for short in-sentence symbols)
- [ ] Korean content includes English terms alongside key technical expressions
- [ ] No bare Unicode math symbols outside `$...$` — α/β/×/→/≤/∑/√/ℝ etc. must be KaTeX
- [ ] Markdown tables have a separator row (`|---|---|`) — only in `node.content`, not toggleItems
- [ ] `[[IMG:...]]` tokens only in `node.content`, image files exist in `.<basename>-imgs/`
- [ ] `toggleItems[].id` values are unique within the file
- [ ] `links` field present on every node (use `[]` if empty)
