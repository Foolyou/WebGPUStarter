export function createFPSProbe (options: {
  updateInterval: number;
} = { updateInterval: 100 }) {
  const fpsViewer = document.createElement('div')
  fpsViewer.className = 'fps-viewer'

  let fps = 0
  let renderCount = 0
  let renderTime = performance.now()
  let lastRenderCount = 0
  let lastRenderTime = renderTime

  const updateFps = () => {
    setTimeout(() => {
      fps = (renderCount - lastRenderCount) / (renderTime - lastRenderTime) * 1000
      if (!isNaN(fps)) {
        lastRenderCount = renderCount
        lastRenderTime = renderTime
        fpsViewer.innerText = `fps: ${Math.floor(fps)}`
      }
      updateFps()
    }, options.updateInterval)
  }

  return {
    view: fpsViewer,
    get fps () {
      return fps
    },
    count (time: number) {
      renderCount++
      renderTime = time
    },
    start () {
      updateFps()
    },
  }
}
