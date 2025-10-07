import { useEffect, useRef, useState } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { motion } from 'framer-motion'
import { useMemeEditor, type FilterPreset, type FramePreset } from '../hooks/useMemeEditor'
import { Capacitor } from '@capacitor/core'

// noop

export default function MemeEditor() {
  const { canvasRef, initialize, loadImage, addText, setActiveFilter, setFrame, exportDataUrl, isReady, clear } = useMemeEditor(1080, 1350)
  const [filter, setFilter] = useState<FilterPreset>({})
  const [frame, setFrameState] = useState<FramePreset>('post')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    setFrame(frame)
  }, [frame, setFrame])

  useEffect(() => {
    setActiveFilter(filter)
  }, [filter, setActiveFilter])

  const onPickImage = async () => {
    setLoading(true)
    try {
      const isNative = Capacitor.isNativePlatform?.() ?? (Capacitor.getPlatform() !== 'web')
      if (isNative) {
        const result = await Camera.getPhoto({
          source: CameraSource.Photos,
          resultType: CameraResultType.Uri,
          quality: 95,
          allowEditing: false,
        })
        const webPath = result.webPath || result.path
        if (!webPath) return
        await loadImage(webPath)
      } else {
        fileInputRef.current?.click()
      }
    } finally {
      setLoading(false)
    }
  }

  const onFilePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const objectUrl = URL.createObjectURL(file)
    await loadImage(objectUrl)
  }

  const onSave = async () => {
    const dataUrl = exportDataUrl(1)
    if (!dataUrl) return
    const isNative = Capacitor.isNativePlatform?.() ?? (Capacitor.getPlatform() !== 'web')
    const fileName = `meme_${Date.now()}.png`
    if (isNative) {
      const base64 = dataUrl.split(',')[1]
      await Filesystem.writeFile({ data: base64, path: fileName, directory: Directory.Documents, recursive: true })
      alert(`Saved: ${fileName}`)
    } else {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const onShare = async () => {
    const dataUrl = exportDataUrl(1)
    if (!dataUrl) return
    const isNative = Capacitor.isNativePlatform?.() ?? (Capacitor.getPlatform() !== 'web')
    if (isNative) {
      await Share.share({ title: 'My Meme', text: 'Check this meme', url: dataUrl, dialogTitle: 'Share Meme' })
    } else if (navigator.share) {
      try {
        await navigator.share({ title: 'My Meme', text: 'Check this meme', url: dataUrl })
      } catch {}
    } else {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `meme_${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ textAlign: 'center' }}>Meme Maker</motion.h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFilePicked} />
          <button onClick={onPickImage} disabled={!isReady || loading}>Pick Image</button>
          <button onClick={() => addText('TOP TEXT')} disabled={!isReady}>Add Top Text</button>
          <button onClick={() => addText('BOTTOM TEXT')} disabled={!isReady}>Add Bottom Text</button>
          <button onClick={onSave} disabled={!isReady}>Save</button>
          <button onClick={onShare} disabled={!isReady}>Share</button>
          <button onClick={clear} disabled={!isReady}>Clear</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <fieldset style={{ padding: 12 }}>
            <legend>Frame</legend>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['original','square','story','post','twitter'] as const).map(p => (
                <button key={p} onClick={() => setFrameState(p)} aria-pressed={frame === p}>{p}</button>
              ))}
            </div>
          </fieldset>

          <fieldset style={{ padding: 12 }}>
            <legend>Filters</legend>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>
                Brightness: {filter.brightness ?? 0}
                <input type="range" min="-0.5" max="0.5" step="0.05" value={filter.brightness ?? 0} onChange={(e) => setFilter(prev => ({ ...prev, brightness: parseFloat(e.target.value) }))} />
              </label>
              <label>
                Contrast: {filter.contrast ?? 0}
                <input type="range" min="-0.5" max="0.5" step="0.05" value={filter.contrast ?? 0} onChange={(e) => setFilter(prev => ({ ...prev, contrast: parseFloat(e.target.value) }))} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!filter.grayscale} onChange={(e) => setFilter(prev => ({ ...prev, grayscale: e.target.checked }))} />
                Grayscale
              </label>
              <label>
                Blur: {filter.blur ?? 0}
                <input type="range" min="0" max="1" step="0.05" value={filter.blur ?? 0} onChange={(e) => setFilter(prev => ({ ...prev, blur: parseFloat(e.target.value) }))} />
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      <div style={{ width: '100%', display: 'grid', placeItems: 'center' }}>
        <motion.canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', height: 'auto', border: '1px solid #e5e7eb', background: '#111' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}


