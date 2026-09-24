import * as vscode from 'vscode'
import { NodeGraph } from '../webview/types/graph'
import { parseInternalTarget } from '../webview/utils/internalLink'

// `internal` 링크를 "#17 대상 노드 제목"으로 보여주기 위한 조회표.
//
// 라벨은 손으로 쓴 것이라 대상 노드가 바뀌면 조용히 어긋난다. 번호와 제목은 대상에서
// 바로 끌어오므로 항상 맞고, 번호가 있으면 Ctrl+F로도 찾아갈 수 있다.
//
// 같은 그래프 안의 노드는 웹뷰가 직접 알지만, 옆 파일의 노드는 알 수 없다 — 그 파일을
// 읽을 수 있는 것은 확장뿐이므로 여기서 미리 읽어 넘긴다. 키는 링크의 `target` 원문 그대로.

export type InternalTitles = Record<string, string>

export async function resolveInternalTitles(
  docUri: vscode.Uri,
  graph: NodeGraph,
): Promise<InternalTitles> {
  const wanted = new Map<string, Set<string>>()   // file → node ids
  const targetsByFile = new Map<string, string[]>() // file → original target strings

  for (const n of graph.nodes ?? []) {
    for (const l of n.links ?? []) {
      if (l.type !== 'internal') continue
      const parsed = parseInternalTarget(l.target)
      if (!parsed || !parsed.file) continue   // 같은 그래프는 웹뷰가 직접 푼다
      if (!wanted.has(parsed.file)) { wanted.set(parsed.file, new Set()); targetsByFile.set(parsed.file, []) }
      wanted.get(parsed.file)!.add(parsed.nodeId)
      targetsByFile.get(parsed.file)!.push(l.target)
    }
  }
  if (wanted.size === 0) return {}

  const dir = vscode.Uri.joinPath(docUri, '..')
  const out: InternalTitles = {}
  for (const [file, ids] of wanted) {
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(dir, file))
      const other: NodeGraph = JSON.parse(Buffer.from(bytes).toString('utf8'))
      const byId = new Map((other.nodes ?? []).map(n => [n.id, n.title]))
      for (const target of targetsByFile.get(file) ?? []) {
        const parsed = parseInternalTarget(target)
        if (!parsed) continue
        const title = byId.get(parsed.nodeId)
        if (title) out[target] = title
      }
    } catch {
      // 옆 그래프가 없거나 깨졌으면 조회표에서 빠지고, 렌더는 기존 라벨로 폴백한다
    }
    void ids
  }
  return out
}
