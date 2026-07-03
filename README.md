# NodeGraph

A VS Code extension for building node-based knowledge graphs from research papers and documents. Open any `.nodegraph.json` file to get an interactive canvas with rich content nodes, wires, and an exportable HTML viewer.

## Features

- **Custom editor** for `.nodegraph.json` files — pan, zoom, drag nodes
- **Rich node content** — Markdown tables, LaTeX (KaTeX), inline images
- **Image support** — paste or drag images directly onto a node; stored as `[[IMG:filename:WxH]]` tokens
- **Expand / Collapse** — fold individual nodes or entire subtrees with one click
- **HTML export** — generate a self-contained HTML viewer (File → Export to HTML)
- **Toggle sections** — collapsible sub-sections inside each node
- **Original text** — attach the original source quote alongside your summary
- **Edge types** — `arrow` (causal flow) or `line` (reference / association)

## Getting Started

1. Run the command **NodeGraph: New Graph** (`Ctrl+Shift+P`) to create a new `.nodegraph.json` file.
2. The custom editor opens automatically for any `*.nodegraph.json` file.
3. Click a node header to select it; drag to reposition.
4. Use the toolbar buttons to expand/collapse all nodes or fit the view.

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
  "nodes": [
    {
      "id": "node_001",
      "template": "main_topic",
      "title": "Introduction",
      "content": "Summary text\n[[IMG:figure1.png:500x300]]",
      "original": { "text": "Exact quote...", "location": "§1, p.1" },
      "contentExpanded": true,
      "position": { "x": 0, "y": 0 },
      "children": ["node_002"],
      "links": []
    }
  ],
  "edges": [
    { "id": "edge_001", "source": "node_001", "target": "node_002", "type": "arrow", "label": "" }
  ]
}
```

## Commands

| Command | Description |
|---------|-------------|
| `NodeGraph: New Graph` | Create a new empty graph |
| `NodeGraph: Fit to View` | Fit all nodes in the viewport |
| `NodeGraph: Expand All` | Expand all node bodies |
| `NodeGraph: Collapse All` | Collapse all node bodies |

## License

MIT
