import './style.css'
import triangleShaderCode from './shaders/triangle.wgsl?raw'
import { rand, randInt } from './utils/rand'
import { createFPSProbe } from './utils/fps'
import { createCanvasGPUHelper, getGPUDevice } from './webgpu/CanvasGPUHelper'

const canvas = document.createElement('canvas')
canvas.className = 'canvas'
document.body.appendChild(canvas)

const device = await getGPUDevice()
const canvasHelper = await createCanvasGPUHelper({
  canvas,
  device,
  MSAA: {
    count: 4
  }
})

const triangleShaderModule = canvasHelper.createShaderModule({
  label: 'triangle shaders',
  code: triangleShaderCode,
})

const { pipeline, vertexBufferLayouts } = canvasHelper.createRenderPipeline({
  label: 'triangle render pipeline',
  vertex: {
    module: triangleShaderModule,
    entryPoint: 'vs',
    buffers: [
      {
        attributes: [
          { label: 'position', shaderLocation: 0, format: 'float32x2' },
        ],
        stepMode: 'vertex'
      },
      {
        attributes: [
          { label: 'offset', shaderLocation: 1, format: 'float32x2' },
          { label: 'color', shaderLocation: 2, format: 'unorm8x4' },
        ],
        stepMode: 'instance'
      },
    ]
  },
  fragment: {
    module: triangleShaderModule,
    entryPoint: 'fs',
    targets: [
      {
        format: canvasHelper.getPresentationFormat()
      }
    ]
  }
})

const instanceCount = 5
const triangleCount = 2
const positionBufferLayout = vertexBufferLayouts[0]
const instanceBufferLayout = vertexBufferLayouts[1]
const positionBuffer = canvasHelper.createVertexBuffer(positionBufferLayout, 'triangle position buffer', triangleCount * 3)
const instanceBuffer = canvasHelper.createVertexBuffer(instanceBufferLayout, 'triangle instance buffer of offset and color', instanceCount)

const vertexView = new Uint8Array(positionBuffer.size)
canvasHelper.updateVertexBufferData(vertexView.buffer, positionBufferLayout, 'position', 0, 3, [
  // 1 组
  0.2, 0.2,
  -0.2, 0.2,
  0.2, -0.2,
])
canvasHelper.updateVertexBufferData(vertexView.buffer, positionBufferLayout, 'position', 3, 3, [
  // 2 组
  0.2, 0.2,
  -0.2, -0.2,
  -0.2, 0.2,
])
console.log(new Float32Array(vertexView.buffer))

const instanceView = new Uint8Array(instanceBuffer.size)
const colorView = new Uint8Array(instanceView.buffer)
const offsetView = new Float32Array(instanceView.buffer)
for (let i = 0; i < instanceCount; i++) {
  const ofst = i * instanceBufferLayout.arrayStride / 4
  offsetView.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], ofst)
  colorView.set([randInt(0, 255), randInt(0, 255), randInt(0, 255), randInt(0, 255)], ofst * 4 + 2 * 4)
}

const render = (now: number) => {
  fpsProbe.count(now)

  const encoder = device.createCommandEncoder()

  const msaaView = canvasHelper.getMSAAView()
  const canvasView = canvasHelper.getView()

  const pass = encoder.beginRenderPass({
    label: 'triangle render pass',
    colorAttachments: [
      {
        clearValue: [1, 1, 1, 1],
        loadOp: 'clear',
        storeOp: 'store',
        view: canvasHelper.getSampleCount() > 1 && msaaView ? msaaView : canvasView,
        resolveTarget: canvasHelper.getSampleCount() > 1 && msaaView ? canvasView : undefined,
      }
    ]
  })
  pass.setPipeline(pipeline)
  pass.setVertexBuffer(0, positionBuffer)
  pass.setVertexBuffer(1, instanceBuffer)
  device.queue.writeBuffer(positionBuffer, 0, vertexView)
  device.queue.writeBuffer(instanceBuffer, 0, offsetView)
  pass.draw(3 * triangleCount, instanceCount)
  pass.end()
  device.queue.submit([encoder.finish()])
  requestAnimationFrame(render)
}

requestAnimationFrame(render)

const fpsProbe = createFPSProbe()
document.body.appendChild(fpsProbe.view)
fpsProbe.start()
