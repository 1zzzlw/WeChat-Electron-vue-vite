// 将应用与组件库已有的 cursor 语义接到同一套资源，保留原生回退。
const cursors = new Set([
  'auto', 'default', 'pointer', 'text', 'crosshair', 'help', 'not-allowed', 'no-drop',
  'move', 'all-scroll', 'grab', 'grabbing', 'wait', 'progress',
  'ew-resize', 'e-resize', 'w-resize', 'col-resize',
  'ns-resize', 'n-resize', 's-resize', 'row-resize',
  'nwse-resize', 'nw-resize', 'se-resize', 'nesw-resize', 'ne-resize', 'sw-resize'
])

export function cursorStyles() {
  return {
    postcssPlugin: 'minimalistic-cursors',
    Declaration(declaration) {
      if (declaration.prop === 'cursor' && cursors.has(declaration.value)) {
        declaration.value = `var(--cursor-${declaration.value}, ${declaration.value})`
      }
    }
  }
}
