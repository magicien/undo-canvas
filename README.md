# undo-canvas
Add undo/redo functions to CanvasRenderingContext2D

[Online Demo](https://magicien.github.io/undo-canvas/demo.html)

```
<script src="https://cdn.rawgit.com/magicien/undo-canvas/v0.1.0/undo-canvas.js"></script>
<script>
const canvas = document.createElement('canvas')
const context = canvas.getContext('2d')
UndoCanvas.enableUndo(context)

context.strokeStyle = '#ff0000'
context.beginPath()
context.moveTo(0, 0)
context.lineTo(30, 30)
context.closePath()
context.stroke()

context.undo() // erase the line

context.redo() // redraw the line

UndoCanvas.disableUndo(context)
</script>
```

## Install

### Node
```
npm install --save undo-canvas
```

### Browser
```
<script src="https://cdn.rawgit.com/magicien/undo-canvas/v0.1.0/undo-canvas.js"></script>
```
