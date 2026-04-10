import { useState } from 'react'
import { authAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { User, Building2, Phone, Mail, Lock, Save, Eye, EyeOff } from 'lucide-react'

export default function ProfilPage() {
  const { user, setUser } = useAuth()

  const [formProfil, setFormProfil] = useState({
    nom:        user?.nom        || '',
    prenom:     user?.prenom     || '',
    entreprise: user?.entreprise || '',
    telephone:  user?.telephone  || '',
  })

  const [formPassword, setFormPassword] = useState({
    ancien_password:   '',
    nouveau_password:  '',
    confirmer_password: '',
  })

  const [showOld, setShowOld]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [showConf, setShowConf] = useState(false)

  const [savingProfil,   setSavingProfil]   = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [msgProfil,      setMsgProfil]      = useState(null)
  const [msgPassword,    setMsgPassword]    = useState(null)

  // ── Sauvegarder profil ──
  const handleSaveProfil = async () => {
    if (!formProfil.nom) {
      setMsgProfil({ type: 'error', text: 'Le nom est obligatoire' })
      return
    }
    setSavingProfil(true)
    setMsgProfil(null)
    try {
      const res = await authAPI.updateProfile(formProfil)
      setUser(res.data)
      setMsgProfil({ type: 'success', text: 'Profil mis à jour avec succès !' })
    } catch (e) {
      setMsgProfil({ type: 'error', text: 'Erreur lors de la mise à jour' })
    } finally {
      setSavingProfil(false)
    }
  }

  // ── Changer mot de passe ──
  const handleChangePassword = async () => {
    if (!formPassword.ancien_password || !formPassword.nouveau_password) {
      setMsgPassword({ type: 'error', text: 'Tous les champs sont obligatoires' })
      return
    }
    if (formPassword.nouveau_password !== formPassword.confirmer_password) {
      setMsgPassword({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' })
      return
    }
    if (formPassword.nouveau_password.length < 6) {
      setMsgPassword({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' })
      return
    }
    setSavingPassword(true)
    setMsgPassword(null)
    try {
      await authAPI.changePassword({
        ancien_password:  formPassword.ancien_password,
        nouveau_password: formPassword.nouveau_password,
      })
      setMsgPassword({ type: 'success', text: 'Mot de passe modifié avec succès !' })
      setFormPassword({ ancien_password: '', nouveau_password: '', confirmer_password: '' })
    } catch (e) {
      const msg = e?.response?.data?.ancien_password
        ? 'Ancien mot de passe incorrect'
        : 'Erreur lors du changement de mot de passe'
      setMsgPassword({ type: 'error', text: msg })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      {/* ── Titre ── */}
      <div>
        <h1 className="text-2xl font-black">Mon Profil</h1>
        <p className="text-base-content/50 text-sm mt-1">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      {/* ── Avatar + infos rapides ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body p-5 flex-row items-center gap-4">
          <div className="avatar placeholder">
            <div className="bg-warning text-warning-content rounded-full w-16">
              <span className="text-2xl font-black">
                {(user?.prenom?.[0] || user?.nom?.[0] || '?').toUpperCase()}
              </span>
            </div>
          </div>
          <div>
            <div className="font-black text-lg">
              {user?.prenom} {user?.nom}
            </div>
            <div className="text-base-content/50 text-sm flex items-center gap-1">
              <Mail className="w-3 h-3" /> {user?.email}
            </div>
            {user?.entreprise && (
              <div className="text-base-content/50 text-sm flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {user.entreprise}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Formulaire profil ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-warning" />
            <h2 className="font-bold text-lg">Informations personnelles</h2>
          </div>

          <div className="flex flex-col gap-3">

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Nom *</label>
                <input type="text" className="input w-full"
                  value={formProfil.nom}
                  onChange={e => setFormProfil({ ...formProfil, nom: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Prénom</label>
                <input type="text" className="input w-full"
                  value={formProfil.prenom}
                  onChange={e => setFormProfil({ ...formProfil, prenom: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <input type="email" className="input w-full input-disabled opacity-50"
                value={user?.email || ''} disabled />
              <span className="text-xs text-base-content/40">L'email ne peut pas être modifié</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Entreprise
              </label>
              <input type="text" className="input w-full"
                placeholder="Nom de votre entreprise"
                value={formProfil.entreprise}
                onChange={e => setFormProfil({ ...formProfil, entreprise: e.target.value })} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="label text-sm flex items-center gap-1">
                <Phone className="w-3 h-3" /> Téléphone
              </label>
              <input type="tel" className="input w-full"
                placeholder="Ex: +226 70 00 00 00"
                value={formProfil.telephone}
                onChange={e => setFormProfil({ ...formProfil, telephone: e.target.value })} />
            </div>

            {msgProfil && (
              <div className={`alert ${msgProfil.type === 'success' ? 'alert-success' : 'alert-error'} py-2`}>
                <span className="text-sm">{msgProfil.text}</span>
              </div>
            )}

            <button className="btn btn-warning w-full" onClick={handleSaveProfil} disabled={savingProfil}>
              {savingProfil
                ? <span className="loading loading-spinner loading-sm" />
                : <><Save className="w-4 h-4" /> Enregistrer les modifications</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Changer mot de passe ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-warning" />
            <h2 className="font-bold text-lg">Changer le mot de passe</h2>
          </div>

          <div className="flex flex-col gap-3">

            {/* Ancien mot de passe */}
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Ancien mot de passe *</label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  className="input w-full pr-10"
                  value={formPassword.ancien_password}
                  onChange={e => setFormPassword({ ...formPassword, ancien_password: e.target.value })} />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  onClick={() => setShowOld(v => !v)}>
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Nouveau mot de passe *</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  className="input w-full pr-10"
                  value={formPassword.nouveau_password}
                  onChange={e => setFormPassword({ ...formPassword, nouveau_password: e.target.value })} />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  onClick={() => setShowNew(v => !v)}>
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmer mot de passe */}
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Confirmer le nouveau mot de passe *</label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  className="input w-full pr-10"
                  value={formPassword.confirmer_password}
                  onChange={e => setFormPassword({ ...formPassword, confirmer_password: e.target.value })} />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  onClick={() => setShowConf(v => !v)}>
                  {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {msgPassword && (
              <div className={`alert ${msgPassword.type === 'success' ? 'alert-success' : 'alert-error'} py-2`}>
                <span className="text-sm">{msgPassword.text}</span>
              </div>
            )}

            <button className="btn btn-warning w-full" onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword
                ? <span className="loading loading-spinner loading-sm" />
                : <><Lock className="w-4 h-4" /> Changer le mot de passe</>
              }
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
