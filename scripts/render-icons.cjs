// Renders build/logo.svg and build/tray-template.svg into every icon the app needs.
// Run with:  npx electron scripts/render-icons.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const dataUrl = (name) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(root, 'build', name)).toString('base64')}`
const MASTER = 1024

/** ICO container with embedded PNGs (supported since Windows Vista). */
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(data.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += data.length
  })
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)])
}

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  try {
    // One offscreen page; we swap the SVG and capture at master resolution, then downscale.
    const win = new BrowserWindow({
      width: MASTER,
      height: MASTER,
      show: false,
      transparent: true,
      frame: false,
      useContentSize: true,
      webPreferences: { offscreen: true }
    })
    await win.loadURL('about:blank')
    const capture = async (src, w, h) => {
      await win.webContents.executeJavaScript(`new Promise((done) => {
        document.documentElement.style.background = 'transparent'
        document.body.style.cssText = 'margin:0;background:transparent;overflow:hidden'
        document.body.innerHTML = ''
        const img = new Image(${w}, ${h})
        img.style.display = 'block'
        img.onload = () => requestAnimationFrame(() => requestAnimationFrame(done))
        img.src = ${JSON.stringify(src)}
        document.body.appendChild(img)
      })`)
      await new Promise((r) => setTimeout(r, 200))
      return win.webContents.capturePage({ x: 0, y: 0, width: w, height: h })
    }
    const out = (p, data) => {
      fs.writeFileSync(path.join(root, p), data)
      console.log('wrote', p)
    }

    const logo = await capture(dataUrl('logo.svg'), MASTER, MASTER)
    const at = (size) => logo.resize({ width: size, height: size, quality: 'best' }).toPNG()
    out('build/icon.png', logo.toPNG())
    out('resources/icon.png', at(256))
    out('src/renderer/public/icon.png', at(256))
    out('resources/tray.png', at(24))
    out('resources/tray@2x.png', at(48))
    out('build/icon.ico', ico([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: at(size) }))))

    // macOS menu-bar template (silhouette aspect 520:820, 18pt tall).
    const tray = await capture(dataUrl('tray-template.svg'), 520, 820)
    out('resources/trayTemplate.png', tray.resize({ width: 12, height: 18, quality: 'best' }).toPNG())
    out('resources/trayTemplate@2x.png', tray.resize({ width: 24, height: 36, quality: 'best' }).toPNG())
    win.destroy()
  } catch (e) {
    console.error(e)
    process.exitCode = 1
  }
  app.quit()
})
