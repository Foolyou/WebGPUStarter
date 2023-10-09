export function rand(low: number, high: number) {
  const size = high - low
  const random = Math.random() * size
  return low + random
}

export function randInt(low: number, high: number) {
  low = Math.ceil(low)
  high = Math.ceil(high)
  return Math.floor(rand(low, high))
}
