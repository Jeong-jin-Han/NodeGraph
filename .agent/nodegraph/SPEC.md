# NodeGraph — Agent Editing Specification

> **If you are an AI agent editing a `.nodegraph.json` file, read this document first.**
> It defines every field, every syntax rule, and every constraint you must follow.
> Skipping it will produce broken graphs.
>
> **Before reading PDFs or extracting images**, also read `.agent/nodegraph/ENVIRONMENT.md` —
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

---

## Writing principles

> **The test a graph has to pass is not "is this readable".**
> It is **"is reading this faster than reading the source directly?"**
> A graph that takes longer to understand than the thing it explains has failed, however complete it is.
> Two symptoms mean it failed: titles that name a topic instead of saying something, and nodes so long
> that the reader gives up and asks a question instead.

The eight principles below are **constructive** — it is easy to check whether a node satisfies one, and
when it does not, the principle itself says what to change. That is the bar for being in this list;
uncheckable advice ("be clear", "omit needless words") is deliberately absent. Run the **Check** column
node by node before finishing (the **Post-edit checklist** repeats them).

| # | Principle | What it means for a node | Check |
|---|-----------|--------------------------|-------|
| 1 | **Canonical reader** | Before writing anything, fix **one concrete reader**: someone real, with the *minimum* expertise you expect — "a 4th-year undergrad who has used gem5 SE mode but never read a cache model", not "a technical audience". Write every node as if explaining it to them at a whiteboard. Record them in top-level `conventions.reader`. | Does any node use a term this reader does not know, without glossing it? |
| 2 | **A title is a falsifiable claim** | The title says something that **could turn out to be wrong**. `개요`, `구조`, `Overview`, `Architecture` cannot be wrong, so they carry no information — the reader has to open the node to learn anything. `모듈 넷, 그중 직접 쓴 것은 수신기 하나` can be wrong, so it informs. The template badge already shows the node's *role*; the title spends its ~30 characters on the *claim*. Put a subtitle after ` — ` if one is needed. | Could this title turn out to be wrong? If it cannot, rewrite it. |
| 3 | **One landmark** | The graph has **one sentence** naming what it is about, visible from everywhere — the problem and the answer, together. Record it in `conventions.landmark`. Every node must earn its place against it. | Can you say in one clause how this node serves the landmark? If not, delete the node. |
| 4 | **One node, one point — and the point comes first (두괄식)** | A node carries exactly **one point, stated in one sentence, at the top**, with its key phrase in `**bold**`; the rest of the node is the evidence for that sentence. If one sentence cannot cover the whole node, the node holds two points and must be split. Never build up to the point through background, definitions, or "the paper says…" run-ups. Same rule for `toggleItems[].content`. | Does one point sentence cover the whole node? Does the node open with it? |
| 5 | **Old to new** | A child node's first sentence **starts from wording the parent already used** and ends on what is new. This is what makes a path through the graph read as one argument instead of a pile of notes. | Does the first sentence start from something the parent already said? |
| 6 | **Name your baby** | Every recurring thing gets **one name**, used identically in every title and body. Two names for one thing is the most common reason a reader stops and asks a question. | Does anything in this graph appear under two names? |
| 7 | **Just in time, and layer by audience** | Put background and definitions **in the node that needs them**, at the hop where they are needed — never front-loaded into the overview, where the reader cannot use them yet. Each layer has a different audience: **backbone = everyone, hop 1 = the interested reader, hop 2+ = the few who need the mechanism.** | Is every piece of information in this node used *in* this node? Do the backbone and hop-1 nodes **alone** tell the whole story? |
| 8 | **Cut, then cut again** | When the graph feels finished, make a **shortening pass** over every node — a required second pass, not an optional polish. Cut run-ups, cut anything a *different* node already says, and collapse repeated examples into **one running example** reused across the graph. The pass is mandatory; the amount is not a quota. Drafts written slide-style from the start typically shed 10–20%; a first draft written like a document sheds far more. **Never delete evidence to hit a number** — if the only way to cut further is to remove a fact the graph needs, you are done. | Did you run the pass, and can you name what it removed? Is the same fact stated in two nodes? Is there more than one example for the same idea? |

> **The cause of verbose nodes has a name: writing each node to be readable on its own.**
> A node is a **slide, not a document**. Completeness is the job of the *path* through the graph, not of
> any single node. When a node grows because you wanted it to stand alone, that is the bug — split it,
> or let the parent carry the context.

These are judging criteria, not style advice: a graph that fails #2 or #7 is not "a bit rough", it is
not usable for its purpose. (Sources: Benjamin C. Pierce, *The Curse of Knowledge*, PLMW 2017 —
canonical reader, landmark, falsifiable contributions, running example, the shortening pass; Derek
Dreyer, *How to Write Papers and Give Talks That People Can Follow*, PLMW@ICFP 2017 — one point per
unit, old-to-new, name your baby, just in time, audience layering, and the "readable on its own" trap.)

**Other conventions** (apply throughout):
- **Bilingual glossing**: When writing content in Korean, include the English term alongside key technical expressions, so readers never have to guess what the original English term was (see **Language rules** below for the exact convention and example).
- **Not limited to one Killer Application**: Papers often have more than one remarkable contribution. Capture all of them (see Step 2).
- **Prefer display-block math**: Prefer `$$...$$` block math over `$...$` inline for formulas. Use inline only for short symbols inside a sentence (see Step 5).
- **Intent-centered analysis**: Every paper has one. Every table, figure, and key data point you embed must be explained through that lens — not "what does this show" but "why does this matter for the problem this paper claims to solve" (see Step 5). A table or image with no such explanation is incomplete, the same way a formula with no explanation is.
- **No hallucination**: Every claim traces back to the paper's own text. Never invent numbers, citations, comparisons, or "facts" from general knowledge to fill a gap. If a point genuinely needs something outside the PDF (a baseline's actual reported number, a follow-up result, prior work the paper doesn't quote), either attach a real `links` entry pointing to where it can be verified (see **NodeLink schema**), or leave that point unwritten rather than stating it as fact — an incomplete node is correct behavior; a fabricated one is not. This applies to every field, not just `original.text` (Step 6's verbatim-quote rule is the strictest case of this same principle).

---

## PDF → NodeGraph workflow

### Step 0 — Setup
1. Read `.agent/nodegraph/ENVIRONMENT.md` to know which PDF/image tools are available.
2. Identify the target file: `<name>.nodegraph.json` (create it if it does not exist).
3. If the JSON already exists, read it first so you don't clobber existing work — **including its
   top-level `conventions` field, which is binding for every node you add** (see **`conventions`**).
   If you are only adding nodes to a graph that already exists, `conventions` plus the
   **Writing principles** table is enough; you do not have to re-read the rest of this document.

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

#### Kernel test — what earns a backbone node

"Remarkable" is a judgement call, which makes it a weak filter. Use this sharper one:

> **A kernel is something the authors contributed that nobody else did.**
> Find **4–8** of them, and check that *the whole paper can be reconstructed from that set*.
> If it cannot, you have missed one. If a candidate can be dropped without losing the
> reconstruction, it was never a kernel.

Sort every candidate into one of three piles:

| | What it is | Where it goes |
|---|---|---|
| **CORE** | The authors' own contribution — a named phenomenon, a metric they defined, an interpretation only they drew | A backbone node |
| **SUPPORTING** | Standard method, external data, textbook background — real, but not theirs | A node below the kernel it supports, or one line inside it |
| **Non-kernel** | Transitions, restatements, boilerplate framing | **No node at all** |

Signals that something is CORE:
- **The authors named it.** A phenomenon or metric with a term that has no external citation.
- **A definition with a formula** they introduce: "we define X as…", "let X = …".
- **Analytical inversion** — "X looks large → the calculation shows it is trivial → therefore
  X is not the cause." This is the strongest uniqueness signal there is, and the easiest to miss.
- **A verdict between two possibilities**: "X is Y, not Z." The choice is the contribution.
- **An interpretation attached to a number.** Anyone can compute the number; the meaning is theirs.

Signals it is only SUPPORTING: a standard technique (OLS, NPV, an off-the-shelf baseline),
a number reported without interpretation, background the reader could get anywhere.

**Then write the chain.** Kernels must connect: each one says which kernel it follows from
and which it enables. That chain is the backbone's `arrow` edges, and it is also the check —
**a kernel that derives from nothing and enables nothing is misclassified.** No leaps: if K3
needs a step that is not in K1 or K2, that step is a missing kernel.

**When there are more kernels than backbone slots** — and there usually are, since the
backbone is five and the test asks for 4–8 — the extra kernels do **not** get squeezed out.
A backbone node can carry a kernel *and its immediate consequences below it*: put the kernel
that opens the argument on the backbone and hang the kernels it enables beneath it as hop-1
nodes. What must stay true is that **every backbone node is a kernel**, not that every kernel
is a backbone node. If you find yourself with eight kernels and five slots, the chain tells
you which three are consequences of another.

This replaces nothing above — the Killer Application is still what the framing is built on.
The kernel test just decides **which** claims are strong enough to carry a backbone node.

### Step 3 — Build the backbone (5 nodes)

Create exactly **5 backbone `main_topic` nodes**, positioned per **Position guidelines** below (`x: 0`, 600px apart vertically):

The five **slots** are fixed. The five **titles** are not — you write them fresh for this paper.

| # | Slot (fixed role — **never** the title) | What the `title` must claim | What to put in `content` |
|---|---|---|---|
| 1 | Killer Application | The specific thing this paper does that nobody did before | The problem(s) solved and why remarkable. Be concrete and specific. |
| 2 | Why | The actual reason existing work could not do it | What existing approaches fail to do, and why. Include key limitation equations in KaTeX. |
| 3 | Solution | The mechanism, in one claim | The core technical contribution. Key equations in KaTeX, architecture description. Embed architecture diagram image if available. |
| 4 | Results | What the numbers actually establish | Quantitative evidence. Benchmark tables in Markdown. Embed performance charts as images. |
| 5 | Conclusion | What this now makes possible | What this enables. Future directions, limitations, broader impact. |

> ⚠️ **Do not use the slot names as titles.** `Killer Application`, `필요한 이유 (Why)`,
> `해결책 (Solution)`, `결과 (Results)`, `결론 (Conclusion)` are role labels for *you*, and they all
> fail Writing principle 2 — none of them could be wrong, so the reader learns nothing from the
> backbone until they open all five nodes. The slot name belongs nowhere in the JSON; if a reader
> would be lost without it, put it in the first words of `content`, not in `title`.
>
> For *Attention Is All You Need*, slot 3 is not `해결책 (Solution)` but
> `어텐션만으로 문장을 한 번에 본다 — 순환을 지운다`. Slot 4 is not `결과 (Results)` but
> `BLEU는 올라가고 학습 시간은 1/4로`.

**Graph language**: Write the whole graph in Korean or entirely in English — both are fully supported. Follow the user's request; if unspecified, default to Korean with English terms alongside (per **Language rules**). For an English-only graph, use the English column titles and skip the bilingual-glossing rule.

Connect backbone nodes in sequence with `arrow` edges (1→2→3→4→5).

### Step 4 — Add sub-nodes

For each backbone node, add **sub-nodes branching to the right**. Use the appropriate template:

| What | Template | When to add |
|------|----------|-------------|
| Key equation explained in depth | `method` (sharp) | Every important formula deserves its own node |
| Data table from the paper | `method` (sharp) | Put the markdown table directly in `content`. **An ablation table goes below the mechanism it tests, not under Results** — the kernel test's SUPPORTING rule wins over this row. That is what turns a flat results branch into real depth |
| Figure / diagram image | `method` (sharp) | Embed `[[IMG:filename:WxH]]` in `content` |
| Deep question or gap | `gap` (rounded) | "Why did they choose X?", "What if Y instead?" |
| Related prior work | `reference` (rounded) | Papers the PDF itself cites as baselines or inspirations — only what's actually in the paper's own citations/discussion, never a paper you recall from general knowledge that the PDF doesn't mention. Add a `links` entry (arXiv/DOI URL) when you have one; if you don't have a verifiable link, still only include it if the PDF names it, and say so in `content` instead of inventing a link |
| Design decision memo | `memo` (rounded) | Choices that seem arbitrary but have a reason |

Position sub-nodes per **Position guidelines** below — hop 1 at `parent.x ± 750`, hop 2+ 750px further in the same direction. Do not invent your own offsets.

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

> ⚠️ **`p.N` is the PDF's own page index, counting the first page as 1 — not the page number
> printed on the paper.** Conference proceedings routinely disagree: an OSDI paper whose PDF
> runs 1–21 may be printed 957–977, an offset of 956. The viewer and
> `tools/verify-nodegraph.js` both take `p.N` literally as the PDF index, so a printed number
> makes every quote-jump land in the wrong place — or nowhere. If you want the printed number
> visible to a reader, put it in the section part: `"§3.1 (printed p.960), p.5"`.

### Step 7 — Finalize
- **Run the shortening pass (Writing principle 8).** Go back over every node you wrote and cut.
  This is a required second pass, not a polish — the first draft of a node is always written to
  stand alone, and that is exactly the habit that makes a graph slower to read than the source.
  Cut run-ups, delete anything another node already says, collapse repeated examples into the one
  running example, and move background down to the node that actually needs it. Report what the
  pass removed. **Do not delete evidence to hit a percentage** — there is no quota.
- **Run the Check column** of the **Writing principles** table over every node, then the
  **Post-edit checklist**.
- **Run the verifier**: `node <extension>/tools/verify-nodegraph.js <PROJECT_FOLDER>`.
  It re-reads every cited line range and fails if a quote is not there, if an `internal`
  link points at a node that does not exist, if a `code` link runs past the end of a file,
  or if a node exceeds the fan-out cap. **Report its output.** Saying "I checked the line
  numbers" is not the same as running it — an agent has already made that claim on a graph
  where three of thirty quotes cited the wrong lines.
- **Write or refresh top-level `conventions`** (`reader`, `landmark`, `example`, `names`, `checks`)
  so the next agent to add a node inherits the rules — see **`conventions`**.
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
Same as the PDF workflow (read `.agent/nodegraph/ENVIRONMENT.md`, identify/create
`<name>.nodegraph.json` next to the slides PDF, set top-level `source.pdf`, and read an existing
file's `conventions` before touching it).

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
(typically 4–8 nodes), positioned per **Position guidelines** below (`x: 0`, 600px apart vertically).

- **The first backbone node is always an overview node** — the lecture's topic,
  learning goals, and prerequisites (from the title/agenda slides, or inferred).
- **The deck's section name is the slot, not the title.** Follow the deck's sections for
  *structure*, but do not copy a section heading into `title` — lecture headings are topic
  words (`Caches`, `Dynamic Programming`, `정렬`) and they fail Writing principle 2. The title
  says what that section **establishes**: not `Caches` but `지역성이 있으면 작은 메모리가 큰 메모리처럼 보인다`.
  Put the section name and the slide range in `content`'s first line (e.g. "Caches, slides 12–27")
  so the reader can still map graph → deck at a glance.
- Do not invent sections — if the deck has divider slides or an agenda, follow them;
  only fall back to your own segmentation when the deck provides none.

Connect backbone nodes in sequence with `arrow` edges.

### Step 4 — Add sub-nodes

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
Same as the PDF workflow — shortening pass, Check column, write `conventions`, update `"modified"`,
tell the user to hit Reload.

---

## Code → NodeGraph workflow

### Two graphs, not one

A codebase is read with two different questions, and mixing them blurs both. **Two graphs
total** — not one per source file:

| | **Code graph** | **Workflow graph** |
|---|---|---|
| Question | What does each file do, and how is it written? | What happens when these files run together? |
| Covers | **every source file, in one graph** — one backbone node per file, each with its own purpose chain below it | the behaviours the code graph already established |
| File | `<repo-name>.nodegraph.json` | `<repo-name>-workflow.nodegraph.json` |

> ⚠️ **One code graph for the whole codebase.** Do not emit `uart_receiver.nodegraph.json`,
> `uart_transmitter.nodegraph.json`, … one per file. Splitting per file breaks the things
> that make a graph usable: `Ctrl+F` only sees the open file, the outline stops at the file
> boundary, the Levels control can no longer show "the whole codebase at level 1", and a
> reader has to know which file to open before they can look anything up. Files become
> **backbone nodes inside one graph**, not separate graphs.

**Why the workflow is separate.** You can read `uart_receiver.v` and `uart_transmitter.v`
perfectly and still not know what happens when a reset lands mid-frame — that only shows up
between them. Put the scenarios in the code graph and the cross-file story gets buried among
per-file detail; put the per-file detail in the workflow graph and it gets interrupted by
scenarios no single file can explain.

**The workflow graph holds two kinds of node:**
- **Covered scenarios** — a workflow the current code *does* handle. Each step links back
  to the `semantic` node in the code graph that produces it, so the reader can see *which*
  behaviour makes the step happen.
- **Uncovered scenarios** — a situation the code does *not* handle, or handles by
  accident. Use the `gap` template. These are the most valuable nodes in the graph and
  the hardest to get from reading one file.

**Linking back is the point.** Every workflow step that rests on a specific behaviour
carries an `internal` link to that node (see **NodeLink schema**):
`{ "type": "internal", "target": "uart.nodegraph.json#node_014", "label": "…" }`.
A workflow node with no link into the code graph is an assertion nobody can check.

> **Keep every graph in the same folder.** `code`, `pdf`, `internal` links and the image
> folder all resolve relative to **the JSON's own directory**, so side-by-side files share
> one resolution base and nothing needs rewriting. Do not put them in a subfolder.

**When one graph is enough**: a single-file project, or code with no meaningful runtime
interaction between parts. Say so and build only the code graph.

### Step 0 — Setup
1. Identify the two target files: `<repo-name>.nodegraph.json` (the code graph, covering every source file) and `<repo-name>-workflow.nodegraph.json`. Both go **directly inside `PROJECT_FOLDER`** (the folder the user pointed you at), side by side. This matters because every `code`-type link (Step 6) and every `internal` link resolves relative to wherever the JSON file lives, the same way `pdf`-type links already resolve relative to the JSON's own directory in the PDF workflow.
2. If the JSON already exists, read it first so you don't clobber existing work — **including its
   top-level `conventions` field, which is binding for every node you add** (see **`conventions`**).
   If you are only adding nodes to a graph that already exists, `conventions` plus the
   **Writing principles** table is enough; you do not have to re-read the rest of this document.

### Step 1 — Read the codebase
- Walk the directory tree from `PROJECT_FOLDER` down, respecting `.gitignore` (skip `node_modules/`, build output, lockfiles, etc. — they're not architecture).
- Find the entry point(s) (`main`/`index` file, `package.json`'s `main`/`bin`, a `src/` root, etc.) and read outward from there rather than reading every file exhaustively.
- Identify the major modules/layers and how they depend on each other.

### Step 2 — Find the core idea
Answer this question: **"What does this codebase actually do, and what's the central approach that makes it work?"**

This becomes the framing of the first backbone node. Not a generic description like "a web app for managing tasks." Specific: "a VS Code extension that renders documents as an editable node graph, using grid-based A* routing so wires never cross a node."

### Step 3 — Build the backbone

The two graphs have **different backbones**, because they answer different questions.

#### Code graph — one node per file, plus the two that frame them

The backbone is **not a fixed five**. It is:

| # | Slot | What the `title` must claim |
|---|---|---|
| 1 | Purpose | What this codebase does, as one claim — plain language, no identifiers |
| 2 … n+1 | **One node per source file** | What that file is for, stated so it could be wrong |
| last | Design Decisions & Gotchas | The thing that will surprise a newcomer, across files |

So a three-file project has 5 backbone nodes, a six-file project has 8. Files that are
trivial or generated get one line inside another node instead of a backbone slot of their own.

**A file's backbone node *is* that file's ① purpose node** — there is one `main_topic` per
file, not a backbone node with a separate purpose node beneath it. Below it hang the rest of
the chain: its state (②), its behaviours (③), the code implementing them (④). See
**The purpose chain**.

#### Workflow graph — the five slots

| # | Slot (fixed role — **never** the title) | What the `title` must claim | What to put in `content` |
|---|---|---|---|
| 1 | Overview | What running this system actually looks like, as one claim | The scenario set this graph covers, and what it is for. |
| 2 | Architecture | The shape of the interaction, stated so it could be wrong | Which parts talk to which, and through what. A short table is welcome. |
| 3 | The normal path | What happens when nothing goes wrong | The main covered scenario, step by step, each step linking into the code graph. |
| 4 | The other paths | What else the code handles | The remaining covered scenarios. |
| 5 | What is not handled | The situation that will bite someone | The `gap` nodes — uncovered scenarios, and what the code does instead of handling them. |

> ⚠️ **Do not use the slot names as titles**, and do not use a bare filename either.
> `개요`, `Overview`, `Architecture`, `설계 결정과 주의사항` are role labels for *you*, and
> `uart_receiver.v` is a fact the reader can already see. They all fail Writing principle 2 —
> none of them could be wrong. The slot name belongs nowhere in the JSON; if a reader would be
> lost without it, put it in the first words of `content`, not in `title`.
>
> A file's backbone node is titled by **what the file is for**: not `uart_receiver.v` but
> `수신기는 비트 한가운데서 한 번만 읽는다 — 그 반 비트가 클럭 합의를 대신한다`. Put the
> filename in `content`'s first line.

**Graph language**: same rule as the PDF workflow — write the whole graph in Korean or entirely in English, following the user's request (default to Korean with English terms alongside per **Language rules** if unspecified).

Connect backbone nodes in sequence with `arrow` edges (1→2→3→4→5).

### Step 4 — Add sub-nodes

For each backbone node, add **sub-nodes branching to the right**. Use the appropriate template:

| What | Template | When to add |
|------|----------|--------------|
| A specific module/file worth understanding on its own | `module` (sharp) | Every module central to the architecture deserves its own node |
| A step in a data/control flow | `flow` (sharp) | Each meaningful hop in a request/event pipeline |
| The code implementing one behaviour | `syntax` (sharp) | See **The purpose chain** below — step ④, hangs off its `semantic` parent and carries the `code` link |
| An abstract behaviour, and why | `semantic` (sharp) | See **The purpose chain** below — step ③, split by the scale of the behaviour |
| A non-obvious design decision | `decision` (sharp) | Choices that look arbitrary but have a real reason — code's equivalent of the paper workflow's most valuable node type |
| Deep question or open issue | `question` (rounded) | "Why is this cached instead of recomputed?", "What happens if this call fails?" |
| Known limitation / improvement idea | `gap` (rounded) | TODOs, things that could be refactored, known rough edges |
| Related external doc/dependency | `reference` (rounded) | Library docs, RFCs, or upstream projects this code actually depends on or cites (in comments, README, package.json) — never something recalled from general knowledge that the codebase itself doesn't reference |
| Misc note | `memo` (rounded) | Anything else worth remembering |

**The purpose chain** — a file's nodes are built in this order, each step answering the
question the previous one raises. This is the backbone of a per-file graph:

```
① purpose      이 파일은 무엇을 이루려 하는가        (natural language, no identifiers yet)
      ↓  "to do that, what has to be remembered?"
② parameters   그래서 어떤 상태가 필요한가            (each one tied back to ①)
      ↓  "what is done with that state?"
③ semantic     그 상태로 어떤 행동이 일어나는가        (split by scale of behaviour)
      ↓  "how is that behaviour written?"
④ syntax       그 행동을 구현한 코드                  (maps onto ③, carries the code link)
```

- **① purpose** — one `main_topic` node, written in plain language. No variable names,
  no code. If you cannot say what the file is for without naming an identifier, you do
  not yet understand it.
- **② parameters** — the state the purpose requires: registers, fields, configuration.
  Each one says **what it contributes to ①**, not just what type it is. A parameter that
  cannot be tied to the purpose is either dead or the purpose is stated wrong.
- **③ semantic** — the abstract behaviours. For each: which **local** state it
  introduces, which of ②'s parameters it consumes, and which other behaviours it is
  coupled to. **Split these by the scale of the behaviour** — a big behaviour is a
  parent, the behaviours it decomposes into are its children. That is also what keeps
  the fan-out within the hierarchical cap.
- **④ syntax** — the code that implements one ③. It carries the **verbatim declaration
  or body** in `original.text` and the `code`-type `links` entry pointing at the exact
  lines (Step 6). It maps onto its semantic parent; it does not restate the behaviour.

> ⚠️ **This reverses the order shipped in 1.0.8**, which wired `module → syntax → semantic`
> (structure first, meaning second). Meaning now comes first and code hangs off it:
> `semantic → syntax`, the semantic node as the parent. The old order could never answer
> "why does this variable exist", because it introduced the variable before the purpose
> that needs it. Existing graphs written the old way are not broken, but new ones follow
> the chain above.

- Don't force the pair on trivial elements — a helper worth one sentence stays a
  sentence inside its semantic node. `syntax` is for the handful of places a reader
  must actually see the code to believe the behaviour.

Position sub-nodes per **Position guidelines** below — hop 1 at `parent.x ± 750`, hop 2+ 750px further in the same direction. Do not invent your own offsets.

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

**Keep `original.location` and the `code` link pointing at the same place.** The verifier
checks the quote against the **link**, so a node with a correct link and a stale `location`
passes silently and then sends a human reader to the wrong line. Write the location from the
link, not from memory.

**Unlike the PDF workflow, `original.location` alone does not drive navigation for code** — there is no page-search mechanism to parse it. One-click navigation comes entirely from a `links` entry of `"type": "code"` (see **NodeLink schema** below). Add one to every node that references a real location in the code, with `target` as a path relative to this JSON file's own directory, in the form `path/to/file.ts`, `path/to/file.ts:42` (a single line), or `path/to/file.ts:42-58` (an inclusive range).

### Step 7 — Finalize
- **Run the shortening pass (Writing principle 8).** Go back over every node you wrote and cut.
  This is a required second pass, not a polish — the first draft of a node is always written to
  stand alone, and that is exactly the habit that makes a graph slower to read than the source.
  Cut run-ups, delete anything another node already says, collapse repeated examples into the one
  running example, and move background down to the node that actually needs it. Report what the
  pass removed. **Do not delete evidence to hit a percentage** — there is no quota.
- **Run the Check column** of the **Writing principles** table over every node, then the
  **Post-edit checklist**.
- **Run the verifier**: `node <extension>/tools/verify-nodegraph.js <PROJECT_FOLDER>`.
  It re-reads every cited line range and fails if a quote is not there, if an `internal`
  link points at a node that does not exist, if a `code` link runs past the end of a file,
  or if a node exceeds the fan-out cap. **Report its output.** Saying "I checked the line
  numbers" is not the same as running it — an agent has already made that claim on a graph
  where three of thirty quotes cited the wrong lines.
- **Write or refresh top-level `conventions`** (`reader`, `landmark`, `example`, `names`, `checks`)
  so the next agent to add a node inherits the rules — see **`conventions`**.
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
  "conventions": { ... },       // required on graphs you create — see "conventions" below
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
Also required on any graph you create: `conventions` (see below).
Optional: `source`, `canvasImages`.

---

## `conventions` — the rules travel with the graph

> **Why this field exists.** A graph is rarely written once. Most nodes get added later, one at a
> time, in answer to a question — and by then the agent adding them has usually lost this document
> from its context, so the new nodes quietly stop following it. Re-reading all of `SPEC.md` for a
> single node is far too expensive to do every time. So the rules that must survive live **inside
> the graph file itself**: adding a node means reading that file, which means the rules arrive for
> free, and there is no path by which they can be forgotten.

```jsonc
"conventions": {
  "spec": ".agent/nodegraph/SPEC.md",
  "reader": "A 4th-year CS undergrad who has used gem5 SE mode but never read a cache model",
  "landmark": "One sentence: the problem this graph is about, and the answer.",
  "example": "The one running example reused across the graph (omit if there isn't one).",
  "names": { "the delay register": "serial_in_d" },
  "checks": [
    "Title is a claim that could be wrong — never a topic word like 개요/구조/Overview.",
    "The node opens with its one point sentence, key phrase in **bold**.",
    "One point sentence covers the whole node; if not, split the node.",
    "First sentence starts from wording the parent node already used.",
    "Every name matches conventions.names — one thing, one name.",
    "Background sits in the node that needs it, not front-loaded upstream.",
    "Backbone + hop-1 nodes alone still tell the whole story.",
    "The node was cut, not written to stand alone. A node is a slide, not a document.",
    "Nothing outside the source was invented; unverifiable points are left unwritten or carry a real link."
  ]
}
```

Rules for this field:

- **Write it when you create the graph**, from the **Writing principles** above: `reader` is
  principle 1, `landmark` is principle 3, `example` is principle 8, `names` is principle 6, and
  `checks` is the Check column, compressed. Keep `checks` under ~12 lines — it is read on every
  later edit, so its size is a recurring cost.
- **Read it before adding or editing any node**, and obey it. It is the authority for this specific
  graph; `conventions.spec` points at the full document if you need a rule it does not cover.
- **Keep it true.** If the graph's landmark changes or a thing gets renamed, update this field in
  the same edit — a stale `conventions` is worse than none, because later agents will trust it.
- `names` is for things that were *at risk* of getting two names, not a glossary of everything.
- The editor and the HTML export **ignore this field entirely** — it never renders, and it survives
  save/reload untouched. It exists for agents, not readers.

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
  "syntax":     { "label": "Syntax",      "color": "#16A085", "icon": "code",          "shape": "sharp"   },
  "semantic":   { "label": "Semantic",    "color": "#D97706", "icon": "zap",           "shape": "sharp"   },
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
  "childrenExpanded": false,    // required field; still has no effect on rendering — always set false.
                                // Hierarchy folding (hiding descendants) now exists in the UI, but it is
                                // session state, not read from or written to this field. See below.
  "position": { "x": 400, "y": -60 },
  "children": [],               // list of child node IDs (for tree structure)
  "links": [],                  // NodeLink array — see below; use [] if empty
  "fontSize": 14,               // optional — per-node font size in px
  "nodeWidth": 320,             // optional — user-set minimum width in px
  "nodeHeight": null            // optional — user-set minimum height in px
}
```

### Hierarchy folding is a view, not data

The editor and the exported HTML can hide a node's descendants (right-click the tag badge — see
**Editor interaction**). That fold state lives **only in the open view**: it is not read from
`childrenExpanded`, not written back to the file, and not carried by the HTML export. Opening a
graph always shows every node.

This is deliberate. Every graph written so far has `childrenExpanded: false` on every node, so
honoring the field would make existing files open with nothing but the backbone visible. Keep
writing `false`; if you want a reader to start from the backbone, say so in your message ("collapse
everything, then expand #3") rather than trying to encode it in the file.

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
relative to the JSON file's directory.

`internal` points at **a node** — either in this graph or in a graph beside it. It works in
every workflow, not just Code:

| `target` | What happens |
|---|---|
| `node_017` | Jumps to that node in this graph — reveals it if hierarchy folding is hiding it, selects it, centres the view |
| `other.nodegraph.json#node_017` | Opens that graph in the editor group to the right (same rule as `code` links) and jumps to the node there |

The file part is resolved **relative to this JSON's own directory**, like every other link
type — so sibling graphs in one folder need no path prefixes. In the exported HTML a
same-graph link scrolls within the page, and a cross-file link points at the sibling's
export (`other.html#node-node_017`).

Use it for cross-references the reader would otherwise have to hunt for: a workflow step
citing the behaviour that causes it, a result node citing the method that produced it, a
lecture example citing the definition it uses.

`code` targets (Code workflow only) are a path relative to the JSON file's own
directory, optionally with a line spec: `"src/foo.ts"`, `"src/foo.ts:42"`, or
`"src/foo.ts:42-58"` (1-indexed, inclusive). Click behaviour differs by context:
- **In the live editor**: opens the file and reveals/selects the given line range directly — no search step, unlike `pdf`'s page-jump, since VS Code can address an exact line natively.
- **In the exported standalone HTML**: resolves to a GitHub blob URL (`https://github.com/<owner>/<repo>/blob/<commit-sha-at-export-time>/<path>#L<start>-L<end>`) if the project's git remote is on `github.com`. If it isn't (no git repo, no `origin`, non-GitHub host, git not installed), the link renders as inert text — same graceful degradation `canvasImages` already have for HTML export.

**Jupyter notebooks (`.ipynb`)**: for a notebook target the `:N` / `:N-M` spec means
**1-based cell numbers**, not lines — e.g. `"analysis.ipynb:3"` opens the notebook in
the editor's notebook UI and reveals/selects the 3rd cell (`:3-5` selects cells 3–5).
Never target a notebook's raw JSON line numbers. In the exported HTML the link opens
GitHub's rendered notebook page without a position (GitHub's notebook view ignores
line fragments).

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

### Two shapes, one rule: build hierarchical past ~12 sub-nodes

| | **Flat** | **Hierarchical** |
|---|---|---|
| When | 12 or fewer sub-nodes | **more than ~12 sub-nodes** |
| Shape | backbone plus one level | backbone, then 3–4 levels of narrowing detail |
| Fan-out | unconstrained | **at most 4 direct children per node, anywhere** |
| Depth | 1–2 hops | **3 or more hops** |
| `Levels 2` shows | almost everything, so the control barely helps | a genuine middle layer |

**This is one rule with two outcomes, not two styles to pick between.** Below the threshold,
inventing an intermediate node to hold two children is noise. Above it, skipping the rule
produces the shape an unguided model always produces, which measurement says is
backbone-plus-one-flat-layer:

| Graph | Depths | Largest fan-out | `Levels 2` shows |
|---|---|---|---|
| Four graphs written before this rule existed | 5 / 24–27 / 0–3 | 4, 6, 7, **8** | 29 of 29, 32 of 34, 34 of 37 |
| The same paper with the rule | **5 / 13 / 12 / 5** | **3** | **18 of 35** |

Three of those four hung six to eight children off one node, and in all four the Levels
control and the outline's drill-down had nothing to work with. The rule is what produces
depth; leaving it out does not leave the choice open, it picks flat.

**Why fan-out is the rule that matters.** Depth alone does nothing if one node carries 19 children —
the reader still meets 19 things at once, which is the problem the levels control and folding exist to
solve. Cap the fan-out and the depth follows on its own.

**Building hierarchical** (when the threshold applies):
- **At most 4 direct children per node.** If a node needs a fifth, group two of them under a new
  intermediate node that names what they have in common — that name is usually a real insight.
- **Aim for depth 3–5.** A 30-node graph should land near 5 / 12 / 9 / 4 across the levels, not 5 / 19 / 6.
- **Fill `children`.** In a flat graph the edges carry the tree well enough; in a deep one, state it.
- **Each level answers a different question.** Backbone: what is this. Level 2: what are its parts.
  Level 3: how does each part work. Level 4: the case, the number, the exception.
- **A parent must read on its own.** Someone who stops at level 2 and never opens level 3 should still
  have a correct, if coarser, understanding. This is Writing principle 7 applied to the tree.
- **Report the shape when you finish**: the count at each depth and the largest fan-out. If any node
  has more than 4 children, say so rather than leaving it to be discovered.

### Reading order is the layout, so place nodes in the order you want them read

The outline panel and the search dropdown both list nodes **top to bottom by `y`** within a
parent. That ordering is not a separate field you set — it falls out of `position.y`. So when
a node's children have a natural reading order (steps of a flow, cases of a failure, stages of
an argument), **give them ascending `y` in that order**. A reader following the outline from
top to bottom is following the order you laid out, whether or not they ever look at the canvas.

`children` does not have to be populated for this: the outline derives the tree from `children`
**or** the edges, the same way the layout and the search ordering do. Filling `children` is still
worth doing when the tree is not obvious from edges alone.

### The node number is the id's number — use it when you talk to the user

The editor and the exported HTML print each node's number in its header (`#17` for
`node_017`), and that badge stays visible when the node is folded. `Ctrl+F`'s `#` mode
searches by exactly that number.

So when you report what you did, **name nodes by number, not by title or id**: "added #17
under #3" is something the user can jump to in two keystrokes, while "added a node about
the tile rasterizer" makes them hunt for it. Ranges work too, so "#19-22" is a valid thing
to say after adding four nodes. This is the whole reason node ids are numeric — keep
writing `node_NNN` with the next available number so the numbering stays dense and
predictable.

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
| Markdown list (`- ` / `1. `) | ✅ | ✅ |
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
>
> **Exception — `original.text` wins.** A quote must stay verbatim (Step 6), so when the source
> sentence itself contains `α`, `Σ`, `≥`, `×` or similar, **copy it exactly and leave the symbol
> alone**. Do not rewrite a quote into KaTeX, and do not pick a weaker sentence just to dodge a
> character. The no-Unicode rule governs text *you* write — `title`, `content`, `toggleItems[]` —
> where you always have the choice.

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

### Markdown lists

> **If you are enumerating things, write a list. Never run the items together in one paragraph.**

```
1. First item
2. Second item
3. Third item
```
```
- First item
- Second item
```

- Ordered (`1.` or `1)`) and unordered (`-`, `*`, `+`) both render as real `<ol>` / `<ul>`,
  with hanging indent and spacing between items.
- **Each item goes on its own line** — in a JSON string that means a real `\n` between them.
- The first number is honored: a list starting at `5.` renders starting at 5.
- Indent by two spaces to nest one level deeper. Nesting works to any depth.
- Works in `node.content`, `original.text`, and `toggleItems[].content`.

**This is the single most common readability failure in generated graphs.** An enumeration
written inline —

> ❌ `**Three elements.** (1) the representation. (2) the optimizer. (3) the rasterizer. Element 3 is what makes 2 affordable.`

— arrives as one unbroken block of text that the reader has to parse by eye. The same content
as a list is scannable at a glance:

> ✅ ```
> **Three elements, and none of them is a learned layer.**
> 1. Anisotropic 3D Gaussians — the representation
> 2. Optimization of position, opacity, covariance and color
> 3. A visibility-aware differentiable rasterizer
>
> Element 3 is what makes element 2 affordable.
> ```

Note the shape: the point sentence first (Writing principle 4), then the list, then the
consequence. The list carries the items; it does not carry the argument.

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

> **This section is the single source of truth for positions.** Each workflow's Step 3/4 points
> here and gives no numbers of its own.

- **Backbone (main_topic) nodes**: arrange vertically at `x: 0`. Spacing depends on the shape:
  - **Flat graph** — `y` spacing of **600px**. 600 rather than 300 because a hop-1 fan-out
    spans 450px on its own (`parent.y-150` … `parent.y+300` for four children), so 300px
    spacing makes one backbone node's children collide with the next one's.
  - **Hierarchical graph** — a fixed number does not work, because a subtree's height depends
    on how many leaves it has. Lay it out bottom-up instead: **put leaves on a ~200px pitch,
    give every parent the mean `y` of its children, and leave ~400px between one backbone
    node's subtree and the next.** Backbone gaps then fall out of the content (commonly
    900–1500px). This supersedes the alternating `parent.y ±150, +300` offsets below, which
    only describe a one-level fan-out.
  - Either way the horizontal rule is unchanged: hop *n* sits at `depth × 750` from the backbone.
- **Hop 1** (a node whose direct parent — via `children` or an edge — is a main_topic node):
  place at `parent.x ± 750`, alternating around the parent's vertical center (`parent.y`,
  `parent.y+150`, `parent.y-150`, `parent.y+300`, ...). Default to the **right** (`+750`); once
  a main_topic parent already has 4 hop-1 children on the right, put further ones on the
  **left** (`-750`) instead.
  **This left-side overflow only applies to a flat graph.** A hierarchical one caps fan-out at
  4, so a fifth child never exists — if you find yourself reaching for the left side there, the
  answer is an intermediate node, not a second column.
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
| Double-click **node title** | Rename inline (the quick path; the right-click menu also has it) |
| Right-click **anywhere on a node** | Open the node menu. It has two sections. **Edit this node** turns the whole card into editors at once — title, tag (template) and content — and opens the body even if the node was folded. The content box grows with its text instead of scrolling inside itself. A round **✕** sits just outside the card's top-right corner (hovering it reads *Edit done*); it and `Esc` both commit and leave. The **fold** section hides and shows *descendant nodes*, a different axis from Collapse, which only folds a node's own body. Four scopes each way — `children` (one level), `this level` (everything at the same hop depth), `all below` (this branch to the bottom), `everything` (the whole graph) — plus **Undo last fold change**. An entry is greyed out when it would not change anything, and a folded node shows a `+N` badge counting what is hidden under it. |
| Click a **wire** | Select edge (blue); `Delete` removes it |
| Drag from a **port dot** onto a node body | Create an edge |
| `Ctrl+F` / `Cmd+F` | Open search dropdown. Two modes, toggled by the `Aa` / `#` buttons in the search box (VS Code's find-widget style): **`Aa`** filters by title + content + original text + toggle titles/content, and marks matched text inside nodes in the inverse template color; **`#`** filters by **node number** and accepts `17`, `17 19`, `17,19`, `17-20` or any mix |
| `↑` / `↓` in search | Preview node (viewport flies to it); dropdown stays open |
| `Enter` in search | Confirm: expands selected node, collapses all other matches |
| **Levels** toolbar control | `1` shows the backbone alone, `2` adds hop 1, `3` adds hop 2, `All` shows everything. One click decides how much of the graph is on screen at once. Only as many buttons appear as the graph has depth. Using the right-click fold menu afterwards clears the highlight, because the view is no longer a clean level. |
| **Outline** toolbar button | Toggle the left-hand outline panel (off by default). It lists the selected node's **direct children in reading order** — top to bottom, the same order the layout puts them in — with each node's `#number`. Clicking an entry drills one level down and flies the canvas there; the breadcrumb walks back up, `Top` returns to the backbone. Selecting a node on the canvas moves the outline to it. |
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
- [ ] No bare Unicode math symbols outside `$...$` in text you wrote (`title`, `content`, `toggleItems[]`) — α/β/×/→/≤/∑/√/ℝ etc. must be KaTeX. **`original.text` is exempt: verbatim wins**
- [ ] Markdown tables have a separator row (`|---|---|`) — works in `node.content` or `toggleItems[].content`
- [ ] **Every enumeration is a real list**, one item per line with a real `\n` — never `(1) … (2) … (3) …` run together inside a paragraph
- [ ] `[[IMG:...]]` tokens reference files that exist in `.<basename>-imgs/` (works in `node.content` or `toggleItems[].content`)
- [ ] `toggleItems[].id` values are unique within the file
- [ ] `links` field present on every node (use `[]` if empty)
- [ ] Every table and figure node explains what it shows *and* why that matters for the Killer Application — not just embedded/pasted with no interpretation

**Writing principles** — the Check column of the table above, one line each. A graph failing 2 or 7
is not "a bit rough", it is unusable for its purpose; fix those before anything else.

- [ ] **(1 Canonical reader)** No node uses a term `conventions.reader` would not know without glossing it
- [ ] **(2 Falsifiable titles)** Every `title` is a claim that could turn out to be **wrong** — no `개요`/`구조`/`Overview`/`Architecture`, no bare deck section name, no slot name used as a title
- [ ] **(Paper)** Every backbone node is a kernel (the authors' own contribution), 4–8 kernels were found in total, and the paper reconstructs from that set. Each kernel states what it follows from and what it enables; kernels beyond the five slots hang below the kernel they follow from
- [ ] **(3 Landmark)** `conventions.landmark` is set, and each node's contribution to it can be stated in one clause — nodes that couldn't were deleted, not kept
- [ ] **(4 One node, one point)** One point sentence covers each node and the node opens with it, key phrase in `**bold**` (두괄식 — never a background/definition run-up). Same for `toggleItems[].content`
- [ ] **(5 Old to new)** Every child node's first sentence starts from wording its parent already used
- [ ] **(6 Name your baby)** Nothing in the graph appears under two names; `conventions.names` matches what the nodes actually say
- [ ] **(7 Just in time / layering)** No background sits above the node that needs it, and the backbone + hop-1 nodes **alone** still tell the whole story
- [ ] **(8 Cut again)** The shortening pass was run, and one running example is reused instead of a fresh example per node
- [ ] `conventions` is present, true of this graph, and its `checks` list is under ~12 lines

- [ ] No invented numbers, citations, or external claims — every claim traces to the PDF's own text, or has a real `links` entry, or was left unwritten
- [ ] **`tools/verify-nodegraph.js` was run and reported OK** — quotes really are at the lines they cite, `internal` targets exist, `code` links are in range, fan-out within cap
- [ ] (Code workflow) Every node that references a specific place in the code has a matching `links` entry with `"type": "code"` — `original.location` alone does not make it clickable
- [ ] (Code workflow) Each file follows **the purpose chain** — purpose → parameters → semantic → syntax, with `syntax` hanging off its `semantic` parent (not the reverse). Every parameter node says what it contributes to the purpose
