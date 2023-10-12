import './style.css';
import triangleShaderCode from './shaders/triangle.wgsl?raw';
import { rand, randInt } from './utils/rand';
import { createFPSProbe } from './utils/fps';
import { createCanvasGPUHelper, getGPUDevice } from './webgpu/CanvasGPUHelper';
import { VertexBufferLayout } from './webgpu/layout';

const fpsProbe = createFPSProbe();
document.body.appendChild(fpsProbe.view);

const canvas = document.createElement('canvas');
canvas.className = 'canvas';
document.body.appendChild(canvas);

const device = await getGPUDevice();
const canvasHelper = await createCanvasGPUHelper({
  canvas,
  device,
  MSAA: {
    count: 4,
  },
});

const triangleShaderModule = canvasHelper.createShaderModule({
  label: 'triangle shaders',
  code: triangleShaderCode,
});

const triangleVertexBufferLayout = new VertexBufferLayout({
  stepMode: 'vertex',
  attributes: [
    { label: 'vert', shaderLocation: 0, format: 'float32x2' },
  ],
});

const triangleInstanceBufferLayout = new VertexBufferLayout({
  stepMode: 'instance',
  attributes: [
    { label: 'offset', shaderLocation: 1, format: 'float32x2' },
    { label: 'color', shaderLocation: 2, format: 'unorm8x4' },
  ],
});

const pipeline = canvasHelper.createRenderPipeline({
  label: 'triangle render pipeline',
  vertex: {
    module: triangleShaderModule,
    entryPoint: 'vs',
    buffers: [triangleVertexBufferLayout, triangleInstanceBufferLayout],
  },
  fragment: {
    module: triangleShaderModule,
    entryPoint: 'fs',
    targets: [
      {
        format: canvasHelper.getPresentationFormat(),
      },
    ],
  },
});

const triangleCountPerInstance = 2;
const instanceCount = 5;

const vertexBuffer = canvasHelper.createVertexBuffer(
  triangleVertexBufferLayout,
  triangleCountPerInstance * 3
);
const instanceBuffer = canvasHelper.createVertexBuffer(
  triangleInstanceBufferLayout,
  instanceCount
);

const vertexView = new Uint8Array(vertexBuffer.size);
triangleVertexBufferLayout.attribute('vert').set(
  vertexView.buffer,
  [
    // 1 组
    0.2, 0.2,
    -0.2, 0.2,
    0.2, -0.2,
  ],
  0
);
triangleVertexBufferLayout.attribute('vert').set(
  vertexView.buffer,
  [
    // 2 组
    -0.2, 0.2,
    -0.2, -0.2,
    0.2, -0.2,
  ],
  3
);

const instanceView = new Uint8Array(instanceBuffer.size);
for (let i = 0; i < instanceCount; i++) {
  triangleInstanceBufferLayout
    .attribute('offset')
    .set(instanceView.buffer, [rand(-0.8, 0.8), rand(-0.8, 0.8)], i);
  triangleInstanceBufferLayout
    .attribute('color')
    .set(
      instanceView.buffer,
      [randInt(0, 255), randInt(0, 255), randInt(0, 255), randInt(0, 255)],
      i
    );
}

const render = (now: number) => {
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass(canvasHelper.getCanvasRenderPassDescriptor());
  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setVertexBuffer(1, instanceBuffer);
  device.queue.writeBuffer(vertexBuffer, 0, vertexView);
  device.queue.writeBuffer(instanceBuffer, 0, instanceView);
  pass.draw(3 * triangleCountPerInstance, instanceCount);
  pass.end();
  device.queue.submit([encoder.finish()]);
  fpsProbe.count(now);
  requestAnimationFrame(render);
};

requestAnimationFrame(render);
fpsProbe.start();
