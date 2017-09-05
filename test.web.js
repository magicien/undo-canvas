const canvas = document.createElement('canvas')
const context = canvas.getContext('2d')

const getCommandLength = (context) => {
  return context._undodata.commands.length
}
const getRedoLength = (context) => {
  return context._undodata.redos.length
}
const getCheckpointLength = (context) => {
  return context._undodata.checkpoints.length
}

describe('undoCanvas', () => {
  describe('enableUndo', () => {
    it('should add undo/redo functions', () => {
      expect(context).to.not.respondTo('undo')
      expect(context).to.not.respondTo('redo')

      UndoCanvas.enableUndo(context)

      expect(context).to.respondTo('undo')
      expect(context).to.respondTo('redo')
    })

    it('should record fillStyle', () => {
      expect(getCommandLength(context)).to.equal(0)
      context.fillStyle = '#aabbcc'
      expect(getCommandLength(context)).to.equal(1)
      expect(context._undodata.commands[0].args[0]).to.deep.equal('#aabbcc')
    })

    it('should record font', () => {
      context.font = 'Arial'
      expect(getCommandLength(context)).to.equal(2)
      expect(context._undodata.commands[1].args[0]).to.deep.equal('Arial')
    })

    it('should record globalAlpha', () => {
      context.globalAlpha = 0.8
      expect(getCommandLength(context)).to.equal(3)
      expect(context._undodata.commands[2].args[0]).to.deep.equal(0.8)
    })

    it('should record globalCompositeOperation', () => {
      context.globalCompositeOperation = 'source-in'
      expect(getCommandLength(context)).to.equal(4)
      expect(context._undodata.commands[3].args[0]).to.deep.equal('source-in')
    })

    it('should record lineCap', () => {
    })

    it('should record lineDashoffset', () => {
    })

    it('should record lineJoin', () => {
    })

    it('should record lineWidth', () => {
    })

    it('should record miterLimit', () => {
    })

    it('should record shadowBlur', () => {
    })

    it('should record shadowColor', () => {
    })

    it('should record shadowOffsetX', () => {
    })

    it('should record shadowOffsetY', () => {
    })

    it('should record strokeStyle', () => {
    })

    it('should record textAlign', () => {
    })

    it('should record textBaseline', () => {
    })

    it('should record beginPath()', () => {
    })

    it('should record arc()', () => {
    })

    it('should record arcTo()', () => {
    })

    it('should record bezierCurveTo()', () => {
    })

    it('should record ellipse()', () => {
    })

    it('should record moveTo()', () => {
    })

    it('should record lineTo()', () => {
    })

    it('should record quadraticCurveTo()', () => {
    })

    it('should record rect()', () => {
    })

    it('should record closePath()', () => {
    })

    it('should record clip()', () => {
    })

    it('should record and commit clearRect()', () => {
    })

    it('should ignore createImageData()', () => {
    })

    it('should ignore createLinearGradient()', () => {
    })

    it('should ignore createPattern()', () => {
    })

    it('should ignore createRadialGradient()', () => {
    })

    it('should record and commit drawFocusIfNeeded()', () => {
    })

    it('should record and commit drawImage()', () => {
    })

    it('should record and commit fill()', () => {
    })

    it('should record and commit fillRect()', () => {
    })

    it('should record and commit fillText()', () => {
    })

    it('should ignore getImageData()', () => {
    })

    it('should ignore getLineDash()', () => {
    })

    it('should ignore isPointInPath()', () => {
    })

    it('should ignore isPointInStroke()', () => {
    })

    it('should ignore measureText()', () => {
    })

    it('should record and commit putImageData()', () => {
    })

    it('should record save()', () => {
    })

    it('should record rotate()', () => {
    })

    it('should record scale()', () => {
    })

    it('should record setLineDash()', () => {
    })

    it('should record setTransform()', () => {
    })

    it('should record and commit stroke()', () => {
    })

    it('should record and commit strokeRect()', () => {
    })

    it('should record and commit strokeText()', () => {
    })

    it('should record transform()', () => {
    })

    it('should record translate()', () => {
    })

    it('should record restore()', () => {
    })
  })

  describe('disableUndo', () => {
    it('should remove undo/redo functions', () => {
      expect(context).to.respondTo('undo')
      expect(context).to.respondTo('redo')

      UndoCanvas.disableUndo(context)

      expect(context).to.not.respondTo('undo')
      expect(context).to.not.respondTo('redo')
    })
  })
})
