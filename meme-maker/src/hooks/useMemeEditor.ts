/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import * as Fabric from 'fabric'
const fabricLib: any = (Fabric as any).fabric ?? (Fabric as any).default ?? (Fabric as any)

export type FramePreset = 'original' | 'square' | 'story' | 'post' | 'twitter'

export type FilterPreset = {
  brightness?: number
  contrast?: number
  grayscale?: boolean
  blur?: number
}

export type UseMemeEditorResult = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  initialize: () => void
  loadImage: (src: string) => Promise<void>
  addText: (text?: string) => void
  setActiveFilter: (f: FilterPreset) => void
  setFrame: (preset: FramePreset) => void
  exportDataUrl: (multiplier?: number) => string | null
  clear: () => void
  isReady: boolean
}

export function useMemeEditor(width = 360, height = 480): UseMemeEditorResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fabricRef = useRef<any | null>(null)
  const imageRef = useRef<any | null>(null)
  const [isReady, setIsReady] = useState(false)

  const initialize = useCallback(() => {
    if (fabricRef.current || !canvasRef.current) return
    const canvas = new fabricLib.Canvas(canvasRef.current, {
      width,
      height,
      preserveObjectStacking: true,
      selection: true,
    })
    fabricRef.current = canvas
    setIsReady(true)
  }, [width, height])

  useEffect(() => {
    return () => {
      fabricRef.current?.dispose?.()
      fabricRef.current = null
      imageRef.current = null
    }
  }, [])

  const loadImage = useCallback(async (src: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const isBlobOrData = src.startsWith('blob:') || src.startsWith('data:')
        const imgEl = new Image()
        if (!isBlobOrData) {
          imgEl.crossOrigin = 'anonymous'
        }
        imgEl.onload = () => {
          try {
            const fabricImg = new fabricLib.Image(imgEl)
            const canvas = fabricRef.current
            if (!canvas) return

            const maxW = canvas.getWidth?.() || width
            const maxH = canvas.getHeight?.() || height
            const scale = Math.min(maxW / (fabricImg.width || 1), maxH / (fabricImg.height || 1))
            fabricImg.set({
              selectable: true,
              hasControls: true,
              left: (maxW - (fabricImg.width || 0) * scale) / 2,
              top: (maxH - (fabricImg.height || 0) * scale) / 2,
              scaleX: scale,
              scaleY: scale,
            })

            canvas.clear?.()
            imageRef.current = fabricImg
            canvas.add?.(fabricImg)
            canvas.setActiveObject?.(fabricImg)
            canvas.requestRenderAll?.()
            resolve()
          } catch (err) {
            reject(err as Error)
          }
        }
        imgEl.onerror = () => reject(new Error('Image load error'))
        imgEl.src = src
      } catch (e) {
        reject(e as Error)
      }
    })
  }, [width, height])

  const addText = useCallback((text = 'Your Text') => {
    const canvas = fabricRef.current
    if (!canvas) return
    const textbox = new fabricLib.Textbox(text, {
      left: ((canvas.getWidth?.() || width) / 2) - 100,
      top: 20,
      width: 200,
      fill: '#ffffff',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 36,
      stroke: '#000000',
      strokeWidth: 2,
      textAlign: 'center',
      editable: true,
    })
    canvas.add?.(textbox)
    canvas.setActiveObject?.(textbox)
    textbox.bringToFront?.()
    canvas.requestRenderAll?.()
  }, [width])

  const setActiveFilter = useCallback((f: FilterPreset) => {
    const img: any = imageRef.current
    const canvas = fabricRef.current
    if (!img || !canvas) return

    const filters: any[] = []
    if (typeof f.brightness === 'number') {
      filters.push(new fabricLib.Image.filters.Brightness({ brightness: f.brightness }))
    }
    if (typeof f.contrast === 'number') {
      filters.push(new fabricLib.Image.filters.Contrast({ contrast: f.contrast }))
    }
    if (f.grayscale) {
      filters.push(new fabricLib.Image.filters.Grayscale())
    }
    if (typeof f.blur === 'number' && f.blur > 0) {
      filters.push(new fabricLib.Image.filters.Blur({ blur: f.blur }))
    }

    img.filters = filters
    img.applyFilters?.()
    canvas.requestRenderAll?.()
  }, [])

  const setFrame = useCallback((preset: FramePreset) => {
    const canvas = fabricRef.current
    if (!canvas) return

    const originalW = width
    const originalH = height
    let targetW = originalW
    let targetH = originalH

    if (preset === 'square') {
      targetW = 1080; targetH = 1080
    } else if (preset === 'story') {
      targetW = 1080; targetH = 1920
    } else if (preset === 'post') {
      targetW = 1080; targetH = 1350 // Instagram portrait
    } else if (preset === 'twitter') {
      targetW = 1200; targetH = 675
    }

    canvas.setWidth?.(targetW)
    canvas.setHeight?.(targetH)
    canvas.calcOffset?.()
    canvas.requestRenderAll?.()
  }, [width, height])

  const exportDataUrl = useCallback((multiplier = 1) => {
    const canvas = fabricRef.current
    if (!canvas) return null
    return canvas.toDataURL?.({ format: 'png', multiplier })
  }, [])

  const clear = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.clear?.()
    imageRef.current = null
    canvas.requestRenderAll?.()
  }, [])

  return {
    canvasRef,
    initialize,
    loadImage,
    addText,
    setActiveFilter,
    setFrame,
    exportDataUrl,
    clear,
    isReady,
  }
}


