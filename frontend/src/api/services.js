import api from './client'

export const authAPI = {
  register: (data) => api.post('auth/register/', data),
  login: (data) => api.post('auth/login/', data),
  logout: (refresh) => api.post('auth/logout/', { refresh }),
  profile: () => api.get('auth/profile/'),
  updateProfile: (data) => api.put('auth/profile/', data),
  changePassword: (data) => api.post('auth/change-password/', data),
}

export const categorieAPI = {
  list: () => api.get('categories/'),
  entrees: () => api.get('categories/entrees/'),
  sorties: () => api.get('categories/sorties/'),
}

export const transactionAPI = {
  list: (params) => api.get('transactions/', { params }),
  create: (data) => api.post('transactions/', data),
  update: (id, data) => api.put(`transactions/${id}/`, data),
  delete: (id) => api.delete(`transactions/${id}/`),
  resume: (params) => api.get('transactions/resume/', { params }),
  fluxJournalier: (params) => api.get('transactions/flux_journalier/', { params }),
}

export const detteAPI = {
  list: (params) => api.get('dettes/', { params }),
  create: (data) => api.post('dettes/', data),
  update: (id, data) => api.put(`dettes/${id}/`, data),
  delete: (id) => api.delete(`dettes/${id}/`),
  stats: () => api.get('dettes/stats/'),
}

export const budgetAPI = {
  list: () => api.get('budgets/'),
  create: (data) => api.post('budgets/', data),
  update: (id, data) => api.put(`budgets/${id}/`, data),
  delete: (id) => api.delete(`budgets/${id}/`),
  suivi: (params) => api.get('budgets/suivi/', { params }),
}

export const factureAPI = {
  list:           (params) => api.get('factures/', { params }),
  create:         (data)   => api.post('factures/', data),
  get:            (id)     => api.get(`factures/${id}/`),
  update:         (id, data) => api.put(`factures/${id}/`, data),
  delete:         (id)     => api.delete(`factures/${id}/`),
  stats:          ()       => api.get('factures/stats/'),
  ajouterLigne:   (id, data) => api.post(`factures/${id}/ajouter_ligne/`, data),
  supprimerLigne: (factureId, ligneId) => api.delete(`factures/${factureId}/supprimer_ligne/${ligneId}/`),
  changerStatut:  (id, statut) => api.post(`factures/${id}/changer_statut/`, { statut }),
}

