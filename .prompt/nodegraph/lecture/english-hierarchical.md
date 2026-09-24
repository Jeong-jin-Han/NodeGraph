PDF_ABSOLUTE_PATH = <PDF_ABSOLUTE_PATH>
PROJECT_FOLDER = dirname(PDF_ABSOLUTE_PATH)

PROJECT_FOLDER/.agent/nodegraph/SPEC.md and PROJECT_FOLDER/.agent/nodegraph/ENVIRONMENT.md
are already prepared for you — read both in full. This PDF is a lecture
slide deck, so follow the "Lecture → NodeGraph workflow" section
specifically, not the paper workflow.

Based on the slides and those two files, briefly explain what kind of
nodegraph you can build from it, then build it. Slides are figure-heavy,
so extract images generously.

Build the **hierarchical** shape, not the flat one — see "Two shapes: flat and
hierarchical" in the spec. The rules that decide it:

- **At most 4 direct children on any node.** If a node needs a fifth child, invent
  an intermediate node that names what two of them have in common, and put them
  under that. Finding those names is most of the work.
- **Depth 3 or more.** A ~30-node graph should land near 5 / 12 / 9 / 4 across the
  levels, not 5 / 19 / 6.
- **Fill `children`** on every node that has any.
- **Each level answers a different question**: what is this lecture teaching /
  what are each section's parts (the concepts it defines) / how does each concept
  work (the worked example, the derivation) / the case, the likely exam point,
  the exception.
- The deck's own sections set the backbone, but a section with eight concepts
  still needs intermediate nodes — the deck's structure is a starting point, not
  a licence to fan out
- **A parent must read on its own.** Someone who stops at level 2 and never opens
  level 3 should still come away with a correct, coarser understanding.

Write all node content in English. Quote definitions and technical terms
verbatim from the slides.

Before you start, fix two things and tell me what you chose: (1) the canonical
reader for this graph — one plausible real person with only the minimum
background I'd expect; (2) the landmark, one sentence saying what this lecture
teaches and what it concludes. Record both in the result's top-level
`conventions` (see the spec's `conventions` section). That field is what lets
whoever adds a node later inherit these rules without re-reading the spec.

Write titles as claims that could turn out to be **wrong**, not as topics. Don't
copy the deck's section headings ("Caches", "Sorting") into titles — say what
that section establishes. The section name and slide range go in `content`'s
first line instead.

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
