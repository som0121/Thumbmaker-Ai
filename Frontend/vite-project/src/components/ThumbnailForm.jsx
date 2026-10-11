import { useRef, useState } from 'react'

const MAX_THUMBNAILS = 3
const COUNTS = Array.from({ length: MAX_THUMBNAILS }, (_, i) => i + 1)

function ThumbnailForm({ busy, busyLabel, onSubmit }) {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [numThumbnails, setNumThumbnails] = useState(MAX_THUMBNAILS)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState(null)
  const inputRef = useRef(null)

  function selectFile(next) {
    if (!next) return
    if (!next.type.startsWith('image/')) {
      setFileError('Please choose an image file.')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFileError(null)
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
  }

  function handleDrop(event) {
    event.preventDefault()
    setDragging(false)
    if (busy) return
    selectFile(event.dataTransfer.files[0])
  }

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit({ file, prompt: prompt.trim(), numThumbnails })
  }

  const canSubmit = !busy && file && prompt.trim()

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <span className="label">Headshot</span>
        <button
          type="button"
          className={`dropzone${dragging ? ' dragging' : ''}`}
          disabled={busy}
          onClick={() => inputRef.current.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Headshot preview" className="headshot-preview" />
              <span className="dropzone-text">
                <strong>{file.name}</strong>
                <span>Click or drop to replace</span>
              </span>
            </>
          ) : (
            <span className="dropzone-text">
              <strong>Click to upload or drag a photo here</strong>
              <span>A clear, front-facing photo works best</span>
            </span>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            selectFile(event.target.files[0])
            event.target.value = ''
          }}
        />
        {fileError && <p className="field-error">{fileError}</p>}
      </div>

      <div className="field">
        <label className="label" htmlFor="prompt">Video topic</label>
        <textarea
          id="prompt"
          rows={4}
          placeholder="e.g. I built a SaaS in 24 hours using only AI tools"
          value={prompt}
          disabled={busy}
          onChange={(event) => setPrompt(event.target.value)}
        />
      </div>

      <div className="field">
        <span className="label">Number of thumbnails</span>
        <div className="segmented" role="radiogroup" aria-label="Number of thumbnails">
          {COUNTS.map((count) => (
            <button
              key={count}
              type="button"
              role="radio"
              aria-checked={numThumbnails === count}
              className={numThumbnails === count ? 'active' : ''}
              disabled={busy}
              onClick={() => setNumThumbnails(count)}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="primary" disabled={!canSubmit}>
        {busy ? busyLabel : 'Generate thumbnails'}
      </button>
    </form>
  )
}

export default ThumbnailForm
