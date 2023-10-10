@vertex fn vs(@location(0) pos: vec2f, @location(1) offset: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos + offset, 0, 1);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  return vec4f(0, 1, 1, 1);
}
