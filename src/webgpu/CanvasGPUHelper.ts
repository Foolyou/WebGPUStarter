import { getGPUDevice, getGPUCanvasContext, getPresentationFormat, configureGPUCanvasContextWithDevice } from './toolbox'
import { makeDeferred } from '../utils/deferred'
import { getVertexFormatSize, getVertexFormatTypedArray } from './vertex_format';

interface Size {
  width: number;
  height: number;
}

interface CanvasGPUHelperOptions {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  device: GPUDevice;
  resize?: boolean;
  MSAA?: GPUMultisampleState | boolean;
  width?: number;
  height?: number;
}

interface VertexBufferOptions {
  stepMode: GPUVertexStepMode;
  attributes: { label: string, shaderLocation: number, format: GPUVertexFormat }[];
}

interface RenderPipelineVertexOptions {
  module: GPUShaderModule;
  entryPoint: string;
  buffers: VertexBufferOptions[];
}

interface RenderPipelineOptions {
  label: string;
  vertex: RenderPipelineVertexOptions;
  fragment?: GPUFragmentState;
}

interface AttributeLayout {
  shaderLocation: number;
  size: number;
  offset: number;
  typedArray: new (buffer: ArrayBuffer, offset: number) => Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array;
}

interface VertexBufferLayout {
  arrayStride: number;
  attributeLayout: Record<string, AttributeLayout>
}

const helperMap = new Map<HTMLCanvasElement | OffscreenCanvas, CanvasGPUHelper>()

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const canvas = entry.target as HTMLCanvasElement
    if (helperMap.has(canvas)) {
      const helper = helperMap.get(canvas)!
      helper.changeSize({
        width: entry.devicePixelContentBoxSize[0].inlineSize,
        height: entry.devicePixelContentBoxSize[0].blockSize
      })
    }
  }
})

class CanvasGPUHelper {
  private _canvas: HTMLCanvasElement | OffscreenCanvas
  private _device: GPUDevice
  private _presentationFormat: GPUTextureFormat
  private _ctx: GPUCanvasContext
  private _resize: boolean = true
  private _MSAA: GPUMultisampleState | null
  private _MSAATexture: GPUTexture | null = null
  private _MSAAView: GPUTextureView | null = null
  private _isSizeReady = false
  private _sizeReadyDeferred = makeDeferred()

  /* lifetimes begin */
  constructor (options: CanvasGPUHelperOptions) {
    this._canvas = options.canvas
    this._device = options.device
    this._ctx = getGPUCanvasContext(this._canvas)
    this._presentationFormat = getPresentationFormat()

    configureGPUCanvasContextWithDevice(this._ctx, this._device)

    this._resize = !!options.resize
    if (options.MSAA === true) {
      this._MSAA = {
        count: 4
      }
    } else if (options.MSAA) {
      this._MSAA = options.MSAA
    } else {
      this._MSAA = null
    }

    helperMap.set(this._canvas, this)

    if (this._canvas instanceof OffscreenCanvas) {
      if (!options.width || !options.height) {
        this.changeSize({
          width: 300,
          height: 150
        })
      } else {
        this.changeSize({
          width: options.width,
          height: options.height
        })
      }
    } else {
      observer.observe(this._canvas, {
        box: 'device-pixel-content-box'
      })
    }
  }

  changeSize (size: Size) {
    if (this._isSizeReady && !this._resize) {
      return
    }

    this._canvas.width = size.width
    this._canvas.height = size.height

    if (this._MSAA) {
      this._MSAATexture = this._device.createTexture({
        size: [this._canvas.width, this._canvas.height],
        sampleCount: this._MSAA.count,
        format: this._presentationFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      })
      this._MSAAView = this._MSAATexture.createView()
    }

    this.makeReady()
  }

  private makeReady () {
    if (!this._isSizeReady) {
      this._isSizeReady = true
      this._sizeReadyDeferred.resolve()
    }
  }

  ready () {
    return this._sizeReadyDeferred.promise
  }

  destroy () {
    helperMap.delete(this._canvas)
  }
  /* lifetimes end */

  /* getters begin */
  getMSAAView () {
    return this._MSAAView
  }

  getPresentationFormat() {
    return this._presentationFormat
  }

  getSampleCount () {
    if (this._MSAA) {
      return this._MSAA.count || 1
    } else {
      return 1
    }
  }

  getCanvas () {
    return this._canvas
  }

  getContext () {
    return this._ctx
  }

  getView () {
    return this._ctx.getCurrentTexture().createView()
  }
  /* getters end */

  /* pipeline begin */
  createShaderModule(options: GPUShaderModuleDescriptor) {
    return this._device.createShaderModule(options)
  }

  createRenderPipeline(options: RenderPipelineOptions) {
    const descriptor: GPURenderPipelineDescriptor = {
      layout: 'auto',
      multisample: {
        count: this.getSampleCount()
      },
      vertex: {
        module: options.vertex.module,
        entryPoint: options.vertex.entryPoint,
      },
      fragment: options.fragment
    }

    const vertexBufferLayouts: VertexBufferLayout[] = []

    if (options.vertex.buffers) {
      const buffers: GPUVertexBufferLayout[] = []
      for (const bufferDesc of options.vertex.buffers) {
        let arrayStride = 0
        const attributes: GPUVertexAttribute[] = []
        const attributeLayout: Record<string, AttributeLayout> = {}
        for (const attributeDesc of bufferDesc.attributes) {
          const size = getVertexFormatSize(attributeDesc.format)
          const offset = arrayStride
          attributes.push({
            format: attributeDesc.format,
            shaderLocation: attributeDesc.shaderLocation,
            offset
          })
          attributeLayout[attributeDesc.label] = {
            offset,
            size,
            shaderLocation: attributeDesc.shaderLocation,
            typedArray: getVertexFormatTypedArray(attributeDesc.format)
          }
          arrayStride += size
        }
        buffers.push({
          stepMode: bufferDesc.stepMode,
          attributes,
          arrayStride
        })
        vertexBufferLayouts.push({
          arrayStride,
          attributeLayout
        })
      }
      descriptor.vertex.buffers = buffers
    }

    const pipeline = this._device.createRenderPipeline(descriptor)

    return {
      pipeline,
      vertexBufferLayouts
    }
  }
  /* pipeline end */

  /* vertex buffer start */
  createVertexBuffer (vertexBufferLayout: VertexBufferLayout, label: string, count: number) {
    const size = vertexBufferLayout.arrayStride * count
    const vertexBuffer = this._device.createBuffer({
      size,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      label
    })
    return vertexBuffer
  }

  updateVertexBufferData (buffer: ArrayBuffer, vertexBufferLayout: VertexBufferLayout, label: string, index: number, length: number, value: ArrayLike<number>) {
    const { arrayStride, attributeLayout } = vertexBufferLayout
    const { typedArray, offset } = attributeLayout[label]
    new typedArray(buffer, arrayStride * index + offset).set(value)
  }
  /* vertex buffer end */
}

export async function createCanvasGPUHelper (options: CanvasGPUHelperOptions) {
  const helper = new CanvasGPUHelper(options)
  await helper.ready()
  return helper
}

export { getGPUDevice }
