PDF_ABSOLUTE_PATH = <PDF_ABSOLUTE_PATH>
PROJECT_FOLDER = dirname(PDF_ABSOLUTE_PATH)

PROJECT_FOLDER/.agent/nodegraph/SPEC.md and PROJECT_FOLDER/.agent/nodegraph/ENVIRONMENT.md
are already prepared for you — read both in full.

Based on the paper and those two files, briefly explain what kind of
nodegraph you can build from it, then build it. For depth, aim at roughly
5 backbone nodes plus 15-30 sub-nodes; the spec's Writing principles decide
how long each node may be, not a node count.

Pick the backbone nodes with the spec's **kernel test** (Step 2): a kernel is something
the authors contributed that nobody else did. Find 4-8 of them and check the whole paper
reconstructs from that set. Sort everything else into SUPPORTING (real but standard — goes
below the kernel it supports) or non-kernel (gets no node at all). Then write the chain:
each kernel says which one it follows from and which it enables. A kernel that derives
from nothing and enables nothing is misclassified.

Write all node content in English.

Before you start, fix two things and tell me what you chose: (1) the canonical
reader for this graph — one plausible real person with only the minimum
background I'd expect; (2) the landmark, one sentence saying what this paper is
about and what the answer is. Record both in the result's top-level
`conventions` (see the spec's `conventions` section). That field is what lets
whoever adds a node later inherit these rules without re-reading the spec.

Write titles as claims that could turn out to be **wrong**, not as topics.
"Killer Application", "Why It's Needed", "Solution", "Results", "Conclusion" are
slot names, not titles — scanning the titles alone should explain the paper, and
a title that cannot be wrong carries no information.

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
end to end without asking me anything. Tell me when done.
