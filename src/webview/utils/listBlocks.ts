// 마크다운 목록을 실제 <ul>/<ol> 로 만든다.
//
// 입력은 "인라인 변환(bold/math/이미지)은 이미 끝났고 줄바꿈만 \n 으로 남아 있는 HTML".
// 지금까지는 호출부가 `.replace(/\n/g, '<br>')` 만 했기 때문에 `- 항목` 이 그냥 글자로
// 나왔고, 나열식 내용이 전부 한 덩어리로 붙어 보였다. 에디터(MathText)와 HTML export가
// 같은 결과를 내야 하므로 두 쪽이 이 함수를 공유한다.
//
// 스타일을 CSS 클래스가 아니라 인라인으로 박는 이유: export된 HTML은 단독 파일이라
// 에디터 쪽 스타일시트를 못 쓰고, 두 경로의 모양이 어긋나면 안 되기 때문.
//
// 주의 — 이 함수가 만드는 HTML에는 줄바꿈 문자가 하나도 없어야 한다. 노드 본문 컨테이너가
// `white-space: pre-wrap` 이라 태그 사이의 개행이 그대로 빈 줄로 보이기 때문.

const UL_RE = /^([ \t]*)[-*+][ \t]+(.*)$/
const OL_RE = /^([ \t]*)(\d+)[.)][ \t]+(.*)$/

interface Frame {
  indent: number
  ordered: boolean
  start: number
  items: string[]
}

type Chunk = { list: true; html: string } | { list: false; text: string }

function indentWidth(s: string): number {
  let w = 0
  for (const ch of s) w += ch === '\t' ? 4 : 1
  return w
}

function renderFrame(f: Frame): string {
  const items = f.items.map(t => `<li style="margin:2px 0">${t}</li>`).join('')
  return f.ordered
    ? `<ol start="${f.start}" style="margin:4px 0;padding-left:1.6em">${items}</ol>`
    : `<ul style="margin:4px 0;padding-left:1.35em">${items}</ul>`
}

export function groupListsInHtml(html: string): string {
  const lines = html.split('\n')
  const out: Chunk[] = []
  const stack: Frame[] = []

  // 스택에서 indent가 더 깊은 프레임들을 닫아, 부모 <li> 안쪽이나 최상위로 흘려보낸다
  const closeDeeperThan = (indent: number) => {
    while (stack.length > 0 && stack[stack.length - 1].indent > indent) {
      const done = renderFrame(stack.pop()!)
      const parent = stack[stack.length - 1]
      if (parent && parent.items.length > 0) parent.items[parent.items.length - 1] += done
      else out.push({ list: true, html: done })
    }
  }
  const closeAll = () => closeDeeperThan(-1)

  for (const line of lines) {
    const ol = OL_RE.exec(line)
    const ul = ol ? null : UL_RE.exec(line)
    if (!ol && !ul) {
      closeAll()
      out.push({ list: false, text: line })
      continue
    }

    const ordered = !!ol
    const indent = indentWidth(ol ? ol[1] : ul![1])
    const text = ol ? ol[3] : ul![2]

    closeDeeperThan(indent)
    let top: Frame | undefined = stack[stack.length - 1]

    // 같은 깊이인데 목록 종류가 바뀌면(번호 ↔ 불릿) 별개의 목록으로 끊는다
    if (top && top.indent === indent && top.ordered !== ordered) {
      const done = renderFrame(stack.pop()!)
      const parent = stack[stack.length - 1]
      if (parent && parent.items.length > 0) parent.items[parent.items.length - 1] += done
      else out.push({ list: true, html: done })
      top = stack[stack.length - 1]
    }

    if (!top || top.indent < indent) {
      top = { indent, ordered, start: ordered ? parseInt(ol![2], 10) : 1, items: [] }
      stack.push(top)
    }
    top.items.push(text)
  }
  closeAll()

  // 목록 바로 옆의 빈 줄은 버린다 — <ul>/<ol>이 자체 margin을 갖고 있어서 그대로 두면
  // 목록 위아래에 빈 줄이 하나 더 생긴다
  const kept = out.filter((c, i) => {
    if (c.list || c.text !== '') return true
    const prev = out[i - 1]
    const next = out[i + 1]
    return !(prev?.list || next?.list)
  })

  let result = ''
  for (let i = 0; i < kept.length; i++) {
    const c = kept[i]
    if (c.list) { result += c.html; continue }
    // 앞 조각이 텍스트였을 때만 줄바꿈을 넣는다 (목록과 텍스트 사이는 margin이 담당)
    if (i > 0 && !kept[i - 1].list) result += '<br>'
    result += c.text
  }
  return result
}
