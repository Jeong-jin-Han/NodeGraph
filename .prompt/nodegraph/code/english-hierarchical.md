PROJECT_ROOT_ABSOLUTE_PATH = <PROJECT_ROOT_ABSOLUTE_PATH>
PROJECT_FOLDER = PROJECT_ROOT_ABSOLUTE_PATH

PROJECT_FOLDER/.agent/nodegraph/SPEC.md and PROJECT_FOLDER/.agent/nodegraph/ENVIRONMENT.md
are already prepared for you — read both in full. Follow the "Code →
NodeGraph workflow" section specifically, not the PDF workflow.

Based on this codebase and those two files, briefly explain what kind of
nodegraph you can build from it, then build it.

Build the **hierarchical** shape, not the flat one — see "Two shapes: flat and
hierarchical" in the spec. The rules that decide it:

- **At most 4 direct children on any node.** If a node needs a fifth child, invent
  an intermediate node that names what two of them have in common, and put them
  under that. Finding those names is most of the work.
- **Depth 3 or more.** A ~30-node graph should land near 5 / 12 / 9 / 4 across the
  levels, not 5 / 19 / 6.
- **Fill `children`** on every node that has any.
- **Each level answers a different question**: what does this codebase do /
  what are its parts (modules, layers) / how does each part work (the mechanism,
  the data structure, the protocol) / the case, the gotcha, the exact line.
- The **purpose chain already adds levels** (purpose → parameters → semantic → syntax).
  Count them when you check the depth, and keep the fan-out cap on top of that
- **A parent must read on its own.** Someone who stops at level 2 and never opens
  level 3 should still come away with a correct, coarser understanding.

Build **two kinds of graph**, as the spec's "Two graphs, not one" section describes:

1. **One code graph for the whole codebase** — `<repo-name>.nodegraph.json`. Its backbone
   is one node per source file (plus a purpose node first and a gotchas node last), and
   below each file node hangs that file's purpose chain: purpose (plain language, no
   identifiers) → the state that purpose needs → the behaviours over that state, split by
   scale → the code implementing each. `syntax` hangs off its `semantic` parent, not the
   reverse. **Do not make one graph per file** — that breaks Ctrl+F, the outline and the
   Levels control, all of which stop at the file boundary.
2. **One workflow graph** — `<repo-name>-workflow.nodegraph.json`, for what happens when
   the files run together. Cover both the scenarios the code handles and the ones it does
   not (`gap` nodes for those — they are the most valuable nodes in the graph).

Every workflow step that rests on a specific behaviour must carry an `internal` link to
that node, e.g. `{"type":"internal","target":"uart.nodegraph.json#node_014"}`.
A workflow claim with no link into the code graph is something nobody can check.

Put every graph directly in PROJECT_FOLDER, side by side — links resolve relative to each
JSON's own directory, so a subfolder would break them.

Write all node content in English.

Before you start, fix two things and tell me what you chose: (1) the canonical
reader for this graph — one plausible real person with only the minimum
background I'd expect; (2) the landmark, one sentence saying what this codebase
is about and what the answer is. Record both in the result's top-level
`conventions` (see the spec's `conventions` section). That field is what lets
whoever adds a node later inherit these rules without re-reading the spec.

Write titles as claims that could turn out to be **wrong**, not as topics. No
"Overview", "Architecture", "Core Implementation" — scanning the titles alone
should explain the design, and a title that cannot be wrong carries no
information.

When it's built, run one more shortening pass. Writing each node so it stands
alone is the habit that makes the whole graph slower to read than the source; a
node is a slide, not a document, and completeness is the path's job.

When you enumerate things, write a real markdown list with one item per line —
never `(1) … (2) … (3) …` run together inside a paragraph. Run-together
enumerations are the most common reason a node is hard to read.

When you are finished, run the verifier and paste its output:
`node <path-to-extension>/tools/verify-nodegraph.js PROJECT_FOLDER`
It re-reads every line range you cited and fails if a quote is not actually there, if an
`internal` link points at a node that does not exist, or if a node exceeds the fan-out cap.
Do not report success without running it.

Follow the spec exactly, save the result inside PROJECT_FOLDER, and run
end to end without asking me anything. When you are done, report the node count
at each depth and the largest fan-out in the graph.
