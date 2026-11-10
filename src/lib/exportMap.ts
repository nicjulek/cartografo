import { VIEW } from '../map/geometry'

const FONTS =
  "@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap');"

export function serialize(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('viewBox', `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`)
  clone.setAttribute('width', String(VIEW.w))
  clone.setAttribute('height', String(VIEW.h))
  clone.removeAttribute('class')
  clone.removeAttribute('style')
  clone.querySelectorAll('[data-preview]').forEach((n) => n.remove())
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = FONTS
  clone.insertBefore(style, clone.firstChild)
  return new XMLSerializer().serializeToString(clone)
}

function download(href: string, filename: string): void {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'mapa'
  )
}

export function downloadSvg(svg: SVGSVGElement, name: string): void {
  const url = URL.createObjectURL(new Blob([serialize(svg)], { type: 'image/svg+xml' }))
  download(url, `${slug(name)}.svg`)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function rasterize(svg: SVGSVGElement, width: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([serialize(svg)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.round((width / VIEW.w) * VIEW.h)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function downloadPng(svg: SVGSVGElement, name: string): Promise<void> {
  const canvas = await rasterize(svg, VIEW.w * 2)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Não foi possível gerar a imagem')
  const url = URL.createObjectURL(blob)
  download(url, `${slug(name)}.png`)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export async function thumbnail(svg: SVGSVGElement): Promise<string> {
  const canvas = await rasterize(svg, 360)
  return canvas.toDataURL('image/jpeg', 0.78)
}
