import { makeDeferred } from './deferred'

interface Size {
  width: number;
  height: number;
}

interface Resizer {
  isReady: boolean;
  readyResolve: (size: Size) => void;
  size: Size;
}

const resizerMap = new Map<HTMLCanvasElement, Resizer>()

const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const canvas = entry.target as HTMLCanvasElement
    if (resizerMap.has(canvas)) {
      const resizer = resizerMap.get(canvas)!
      canvas.width = entry.devicePixelContentBoxSize[0].inlineSize
      canvas.height = entry.devicePixelContentBoxSize[0].blockSize
      resizer.size.width = canvas.width
      resizer.size.height = canvas.height
      if (!resizer.isReady) {
        resizer.isReady = true
        resizer.readyResolve(resizer.size)
      }
    }
  }
})

export function autoResizeCanvas (canvas: HTMLCanvasElement) {
  const readyDeferred = makeDeferred<Size>()
  const resizer = {
    isReady: false,
    readyResolve: readyDeferred.resolve,
    size: {
      width: 0,
      height: 0
    }
  }
  resizerMap.set(canvas, resizer)
  observer.observe(canvas, {
    box: 'device-pixel-content-box'
  })

  return readyDeferred.promise
}
