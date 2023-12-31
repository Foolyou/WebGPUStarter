export function getGPUCanvasContext (canvas: HTMLCanvasElement | OffscreenCanvas): GPUCanvasContext {
  const ctx = canvas.getContext('webgpu')
  if (!ctx) {
    throw new Error('WebGPU not supported')
  }

  return ctx as GPUCanvasContext
}

export async function getGPUDevice () {
  const adapter = await navigator.gpu.requestAdapter()
  if (!adapter) {
    throw new Error('cannot request a GPU adapter')
  }

  const device = await adapter.requestDevice({
    label: 'default gpu device',
  })
  if (!device) {
    throw new Error('cannot request a GPU device')
  }

  return device
}

export function getPresentationFormat () {
  return navigator.gpu.getPreferredCanvasFormat()
}

export function configureGPUCanvasContextWithDevice (ctx: GPUCanvasContext, device: GPUDevice) {
  ctx.configure({
    device,
    format: navigator.gpu.getPreferredCanvasFormat(),
  })
}
