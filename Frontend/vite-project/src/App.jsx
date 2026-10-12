import { useEffect, useState } from 'react'
import { createJob, getCurrentUser, logout, subscribeToJob, uploadHeadshot } from './api'
import LoginScreen from './components/LoginScreen'
import ThumbnailForm from './components/ThumbnailForm'
import ThumbnailCard from './components/ThumbnailCard'
import './App.css'

const BUSY_LABELS = {
  uploading: 'Uploading headshot…',
  starting: 'Starting job…',
  generating: 'Generating…',
}

function App() {
  // undefined = still checking the session, null = signed out
  const [user, setUser] = useState(undefined)
  // idle | uploading | starting | generating | done
  const [phase, setPhase] = useState('idle')
  const [jobId, setJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const [expected, setExpected] = useState(0)
  const [thumbnails, setThumbnails] = useState([])
  const [error, setError] = useState(null)

  // restore the session from the cookie on page load
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  // 3. subscribe to SSE once the job exists
  useEffect(() => {
    if (!jobId) return

    // the stream replays finished thumbnails if it reconnects, so add each only once
    const addThumbnail = (thumbnail) => {
      setThumbnails((prev) => (prev.some((t) => t.id === thumbnail.id) ? prev : [...prev, thumbnail]))
    }

    return subscribeToJob(jobId, {
      onThumbnailReady: (data) => {
        addThumbnail({
          id: data.thumbnail_id,
          style_name: data.style_name,
          status: 'uploaded',
          imagekit_url: data.imagekit_url,
          variants: data.variants,
        })
      },
      onThumbnailFailed: (data) => {
        addThumbnail({
          id: data.thumbnail_id,
          style_name: data.style_name,
          status: 'error',
          error_message: data.error,
        })
      },
      onJobComplete: (data) => {
        setJobStatus(data.status)
        setPhase('done')
      },
      onError: () => {
        setError('Lost connection to the server while generating. Please try again.')
        setPhase('done')
      },
    })
  }, [jobId])

  async function handleSubmit({ file, prompt, numThumbnails }) {
    setError(null)
    setJobId(null)
    setJobStatus(null)
    setThumbnails([])
    setExpected(numThumbnails)

    try {
      // 1. upload headshot
      setPhase('uploading')
      const { url } = await uploadHeadshot(file)

      // 2. create job
      setPhase('starting')
      const { job_id } = await createJob({ prompt, numThumbnails, headshotUrl: url })

      setJobId(job_id)
      setPhase('generating')
    } catch (err) {
      setError(err.message)
      setPhase('idle')
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setUser(null)
      setJobId(null)
      setJobStatus(null)
      setThumbnails([])
      setError(null)
      setPhase('idle')
    }
  }

  if (user === undefined) return null
  if (user === null) return <LoginScreen onLogin={setUser} />

  const busy = phase !== 'idle' && phase !== 'done'

  // placeholders for thumbnails the stream has not reported yet
  const pendingCount = phase === 'generating' ? Math.max(expected - thumbnails.length, 0) : 0
  const pending = Array.from({ length: pendingCount }, (_, i) => ({
    id: `pending-${i}`,
    style_name: `Thumbnail ${thumbnails.length + i + 1}`,
    status: 'pending',
  }))
  const cards = [...thumbnails, ...pending]

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>ThumbMaker</h1>
          <p>Upload a headshot, describe your video, and get AI-generated YouTube thumbnails.</p>
        </div>
        <div className="user">
          {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" />}
          <span>{user.name || user.email}</span>
          <button type="button" className="secondary" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <ThumbnailForm busy={busy} busyLabel={BUSY_LABELS[phase]} onSubmit={handleSubmit} />
          {error && <p className="alert" role="alert">{error}</p>}
        </section>

        <section className="results" aria-live="polite">
          {cards.length === 0 ? (
            <div className="empty">
              <p>Your thumbnails will appear here.</p>
            </div>
          ) : (
            <>
              {jobStatus === 'failed' && (
                <p className="alert" role="alert">
                  None of the thumbnails could be generated. Please try again.
                </p>
              )}
              <div className="grid">
                {cards.map((thumbnail) => (
                  <ThumbnailCard key={thumbnail.id} thumbnail={thumbnail} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
