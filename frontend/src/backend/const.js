// Adresse de l'API : choisie automatiquement par Vite
// - "npm run dev"   : API locale
// - "npm run build" : API servie par nginx sur le même domaine que le front (/api)
const urlLocal = "http://localhost:5500"
const urlServer = '/api'

// @ts-ignore
const urlBase = import.meta.env.DEV ? urlLocal : urlServer

export default urlBase
