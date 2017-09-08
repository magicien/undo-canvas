const resetObject = require('reset-object')

const ignoreTriggers = [
  'canvas',
  'constructor',
  'createImageData',
  'createLinearGradient',
  'createPattern',
  'createRadialGradient',
  'getImageData',
  'getLineDash',
  'isPointInPath',
  'isPointInStroke',
  'measureText',
  'scrollPathIntoView'
]

const commitTriggers = [
  'clearRect',
  'drawFocusIfNeeded',
  'drawImage',
  'fill',
  'fillRect',
  'fillText',
  'putImageData',
  'stroke',
  'strokeRect',
  'strokeText'
]

class CheckPoint {
  constructor(context, redo) {
    this.parameters = null
    this.imageData = null
    this.redo = redo

    this.getContextParameters(context)
    this.getImageData(context)
  }

  getImageData(context) {
    const prop = Object.getOwnPropertyDescriptor(context.constructor.prototype, 'getImageData')
    this.imageData = prop.value.bind(context)(0, 0, context.canvas.width, context.canvas.height)
  }

  putImageData(context) {
    context.canvas.width = this.imageData.width
    context.canvas.height = this.imageData.height

    const prop = Object.getOwnPropertyDescriptor(context.constructor.prototype, 'putImageData')
    prop.value.bind(context)(this.imageData, 0, 0)
  }

  getContextParameters(context) {
    const names = Object.getOwnPropertyNames(context.constructor.prototype)
    const params = {}
    for(const name of names){
      if(ignoreTriggers.indexOf(name) !== -1){
        continue
      }
      const prop = Object.getOwnPropertyDescriptor(context.constructor.prototype, name)
      if(prop.get && prop.set){
        params[name] = prop.get.bind(context)()
      }
    }
    this.parameters = params
  }

  setContextParameters(context) {
    const src = this.parameters
    const dst = context

    const keys = Object.keys(src)
    for(const key of keys){
      const prop = Object.getOwnPropertyDescriptor(context.constructor.prototype, key)
      prop.set.bind(context)(src[key])
    }
  }

  apply(context) {
    this.putImageData(context)
    this.setContextParameters(context)
    context._undodata.cost = 0
  }

  serialize() {
    const data = {}
    data.p = this.parameters
    data.w = this.imageData.width
    data.h = this.imageData.height
    data.d = this.imageData.data
  }

  deserialize(data) {
    this.parameters = data.p
    this.imageData = new ImageData(data.d, data.w, data.h)
    this.redo = null
  }
}

class RedoLog {
  constructor(commands = [], no = null) {
    this.no = no
    this.commands = commands
    this.cost = this.calcCost()
  }

  apply(context) {
    for(const command of this.commands){
      command.apply(context)
    }
    context._undodata.cost += this.cost
  }

  calcCost() {
    let cost = 0
    for(const command of this.commands){
      cost += command.cost
    }
    return cost
  }

  serialize(funcs) {
    const data = []
    for(const command of this.commands){
      data.push(command.serialize(funcs))
    }
    return data
  }

  static deserialize(data, no, funcs) {
    const commands = []
    for(const d of data){
      const command = CommandLog.deserialize(d, funcs)
      commands.push(command)
    }
    return new RedoLog(commands, no)
  }
}

class CommandLog {
  constructor(func, args, cost = 1) {
    this.func = func
    this.args = args
    this.cost = cost
  }

  apply(context) {
    this.func.bind(context)(...this.args)
  }

  serialize(funcs) {
    let index = funcs.indexOf(this.func)
    if(index == -1){
      funcs.push(this.func)
      index = funcs.length - 1
    }
    return {
      f: index,
      a: serializeData(args)
    }
  }

  static deserialize(data, funcs) {
    const func = funcs[data.f]
    const args = deserializeData(data.a)
    const command = new CommandLog(func, args)
    return command
  }
}

function undo(step = 1) {
  if(step < 1){
    return
  }
  if(this._undodata.commands.length > 0){
    commit(this)
  }
  let redoNo = this._undodata.current.no - step
  if(redoNo < 0){
    redoNo = 0
  }
  const cp = getLatestCheckpoint(this, redoNo)
  cp.apply(this)
  this._undodata.current = cp.redo

  let redo = cp.redo.next
  while(redo && redo.no <= redoNo){
    redo.apply(this)
    this._undodata.current = redo
    redo = redo.next
  }
}

function redo(step = 1) {
  if(step < 1){
    return
  }
  let redoNo = this._undodata.current.no + step
  const latestNo = this._undodata.redos[this._undodata.redos.length-1].no
  if(redoNo > latestNo){
    redoNo = latestNo
  }
  const currentCp = getLatestCheckpoint(this, this._undodata.current.no)
  let redo = this._undodata.current

  const cp = getLatestCheckpoint(this, redoNo)
  if(currentCp !== cp){
    cp.apply(this)
    redo = cp.redo
  }
  while(redo && redo.no <= redoNo){
    redo.apply(this)
    this._undodata.current = redo
    redo = redo.next
  }
}

function undoTag(name = /.*/, step = 1) {
  if(step < 1){
    return
  }
  const current = this._undodata.current
  let tags
  if(name instanceof RegExp){
    tags = this._undodata.tags.filter(tag => tag.no < current.no && name.test(tag.name))
  }else{
    tags = this._undodata.tags.filter(tag => tag.no < current.no && tag.name == name)
  }
  let index = tags.length - step
  if(index < 0){
    return
  }
  this.currentHistoryNo = tags[index].no
}

function redoTag(name = /.*/, step = 1) {
  if(step < 1){
    return
  }
  const current = this._undodata.current
  let tags
  if(name instanceof RegExp){
    tags = this._undodata.tags.filter(tag => tag.no > current.no && name.test(tag.name))
  }else{
    tags = this._undodata.tags.filter(tag => tag.no > current.no && tag.name == name)
  }
  if(tags.length <= step - 1){
    return
  }
  this.currentHistoryNo = tags[step - 1].no
}

function putTag(name = '') {
  const newData = {
    no: this.currentHistoryNo,
    name: name
  }
  const tags = this._undodata.tags
  for(let i=tags.length-1; i>=0; i--){
    if(tags[i].no <= newData.no){
      tags.splice(i+1, 0, newData)
      return
    }
  }
  tags.push(newData)
}

function serializeData(obj) {
}

function deserializeData(data) {
}

function serialize() {
  const funcs = []
  const data = {context: {}, oldest: 0, current: 0, funcs: [], redos: [], tags: []}

  data.context = this._undodata.checkpoints[0].serialize()
  data.oldest = this._undodata.oldestHistoryNo
  data.current = this._undodata.currentHistoryNo

  const redos = []
  for(const redo of this._undodata.redos){
    redos.push(redo.serialize(funcs))
  }
  data.redos = redos

  for(const func of funcs){
    data.funcs.push(func.name)
  }

  const tags = []
  for(const tag of this._undodata.tags){
    tags.push({
      n: tag.name,
      r: tag.no
    })
  }

  return data
}

function deserialize(data) {
}

function getCurrentHistoryNo() {
  return this._undodata.current.no
}

function setCurrentHistoryNo(value) {
  const step = value - this._undodata.current.no
  if(step > 0){
    this.redo(step)
  }else if(step < 0){
    this.undo(-step)
  }
}

function getLatestCheckpoint(obj, no) {
  const cps = obj._undodata.checkpoints
  for(let i=cps.length-1; i>=0; i--){
    const cp = cps[i]
    if(cp.redo.no <= no){
      return cp
    }
  }
  return null
}

function getLatestRedo(obj) {
  const redoLen = obj._undodata.redos.length
  return obj._undodata.redos[redoLen - 1]
}

function recalcCost(obj) {
  const lastCp = obj._undodata.checkpoints[obj._undodata.checkpoints.length - 1]
  let redo = lastCp.redo.next
  let cost = 0
  while(redo){
    cost += redo.cost
    redo = redo.next
  }
  obj._undodata.cost = cost
}

function deleteFutureData(obj) {
  const current = obj._undodata.current
  const currentNo = current.no

  // delete redos
  const latestRedo = getLatestRedo(obj)
  const numRedos = latestRedo.no - current.no
  if(numRedos <= 0){
    return
  }
  obj._undodata.redos.length = obj._undodata.redos.length - numRedos
  current.next = null

  // delete checkpoints
  const checkpoints = obj._undodata.checkpoints
  let i = checkpoints.length - 1
  for(; i>=0; i--){
    if(checkpoints[i].redo.no <= currentNo){
      break
    }
  }
  checkpoints.length = i + 1

  // delete tags
  const tags = obj._undodata.tags
  i = tags.length - 1
  for(; i>=0; i--){
    if(tags[i].no <= currentNo){
      break
    }
  }
  tags.length = i + 1

  recalcCost(obj)
}

function addCommand(obj, command) {
  obj._undodata.commands.push(command)
}

function addRedo(obj, redoLog) {
  const current = obj._undodata.current
  redoLog.no = current.no + 1
  current.next = redoLog
  obj._undodata.redos.push(redoLog)
  obj._undodata.current = redoLog
  obj._undodata.cost += redoLog.cost

  if(obj._undodata.cost > obj._undodata.cpThreshold){
    const cp = new CheckPoint(obj, redoLog)
    obj._undodata.checkpoints.push(cp)
    obj._undodata.cost = 0
  }
}

const commandCost = {
  'putImageData': 1000,
  'drawImage': 1000
}

function recordCommand(obj, func, args) {
  deleteFutureData(obj)
  const cost = commandCost[func.name] || 1
  const command = new CommandLog(func, args, cost)
  addCommand(obj, command)
}

function commit(obj) {
  const redoLog = new RedoLog(obj._undodata.commands)
  obj._undodata.commands = []
  addRedo(obj, redoLog)
}

function hookAccessor(obj, propertyName) {
  const desc = Object.getOwnPropertyDescriptor(obj.constructor.prototype, propertyName)
  Object.defineProperty(obj, propertyName, {
    set: (newValue) => {
      recordCommand(obj, desc.set, [newValue])
      desc.set.bind(obj)(newValue)
    },
    get: desc.get ? desc.get.bind(obj) : () => {},
    enumerable: true,
    configurable: true
  })
}

function hookFunction(obj, propertyName, needsCommit) {
  const desc = Object.getOwnPropertyDescriptor(obj.constructor.prototype, propertyName)
  const orgFunc = desc.value.bind(obj)
  obj[propertyName] = (...args) => {
    recordCommand(obj, desc.value, args)
    if(needsCommit){
      commit(obj)
    }
    orgFunc(...args)
  }
}

function hook(obj, propertyName, needsCommit) {
  const desc = Object.getOwnPropertyDescriptor(obj.constructor.prototype, propertyName)
  if(typeof desc === 'undefined'){
    return
  }

  if(!desc.configurable){
    console.error(propertyName + ' is not configurable')
    return
  }

  if(typeof desc.set !== 'undefined'){
    hookAccessor(obj, propertyName, desc)
  }else if(typeof desc.get !== 'undefined'){
    // read-only: nothing to do
  }else{
    hookFunction(obj, propertyName, needsCommit)
  }
}

function isContext2D(context) {
  return context instanceof CanvasRenderingContext2D
}

function addUndoProperties(context) {
  context.undo = undo.bind(context)
  context.redo = redo.bind(context)
  context.undoTag = undoTag.bind(context)
  context.redoTag = redoTag.bind(context)
  context.putTag = putTag.bind(context)
  context.serialize = serialize.bind(context)
  context.deserialize = deserialize.bind(context)
  Object.defineProperty(context, 'currentHistoryNo', {
    enumerable: true,
    configurable: true,
    get: getCurrentHistoryNo.bind(context),
    set: setCurrentHistoryNo.bind(context)
  })
  Object.defineProperty(context, 'oldestHistoryNo', {
    enumerable: false,
    configurable: true,
    get: () => context._undodata.redos[0].no
  })
  Object.defineProperty(context, 'newestHistoryNo', {
    enumerable: false,
    configurable: true,
    get: () => context._undodata.redos[context._undodata.redos.length - 1].no
  })

  const redoLog = new RedoLog([], 0)
  const cp = new CheckPoint(context, redoLog)
  const data = {
    checkpoints: [cp],
    redos: [redoLog],
    tags: [],
    current: redoLog,
    commands: [],
    cost: 0,
    cpThreshold: 5000
  }

  Object.defineProperty(context, '_undodata', {
    enumerable: false,
    configurable: true,
    value: data
  })
}

function deleteUndoProperties(context) {
  delete context.undo
  delete context.redo
  delete context.undoTag
  delete context.redoTag
  delete context.putTag
  delete context._undodata
}

function enableUndo(context, options = {}) {
  if(!isContext2D(context)){
    throw 'enableUndo: context is not instance of CanvasRenderingContext2D'
  }

  const names = Object.getOwnPropertyNames(context.constructor.prototype)
  for(const name of names){
    if(ignoreTriggers.indexOf(name) === -1){
      const needsCommit = commitTriggers.indexOf(name) >= 0
      hook(context, name, needsCommit)
    }
  }
  addUndoProperties(context)
}

function disableUndo(context) {
  if(!isContext2D(context)){
    throw 'disableUndo: context is not instance of CanvasRenderingContext2D'
  }
  deleteUndoProperties(context)
  resetObject(context) 
}

module.exports = { enableUndo, disableUndo }

