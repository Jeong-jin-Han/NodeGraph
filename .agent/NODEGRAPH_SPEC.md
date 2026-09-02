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

## Quick start

When the user says **"apply NodeGraph"** (or the Korean equivalent, **"NodeGraph 적용해"**) and provides a paper PDF path, a lecture-slides PDF path, or a codebase's root folder path, execute the matching workflow below — **PDF → NodeGraph workflow** for a paper, **Lecture → NodeGraph workflow** for lecture slides, **Code → NodeGraph workflow** for a codebase — without asking for further clarification.

**One-sentence goal (paper)**: Find what this paper does that no one did before, and structure it so a reader can grasp why it matters in under 5 minutes.

**One-sentence goal (lecture)**: Reconstruct the flow of the lecture — what it teaches, in what order, and why that order — so a student can review the whole session in under 5 minutes.

**One-sentence goal (code)**: Find how this codebase actually works, and structure it so a new contributor can navigate it confidently in under 5 minutes.

**Writing principles** (apply throughout):
- **Top-down writing, never bottom-up (두괄식)**: Every node's `content` is written top-down — open with the single most important claim, conclusion, or number (the one sentence the reader must take away), then the explanation and evidence behind it. Put that first sentence's key phrase in `**bold**`. Bottom-up writing — starting from background, definitions, or "the paper says…" run-ups and building toward the point — is not allowed; a reader skimming only each node's first line should still get the whole story. The same rule applies to `toggleItems[].content`.
- **Bilingual glossing**: When writing content in Korean, include the English term alongside key technical expressions, so readers never have to guess what the original English term was (see **Language rules** below for the exact convention and example).
- **Not limited to one Killer Application**: Papers often have more than one remarkable contribution. Capture all of them (see Step 2).
- **Prefer display-block math**: Prefer `$$...$$` block math over `$...$` inline for formulas. Use inline only for short symbols inside a sentence (see Step 5).
- **Intent-centered analysis**: Every paper has one. Every table, figure, and key data point you embed must be explained through that lens — not "what does this show" but "why does this matter for the problem this paper claims to solve" (see Step 5). A table or image with no such explanation is incomplete, the same way a formula with no explanation is.
- **No hallucination**: Every claim traces back to the paper's own text. Never invent numbers, citations, comparisons, or "facts" from general knowledge to fill a gap. If a point genuinely needs something outside the PDF (a baseline's actual reported number, a follow-up result, prior work the paper doesn't quote), either attach a real `links` entry pointing to where it can be verified (see **NodeLink schema**), or leave that point unwritten rather than stating it as fact — an incomplete node is correct behavior; a fabricated one is not. This applies to every field, not just `original.text` (Step 6's verbatim-quote rule is the strictest case of this same principle).

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

**Graph language**: Write the whole graph in Korean or entirely in English — both are fully supported. Follow the user's request; if unspecified, default to Korean with English terms alongside (per **Language rules**). For an English-only graph, use the English column titles and skip the bilingual-glossing rule.

Connect backbone nodes in sequence with `arrow` edges (1→2→3→4→5).

### Step 4 — Add sub-nodes (x: 500–550)

For each backbone node, add **sub-nodes branching to the right**. Use the appropriate template:

| What | Template | When to add |
|------|----------|-------------|
| Key equation explained in depth | `method` (sharp) | Every important formula deserves its own node |
| Data table from the paper | `method` (sharp) | Put the markdown table directly in `content` |
| Figure / diagram image | `method` (sharp) | Embed `[[IMG:filename:WxH]]` in `content` |
| Deep question or gap | `gap` (rounded) | "Why did they choose X?", "What if Y instead?" |
| Related prior work | `reference` (rounded) | Papers the PDF itself cites as baselines or inspirations — only what's actually in the paper's own citations/discussion, never a paper you recall from general knowledge that the PDF doesn't mention. Add a `links` entry (arXiv/DOI URL) when you have one; if you don't have a verifiable link, still only include it if the PDF names it, and say so in `content` instead of inventing a link |
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
- Works in both `node.content` and `toggleItems[].content`.
- Benchmark tables, ablation results, and hyperparameter tables all deserve their own node — put secondary/supporting tables inside a toggle to keep the main node compact.
- **Don't just paste the table.** Next to it, write 1–2 sentences on what the numbers show and how that connects back to the Killer Application — e.g. "removing the residual connection drops BLEU by 3.2, confirming the depth this architecture needs would otherwise be untrainable." A table with no interpretation is incomplete.

**Images (figures and diagrams)**
- For any figure, chart, or architecture diagram: extract from the PDF and save to `.<basename>-imgs/`.
- Even diagrams (not just graphs) should be saved as images — a good diagram is worth a thousand words.
- Embed with `[[IMG:filename.png:WxH]]` — works in both `node.content` and `toggleItems[].content`.
- Use Pillow or ImageMagick to crop/save (see ENVIRONMENT.md).
- **Don't just embed the image.** Explain what it depicts and why it matters for the Killer Application — e.g. "this diagram shows every position attending to every other position in one step, the mechanism that replaces the RNN's sequential dependency." The image is evidence; evidence needs an argument attached to it.

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

**The page number in `location` must be correct** — right-clicking `original.text` in the editor jumps the built-in PDF viewer to that page (parsed from `p.N`) and highlights the matching sentence. A wrong page number sends the user to the wrong place. This feature requires the graph's top-level `source.pdf` to be set (see Top-level schema below).

### Step 7 — Finalize
- Update `"modified"` to the current ISO 8601 timestamp.
- Tell the user: **"Click Reload in the editor toolbar to see the updated graph."**

---

## Lecture → NodeGraph workflow

Lecture slide decks are PDFs, so everything from the PDF workflow carries over
mechanically — `source.pdf`, quote-jump, `.<basename>-imgs/` image extraction, the
same target file naming. What changes is the shape of the content: **many pages,
sparse text per slide, figure-heavy** — and the goal shifts from "why is this paper
remarkable" to "what is the flow of this lecture".

### Step 0 — Setup
Same as the PDF workflow (read `.agent/ENVIRONMENT.md`, identify/create
`<name>.nodegraph.json` next to the slides PDF, set top-level `source.pdf`).

### Step 1 — Read the slide deck
- Read **every slide** (chunk if >20 pages). Expect far less text per page than a
  paper — the meaning often lives in the figures, so plan to extract images liberally.
- Identify the deck's own structure first: agenda/outline slides, section-divider
  slides, recurring headers, and the slide ranges each section covers.

### Step 2 — Find the storyline
Answer this question: **"What is this lecture teaching, and why in this order?"**

A lecture is a designed pedagogical sequence — motivation, then concepts building on
each other, then examples, then synthesis. The backbone must make that arc visible,
not just list topics.

### Step 3 — Build the backbone (variable, follow the lecture's own sections)

Unlike the paper workflow's fixed 5 nodes, the backbone mirrors **the lecture's own
section structure**: one `main_topic` node per major section, in teaching order
(typically 4–8 nodes), at `x: 0`, spaced `y: 300` apart.

- **The first backbone node is always an overview node** — the lecture's topic,
  learning goals, and prerequisites (from the title/agenda slides, or inferred).
- Each section node's title carries the section name; note the slide range in
  `content` (e.g. "slides 12–27") so the reader can map graph → deck at a glance.
- Do not invent sections — if the deck has divider slides or an agenda, follow them;
  only fall back to your own segmentation when the deck provides none.

Connect backbone nodes in sequence with `arrow` edges.

### Step 4 — Add sub-nodes (x: 500–550)

For each section, add sub-nodes branching to the right. Use the appropriate template
(see the lecture default set under **`nodeTemplates`**):

| What | Template | When to add |
|------|----------|--------------|
| A concept/definition introduced | `concept` (sharp) | Every term the lecture defines deserves its own node — quote the definition **verbatim** in `original` |
| A worked example / derivation | `example` (sharp) | Examples are how lectures teach; capture the setup and the punchline, not every intermediate line |
| A key diagram/chart from a slide | `figure` (sharp) | Extract with `[[IMG:...]]` — on a figure-heavy slide the image IS the content; add 1–2 sentences on what it shows and where it sits in the lecture's flow |
| Deep question / likely exam point | `question` (rounded) | "Why does this condition matter?", things the lecturer emphasized |
| Unclear or glossed-over point | `gap` (rounded) | Something to look up or ask about later |
| Cited paper/book/resource | `reference` (rounded) | Only what the slides themselves cite |
| Misc note | `memo` (rounded) | Anything else worth remembering |

Positioning follows the same hop rules as the other workflows (**Position guidelines**).
Connect each sub-node to its section node with a `line` edge.

### Step 5 — Images

Slides are the image-heavy case this mechanism was made for — extract generously
(architecture diagrams, plots, annotated equations rendered as graphics), same
`.<basename>-imgs/` + `[[IMG:filename:WxH]]` mechanics as the PDF workflow, and the
same rule: every embedded image needs 1–2 sentences of interpretation tying it to
the lecture's flow. KaTeX/table rules from **Content syntax** apply unchanged.

### Step 6 — Write `original` quotes

Same mechanism as the PDF workflow — verbatim slide text with `location: "p.N"`
where `N` is the **slide (page) number**, which drives right-click quote-jump.
Two lecture-specific notes:
- **Definitions and technical terms must be quoted in the original language of the
  slides, verbatim** — never translate or paraphrase a definition inside
  `original.text` (the graph's own `content` follows the normal **Language rules**,
  with the original English term alongside).
- Slide text is short, so the quote may be just a sentence or a bullet — that's
  fine; even when the text match is too short to highlight, the `p.N` still lands
  the reader on the right slide.

### Step 7 — Finalize
Same as the PDF workflow (update `"modified"`, tell the user to hit Reload).

---

## Code → NodeGraph workflow

### Step 0 — Setup
1. Identify the target file: `<repo-name>.nodegraph.json` (create it if it does not exist), saved directly inside the codebase's root folder (the same folder the user pointed you at — call it `PROJECT_FOLDER`). This matters because every `code`-type link (Step 6) resolves relative to wherever this JSON file lives, the same way `pdf`-type links already resolve relative to the JSON's own directory in the PDF workflow.
2. If the JSON already exists, read it first so you don't clobber existing work.

### Step 1 — Read the codebase
- Walk the directory tree from `PROJECT_FOLDER` down, respecting `.gitignore` (skip `node_modules/`, build output, lockfiles, etc. — they're not architecture).
- Find the entry point(s) (`main`/`index` file, `package.json`'s `main`/`bin`, a `src/` root, etc.) and read outward from there rather than reading every file exhaustively.
- Identify the major modules/layers and how they depend on each other.

### Step 2 — Find the core idea
Answer this question: **"What does this codebase actually do, and what's the central approach that makes it work?"**

This becomes the framing of the first backbone node. Not a generic description like "a web app for managing tasks." Specific: "a VS Code extension that renders documents as an editable node graph, using grid-based A* routing so wires never cross a node."

### Step 3 — Build the backbone (5 nodes)

Create exactly **5 backbone `main_topic` nodes** at `x: 0`, spaced `y: 300` apart:

| # | Node title (Korean file) | Node title (English file) | What to put in `content` |
|---|---------------------------------------|-----------------------------------|--------------------------|
| 1 | **개요 (Overview)** | **Overview** | What this project does and the core idea that makes it work, in a sentence or two. Be concrete and specific, not a generic tagline. |
| 2 | **구조 (Architecture)** | **Architecture** | The major components/layers and how they fit together (e.g. extension host vs. webview, frontend vs. backend). A short table of components is welcome here. |
| 3 | **핵심 구현 (Core Implementation)** | **Core Implementation** | The specific mechanisms that make the system work — the interesting algorithms, data structures, or protocols. Most `code`-type `links` (Step 6) belong on the sub-nodes under this backbone node. |
| 4 | **데이터/제어 흐름 (Data & Control Flow)** | **Data & Control Flow** | How a request/event/action actually moves through the system end to end — e.g. "user clicks X → message posted to extension host → file written → webview re-rendered." |
| 5 | **설계 결정과 주의사항 (Design Decisions & Gotchas)** | **Design Decisions & Gotchas** | Non-obvious choices and constraints a new contributor needs to know before touching the code — the things that aren't written in any single file's comments. |

**Graph language**: same rule as the PDF workflow — write the whole graph in Korean or entirely in English, following the user's request (default to Korean with English terms alongside per **Language rules** if unspecified).

Connect backbone nodes in sequence with `arrow` edges (1→2→3→4→5).

### Step 4 — Add sub-nodes (x: 500–550)

For each backbone node, add **sub-nodes branching to the right**. Use the appropriate template:

| What | Template | When to add |
|------|----------|--------------|
| A specific module/file worth understanding on its own | `module` (sharp) | Every module central to the architecture deserves its own node |
| A step in a data/control flow | `flow` (sharp) | Each meaningful hop in a request/event pipeline |
| A non-obvious design decision | `decision` (sharp) | Choices that look arbitrary but have a real reason — code's equivalent of the paper workflow's most valuable node type |
| Deep question or open issue | `question` (rounded) | "Why is this cached instead of recomputed?", "What happens if this call fails?" |
| Known limitation / improvement idea | `gap` (rounded) | TODOs, things that could be refactored, known rough edges |
| Related external doc/dependency | `reference` (rounded) | Library docs, RFCs, or upstream projects this code actually depends on or cites (in comments, README, package.json) — never something recalled from general knowledge that the codebase itself doesn't reference |
| Misc note | `memo` (rounded) | Anything else worth remembering |

Space sub-nodes at ~`y: 150` intervals around their parent's y-center, at `x: 500`. Same **hop-based positioning rule** as the PDF workflow — see **Position guidelines** below.

Connect each sub-node to its parent backbone node with a `line` edge.

### Step 5 — Tables and diagrams (optional)

KaTeX and Markdown tables (see **Content syntax** below) still apply where relevant — algorithmic complexity, an API/props table, a benchmark. Most code graphs won't need them as heavily as a paper graph does; don't force it.

### Step 6 — Write `original` snippets and `code` links

For nodes describing a specific piece of code, add the verbatim snippet the same way the PDF workflow quotes the paper:

```jsonc
"original": {
  "text": "Exact verbatim code snippet. Never paraphrase.",
  "location": "src/webview/utils/wireGeometry.ts:152-206"   // free-text caption only — NOT clickable by itself
},
"links": [
  { "type": "code", "target": "src/webview/utils/wireGeometry.ts:152-206", "label": "wireGeometry.ts:152" }
]
```

**Unlike the PDF workflow, `original.location` alone does not drive navigation for code** — there is no page-search mechanism to parse it. One-click navigation comes entirely from a `links` entry of `"type": "code"` (see **NodeLink schema** below). Add one to every node that references a real location in the code, with `target` as a path relative to this JSON file's own directory, in the form `path/to/file.ts`, `path/to/file.ts:42` (a single line), or `path/to/file.ts:42-58` (an inclusive range).

### Step 7 — Finalize
- Update `"modified"` to the current ISO 8601 timestamp.
- Tell the user: **"Click Reload in the editor toolbar to see the updated graph."**

---

## Top-level schema (`NodeGraph`)

```jsonc
{
  "version": "1.0.0",          // always "1.0.0" — do not change
  "title": "Paper Title",       // display name shown in the UI
  "created": "2026-07-06T00:00:00.000Z",   // ISO 8601; set once on creation, never change again
  "modified": "2026-07-06T12:00:00.000Z",  // ISO 8601; UPDATE after EVERY edit session
  "source": {                   // optional — paper / document metadata (PDF workflow only)
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

`source` is specific to the PDF workflow (`source.pdf` is what makes right-click-to-jump-to-page work — see Step 6 of that workflow). Code graphs have no equivalent top-level field to set and should just omit `source` entirely — `code`-type links (see **NodeLink schema**) carry their own path, so no top-level pointer is needed.

Required top-level fields: `version`, `title`, `created`, `modified`, `nodeTemplates`, `nodes`, `edges`, `viewport`.
Optional: `source`, `canvasImages`.

---

## `nodeTemplates`

A map of template key → template definition. Every node's `"template"` field must match one of these keys.

```jsonc
// PDF workflow default set
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

```jsonc
// Lecture workflow default set (see Step 4 of Lecture → NodeGraph workflow)
"nodeTemplates": {
  "main_topic": { "label": "Section",     "color": "#4B8BBE", "icon": "file-text",    "shape": "sharp"   },
  "concept":    { "label": "Concept",     "color": "#5C9E6E", "icon": "cpu",           "shape": "sharp"   },
  "example":    { "label": "Example",     "color": "#9B59B6", "icon": "bar-chart-2",   "shape": "sharp"   },
  "figure":     { "label": "Figure",      "color": "#E74C3C", "icon": "image",         "shape": "sharp"   },
  "question":   { "label": "Question",    "color": "#E5A835", "icon": "help-circle",   "shape": "rounded" },
  "gap":        { "label": "Gap / Idea",  "color": "#1ABC9C", "icon": "lightbulb",     "shape": "rounded" },
  "reference":  { "label": "Reference",   "color": "#95A5A6", "icon": "book-open",     "shape": "rounded" },
  "memo":       { "label": "Memo",        "color": "#BDC3C7", "icon": "edit-3",        "shape": "rounded" }
}
```

```jsonc
// Code workflow default set (see Step 4 of Code → NodeGraph workflow)
"nodeTemplates": {
  "main_topic": { "label": "Main topic",  "color": "#4B8BBE", "icon": "file-text",    "shape": "sharp"   },
  "module":     { "label": "Module",      "color": "#5C9E6E", "icon": "package",       "shape": "sharp"   },
  "flow":       { "label": "Flow",        "color": "#9B59B6", "icon": "activity",      "shape": "sharp"   },
  "decision":   { "label": "Decision",    "color": "#E74C3C", "icon": "alert-circle",  "shape": "sharp"   },
  "question":   { "label": "Question",    "color": "#E5A835", "icon": "help-circle",   "shape": "rounded" },
  "gap":        { "label": "Gap / TODO",  "color": "#1ABC9C", "icon": "lightbulb",     "shape": "rounded" },
  "reference":  { "label": "Reference",   "color": "#95A5A6", "icon": "book-open",     "shape": "rounded" },
  "memo":       { "label": "Memo",        "color": "#BDC3C7", "icon": "edit-3",        "shape": "rounded" }
}
```

All three sets are just the recommended defaults — `nodeTemplates` is data inside the file, so an agent can rename/recolor/add keys freely as long as every node's `"template"` matches one.

| `shape` value | When to use |
|---------------|-------------|
| `"sharp"`     | Content from the source itself (paper topics/methods/results/claims, or code modules/flows/decisions) |
| `"rounded"`   | Content added around the source (questions, gaps, memos, references) |

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
      "content": "Renders exactly like node.content — Markdown tables, KaTeX, and [[IMG:...]] all work here too.",
      "expanded": false
    }
  ],
  "contentExpanded": false,     // whether the content panel is open (default false)
  "originalExpanded": false,    // whether the original-quote panel is open (default false)
  "childrenExpanded": false,    // required field, but currently has no effect on rendering — always set false
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

Edges drawn interactively in the editor (port-dot drag) get their type chosen
automatically to match the guidelines above: `"arrow"` only when both endpoints
are `main_topic`, `"line"` otherwise — no manual cleanup needed. Which node you
drag from doesn't matter either; the editor always stores whichever endpoint is
already anchored (a `main_topic`, or a node that already has a parent) as
`source`, so the direction you drag in never breaks the hop tree. Duplicate
edges with the same source and target are rejected by the editor.

**Convergent edges (multiple sources into one target)** render fine — both wires
draw correctly — but layout position is still one-parent-per-node under the
hood: whichever incoming edge is found first becomes that node's real tree
parent, and any other source node with no incoming edge of its own falls back
to treating its own edge's target as a virtual parent, purely for positioning.
Practically this means: don't worry about it when just connecting nodes, but if
a source-only node's placement looks off after adding a convergent edge, that's
why — it's now positioned as if it hangs off the node it points into.

**Avoid transitively redundant edges yourself** — if A→B and B→C already exist, do not
also add a direct A→C edge; the reader can already follow A→B→C. The editor no longer has
a "Reduce Edges" button (removed — this used to be a manual cleanup step), so agents must
keep `edges` clean when writing them: after adding nodes/edges, check whether any edge's
target is already reachable from its source through other edges/`children`, and drop it if so.

---

## NodeLink schema

Nodes can have a `links` array for external references:

```jsonc
{
  "type": "url",              // "pdf" | "obsidian" | "url" | "internal" | "code"
  "target": "https://...",   // URL, file path, Obsidian URI, or code path (see below)
  "label": "arXiv paper"
}
```

Click behaviour: `url` and `obsidian` open externally; `pdf` targets are resolved
relative to the JSON file's directory. `internal` is reserved and currently a no-op.

`code` targets (Code workflow only) are a path relative to the JSON file's own
directory, optionally with a line spec: `"src/foo.ts"`, `"src/foo.ts:42"`, or
`"src/foo.ts:42-58"` (1-indexed, inclusive). Click behaviour differs by context:
- **In the live editor**: opens the file and reveals/selects the given line range directly — no search step, unlike `pdf`'s page-jump, since VS Code can address an exact line natively.
- **In the exported standalone HTML**: resolves to a GitHub blob URL (`https://github.com/<owner>/<repo>/blob/<commit-sha-at-export-time>/<path>#L<start>-L<end>`) if the project's git remote is on `github.com`. If it isn't (no git repo, no `origin`, non-GitHub host, git not installed), the link renders as inert text — same graceful degradation `canvasImages` already have for HTML export.

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

> ⚠️ Canvas images are editor-only: the HTML export does not render them.
> If an image must appear in the exported HTML, embed it in a node's `content`
> as an `[[IMG:...]]` token instead.

---

## ID format rules

| Entity | Format | Example |
|--------|--------|---------|
| Node | `node_` + 3-digit zero-padded | `node_001`, `node_023` |
| Edge | `edge_` + 3-digit zero-padded | `edge_001`, `edge_015` |
| Toggle | `toggle_` + 3-digit zero-padded | `toggle_001` |
| CanvasImage | `cimg_` + any unique suffix | `cimg_001` |

Always use the **next available number**. IDs must be unique within the entire file.

> Note: IDs created interactively in the editor use timestamp suffixes instead
> (`edge_1752650000000`, `toggle_1752650000000`, `cimg_1752650000000`). Agents should
> keep writing zero-padded IDs, but must tolerate both forms when reading a file.
> Uniqueness is the only hard requirement.

---

## Content syntax

> **This section is critical. Read it carefully before writing any `content` value.**

### Where each syntax feature works

Different fields have different rendering capabilities:

| Feature | `node.content` | `toggleItems[].content` |
|---------|:--------------:|:------------------------:|
| KaTeX inline `$...$` | ✅ | ✅ |
| KaTeX block `$$...$$` | ✅ | ✅ |
| Markdown table | ✅ | ✅ |
| `[[IMG:filename:WxH]]` | ✅ | ✅ |
| `**bold**` | ✅ | ✅ |

`node.content` and `toggleItems[].content` render identically — use toggles freely to keep secondary tables/images/detail out of the main node body.

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
- **At least one data row is required** — a header + separator with no rows below it renders as raw text, not a table.
- Use `\n` for newlines inside JSON strings.
- Works in both `node.content` and `toggleItems[].content`.

---

### Inline images

To embed an image inside a node's content area, or inside a toggle's content:

```
[[IMG:filename.png:600x400]]
```

- `filename.png` — the image file name only (no path)
- `600x400` — display width × height in pixels
- The image file must exist in `.<basename>-imgs/` next to the JSON file

**Image folder naming**: if the JSON file is `paper.nodegraph.json`, the image folder is `.paper-imgs/`. The folder is hidden (starts with `.`).

Works in both `node.content` and `toggleItems[].content`.

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

This is the same hop-based rule the editor applies automatically when a wire is drawn
interactively (`computeHopPosition` in `useGraph.ts`) — follow it by hand when writing
positions directly into JSON, so agent-authored and UI-authored graphs look consistent.

- **Backbone (main_topic) nodes**: arrange vertically, `y` spacing of ~300px, `x` = 0.
- **Hop 1** (a node whose direct parent — via `children` or an edge — is a main_topic node):
  place at `parent.x ± 750`, alternating around the parent's vertical center (`parent.y`,
  `parent.y+150`, `parent.y-150`, `parent.y+300`, ...). Default to the **right** (`+750`); once
  a main_topic parent already has 4 hop-1 children on the right, put further ones on the
  **left** (`-750`) instead.
- **Hop 2 and deeper**: do **not** re-split left/right. A node inherits whichever side its own
  direct parent is already on (compare the parent's `x` to its nearest main_topic ancestor's
  `x`) and continues **750px further in that same direction** per level — this is also what
  keeps a long hop-2+ chain from overlapping the hop-1 cluster near the backbone.
- Check all existing node positions before placing new ones — avoid overlapping.
- The overlap-prevention algorithm runs automatically in the editor and HTML viewer, but clean initial placement still helps.

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
| `Ctrl+F` / `Cmd+F` | Open search dropdown (live filter by title + content + original text + toggle titles/content); matched text inside nodes is marked in the inverse template color |
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
- [ ] No transitively redundant edges (A→C when A→B→C already exists) — see Edge schema above
- [ ] KaTeX formulas: **every backslash doubled** (`\\frac`, `\\sqrt`, `\\text`, `\\left`, `\\right`)
- [ ] KaTeX braces balanced
- [ ] Literal currency dollars escaped: `\\$` in JSON strings (never a bare `$` outside math)
- [ ] Important formulas written as `$$...$$` display blocks (inline `$...$` only for short in-sentence symbols)
- [ ] Korean content includes English terms alongside key technical expressions
- [ ] No bare Unicode math symbols outside `$...$` — α/β/×/→/≤/∑/√/ℝ etc. must be KaTeX
- [ ] Markdown tables have a separator row (`|---|---|`) — works in `node.content` or `toggleItems[].content`
- [ ] `[[IMG:...]]` tokens reference files that exist in `.<basename>-imgs/` (works in `node.content` or `toggleItems[].content`)
- [ ] `toggleItems[].id` values are unique within the file
- [ ] `links` field present on every node (use `[]` if empty)
- [ ] Every table and figure node explains what it shows *and* why that matters for the Killer Application — not just embedded/pasted with no interpretation
- [ ] Every node's `content` is written top-down (두괄식) — key claim/conclusion in the first sentence, never bottom-up background/definition run-ups before the point
- [ ] No invented numbers, citations, or external claims — every claim traces to the PDF's own text, or has a real `links` entry, or was left unwritten
- [ ] (Code workflow) Every node that references a specific place in the code has a matching `links` entry with `"type": "code"` — `original.location` alone does not make it clickable
