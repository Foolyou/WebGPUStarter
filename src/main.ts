import './style.css'
import triangleShader from './shaders/triangle.wgsl?raw'
import { rand } from './utils/rand'
import { autoResizeCanvas } from './utils/autoResizeCanvas'
import { createFPSProbe } from './utils/fps'
import { getGPUCanvasContext, getGPU, configureGPUCanvasContextWithDevice } from './webgpu/toolbox'

const canvas = document.createElement('canvas')
canvas.className = 'canvas'
document.body.appendChild(canvas)

const fpsProbe = createFPSProbe()
document.body.appendChild(fpsProbe.view)

await autoResizeCanvas(canvas)

const ctx = getGPUCanvasContext(canvas)
const { device, presentationFormat } = await getGPU()

configureGPUCanvasContextWithDevice(ctx, device)

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
        format: presentationFormat
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
vertexes.set([rand(-0.1, 0.1), rand(-0.1, 0.1)], 2)
vertexes.set([rand(-0.1, 0.1), rand(-0.1, 0.1)], 4)

const offsetBuffer = device.createBuffer({
  label: 'triangle offset buffer',
  size: offsetBufferSize,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
})
const offsetArray = new Uint8Array(offsetBufferSize)
const offsets = new Float32Array(offsetArray.buffer)

for (let i = 0; i < triangleCount; i++) {
  const ofst = i * offsetStride / 4
  offsets.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], ofst)
}

const render = (now: number) => {
  fpsProbe.count(now)

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    label: 'triangle render pass',
    colorAttachments: [
      {
        clearValue: [1, 1, 1, 1],
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

requestAnimationFrame(render)
fpsProbe.start()
