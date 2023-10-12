import { getVertexFormatSize, getVertexFormatTypedArrayCtor } from './vertex_format';

interface VertexAttributeOptions<T extends string = string> {
  label: T;
  shaderLocation: number;
  format: GPUVertexFormat;
}

interface VertexBufferLayoutOptions<T extends string = string> {
  label?: string;
  stepMode: GPUVertexStepMode;
  attributes: VertexAttributeOptions<T>[];
}

class VertexAttributeLayout<T extends string = string> {
  private _shaderLocation: number
  private _format: GPUVertexFormat
  private _typedArrayCtor: ReturnType<typeof getVertexFormatTypedArrayCtor>
  private _label: T

  constructor (options: VertexAttributeOptions<T>, private _bufferLayout: VertexBufferLayout<T>, private _offset: number) {
    this._label = options.label
    this._shaderLocation = options.shaderLocation
    this._format = options.format
    this._typedArrayCtor = getVertexFormatTypedArrayCtor(this._format)
  }

  set (buffer: ArrayBuffer, value: ArrayLike<number>, startItemIndex: number) {
    new this._typedArrayCtor(buffer, this.nthOffset(startItemIndex)).set(value)
  }

  get layout (): GPUVertexAttribute {
    return {
      format: this._format,
      offset: this._offset,
      shaderLocation: this._shaderLocation,
    }
  }

  get label () {
    return this._label
  }

  get offset () {
    return this._offset
  }

  nthOffset (nth: number) {
    return this._bufferLayout.arrayStride * nth + this._offset
  }
}

export class VertexBufferLayout<T extends string = string> {
  private _attributeMap: Map<T, VertexAttributeLayout<T>> = new Map()
  private _attributeList: VertexAttributeLayout<T>[] = []
  private _stepMode: GPUVertexStepMode = 'vertex'
  private _arrayStride: number = 0
  private _label?: string = '';

  constructor (options: VertexBufferLayoutOptions<T>) {
    this._label = options.label
    this._stepMode = options.stepMode
    let offset = 0
    for (const attribute of options.attributes) {
      const { label, format } = attribute
      const size = getVertexFormatSize(format)
      const attributeLayout = new VertexAttributeLayout(attribute, this, offset)
      this._attributeMap.set(label, attributeLayout)
      this._attributeList.push(attributeLayout)
      offset += size
    }
    this._arrayStride = offset
  }

  attribute (label: T) {
    return this._attributeMap.get(label)!
  }

  get arrayStride () {
    return this._arrayStride
  }

  get label () {
    return this._label
  }

  get layout (): GPUVertexBufferLayout {
    return {
      arrayStride: this._arrayStride,
      stepMode: this._stepMode,
      attributes: this._attributeList.map(attributeLayout => attributeLayout.layout),
    }
  }
}
