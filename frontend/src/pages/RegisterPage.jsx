import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage({ onSwitch }) {
  const { register } = useAuth()
  const [form, setForm] = useState({
    email: '', nom: '', prenom: '', entreprise: '',
    telephone: '', password: '', password2: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.nom || !form.password) {
      setError('Email, nom et mot de passe sont obligatoires')
      return
    }
    if (form.password !== form.password2) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      await register(form)
    } catch (e) {
      setError(e.response?.data?.email?.[0] || 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  const field = (label, name, type = 'text', placeholder = '') => (
    <div className="flex flex-col gap-1">
      <label className="label text-sm">{label}</label>
      <input
        type={type}
        className="input input-bordered w-full"
        placeholder={placeholder}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      />
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 py-8">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl border border-base-300">
        <div className="card-body gap-4">

          <div className="text-center">
            <div className="text-4xl font-black text-warning tracking-tight">FinTrack</div>
            <p className="text-base-content/50 text-sm mt-1">Créez votre compte</p>
          </div>

          {error && <div className="alert alert-error alert-soft text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            {field('Nom *', 'nom', 'text', 'Barro')}
            {field('Prénom', 'prenom', 'text', 'Drissa')}
          </div>

          {field('Email *', 'email', 'email', 'votre@email.com')}
          {field('Entreprise', 'entreprise', 'text', 'Mon Entreprise SARL')}
          {field('Téléphone', 'telephone', 'tel', '+226 XX XX XX XX')}

          <div className="grid grid-cols-2 gap-3">
            {field('Mot de passe *', 'password', 'password', '••••••••')}
            {field('Confirmer *', 'password2', 'password', '••••••••')}
          </div>

          <button
            className="btn btn-warning w-full mt-2"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : 'Créer mon compte'}
          </button>

          <p className="text-center text-sm text-base-content/60">
            Déjà un compte ?{' '}
            <button className="text-warning font-semibold hover:underline" onClick={onSwitch}>
              Se connecter
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
