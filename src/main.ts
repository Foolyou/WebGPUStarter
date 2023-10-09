import './style.css'
import triangleShader from './shaders/triangle.wgsl?raw'

const canvas = document.createElement('canvas')
canvas.className = 'canvas'
document.body.appendChild(canvas)

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
        ]
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

const triangleCount = 1
const bufferSize = vertexStride * 3 * triangleCount // a triangle have 3 points

const vertexBuffer = device.createBuffer({
  label: 'triangle vertex buffer',
  size: bufferSize,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
})
const vertexArray = new Uint8Array(bufferSize)
const vertexes = new Float32Array(vertexArray.buffer)
vertexes.set([0.5, -0.5], 0)
vertexes.set([-0.5, -0.5], 1 * vertexStride / 4)
vertexes.set([0, 0.5], 2 * vertexStride / 4)

const render = (now: number) => {
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
  device.queue.writeBuffer(vertexBuffer, 0, vertexes)
  pass.draw(3, 1)
  pass.end()
  const commandBuffer = encoder.finish()
  device.queue.submit([commandBuffer])
}

requestAnimationFrame(render)
