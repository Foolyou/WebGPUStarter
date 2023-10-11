export class RenderPipelineBuilder {
  constructor (private _device: GPUDevice) {}
}

interface BufferAttribute {
  name?: string;
  format: GPUVertexFormat;
}

interface BufferGroup {
  label: string;
  stepMode?: GPUVertexStepMode;
  attributes: BufferAttribute[];
}

export class VertexBufferLayoutBuilder {
  private _currentGroup: BufferGroup | null = null
  private _groups: BufferGroup[] = []

  group(label: string, stepMode: GPUVertexStepMode, attributes: BufferAttribute[]) {
    const group: BufferGroup = {
      label,
      stepMode,
      attributes: attributes
    }
    this._groups.push(group)
  }

  build() {
  }
}
