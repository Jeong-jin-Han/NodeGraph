import React, { useEffect } from 'react'
import { useGraph } from './hooks/useGraph'
import { useViewport } from './hooks/useViewport'
import { Canvas } from './components/Canvas'

export function App() {
  const {
    graph, imageUris,
    updateNodePosition, toggleContent, toggleOriginal,
    updateNodeField, addNode, deleteNodes, addEdge, deleteEdge,
    addToggle, updateToggle, deleteToggle, expandToggle, deleteOriginal,
    saveImage, deleteImage,
    setNodeWidth, setNodeFontSize, bumpFontSize, setFontSizeExact, pushHistory,
    collapseAll, expandAll, expandNodes, collapseNodes, setNodeTemplate, addOriginal, addLink, deleteLink, openLink, exportHtml,
    undo, redo, canUndo, canRedo,
    saveGraph,
  } = useGraph()

  const {
    viewport, setViewport, cursor, nativeWheelHandler,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onContextMenu,
  } = useViewport()

  useEffect(() => {
    if (graph?.viewport) setViewport(graph.viewport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph !== null])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveGraph() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, saveGraph])

  if (!graph) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--vscode-editor-foreground)', opacity: 0.5 }}>
        Loading…
      </div>
    )
  }

  return (
    <Canvas
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
      onUpdateNode={updateNodeField}
      onAddNode={(x, y, t) => addNode(x, y, t)}
      onDeleteNodes={deleteNodes}
      onSetNodeWidth={setNodeWidth}
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
      imageUris={imageUris}
      onSaveImage={saveImage}
      onDeleteImage={deleteImage}
    />
  )
}
