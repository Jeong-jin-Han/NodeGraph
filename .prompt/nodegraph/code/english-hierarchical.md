PROJECT_ROOT_ABSOLUTE_PATH = <PROJECT_ROOT_ABSOLUTE_PATH>
PROJECT_FOLDER = PROJECT_ROOT_ABSOLUTE_PATH

PROJECT_FOLDER/.agent/nodegraph/SPEC.md and PROJECT_FOLDER/.agent/nodegraph/ENVIRONMENT.md
are already prepared for you — read both in full. Follow the "Code →
NodeGraph workflow" section specifically, not the PDF workflow.

Based on this codebase and those two files, briefly explain what kind of
nodegraph you can build from it, then build it. For every function/class
worth a deep dive, split it into a syntax node (what it structurally is)
and a semantic node (what it does and why), as the spec's Syntax/Semantic
pairing rule describes.

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
- The spec's **Syntax/Semantic pairing already adds a level** (module → syntax →
  semantic). Count it when you check the depth, and keep the fan-out cap on top of it
- **A parent must read on its own.** Someone who stops at level 2 and never opens
  level 3 should still come away with a correct, coarser understanding.

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

Follow the spec exactly, save the result inside PROJECT_FOLDER, and run
end to end without asking me anything. When you are done, report the node count
at each depth and the largest fan-out in the graph.
