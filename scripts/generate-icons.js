const sharp = require('sharp')
let pngToIco = require('png-to-ico')
if (pngToIco && pngToIco.default) pngToIco = pngToIco.default
const fs = require('fs')
const path = require('path')

async function gen() {
  const svgPath = path.join(__dirname, '..', 'public', 'logo.svg')
  const out = (...parts) => path.join(__dirname, '..', 'public', ...parts)

  try {
    await sharp(svgPath).resize(512, 512).png().toFile(out('logo-512.png'))
    await sharp(svgPath).resize(192, 192).png().toFile(out('android-chrome-192x192.png'))
    await sharp(svgPath).resize(512, 512).png().toFile(out('android-chrome-512x512.png'))
    await sharp(svgPath).resize(180, 180).png().toFile(out('apple-touch-icon.png'))
    await sharp(svgPath).resize(32, 32).png().toFile(out('favicon-32x32.png'))
    await sharp(svgPath).resize(16, 16).png().toFile(out('favicon-16x16.png'))

    // Create an ICO containing 16,32,48 sizes
    const buf16 = await sharp(svgPath).resize(16,16).png().toBuffer()
    const buf32 = await sharp(svgPath).resize(32,32).png().toBuffer()
    const buf48 = await sharp(svgPath).resize(48,48).png().toBuffer()

    const icoBuffer = await pngToIco([buf16, buf32, buf48])
    fs.writeFileSync(out('favicon.ico'), icoBuffer)

    console.log('Icons generated successfully in public/')
  } catch (err) {
    console.error('Icon generation failed:', err)
    process.exit(1)
  }
}

gen()
