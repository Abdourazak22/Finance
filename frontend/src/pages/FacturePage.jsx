import { useState, useEffect, useCallback, useRef } from 'react'
import { factureAPI, transactionAPI } from '../api/services'
import {
  PlusCircle, Trash, Pencil, Eye, Download,
  FileText, CheckCircle, Clock, XCircle, FileEdit
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const FORM_EMPTY = {
  client_nom: '', client_email: '', client_telephone: '',
  client_adresse: '', date_emission: new Date().toISOString().split('T')[0],
  date_echeance: '', statut: 'brouillon', taux_tva: 0, notes: '', transaction: ''
}

const LIGNE_EMPTY = { description: '', quantite: 1, prix_unitaire: '' }

const STATUT_CONFIG = {
  brouillon:  { label: 'Brouillon',   badge: 'badge-ghost' },
  envoyee:    { label: 'Envoyée',     badge: 'badge-info' },
  en_attente: { label: 'En attente',  badge: 'badge-warning' },
  payee:      { label: 'Payée',       badge: 'badge-success' },
  annulee:    { label: 'Annulée',     badge: 'badge-error' },
}

export default function FacturePage() {
  const { user } = useAuth()
  const [factures, setFactures]       = useState([])
  const [stats, setStats]             = useState(null)
  const [transactions, setTransactions] = useState([])
  const [form, setForm]               = useState(FORM_EMPTY)
  const [lignes, setLignes]           = useState([{ ...LIGNE_EMPTY }])
  const [editId, setEditId]           = useState(null)
  const [viewFacture, setViewFacture] = useState(null)
  const [loading, setLoading]         = useState(false)
  const [refresh, setRefresh]         = useState(0)
  const printRef = useRef()

  const load = useCallback(async () => {
    try {
      const [f, s, t] = await Promise.all([
        factureAPI.list({ ordering: '-date_emission' }),
        factureAPI.stats(),
        transactionAPI.list({ ordering: '-date' }),
      ])
      setFactures(Array.isArray(f.data) ? f.data : (f.data.results || []))
      setStats(s.data)
      setTransactions(Array.isArray(t.data) ? t.data : (t.data.results || []))
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load, refresh])

  const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA'

  const openModal = (facture = null) => {
    if (facture) {
      setForm({
        client_nom:       facture.client_nom,
        client_email:     facture.client_email || '',
        client_telephone: facture.client_telephone || '',
        client_adresse:   facture.client_adresse || '',
        date_emission:    facture.date_emission,
        date_echeance:    facture.date_echeance || '',
        statut:           facture.statut,
        taux_tva:         facture.taux_tva || 0,
        notes:            facture.notes || '',
        transaction:      facture.transaction || '',
      })
      setLignes(facture.lignes?.length ? facture.lignes.map(l => ({
        description: l.description,
        quantite: l.quantite,
        prix_unitaire: l.prix_unitaire,
      })) : [{ ...LIGNE_EMPTY }])
      setEditId(facture.id)
    } else {
      setForm(FORM_EMPTY)
      setLignes([{ ...LIGNE_EMPTY }])
      setEditId(null)
    }
    document.getElementById('modal_facture').showModal()
  }

  const handleSave = async () => {
    if (!form.client_nom || !form.date_emission) {
      alert('Nom client et date sont obligatoires')
      return
    }

    const lignesValides = lignes.filter(l => l.description && l.prix_unitaire)
    if (lignesValides.length === 0) {
      alert('Ajoutez au moins une ligne avec description et prix')
      return
    }

    setLoading(true)
    try {
      let factureId

      const payload = {
        ...form,
        transaction: form.transaction || null,
        taux_tva: Number(form.taux_tva || 0),
      }

      if (editId) {
        // ── Modification ──
        await factureAPI.update(editId, payload)
        factureId = editId

        // Supprimer les anciennes lignes
        const factureActuelle = await factureAPI.get(editId)
        for (const l of (factureActuelle.data.lignes || [])) {
          await factureAPI.supprimerLigne(factureId, l.id)
        }
      } else {
        // ── Création ──
        const res = await factureAPI.create(payload)
        factureId = res.data.id
        console.log('Facture créée ID:', factureId)
      }

      // ── Ajouter les lignes une par une ──
      for (const l of lignesValides) {
        const lignePayload = {
          description:   String(l.description),
          quantite:      Number(l.quantite) || 1,
          prix_unitaire: Number(l.prix_unitaire),
        }
        console.log('Ajout ligne:', lignePayload)
        const res = await factureAPI.ajouterLigne(factureId, lignePayload)
        console.log('Ligne ajoutée, montant_total:', res.data.montant_total)
      }

      document.getElementById('modal_facture').close()
      setForm(FORM_EMPTY)
      setLignes([{ ...LIGNE_EMPTY }])
      setEditId(null)
      setRefresh(r => r + 1)

    } catch (e) {
      console.error('Erreur handleSave:', e)
      console.error('Response data:', e?.response?.data)
      alert('Erreur : ' + JSON.stringify(e?.response?.data || e.message))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette facture ?')) return
    await factureAPI.delete(id)
    setRefresh(r => r + 1)
  }

  const handleStatut = async (id, statut) => {
    await factureAPI.changerStatut(id, statut)
    setRefresh(r => r + 1)
  }

  const handleView = async (id) => {
    const res = await factureAPI.get(id)
    setViewFacture(res.data)
    document.getElementById('modal_view_facture').showModal()
  }

  const handlePrint = () => { window.print() }

  const addLigne = () => setLignes([...lignes, { ...LIGNE_EMPTY }])
  const removeLigne = (i) => setLignes(lignes.filter((_, idx) => idx !== i))
  const updateLigne = (i, field, val) => {
    const updated = [...lignes]
    updated[i] = { ...updated[i], [field]: val }
    setLignes(updated)
  }

  const sousTotal = lignes.reduce((acc, l) => acc + (Number(l.quantite || 0) * Number(l.prix_unitaire || 0)), 0)
  const tva = sousTotal * Number(form.taux_tva || 0) / 100
  const total = sousTotal + tva

  return (
    <div className="flex flex-col gap-6">

      {/* ── Titre ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Factures</h1>
          <p className="text-base-content/50 text-sm mt-1">{factures.length} facture(s) au total</p>
        </div>
        <button className="btn btn-warning" onClick={() => openModal()}>
          <PlusCircle className="w-4 h-4" /> Nouvelle facture
        </button>
      </div>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 text-xs text-base-content/50 uppercase">
                <CheckCircle className="w-4 h-4 text-success" /> Payées
              </div>
              <div className="text-xl font-black text-success">{fmt(stats.montant_total_paye)}</div>
              <div className="text-xs text-base-content/40">{stats.payees} facture(s)</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 text-xs text-base-content/50 uppercase">
                <Clock className="w-4 h-4 text-warning" /> En attente
              </div>
              <div className="text-xl font-black text-warning">{fmt(stats.montant_en_attente)}</div>
              <div className="text-xs text-base-content/40">{stats.en_attente} facture(s)</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 text-xs text-base-content/50 uppercase">
                <FileEdit className="w-4 h-4 text-info" /> Brouillons
              </div>
              <div className="text-xl font-black">{stats.brouillons}</div>
            </div>
          </div>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 text-xs text-base-content/50 uppercase">
                <XCircle className="w-4 h-4 text-error" /> Annulées
              </div>
              <div className="text-xl font-black text-error">{stats.annulees}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tableau ── */}
      <div className="card bg-base-100 border border-base-300">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Date émission</th>
                <th>Échéance</th>
                <th>Montant total</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-base-content/40 py-10">
                    Aucune facture trouvée
                  </td>
                </tr>
              )}
              {factures.map(f => (
                <tr key={f.id}>
                  <td className="font-mono font-bold text-warning">{f.numero}</td>
                  <td className="font-medium">{f.client_nom}</td>
                  <td className="text-sm text-base-content/60">
                    {new Date(f.date_emission).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="text-sm text-base-content/60">
                    {f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="font-bold">{fmt(f.montant_total)}</td>

                  <td>
                    <select
                      className={`badge badge-soft text-xs border-0 cursor-pointer ${STATUT_CONFIG[f.statut]?.badge}`}
                      value={f.statut}
                      onChange={e => handleStatut(f.id, e.target.value)}
                    >
                      {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="flex gap-1">
                    <button className="btn btn-sm btn-ghost" onClick={() => handleView(f.id)}>
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => openModal(f)}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-error btn-soft" onClick={() => handleDelete(f.id)}>
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal création/modification ── */}
      <dialog id="modal_facture" className="modal backdrop-blur">
        <div className="modal-box max-w-3xl border border-base-300">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <h3 className="font-bold text-lg mb-4">
            {editId ? 'Modifier la facture' : 'Nouvelle facture'}
          </h3>

          <div className="flex flex-col gap-4">

            {/* Infos client */}
            <div className="divider text-sm text-base-content/40 my-0">Informations client</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Nom client *</label>
                <input type="text" className="input w-full" placeholder="Ex: Alpha SARL"
                  value={form.client_nom}
                  onChange={e => setForm({ ...form, client_nom: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Email client</label>
                <input type="email" className="input w-full" placeholder="client@email.com"
                  value={form.client_email}
                  onChange={e => setForm({ ...form, client_email: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Téléphone</label>
                <input type="tel" className="input w-full" placeholder="+226 70 00 00 00"
                  value={form.client_telephone}
                  onChange={e => setForm({ ...form, client_telephone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Adresse</label>
                <input type="text" className="input w-full" placeholder="Adresse client"
                  value={form.client_adresse}
                  onChange={e => setForm({ ...form, client_adresse: e.target.value })} />
              </div>
            </div>

            {/* Dates et statut */}
            <div className="divider text-sm text-base-content/40 my-0">Dates & Statut</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Date émission *</label>
                <input type="date" className="input w-full"
                  value={form.date_emission}
                  onChange={e => setForm({ ...form, date_emission: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Date échéance</label>
                <input type="date" className="input w-full"
                  value={form.date_echeance}
                  onChange={e => setForm({ ...form, date_echeance: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="label text-sm">Statut</label>
                <select className="select w-full" value={form.statut}
                  onChange={e => setForm({ ...form, statut: e.target.value })}>
                  {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lier à une transaction */}
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Lier à une transaction (optionnel)</label>
              <select className="select w-full" value={form.transaction}
                onChange={e => setForm({ ...form, transaction: e.target.value })}>
                <option value="">-- Aucune transaction --</option>
                {transactions.filter(t => t.type === 'entree').map(t => (
                  <option key={t.id} value={t.id}>
                    {new Date(t.date).toLocaleDateString('fr-FR')} — {t.description} — {Number(t.montant).toLocaleString('fr-FR')} FCFA
                  </option>
                ))}
              </select>
            </div>

            {/* Lignes */}
            <div className="divider text-sm text-base-content/40 my-0">Articles / Prestations</div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-base-content/50 px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2">Qté</span>
                <span className="col-span-3">Prix unit.</span>
                <span className="col-span-2">Total</span>
              </div>
              {lignes.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input type="text" className="input input-sm col-span-5" placeholder="Description"
                    value={l.description}
                    onChange={e => updateLigne(i, 'description', e.target.value)} />
                  <input type="number" className="input input-sm col-span-2" min="1"
                    value={l.quantite}
                    onChange={e => updateLigne(i, 'quantite', e.target.value)} />
                  <input type="number" className="input input-sm col-span-3" placeholder="0"
                    value={l.prix_unitaire}
                    onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                  <div className="col-span-1 text-sm font-bold text-success">
                    {Number(Number(l.quantite || 0) * Number(l.prix_unitaire || 0)).toLocaleString('fr-FR')}
                  </div>
                  {lignes.length > 1 && (
                    <button className="col-span-1 btn btn-xs btn-error btn-soft"
                      onClick={() => removeLigne(i)}>
                      <Trash className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button className="btn btn-sm btn-ghost btn-outline mt-1 w-fit" onClick={addLigne}>
                <PlusCircle className="w-4 h-4" /> Ajouter une ligne
              </button>
            </div>

            {/* TVA + Totaux */}
            <div className="divider text-sm text-base-content/40 my-0">Totaux</div>
            <div className="flex justify-end">
              <div className="flex flex-col gap-2 w-64">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Sous-total</span>
                  <span className="font-bold">{sousTotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex items-center justify-between text-sm gap-2">
                  <span className="text-base-content/60">TVA (%)</span>
                  <input type="number" className="input input-sm w-20" min="0" max="100"
                    value={form.taux_tva}
                    onChange={e => setForm({ ...form, taux_tva: e.target.value })} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Montant TVA</span>
                  <span>{tva.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="divider my-0" />
                <div className="flex justify-between font-black text-lg">
                  <span>Total</span>
                  <span className="text-warning">{total.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1">
              <label className="label text-sm">Notes / Conditions</label>
              <textarea className="textarea w-full" rows={2}
                placeholder="Conditions de paiement, notes..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <button className="btn btn-warning w-full" onClick={handleSave} disabled={loading}>
              {loading
                ? <span className="loading loading-spinner loading-sm" />
                : editId ? 'Mettre à jour' : 'Créer la facture'
              }
            </button>
          </div>
        </div>
      </dialog>

      {/* ── Modal visualisation + impression ── */}
      <dialog id="modal_view_facture" className="modal backdrop-blur">
        <div className="modal-box max-w-2xl border border-base-300" ref={printRef}>
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 print:hidden">✕</button>
          </form>

          {viewFacture && (
            <div className="flex flex-col gap-4">

              {/* En-tête */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-black text-warning">FinTrack</div>
                  <div className="text-sm text-base-content/50">{user?.entreprise || ''}</div>
                  <div className="text-sm text-base-content/50">{user?.email}</div>
                  <div className="text-sm text-base-content/50">{user?.telephone || ''}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono">{viewFacture.numero}</div>
                  <div className="text-sm text-base-content/50">
                    Émise le {new Date(viewFacture.date_emission).toLocaleDateString('fr-FR')}
                  </div>
                  {viewFacture.date_echeance && (
                    <div className="text-sm text-base-content/50">
                      Échéance : {new Date(viewFacture.date_echeance).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                  <span className={`badge badge-soft mt-1 ${STATUT_CONFIG[viewFacture.statut]?.badge}`}>
                    {STATUT_CONFIG[viewFacture.statut]?.label}
                  </span>
                </div>
              </div>

              {/* Client */}
              <div className="bg-base-200 rounded-xl p-4">
                <div className="text-xs text-base-content/50 uppercase mb-1">Facturé à</div>
                <div className="font-bold">{viewFacture.client_nom}</div>
                {viewFacture.client_email    && <div className="text-sm">{viewFacture.client_email}</div>}
                {viewFacture.client_telephone && <div className="text-sm">{viewFacture.client_telephone}</div>}
                {viewFacture.client_adresse  && <div className="text-sm">{viewFacture.client_adresse}</div>}
              </div>

              {/* Lignes */}
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-right">Qté</th>
                    <th className="text-right">Prix unit.</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewFacture.lignes?.map((l, i) => (
                    <tr key={i}>
                      <td>{l.description}</td>
                      <td className="text-right">{l.quantite}</td>
                      <td className="text-right">{Number(l.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
                      <td className="text-right font-bold">{Number(l.total).toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totaux */}
              <div className="flex justify-end">
                <div className="flex flex-col gap-1 w-56">
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Sous-total</span>
                    <span>{Number(viewFacture.sous_total).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {Number(viewFacture.taux_tva) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-base-content/60">TVA ({viewFacture.taux_tva}%)</span>
                        <span>{Number(viewFacture.montant_tva).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </>
                  )}
                  <div className="divider my-0" />
                  <div className="flex justify-between font-black text-lg">
                    <span>Total</span>
                    <span className="text-warning">{Number(viewFacture.montant_total).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              </div>

              {viewFacture.notes && (
                <div className="bg-base-200 rounded-xl p-3 text-sm text-base-content/60">
                  {viewFacture.notes}
                </div>
              )}

              {/* Bouton PDF */}
              <button className="btn btn-warning w-full print:hidden" onClick={handlePrint}>
                <Download className="w-4 h-4" /> Télécharger PDF
              </button>
            </div>
          )}
        </div>
      </dialog>

    </div>
  )
}
