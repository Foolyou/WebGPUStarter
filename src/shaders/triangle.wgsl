struct TriangleInput {
  @location(0) position: vec2f,
  @location(1) offset: vec2f,
};

@vertex fn vs(input: TriangleInput) -> @builtin(position) vec4f {
  return vec4f(input.position + input.offset, 0, 1);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(0, 1, 1, 1);
}
