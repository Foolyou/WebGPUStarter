struct TriangleVertexInput {
  @location(0) position: vec2f,
  @location(1) offset: vec2f,
  @location(2) color: vec4f,
};

struct TriangleVertexOutput {
  @builtin(position) position: vec4f,
  @location(0) color: vec4f,
}

@vertex fn vs(input: TriangleVertexInput) -> TriangleVertexOutput {
  var output: TriangleVertexOutput;
  output.position = vec4f(input.position + input.offset, 0, 1);
  output.color = input.color;
  return output;
}

@fragment fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
  return color;
}
