import './style.css'
import triangleShader from './shaders/triangle.wgsl?raw'
import { rand } from './utils/rand'

const canvas = document.createElement('canvas')
canvas.className = 'canvas'
document.body.appendChild(canvas)

const fpsViewer = document.createElement('div')
fpsViewer.className = 'fps-viewer'
document.body.appendChild(fpsViewer)

let fps = 0
let renderCount = 0
let renderTime = performance.now()
let lastRenderCount = 0
let lastRenderTime = renderTime

const updateFps = () => {
  setTimeout(() => {
    fps = (renderCount - lastRenderCount) / (renderTime - lastRenderTime) * 1000
    if (isNaN(fps)) {
      updateFps()
      return
    }
    lastRenderCount = renderCount
    lastRenderTime = renderTime
    fpsViewer.innerText = `fps: ${fps}`
    updateFps()
  }, 1000)
}

const canvasRect = canvas.getBoundingClientRect()

let canvasWidth = canvasRect.width * window.devicePixelRatio
let canvasHeight = canvasRect.height * window.devicePixelRatio

canvas.width = canvasWidth
canvas.height = canvasHeight

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    if (entry.target === canvas) {
      canvasWidth = entry.devicePixelContentBoxSize[0].inlineSize
      canvasHeight = entry.devicePixelContentBoxSize[0].blockSize
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }
  }
})

resizeObserver.observe(canvas, {
  box: 'device-pixel-content-box'
})

const ctx = canvas.getContext('webgpu')
if (!ctx) {
  throw new Error('WebGPU not supported')
}

if (!navigator.gpu) {
  throw new Error('WebGPU not supported')
}

const adapter = await navigator.gpu.requestAdapter()
if (!adapter) {
  throw new Error('cannot request a GPU adapter')
}

const device = await adapter.requestDevice({
  label: 'default gpu device'
})
if (!device) {
  throw new Error('cannot request a GPU device')
}

const preferredCanvasFormat = navigator.gpu.getPreferredCanvasFormat()

ctx.configure({
  device,
  format: preferredCanvasFormat
})

const shaderModule = device.createShaderModule({
  label: 'triangle shaders',
  code: triangleShader
})

const vertexStride = 2 * 4 // 2 floats, 4 bytes each
const offsetStride = 2 * 4 // 2 floats, 4 bytes each

const pipeline = device.createRenderPipeline({
  label: 'triangle render pipeline',
  layout: 'auto',
  vertex: {
    module: shaderModule,
    entryPoint: 'vs',
    buffers: [
      {
        // positions
        arrayStride: vertexStride,
        attributes: [
          { shaderLocation: 0, offset: 0, format: 'float32x2' }
        ],
        stepMode: 'vertex'
      },
      {
        // offsets
        arrayStride: offsetStride,
        attributes: [
          { shaderLocation: 1, offset: 0, format: 'float32x2' }
        ],
        stepMode: 'instance'
      }
    ]
  },
  fragment: {
    module: shaderModule,
    entryPoint: 'fs',
    targets: [
      {
        format: preferredCanvasFormat
      }
    ]
  },
})

const triangleCount = 100
const vertexBufferSize = vertexStride * 3 // a triangle have 3 points
const offsetBufferSize = offsetStride * triangleCount

const vertexBuffer = device.createBuffer({
  label: 'triangle vertex buffer',
  size: vertexBufferSize,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
})
const vertexArray = new Uint8Array(vertexBufferSize)
const vertexes = new Float32Array(vertexArray.buffer)
vertexes.set([rand(-0.1, 0.1), rand(-0.1, 0.1)], 0)
vertexes.set([rand(-0.1, 0.1), rand(-0.1, 0.1)], 1)
vertexes.set([rand(-0.1, 0.1), rand(-0.1, 0.1)], 2)

const offsetBuffer = device.createBuffer({
  label: 'triangle offset buffer',
  size: offsetBufferSize,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
})
const offsetArray = new Uint8Array(offsetBufferSize)
const offsets = new Float32Array(offsetArray.buffer)

const render = (now: number) => {
  renderTime = now
  renderCount++

  for (let i = 0; i < triangleCount; i++) {
    const ofst = i * offsetStride / 4
    offsets.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], ofst)
  }

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    label: 'triangle render pass',
    colorAttachments: [
      {
        clearValue: [0, 0, 0, 0],
        loadOp: 'clear',
        storeOp: 'store',
        view: ctx.getCurrentTexture().createView()
      }
    ]
  })
  pass.setPipeline(pipeline)
  pass.setVertexBuffer(0, vertexBuffer)
  pass.setVertexBuffer(1, offsetBuffer)
  device.queue.writeBuffer(vertexBuffer, 0, vertexes)
  device.queue.writeBuffer(offsetBuffer, 0, offsets)
  pass.draw(3, triangleCount)
  pass.end()
  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
  requestAnimationFrame(render)
}

updateFps()
requestAnimationFrame(render)
