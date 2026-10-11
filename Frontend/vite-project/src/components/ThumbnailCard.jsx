import './ThumbnailCard.css'

const STYLE_LABELS = {
  bold_dramatic: 'Bold & Dramatic',
  clean_minimal: 'Clean & Minimal',
  vibrant_energetic: 'Vibrant & Energetic',
}

const VARIANT_LABELS = {
  youtube: 'YouTube 1280×720',
  shorts: 'Shorts 1080×1920',
  square: 'Square 1080×1080',
}

function ThumbnailCard({ thumbnail }) {
  const { style_name, status, imagekit_url, variants, error_message } = thumbnail
  const label = STYLE_LABELS[style_name] ?? style_name

  return (
    <article className="card">
      <div className="card-media">
        {status === 'uploaded' ? (
          <a href={imagekit_url} target="_blank" rel="noreferrer">
            <img src={variants?.youtube ?? imagekit_url} alt={`${label} thumbnail`} />
          </a>
        ) : status === 'error' ? (
          <div className="card-state card-error">
            <strong>Generation failed</strong>
            <span>{error_message || 'Something went wrong.'}</span>
          </div>
        ) : (
          <div className="card-state">
            <span className="spinner" aria-hidden="true" />
            <span>Generating…</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <h3>{label}</h3>
        {status === 'uploaded' && variants && (
          <div className="variants">
            {Object.entries(variants).map(([name, url]) => (
              <a key={name} href={`${url}&ik-attachment=true`} target="_blank" rel="noreferrer">
                {VARIANT_LABELS[name] ?? name}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export default ThumbnailCard
