// utils/securiteHtml.js
// Insertion sûre de données saisies par les utilisateurs dans du HTML (mails et PDF).
const puppeteer = require("puppeteer");

// Échappe un texte avant de l'insérer dans du HTML (contenu ou attribut).
// `$` est aussi échappé : sinon String.replace() interprète "$&", "$'"… dans la valeur de remplacement.
const echapperHtml = (valeur) => String(valeur ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')
  .replace(/\$/g, '&#36;')

// Seules ces origines peuvent être chargées par le navigateur qui génère les PDF (logo, signatures).
const ORIGINES_AUTORISEES_PDF = ['https://res.cloudinary.com/'];

// URL d'image utilisable dans un <img src="..."> : image Cloudinary ou image en data: base64, sinon vide.
const urlImage = (valeur) => {
  const url = String(valeur ?? '').trim();
  if (ORIGINES_AUTORISEES_PDF.some((o) => url.startsWith(o))) return echapperHtml(url);
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=\s]+$/.test(url)) return echapperHtml(url);
  return '';
};

// Génère un PDF à partir d'un HTML qui contient des données utilisateur :
// - JavaScript désactivé (un <script> injecté ne s'exécute pas)
// - toute requête réseau bloquée sauf Cloudinary et les data: (pas d'accès aux services internes ni aux fichiers locaux)
// - navigateur toujours fermé, même en cas d'erreur
// "--no-sandbox" est conservé car le serveur peut exécuter Node en root ; les deux protections ci-dessus compensent.
const genererPdf = async (html, options = {}) => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (requete) => {
      const url = requete.url();
      const autorisee = url.startsWith('data:') || url === 'about:blank'
        || ORIGINES_AUTORISEES_PDF.some((o) => url.startsWith(o));
      if (autorisee) requete.continue();
      else requete.abort();
    });
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    return await page.pdf({ format: "A4", printBackground: true, ...options });
  } finally {
    await browser.close();
  }
};

module.exports = { echapperHtml, urlImage, genererPdf };
