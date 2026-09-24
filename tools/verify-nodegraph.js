#!/usr/bin/env node
// Check every *.nodegraph.json in a folder against the things a graph can get wrong
// silently. Written because a generating agent reported "all quotes machine-checked"
// and three of thirty still pointed at the wrong lines — a claim nobody could falsify
// without running something. Usage: node tools/verify-nodegraph.js [dir]
//
// Exits non-zero when something is broken, so it can gate a workflow.

const fs = require('fs')
const path = require('path')

const dir = path.resolve(process.argv[2] || '.')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.nodegraph.json')).sort()
if (files.length === 0) {
  console.error(`no *.nodegraph.json found in ${dir}`)
  process.exit(2)
}

const graphs = new Map()
for (const f of files) {
  try {
    graphs.set(f, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  } catch (e) {
    console.error(`FAIL  ${f}: not valid JSON — ${e.message}`)
    process.exit(1)
  }
}

const problems = []
const note = (f, id, msg) => problems.push(`${f}${id ? ' ' + id : ''}: ${msg}`)

// hop tree, same rule the editor uses: main_topic is a root, parent via children then edges
function tree(g) {
  const byId = new Map(g.nodes.map(n => [n.id, n]))
  const parentOf = id => {
    const byCh = g.nodes.find(n => (n.children || []).includes(id))
    if (byCh) return byCh.id
    const e = g.edges.find(e => e.target === id)
    return e ? e.source : null
  }
  const depth = new Map(), parent = new Map()
  const calc = (id, seen = new Set()) => {
    if (depth.has(id)) return depth.get(id)
    if (seen.has(id)) { depth.set(id, 0); return 0 }
    seen.add(id)
    const n = byId.get(id)
    if (!n || n.template === 'main_topic') { depth.set(id, 0); return 0 }
    const p = parentOf(id)
    if (p) parent.set(id, p)
    const d = p ? calc(p, seen) + 1 : 0
    depth.set(id, d); return d
  }
  g.nodes.forEach(n => calc(n.id))
  const kids = new Map()
  for (const [c, p] of parent) { if (!kids.has(p)) kids.set(p, []); kids.get(p).push(c) }
  return { depth, kids }
}

const parseCode = t => /^([^:]+?)(?::(\d+)(?:-(\d+))?)?$/.exec(t || '')

// PDF 인용문 검사용 — 페이지 텍스트를 뽑아 캐시한다. pdftotext가 없으면 조용히 건너뛴다.
const { execFileSync } = require('child_process')
let pdftotextOk = null
const pageCache = new Map()
function pdfPageText(pdfPath, page) {
  if (pdftotextOk === false) return null
  const key = `${pdfPath}\u0000${page}`
  if (pageCache.has(key)) return pageCache.get(key)
  try {
    // -layout 은 2단 조판에서 두 열을 가로로 엮어버려 문장이 끊긴다(초록 한가운데
    // "Additional Key Words" 줄이 끼어드는 식). 읽기 순서를 살리려면 빼야 한다.
    const out = execFileSync('pdftotext', ['-f', String(page), '-l', String(page), pdfPath, '-'],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
    pdftotextOk = true
    pageCache.set(key, out)
    return out
  } catch {
    if (pdftotextOk === null) pdftotextOk = false
    return null
  }
}
const norm = s => (s || '').replace(/\s+/g, ' ').trim()

let quotesChecked = 0, codeLinks = 0, internalLinks = 0, pdfQuotesChecked = 0, pdfSkipped = 0

for (const [f, g] of graphs) {
  const ids = new Set(g.nodes.map(n => n.id))
  if (ids.size !== g.nodes.length) note(f, '', 'duplicate node ids')
  for (const e of g.edges || []) {
    if (!ids.has(e.source) || !ids.has(e.target)) note(f, e.id, `edge points at a missing node`)
  }
  for (const n of g.nodes) {
    if (!(n.template in (g.nodeTemplates || {}))) note(f, n.id, `template "${n.template}" is not declared`)
    if (!Array.isArray(n.links)) note(f, n.id, 'links is not an array')
    for (const c of n.children || []) if (!ids.has(c)) note(f, n.id, `children points at a missing node: ${c}`)
  }
  if (!g.conventions) note(f, '', 'no top-level conventions')

  // fan-out, for hierarchical graphs
  const { kids } = tree(g)
  for (const [p, cs] of kids) if (cs.length > 4) note(f, p, `fan-out ${cs.length} (cap is 4)`)

  for (const n of g.nodes) {
    for (const l of n.links || []) {
      if (l.type === 'internal') {
        internalLinks++
        const hash = (l.target || '').indexOf('#')
        const tf = hash === -1 ? f : l.target.slice(0, hash)
        const tn = hash === -1 ? l.target : l.target.slice(hash + 1)
        const tg = graphs.get(tf)
        if (!tg) note(f, n.id, `internal link to a graph that is not here: ${tf}`)
        else if (!tg.nodes.some(x => x.id === tn)) note(f, n.id, `internal link to a node that does not exist: ${l.target}`)
      }
      if (l.type === 'code') {
        codeLinks++
        const m = parseCode(l.target)
        if (!m) { note(f, n.id, `unparsable code target: ${l.target}`); continue }
        const p = path.join(dir, m[1])
        if (!fs.existsSync(p)) { note(f, n.id, `code link to a missing file: ${m[1]}`); continue }
        if (m[2]) {
          const total = fs.readFileSync(p, 'utf8').split('\n').length
          const end = Number(m[3] || m[2])
          if (end > total) note(f, n.id, `code link past end of file: ${l.target} (${total} lines)`)
        }
      }
    }

    // PDF graphs: the quote must really be on the page it cites. The page number is what
    // right-click quote-jump follows, so a wrong one sends the reader to the wrong place —
    // the same failure as a wrong line number, in the other workflow. Nothing checked this
    // until an agent pointed out that the tool reported "0 quotes" on a paper graph.
    if (n.original && n.original.text && g.source && g.source.pdf && !(n.links || []).some(l => l.type === 'code')) {
      const pdfPath = path.join(dir, g.source.pdf)
      const pm = /p\.\s*(\d+)/.exec(n.original.location || '')
      if (fs.existsSync(pdfPath) && pm) {
        const text = pdfPageText(pdfPath, Number(pm[1]))
        if (text === null) { pdfSkipped++ }
        else {
          pdfQuotesChecked++
          // 추출 텍스트와 인용문을 같은 방식으로 납작하게 만든다:
          //  - 줄바꿈 하이픈(-\n)을 잇고 공백을 하나로
          //  - ASCII 밖 글자는 양쪽 모두에서 제거 — α, ﬁ, 전각 기호 등은 추출기마다
          //    다른 코드포인트로 나와서, 그대로 비교하면 멀쩡한 인용이 실패한다
          const flat = t => t
            .replace(/-\s*\n\s*/g, '')
            .replace(/[^\x20-\x7e]+/g, ' ')
            .replace(/\s+/g, ' ').trim().toLowerCase()
          // 인용이 페이지 경계를 넘는 경우가 있으므로 "이 페이지에서 시작하는가"를 본다.
          // 앞 60자가 일치하면 인용은 이 페이지에 있는 것이고, 페이지 번호는 맞다.
          const q = flat(n.original.text)
          const probe = q.slice(0, Math.min(60, q.length))
          if (probe.length >= 12 && !flat(text).includes(probe)) {
            note(f, n.id, `original.text does not start on page ${pm[1]} of ${g.source.pdf}`)
          }
        }
      }
    }

    // The one that actually bit us: original.text must really be at the cited lines.
    if (n.original && n.original.text) {
      const cl = (n.links || []).find(l => l.type === 'code')
      if (!cl) continue
      const m = parseCode(cl.target)
      if (!m || !m[2]) continue
      const p = path.join(dir, m[1])
      if (!fs.existsSync(p)) continue
      const src = fs.readFileSync(p, 'utf8').split('\n')
      const seg = src.slice(Number(m[2]) - 1, Number(m[3] || m[2])).join('\n')
      quotesChecked++
      if (!norm(seg).includes(norm(n.original.text))) {
        // where does it actually live?
        const whole = src.join('\n')
        const idx = norm(whole).indexOf(norm(n.original.text))
        let hint = 'not found anywhere in the file'
        if (idx >= 0) {
          const firstLine = norm(n.original.text).split(' ').slice(0, 4).join(' ')
          const at = src.findIndex(l => norm(l).includes(firstLine))
          if (at >= 0) hint = `it is at line ${at + 1}`
        }
        note(f, n.id, `original.text is not at ${cl.target} — ${hint}`)
      }
      // The location caption is what a human reads; the link is what the editor follows.
      // They need not be identical — the link often opens a readable range while the caption
      // names the exact lines quoted — but the caption must fall INSIDE the link's range.
      const loc = n.original.location || ''
      if (loc) {
        const lm = /(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(loc)
        const sameFile = loc.includes(path.basename(m[1])) || loc.includes(m[1])
        if (lm && sameFile) {
          const linkFrom = Number(m[2]), linkTo = Number(m[3] || m[2])
          const locFrom = Number(lm[1]), locTo = Number(lm[2] || lm[1])
          if (locFrom < linkFrom || locTo > linkTo) {
            note(f, n.id, `original.location (${locFrom}-${locTo}) falls outside the code link range ${linkFrom}-${linkTo} (${cl.target})`)
          }
        }
      }
    }
  }
}

console.log(`checked ${files.length} graph(s) in ${dir}`)
console.log(`  ${internalLinks} internal link(s), ${codeLinks} code link(s), ${quotesChecked} quote(s) against their cited lines`)
if (pdfQuotesChecked) console.log(`  ${pdfQuotesChecked} PDF quote(s) against their cited page`)
if (pdfSkipped) console.log(`  ${pdfSkipped} PDF quote(s) skipped — pdftotext not available`)
if (problems.length === 0) {
  console.log('OK — no problems found')
  process.exit(0)
}
console.log(`\n${problems.length} problem(s):`)
for (const p of problems) console.log('  ! ' + p)
process.exit(1)
