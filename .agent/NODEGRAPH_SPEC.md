# NodeGraph — Agent Editing Specification

This document describes how AI agents (Claude Code, Cursor, Copilot, etc.)
should read and edit `.nodegraph.json` files used by the NodeGraph VSCode extension.

## File format

Each `.nodegraph.json` file is a single JSON file containing a full knowledge graph
for one research paper or topic.

## Schema reference

See the `$schema` field in the JSON file, or `schema/nodegraph.schema.json` in the extension package.

## Quick start for agents

1. Read the entire `.nodegraph.json` file
2. Understand the structure: `nodes[]`, `edges[]`, `nodeTemplates{}`
3. Edit by modifying the JSON directly
4. The VSCode extension watches for file changes and auto-refreshes the UI

## Node ID format

- Nodes: `node_` + zero-padded 3-digit number (e.g., `node_001`, `node_015`)
- Edges: `edge_` + zero-padded 3-digit number (e.g., `edge_001`)
- IDs must be unique within the file
- When adding new nodes/edges, use the next available number

## Node shapes and their meaning

| Shape | `shape` value | When to use |
|-------|---------------|-------------|
| Sharp rectangle | `"sharp"` | Content directly from the paper (main topics, methods, results, claims) |
| Rounded rectangle | `"rounded"` | Content outside the paper (questions, external references, memos, gap analysis) |

Use the `template` field to reference a key in `nodeTemplates`. Each template defines shape, color, and icon.

## Content structure (bilingual)

Every node has two text fields:

| Field | Language | Purpose |
|-------|----------|---------|
| `content` | Korean | Summary in the reader's own words |
| `original.text` | English | Exact quote from the paper PDF |
| `original.location` | — | Source location: `"§N.M, p.X"` format |

**Critical rule:** `original.text` must be copied verbatim from the PDF.
Never paraphrase or modify the original text. This field exists specifically
to prevent hallucination by allowing the reader to verify the Korean summary
against the actual paper text.

## Adding nodes

```jsonc
{
  "id": "node_015",
  "template": "question",
  "title": "Short descriptive title",
  "content": "Korean summary of the concept...",
  "original": {
    "text": "Exact English quote from PDF...",
    "location": "§3.2, p.7"
  },
  "contentExpanded": false,
  "originalExpanded": false,
  "childrenExpanded": false,
  "position": { "x": 400, "y": -60 },
  "children": [],
  "images": [],
  "links": []
}
```

## Position guidelines

- Main flow (backbone): arrange vertically, `y` spacing of ~300px
- Sub-nodes: arrange to the right of parent, `x` offset of ~400px
- Distribute sub-nodes vertically around parent's y-center
- Avoid overlapping with existing nodes (check positions before placing)

## Adding edges

```jsonc
{
  "id": "edge_015",
  "source": "node_001",
  "target": "node_015",
  "type": "line",
  "label": ""
}
```

Edge type guidelines:
- `"arrow"`: backbone connections between main nodes (flow/sequence)
- `"line"`: main-to-sub, sub-to-sub, cross-references

## Adding images

1. Copy the image file to the `.<basename>-imgs/` folder
2. Add entry to the node's `images` array:

```jsonc
{
  "filename": "fig_003.png",
  "caption": "Figure 3: Architecture diagram",
  "source": "agent",
  "page": 8
}
```

## PDF → Backbone generation workflow

When asked to create a nodegraph from a PDF:

1. Read the entire PDF (all pages, chunk if >20 pages)
2. Identify major themes (NOT section headings — semantic idea units)
3. Create one `main_topic` (sharp) node per theme
4. Arrange vertically: `position.y` = index × 300
5. Connect with `arrow` edges (backbone flow)
6. For each node: write Korean `content` + English `original`
7. Identify relevant figures → extract to imgs folder → add to `images`
8. Update `modified` timestamp

## Post-edit checklist

After any edit, verify:
- [ ] All `id` values are unique
- [ ] All `children` IDs reference existing nodes
- [ ] All `edges` source/target reference existing nodes
- [ ] `modified` timestamp is updated
- [ ] No duplicate edges between the same pair of nodes
