import React, { useEffect } from 'react'
import { useGraph } from './hooks/useGraph'
import { useViewport } from './hooks/useViewport'
import { Canvas } from './components/Canvas'

export function App() {
  const {
    graph, imageUris,
    updateNodePosition, autoSaveNodePosition, toggleContent, toggleOriginal,
    updateNodeField, addNode, deleteNodes, addEdge, deleteEdge, deleteEdges,
    addToggle, updateToggle, deleteToggle, expandToggle, deleteOriginal,
    saveImage,
    addCanvasImage, addFilenameToNode, saveCanvasImage, updateCanvasImage, removeCanvasImage, moveCanvasImageToNode,
    lastAddedCanvasImageId,
    setNodeWidth, setNodeHeight, setNodeFontSize, bumpFontSize, setFontSizeExact, pushHistory,
    collapseAll, expandAll, expandNodes, collapseNodes, setNodeTemplate, addOriginal, addLink, deleteLink, openLink, exportHtml,
    undo, redo, canUndo, canRedo,
    saveGraph, reload,
  } = useGraph()

  const {
    viewport, setViewport, cursor, nativeWheelHandler,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu,
  } = useViewport()

  useEffect(() => {
    if (graph?.viewport) setViewport(graph.viewport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph !== null])

  // openSearch is called by the extension command (Ctrl+F keybinding in package.json)
  // because VSCode intercepts Ctrl+F before the webview JS keydown handler sees it.
  const [openSearchSignal, setOpenSearchSignal] = React.useState(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveGraph() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, saveGraph])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'openSearch') setOpenSearchSignal(n => n + 1)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  if (!graph) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-editor-foreground)', opacity: 0.5 }}>
        Loading…
      </div>
    )
  }

  return (
    <Canvas
      openSearchSignal={openSearchSignal}
      viewport={viewport}
      cursor={cursor}
      nativeWheelHandler={nativeWheelHandler}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onContextMenu={onContextMenu}
      onSetViewport={setViewport}
      graph={graph}
      onUpdateNodePosition={updateNodePosition}
      onAutoSaveNodePosition={autoSaveNodePosition}
      onUpdateNode={updateNodeField}
      onAddNode={(x, y, t) => addNode(x, y, t)}
      onDeleteNodes={deleteNodes}
      onSetNodeWidth={setNodeWidth}
      onSetNodeHeight={setNodeHeight}
      onSetFontSize={setNodeFontSize}
      onBumpFontSize={bumpFontSize}
      onSetFontSizeExact={setFontSizeExact}

      onPushHistory={pushHistory}
      onUndo={undo}
      onRedo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      onToggleContent={toggleContent}
      onToggleOriginal={toggleOriginal}
      onAddEdge={addEdge}
      onDeleteEdge={deleteEdge}
      onDeleteEdges={deleteEdges}
      onAddToggle={addToggle}
      onUpdateToggle={updateToggle}
      onDeleteToggle={deleteToggle}
      onExpandToggle={expandToggle}
      onDeleteOriginal={deleteOriginal}
      onAddOriginal={addOriginal}
      onAddLink={addLink}
      onDeleteLink={deleteLink}
      onOpenLink={openLink}
      onSetNodeTemplate={setNodeTemplate}
      onCollapseAll={collapseAll}
      onExpandAll={expandAll}
      onExpandNodes={expandNodes}
      onCollapseNodes={collapseNodes}
      onExportHtml={exportHtml}
      onReload={reload}
      imageUris={imageUris}
      onSaveImage={saveImage}
      onAddCanvasImage={addCanvasImage}
      onAddFilenameToNode={addFilenameToNode}
      onSaveCanvasImage={saveCanvasImage}
      onUpdateCanvasImage={updateCanvasImage}
      onRemoveCanvasImage={removeCanvasImage}
      onMoveCanvasImageToNode={moveCanvasImageToNode}
      lastAddedCanvasImageId={lastAddedCanvasImageId}
    />
  )
}
