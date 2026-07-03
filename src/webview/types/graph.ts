export interface CanvasImage {
  id: string
  filename: string
  position: { x: number; y: number }
  width: number
  height: number
}

export interface NodeGraph {
  version: string
  title: string
  created: string
  modified: string
  source?: {
    pdf: string
    authors: string
    venue: string
    doi: string
    pages: number
  }
  nodeTemplates: Record<string, NodeTemplate>
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport: Viewport
  canvasImages?: CanvasImage[]
}

export interface NodeTemplate {
  label: string
  color: string
  icon: string
  shape: 'sharp' | 'rounded'
}

export interface ToggleItem {
  id: string
  title: string
  content: string
  expanded: boolean
}

export interface GraphNode {
  id: string
  template: string
  title: string
  content: string
  original?: {
    title?: string
    text: string
    location: string
  }
  contentExpanded: boolean
  originalExpanded: boolean
  childrenExpanded: boolean
  position: { x: number; y: number }
  children: string[]
  fontSize?: number
  nodeWidth?: number
  nodeHeight?: number
  nodeNaturalY?: number   // original Y before auto-save pushes; updated only on drag
  toggleItems?: ToggleItem[]
  images: NodeImage[]
  links: NodeLink[]
}

export interface NodeImage {
  filename: string
  caption: string
  source: 'paper' | 'user' | 'agent'
  page?: number
  position?: number  // character index in node.content where image was pasted inline
}

export interface NodeLink {
  type: 'pdf' | 'obsidian' | 'url' | 'internal'
  target: string
  label: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: 'line' | 'arrow'
  label: string
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

export type ExtToWebviewMessage =
  | { type: 'load'; data: NodeGraph; imageUris: Record<string, string> }
  | { type: 'externalChange'; data: NodeGraph; imageUris: Record<string, string> }
  | { type: 'themeChanged' }
  | { type: 'imageSaved'; nodeId: string; filename: string; webviewUri: string }

export type WebviewToExtMessage =
  | { type: 'save'; data: NodeGraph }
  | { type: 'ready' }
  | { type: 'openLink'; link: NodeLink }
  | { type: 'saveImage'; nodeId: string; data: string; ext: string }
  | { type: 'exportHtml'; data: NodeGraph }
