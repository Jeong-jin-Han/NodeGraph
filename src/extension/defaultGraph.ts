import { NodeGraph } from '../webview/types/graph'

// spec의 8종 노드 템플릿과 동일 (nodegraph.new 및 빈 파일 폴백에서 공유)
export const DEFAULT_TEMPLATES = {
  main_topic: { label: 'Main topic', color: '#4B8BBE', icon: 'file-text', shape: 'sharp' },
  method: { label: 'Method', color: '#5C9E6E', icon: 'cpu', shape: 'sharp' },
  result: { label: 'Result', color: '#9B59B6', icon: 'bar-chart-2', shape: 'sharp' },
  claim: { label: 'Claim', color: '#E74C3C', icon: 'alert-circle', shape: 'sharp' },
  question: { label: 'Question', color: '#E5A835', icon: 'help-circle', shape: 'rounded' },
  gap: { label: 'Gap / Idea', color: '#1ABC9C', icon: 'lightbulb', shape: 'rounded' },
  reference: { label: 'Reference', color: '#95A5A6', icon: 'book-open', shape: 'rounded' },
  memo: { label: 'Memo', color: '#BDC3C7', icon: 'edit-3', shape: 'rounded' },
} as const

export function createEmptyGraph(title = 'New Graph'): NodeGraph {
  const now = new Date().toISOString()
  return {
    version: '1.0.0',
    title,
    created: now,
    modified: now,
    nodeTemplates: DEFAULT_TEMPLATES,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}
