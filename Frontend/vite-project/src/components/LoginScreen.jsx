import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { loginWithGoogle } from '../api'

function LoginScreen({ onLogin }) {
  const [error, setError] = useState(null)

  async function handleSuccess({ credential }) {
    setError(null)
    try {
      onLogin(await loginWithGoogle(credential))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="login">
      <div className="panel login-card">
        <h1>ThumbMaker</h1>
        <p>Sign in to generate AI YouTube thumbnails from your headshot.</p>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => setError('Google sign-in failed. Please try again.')}
          theme="filled_black"
          shape="pill"
        />
        {error && <p className="alert" role="alert">{error}</p>}
      </div>
    </div>
  )
}

export default LoginScreen
