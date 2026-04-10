import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage({ onSwitch }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.password) {
      setError('Email et mot de passe obligatoires')
      return
    }
    setLoading(true)
    try {
      await login(form.email, form.password)
    } catch (e) {
      setError('Email ou mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-full max-w-md bg-base-100 shadow-xl border border-base-300">
        <div className="card-body gap-6">

          {/* Logo */}
          <div className="text-center">
            <div className="text-4xl font-black text-warning tracking-tight">CheickFin</div>
            <p className="text-base-content/50 text-sm mt-1">Gestion financière simplifiée</p>
          </div>

          <h2 className="text-xl font-bold text-center">Connexion</h2>

          {error && (
            <div className="alert alert-error alert-soft text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Email</label>
              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="votre@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm">Mot de passe</label>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            <button
              className="btn btn-warning w-full mt-2"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-sm" /> : 'Se connecter'}
            </button>
          </div>

          <p className="text-center text-sm text-base-content/60">
            Pas encore de compte ?{' '}
            <button className="text-warning font-semibold hover:underline" onClick={onSwitch}>
              S'inscrire
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
