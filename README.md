<p align="center">
  <img src="resources/banner-hires.png" width="100%" alt="NodeGraph — Structure the paper. Don't just read it." />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-Extension-007ACC?logo=visualstudiocode&logoColor=white&style=for-the-badge" alt="VS Code Extension" />
  <img src="https://img.shields.io/badge/version-0.6.0-orange?style=for-the-badge" alt="Version 0.6.0" />
  <img src="https://img.shields.io/badge/license-MIT-brightgreen?style=for-the-badge" alt="MIT License" />
</p>

---

A VS Code extension for building node-based knowledge graphs from research papers and documents. Open any `.nodegraph.json` file to get an interactive canvas with rich content nodes, wires, and an exportable HTML viewer.

---

## Perfect for

- **Actually understanding a paper**, not skimming it, by pulling the argument back into the ideas it converged from
- **AI-assisted notes without the hallucination risk**, since every claim traces back to the exact source quote
- **Papers full of math and tables**, where other note tools garble LaTeX inside a table and this one does not
- **Sharing notes outside VS Code**, since every graph exports to one self-contained HTML file, no extension needed

---

## A Quick Look

<p align="center">
  <img src="resources/demo-ex3.webp" width="100%" alt="Full agent run building the demo/ex3 nodegraph from the Mooncake paper, sped up, looping" />
</p>
<p align="center"><b>An agent reading a paper it had never seen before and building the full nodegraph end to end, sped up — see Benchmark below for the real numbers</b></p>

---

## Motivation

Writing a paper means **diverging** first (exploring branches, dead ends, alternative framings), then **converging** that down into one clean, linear narrative. Actually dissecting a paper, understanding *why* each choice was made and not another, means running that process in reverse: pulling the converged text back apart into the diverged ideas it came from. That's naturally **a node graph, not a linear document**. That's what led to this mind-map-shaped approach in the first place.

Existing tools weren't quite it. Obsidian-style Markdown notes are great for linking ideas, but **LaTeX doesn't render inside tables**, a real blocker for papers whose comparison tables are full of notation. NodeGraph fuses what those tools do well into a single node: GFM tables, LaTeX (via KaTeX), and inline images all render together, in the same card.

It's also built around **working with an agent rather than a mouse**. Hand-placing every node as you read is tedious enough to break the flow of thought. Point an agent at the shipped `.agent/NODEGRAPH_SPEC.md` instead, and (based on the question you're currently asking it) it can decide where in the graph a new idea belongs and write the node there itself, so a conversation with an agent turns directly into structure instead of stopping to file each note by hand.

An agent writing your notes raises an obvious concern: hallucination. That's exactly what the **Original tag** exists to guard against. Every claim can carry the exact source-text quote it's grounded in, and clicking it jumps straight into the source PDF and highlights the matching sentence, so you can **verify the agent's claim against the paper in one click** instead of trusting it blindly.

And since you don't always want to be inside VS Code to revisit your own notes, every graph **exports to a single self-contained HTML file**. Open it in any browser, no extension required.

---

## Screenshots

<p align="center">
  <img src="resources/screenshot-html-export.png" width="100%" alt="Editor on the left and the exported standalone HTML on the right, rendering the same node tree identically" />
</p>
<p align="center"><b>Editor and exported HTML side by side — same layout, same content</b></p>

<p align="center">
  <img src="resources/screenshot-debug-grid.png" width="100%" alt="Debug grid overlay in the editor and exported HTML, marking hop-level and main-topic-cluster boundaries, with the Ctrl+F search panel open and matching nodes highlighted in red" />
</p>
<p align="center"><b>Debug grid and Ctrl+F search<br/>hop-level/main-topic-cluster boundaries, plus in-canvas search with matching nodes highlighted, in both the editor and the export</b></p>

<p align="center">
  <img src="resources/screenshot-pdf-jump.png" width="100%" alt="An original-text quote outlined in a red box in the editor, connected by a red arrow to the matching highlighted sentence in the source PDF on the right" />
</p>
<p align="center"><b>PDF quote-jump<br/>right-click an original-text quote to open the source PDF and highlight the matching sentence (red box/arrow added for illustration)</b></p>

---

## Features

| | |
|---|---|
| **Rich node content** | Markdown (GFM) tables, LaTeX via KaTeX, inline images, and collapsible toggle sections — all with the same rich renderer |
| **Overlap-free hop layout** | Bottom-up/top-down auto-layout keyed to each main-topic's hop tree — expanding a node only grows its own branch, never disturbs siblings |
| **Smart wire routing** | A*-routed backbone wires that keep clear of node borders and spread apart when several share an endpoint; hop-child wires are direct straight lines anchored to the correct side |
| **PDF quote-jump** | Right-click an original-text quote to open the source PDF, jump to the page, and highlight the matching sentence |
| **Ctrl+F search** | BFS-ordered dropdown over titles, content, original text, and toggle sections, with inline match highlighting |
| **Debug grid** | One-click overlay of hop-level and main-topic-cluster boundaries for visually spotting layout issues |
| **HTML export** | A self-contained, interactive standalone viewer — search, highlighting, and layout included |
| **Agent-friendly** | A machine-readable spec (`.agent/NODEGRAPH_SPEC.md`) so AI agents can read and write graphs directly |

See **[FEATURES.md](docs/FEATURES.md)** for the complete feature list, organized by Editing / Layout & wires / Find & focus / Images / Files & export.

---

## Agent / AI Editing

> **Before pointing an AI agent at a project, run `NodeGraph: Copy Agent Spec to Workspace` once** — it writes `.agent/NODEGRAPH_SPEC.md` (copied from the extension bundle), `.agent/ENVIRONMENT.md` (freshly generated), and `.prompt/korean.md` / `.prompt/english.md` (ready-to-paste copies of the example prompt below, one per language) into one folder, so the agent can read all of it like any other file without needing to know the extension's install path. Right-click the target folder in the Explorer and pick it from the context menu (this is the reliable way in a multi-root workspace, or to target one specific subfolder — it writes into exactly the folder you clicked, nowhere else); running it from the Command Palette instead targets the workspace's only folder, or prompts you to pick one if there are several. It's opt-in rather than automatic on purpose: `.agent/NODEGRAPH_SPEC.md` is a large static doc identical across every install, and writing it into a folder automatically (the way `.agent/ENVIRONMENT.md` alone already does, silently, at every activation) would mean it could land in your own repo without you choosing that.
>
> **AI agents: read these two files before doing anything (both written by the command above, into the same folder):**
> 1. `.agent/NODEGRAPH_SPEC.md` — full JSON schema, syntax rules, and constraints
> 2. `.agent/ENVIRONMENT.md` — lists which Python libraries and CLI tools are installed on this machine (PDF reading, image processing, etc.)
>
> Key rules from the spec:
> - Backslashes in KaTeX **must be doubled** in JSON strings (`\\frac`, `\\sqrt`, `\\text`)
> - Prefer `$$...$$` display blocks for formulas — inline `$...$` only for short in-sentence symbols
> - Literal currency dollars must be escaped: `\$4.28/GB` (in JSON strings: `\\$4.28/GB`) — a bare `$` opens an inline-math region
> - When writing content in a non-English language, pair each key technical term with its original English form (see `.agent/NODEGRAPH_SPEC.md` for the exact convention)
> - The Killer Application is not limited to one — capture every genuinely remarkable contribution
> - `toggleItems[].content` renders exactly like `node.content` — Markdown tables, KaTeX, and `[[IMG:filename:WxH]]` tokens all work inside toggles too
> - Always update the `"modified"` timestamp after every edit

The file `.agent/NODEGRAPH_SPEC.md` (included in the extension) is a machine-readable specification for AI agents. It documents the full JSON schema, ID conventions, KaTeX/Markdown syntax rules, rendering support per field, and a step-by-step workflow for generating a nodegraph from a PDF.

A worked example is included at `demo/ex1/attention-is-all-you-need.nodegraph.json` — the full "Attention Is All You Need" paper rendered as a nodegraph with KaTeX formulas, Markdown tables, toggle sections, and deep question nodes.

**Typical agent workflow:**
1. Right-click the project folder in the Explorer and run `NodeGraph: Copy Agent Spec to Workspace` (one-time per folder)
2. Tell your agent to read `.agent/NODEGRAPH_SPEC.md` and `.agent/ENVIRONMENT.md`
3. Read or create the target `.nodegraph.json`
4. Edit the JSON directly
5. Click **Reload** in the toolbar to see the updated graph without closing/reopening the file

### Example prompt

<b>English</b> | <a href="docs/ko/README.md#example-prompt">한국어</a>

After running `NodeGraph: Copy Agent Spec to Workspace` on the folder that holds your PDF (step 1 above), paste this into your agent — fill in the path and it does the rest: reads the spec, reads the paper, and builds the graph without further back-and-forth. The same command also writes this out as `.prompt/english.md` (and a Korean version at `.prompt/korean.md`) in that folder, so you can open the file directly instead of copying it from here.

```
PDF_ABSOLUTE_PATH = <PDF_ABSOLUTE_PATH>
PROJECT_FOLDER = dirname(PDF_ABSOLUTE_PATH)

PROJECT_FOLDER/.agent/NODEGRAPH_SPEC.md and PROJECT_FOLDER/.agent/ENVIRONMENT.md
are already prepared for you — read both in full.

Based on the paper and those two files, briefly explain what kind of
nodegraph you can build from it. This extension ships a worked example
at demo/ex1/attention-is-all-you-need.nodegraph.json (inside its own
install folder) as a reference for depth/structure — check it if
useful, then build ours the same way for this paper.

Write all node content in English.

Follow the spec exactly, save the result inside PROJECT_FOLDER, and run
end to end without asking me anything. Tell me when done.
```

> **Benchmark** — an agent read the PDF, planned, and wrote each nodegraph end to end with no manual cleanup, on papers it had never seen before. Tested with Claude Code; other agentic coding tools should work the same way, since all it needs is the plain-markdown spec and prompt in `.agent`/`.prompt`:

<p align="center">
  <img src="https://img.shields.io/badge/Claude_Code-ffffff?logo=data:image/svg%2bxml;base64,PHN2ZyBoZWlnaHQ9IjIwMCIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkNsYXVkZSBDb2RlPC90aXRsZT48cGF0aCBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMC45OTggMTAuOTQ5SDI0djMuMTAyaC0zdjMuMDI4aC0xLjQ4N1YyMEgxOHYtMi45MjFoLTEuNDg3VjIwSDE1di0yLjkyMUg5VjIwSDcuNDg4di0yLjkyMUg2VjIwSDQuNDg3di0yLjkyMUgzVjE0LjA1SDBWMTAuOTVoM1Y1aDE3Ljk5OHY1Ljk0OXpNNiAxMC45NDloMS40ODhWOC4xMDJINnYyLjg0N3ptMTAuNTEgMEgxOFY4LjEwMmgtMS40OXYyLjg0N3oiIGZpbGw9IiNEOTc3NTciIGZpbGwtcnVsZT0iZXZlbm9kZCI+PC9wYXRoPjwvc3ZnPg==&style=for-the-badge" alt="Claude Code" />
  <img src="https://img.shields.io/badge/Codex-ffffff?logo=data:image/svg%2bxml;base64,PHN2ZyBoZWlnaHQ9IjIwMCIgc3R5bGU9ImZsZXg6bm9uZTtsaW5lLWhlaWdodDoxIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSIyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPkNvZGV4PC90aXRsZT48cGF0aCBkPSJNMTkuNTAzIDBINC40OTZBNC40OTYgNC40OTYgMCAwMDAgNC40OTZ2MTUuMDA3QTQuNDk2IDQuNDk2IDAgMDA0LjQ5NiAyNGgxNS4wMDdBNC40OTYgNC40OTYgMCAwMDI0IDE5LjUwM1Y0LjQ5NkE0LjQ5NiA0LjQ5NiAwIDAwMTkuNTAzIDB6IiBmaWxsPSIjZmZmIj48L3BhdGg+PHBhdGggZD0iTTkuMDY0IDMuMzQ0YTQuNTc4IDQuNTc4IDAgMDEyLjI4NS0uMzEyYzEgLjExNSAxLjg5MS41NCAyLjY3MyAxLjI3NS4wMS4wMS4wMjQuMDE3LjAzNy4wMjFhLjA5LjA5IDAgMDAuMDQzIDAgNC41NSA0LjU1IDAgMDEzLjA0Ni4yNzVsLjA0Ny4wMjIuMTE2LjA1N2E0LjU4MSA0LjU4MSAwIDAxMi4xODggMi4zOTljLjIwOS41MS4zMTMgMS4wNDEuMzE1IDEuNTk1YTQuMjQgNC4yNCAwIDAxLS4xMzQgMS4yMjMuMTIzLjEyMyAwIDAwLjAzLjExNWMuNTk0LjYwNy45ODggMS4zMyAxLjE4MyAyLjE3LjI4OSAxLjQyNS0uMDA3IDIuNzEtLjg4NyAzLjg1NGwtLjEzNi4xNjZhNC41NDggNC41NDggMCAwMS0yLjIwMSAxLjM4OC4xMjMuMTIzIDAgMDAtLjA4MS4wNzZjLS4xOTEuNTUxLS4zODMgMS4wMjMtLjc0IDEuNDk0LS45IDEuMTg3LTIuMjIyIDEuODQ2LTMuNzExIDEuODM4LTEuMTg3LS4wMDYtMi4yMzktLjQ0LTMuMTU3LTEuMzAyYS4xMDcuMTA3IDAgMDAtLjEwNS0uMDI0Yy0uMzg4LjEyNS0uNzguMTQzLTEuMjA0LjEzOGE0LjQ0MSA0LjQ0MSAwIDAxLTEuOTQ1LS40NjYgNC41NDQgNC41NDQgMCAwMS0xLjYxLTEuMzM1Yy0uMTUyLS4yMDItLjMwMy0uMzkyLS40MTQtLjYxN2E1LjgxIDUuODEgMCAwMS0uMzctLjk2MSA0LjU4MiA0LjU4MiAwIDAxLS4wMTQtMi4yOTguMTI0LjEyNCAwIDAwLjAwNi0uMDU2LjA4NS4wODUgMCAwMC0uMDI3LS4wNDggNC40NjcgNC40NjcgMCAwMS0xLjAzNC0xLjY1MSAzLjg5NiAzLjg5NiAwIDAxLS4yNTEtMS4xOTIgNS4xODkgNS4xODkgMCAwMS4xNDEtMS42Yy4zMzctMS4xMTIuOTgyLTEuOTg1IDEuOTMzLTIuNjE4LjIxMi0uMTQxLjQxMy0uMjUxLjYwMS0uMzMuMjE1LS4wODkuNDMtLjE2NC42NDYtLjIyN2EuMDk4LjA5OCAwIDAwLjA2NS0uMDY2IDQuNTEgNC41MSAwIDAxLjgyOS0xLjYxNSA0LjUzNSA0LjUzNSAwIDAxMS44MzctMS4zODh6bTMuNDgyIDEwLjU2NWEuNjM3LjYzNyAwIDAwMCAxLjI3MmgzLjYzNmEuNjM3LjYzNyAwIDEwMC0xLjI3MmgtMy42MzZ6TTguNDYyIDkuMjNhLjYzNy42MzcgMCAwMC0xLjEwNi42MzFsMS4yNzIgMi4yMjQtMS4yNjYgMi4xMzZhLjYzNi42MzYgMCAxMDEuMDk1LjY0OWwxLjQ1NC0yLjQ1NWEuNjM2LjYzNiAwIDAwLjAwNS0uNjRMOC40NjIgOS4yM3oiIGZpbGw9InVybCgjbG9iZS1pY29ucy1jb2RleC1fUl8wXykiPjwvcGF0aD48ZGVmcz48bGluZWFyR3JhZGllbnQgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIGlkPSJsb2JlLWljb25zLWNvZGV4LV9SXzBfIiB4MT0iMTIiIHgyPSIxMiIgeTE9IjMiIHkyPSIyMSI+PHN0b3Agc3RvcC1jb2xvcj0iI0IxQTdGRiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiM3QTlERkYiPjwvc3RvcD48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMzOTQxRkYiPjwvc3RvcD48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48L3N2Zz4=&style=for-the-badge" alt="Codex" />
  <img src="https://img.shields.io/badge/Antigravity-ffffff?logo=data:image/png;base64,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&style=for-the-badge" alt="Antigravity" />
  <img src="https://img.shields.io/badge/Cursor-ffffff?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABVlBMVEUAAAABAQEDAwMkJCQCAgIUFBSUlJT6+vr7+/sEBARsbGzr6+v////9/f1ra2tFRUXT09P+/v7S0tJERESwsLCxsbElJSUODg6IiIj39/f8/PyJiYkPDw9gYGDl5eXm5uZhYWE7OzvKyso8PDwdHR2lpaUICAiBgYH5+fmAgICoqKjW1tbh4eHo6Ojg4OCnp6dpaWkNDQ0MDAwJCQkKCgoLCwvR0dHc3NzPz8/FxcU2NjY5OTmkpKTAwMDOzs7Q0NDy8vJ7e3vd3d1SUlIQEBDf39++vr4xMTGFhYWZmZkWFhYpKSn19fXu7u5xcXEFBQWpqanX19dHR0fn5+cRERFqamrt7e2Pj48wMDCzs7NQUFAIBwh1dXUdHB3s7Ox+fn7z8/P09PR/f38eHh6mpqY4ODi8vLxbW1vb29uKiorx8fF6eno0NDTDw8Pq6uqTk5MjIyMiIiKVsA4TAAAAAWJLR0QMgbNRYwAAAAd0SU1FB+oHHAwDNj5pmU0AAAJTSURBVFjD7ZZpb9NAEIbHjlPb5F1gU66YEkpoQzhKoIEQznJDC+W+byj3zf//wuzajpIm7a4dCQkpI0W2HM+zM7PjfYdobGP7H8xxRnN3idwREOxeKOhLPnePihN+MFEkLw+CncINJQiB0sZQwbInv2kzRCBlIFCezFoKfruwBcpXSkXB1m2aaRu9R9t3VBBFyl39+K6yc0o9t0ze2VVFxOuyuzK+CSLsnnasSsHR76npsBP3FCFQ22uRh0czs1L6gRiwwJdydoZMMdT3NXqX7jeJyv66Yf0DOHhorrqWHZ5D0xBDGUdCOjrfOjbUjlP7hCGFDnDyFK3RNB6dRscAaINrdYZrFQ5C+NM+i3MGwAJ3TYTzF1pD2salaaBtBui2uXhpSPtfvmIJ4D4SuHptVdu4dB0NK4Bu/wDR4lJvHg7duMl/WgHS9l++dbt3C+4gsAak7X93Mt1Sj+5ByAwAhRA+7s93S1BDlA3ApZAoPYhDcOkhAmQEAAKPYoBDS1XOwL6IqwEuPVYB5AZ49KShz7f8gKfx85wAl57xDkgrQIffHIzgeVlVEGoXTJ/zgq5VP8ClF/FTyZf1I/CoCb/nQNYAj16+UgGo3vSNR1rr9ZtUUVJASIsqAK0vb9+1DCl4tPJeJpqWAOiDkInCNVeMx3q/sMSAj/qQsRSWfmljQJE+8cZkkDbqFVeB5an6Z/gsrl+sxTXJQ8t7hK/hN1Syyjt1B4wI1e8l5BgwqDvilH7gZ54RR+ehhqzA/5VzyNIIot9/8o95NPqgSSOPumMb27+yv+96VN+UlYqTAAAAHnRFWHRpY2M6Y29weXJpZ2h0AEdvb2dsZSBJbmMuIDIwMTasCzM4AAAAFHRFWHRpY2M6ZGVzY3JpcHRpb24Ac1JHQrqQcwcAAAAASUVORK5CYII=&style=for-the-badge" alt="Cursor" />
  <img src="https://img.shields.io/badge/Kimi_Code-ffffff?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABwlBMVEUAAAAAAQIAAAEBBQsGGjQEESEHIEAWdOEZhv8Yg/0QT5oAAgQCCBIXeuQZiv8XgfwXgvsakf8NP3kAAQMIJ0oXgPoYgv4XgfsYh/8UaMYBAQEEBAQDAwMBAgQIKlIZif8Xgv0Xf/kYif8TZLwAAQECAgIJK1MZjv8XhPsYhf4Yh/0ajf8JLVgoKCh5eXlxcXFwcHB6enozMzNOTk58fHx0dHR1dXV2dnZycnKAgIAaGx0JJUYYe+8XduUVb9gKMmBmZmb////7+/v6+vp/f39oaGj+/v78/PzLy8sMDAwBAQICBQkCBQpkZGT29vZ9fX1paWm6uroICAh+fn5ra2v9/f28vLwJCQltbW1vb2+5ubm3t7cHBwe1tbUGBgazs7MFBQWxsbF3d3ewsLCvr6+qqqry8vL5+fkQEBDm5uZGRkaJiYnIyMgkJCTn5+c0NDSIiIjz8/NeXl4sLCxPT0/s7OyioqIrKyscHBy/v7/a2to5OTkqKiqBgYGdnZ01NTWCgoJDQ0Pl5eXV1dUPDw8UFBQXFxfx8fEWFhb4+Pg4ODjv7+8KCgrk5ORLS0vFxcXExMTW1tZJSUmPj4+oqKgODg5LrXqmAAAAAWJLR0RBid5sTgAAAAd0SU1FB+oHHAwDNj5pmU0AAAIwSURBVFjD7ZX3c9MwGIbflFFmGaUMS2zMHi0Q0rI/mcqU0hQKZnaw92rZZVNWoWz4f5GtxEk4aCTzE3d+z7lLdPc8+j75swOkSfM/JlPzb3jhkzQ1GDN2HJLXkMH42gkTJ01Ovv+UqXXTps+YifpkgnrMqmuYPWfuvCpNOEzFKV/hLMp8LFjYsGjxkqVYZrezG1ewfMXKVavXrB21BQfr1m9obNqIuAaOTZuzW3LNLVuxbXvtjp27Ru+AYzcJj/aAFRYYWklK8mlvG/a1t+/PVDkBjg7K56mzKGA4oIQiTwe74k6qCKIKDhUEDIdJBOTRkaNwYJJKAcMxzav9XSO+UsBwnIRU/AljvkLA0Kj5k93GfLmAoVnzPb2G/VcKGLKa7ztlwZcEXchp/jSz4UuDhDOaP8scG74oaEFnyPt0jtvxWiCoqVXz58HseC2QdOFiIEn61HNJrSQQqM1l+AgFdPkKuPEMlFUQwoGS+AFd5VZFFAWKF1LhgaBr120OIm6Bbty8FeJSUP8AXLtRjvjbwJ275KnvPt1rA7N5GqU6vPtgHA8ehk9z4NHgI9NxjASKfxyenLqehD2oSzx91m0u8Og5esNfLseLl7oNSUOvTKqIR7lw6xhe95HwSXrU/8ZCUHorcwdZQZ4azLfvzAQdNDxceiurfwqO94PqhgYfDAW/VRCtjeQ+knELn4Y+f/k6UDG+roORb99//DS6DX/zWsRx/vQO4aajmCZNmjRJ8wureJLPVqVymgAAAB50RVh0aWNjOmNvcHlyaWdodABHb29nbGUgSW5jLiAyMDE2rAszOAAAABR0RVh0aWNjOmRlc2NyaXB0aW9uAHNSR0K6kHMHAAAAAElFTkSuQmCC&style=for-the-badge" alt="Kimi Code" />
</p>

| Example | Paper | Agent | Time | Tokens |
|---|---|---|---|---|
| `demo/ex2` | [Point Transformer](https://arxiv.org/abs/2012.09164) | Opus 5 | ~16 minutes | ~65k |
| `demo/ex3` | [Mooncake](https://arxiv.org/abs/2407.00079) | Opus 5 | ~10 minutes | ~40k |

The `demo/ex3` run was recorded on **v0.5.5**, back when the example prompt still had to be copied out of this README by hand. As of **v0.6.0 and later**, `NodeGraph: Copy Agent Spec to Workspace` writes `.prompt/english.md` and `.prompt/korean.md` alongside `.agent/` from the start — point your agent at that file's path plus the PDF's path and it works the same way the recording shows, no README copy-pasting needed.

<details>
<summary>Watch the full <code>demo/ex3</code> run (40s, no sound)</summary>
<p align="center">
  <video src="https://raw.githubusercontent.com/Jeong-jin-Han/NodeGraph/main/resources/demo-ex3.mp4" controls width="100%"></video>
</p>
</details>

---

## Mouse & Keyboard Controls

<details>
<summary><b>Full control reference</b> (canvas, node, toolbar, search)</summary>

### Canvas

| Action | Control |
|--------|---------|
| Pan canvas | Left-drag on background |
| Deselect / close search | Left-click on background |
| Zoom (0.05×–8×) | Scroll wheel — centered on the cursor |
| Box-select nodes & images | Right-drag on background |
| Select node | Left-click anywhere on the node |
| Add to selection | `Shift`/`Ctrl`+click |
| **Drag node** | **Left-drag the tag badge** (e.g. "Gap / Idea") — dropping it reorders it among same-parent, same-side siblings based on where it lands, rather than just placing it at a free-form position; with a multi-selection, all selected nodes move together (without the single-node drop reordering) |
| Pin generation highlight | Click the tag badge — node + parents + children + wires turn red |
| Clear highlight / selection | `Escape` (background clicks keep the highlight) |
| Delete selection | `Delete` or `Backspace` — canvas images first, then a selected wire, then nodes |
| Select wire | Left-click a wire (turns blue) |
| Draw edge | Drag from a port dot (appears on hover) onto the other node's body, in either direction — becomes an arrow only between two Main topic nodes, a plain line otherwise |

### Node

| Action | Control |
|--------|---------|
| **Fold / Unfold content** | **Click node title** |
| **Edit node title** | **Right-click node title** |
| Edit content / original | Click text area |
| **Search original quote in PDF** | **Right-click the original-text quote** (requires `source.pdf`) |
| Add image | Copy an image, then `Ctrl+V` with the node selected or hovered — inserted as an `[[IMG:...]]` token; pasting on the background creates a floating canvas image, which can be dragged onto a node or table cell |
| Add toggle / original / link | `+ Toggle` · `+ Original` · `+ Link` buttons at the bottom of an expanded node |
| Resize node | Drag the right / bottom / corner handles of an expanded node (min 160×60) |

### Toolbar

The toolbar is two rows — editing controls on top, view/graph-navigation controls below:

| Row | Control | Description |
|-----|---------|-------------|
| Edit | Undo / Redo | History (also `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`) |
| Edit | Template dropdown + `+ Add Node` | With exactly one node selected, adds a child of the chosen type to it (auto-positioned into the hop layout); with none or multiple selected, creates an unparented node in the nearest free spot around the view center |
| Edit | Delete | Deletes all selected nodes (shows a live count, e.g. `Delete (3)`, once more than one is selected) |
| Edit | Type & font controls | Shown while nodes are selected — switch the node's template; set font size by typing a number or picking a preset (8–72) |
| View | Collapse / Expand | Fold/unfold the selected subtree, or everything when nothing is selected — collapsing *everything* also auto-runs Fit View |
| View | Node-type filter (next to Collapse/Expand) | When set to a type instead of `None`: `Collapse` closes everything, `Expand` opens only that type's nodes and closes the rest |
| View | Fit View | Zoom to fit all nodes |
| View | Grid | Toggle the layout debug grid (hop-level vertical lines, main-topic-cluster horizontal lines) |
| View | Export HTML | Write `<name>.html` next to the JSON |
| View | Reload | Re-read the JSON from disk |
| View | Help | Open the bundled README's Features section in a Markdown preview beside the editor |

When the window is narrower than the toolbar content, both rows slide horizontally together (`Shift`+wheel or touch swipe) — button positions never change.

### Search (Ctrl+F)

| Action | Control |
|--------|---------|
| Open search | `Ctrl+F` (or `Cmd+F` on Mac) |
| Close search | `Escape` or ✕ button |
| Navigate results | `↑` / `↓` — moves dropdown highlight **and** flies viewport to that node |
| Select node | `Enter` — expands selected node, collapses other matches |
| Reopen after select | Click search input — resumes from last selected position |

Matched text inside each node is additionally marked (inverse template color + underline), so you can see *where* in the node the query appears — in the editor and in the exported HTML.

</details>

---

## Installation

Install **NodeGraph** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=JeongjinHan.nodegraph), or search "NodeGraph" in VS Code's Extensions view (`Ctrl+Shift+X`) and click Install. A packaged `.vsix` (`packages/nodegraph-<version>.vsix`) is also available in this repo if you'd rather install that directly.

<details>
<summary><b>Getting started</b></summary>

1. Run **NodeGraph: New Graph** (`Ctrl+Shift+P`) to create a `.nodegraph.json` file — or open an existing one, the custom editor opens automatically
2. **Drag nodes** by the colored tag badge; **click the title** to fold/unfold; **right-click the title** to rename it
3. Use the toolbar — **Expand / Collapse / Fit View / Export HTML / Reload / Help** — and **Ctrl+F** to search

Installing from the `.vsix` directly:

```bash
code --install-extension packages/nodegraph-<version>.vsix
```

To build the `.vsix` yourself:

```bash
npm install
node esbuild.js --production
npx vsce package -o packages/nodegraph-<version>.vsix
```

</details>

---

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

---

## File Format

<details>
<summary><b>Full JSON schema example</b></summary>

```jsonc
{
  "version": "1.0.0",
  "title": "My Research Graph",
  "created": "2026-07-06T00:00:00.000Z",
  "modified": "2026-07-06T00:00:00.000Z",
  "source": {                             // optional — omit entirely if there's no source PDF
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
      "original": { "title": "Optional custom label", "text": "Exact quote from paper.", "location": "§1, p.1" },
      "toggleItems": [                    // optional — omit if the node has no toggle sections
        { "id": "toggle_001", "title": "Table 1", "content": "| Col | Val |\n|-----|-----|\n| A | 1 |", "expanded": false }
      ],
      "contentExpanded": true,
      "originalExpanded": false,
      "childrenExpanded": false,
      "position": { "x": 0, "y": 0 },
      "children": ["node_002"],
      "links": [],                        // { type: 'url'|'pdf'|'obsidian'|'internal', target, label }[]
      "fontSize": 14,                     // optional — per-node title font size override
      "nodeWidth": 432,                   // optional — persisted card width after a manual resize
      "nodeHeight": 220,                  // optional — persisted card height after a manual resize
      "nodeNaturalY": 0                   // optional — Y position as last set by dragging; leave this to the editor
    }
  ],
  "edges": [
    { "id": "edge_001", "source": "node_001", "target": "node_002", "type": "arrow", "label": "" },
    { "id": "edge_002", "source": "node_002", "target": "node_003", "type": "line", "label": "" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "canvasImages": []                      // optional — floating images pasted onto the background, not into a node
}
```

</details>

---

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `NodeGraph: New Graph` | — | Create a new empty graph. Right-click a folder in the Explorer to target it directly; from the Command Palette it targets the workspace's only folder, or prompts you to pick one if there are several |
| `NodeGraph: Search Nodes` | `Ctrl+F` / `Cmd+F` | Open search dropdown |
| `NodeGraph: Copy Agent Spec to Workspace` | — | Write `.agent/NODEGRAPH_SPEC.md`, `.agent/ENVIRONMENT.md`, and `.prompt/{korean,english}.md` into a folder so an AI agent can read them. Same folder-targeting as New Graph above |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | VS Code Extension (Custom Editor API) |
| UI | React + TypeScript |
| Math / rendering | KaTeX, custom Markdown-lite renderer, SVG wire routing (A*) |
| PDF | `pdfjs-dist` (custom minimal renderer, not the prebuilt viewer toolkit) |
| Build | esbuild |
| Storage | Plain JSON on disk (`.nodegraph.json`) — no accounts, no external services |

---

## Privacy

NodeGraph does **not** collect, store, or transmit any data to external servers.

- Everything lives in the `.nodegraph.json` file and local image assets next to it — no accounts, no telemetry, no analytics
- The editor loads KaTeX from the extension's own bundled assets (no CDN, no network)
- The one exception: opening an **exported HTML file** in a browser loads KaTeX from a CDN, since that file is meant to be viewed outside VS Code — the editor itself never does this
