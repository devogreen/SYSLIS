// middlewares/limiteur.js
// Limitation du nombre de tentatives sur les routes publiques (connexion, mot de passe oublié, réinitialisation).
// Compteurs en mémoire (un seul process Node) : remis à zéro au redémarrage du serveur.

const compteurs = new Map(); // clé -> { nombre, fin }

const incrementer = (cle, fenetreMs) => {
  const maintenant = Date.now();
  let c = compteurs.get(cle);
  if (!c || c.fin <= maintenant) {
    c = { nombre: 0, fin: maintenant + fenetreMs };
    compteurs.set(cle, c);
  }
  c.nombre += 1;
  return c;
};

const lire = (cle) => {
  const c = compteurs.get(cle);
  if (!c || c.fin <= Date.now()) return null;
  return c;
};

// Nettoyage des compteurs expirés
setInterval(() => {
  const maintenant = Date.now();
  for (const [cle, c] of compteurs) if (c.fin <= maintenant) compteurs.delete(cle);
}, 60 * 1000).unref();

const refuser = (res, c, message) => {
  const secondes = Math.max(1, Math.ceil((c.fin - Date.now()) / 1000));
  res.set('Retry-After', String(secondes));
  const minutes = Math.ceil(secondes / 60);
  return res.status(429).json({ message: `${message} Réessayez dans ${minutes} minute(s).` });
};

const emailDe = (req) => String(req.body?.email || '').trim().toLowerCase();

// Limite simple : `max` requêtes par `fenetreMs` pour une même clé (IP par défaut).
const limiter = ({ max, fenetreMs, prefixe, cle = (req) => req.ip, message }) => (req, res, next) => {
  const c = incrementer(`${prefixe}:${cle(req)}`, fenetreMs);
  if (c.nombre > max) return refuser(res, c, message);
  return next();
};

// Connexion : seuls les échecs comptent, par adresse e-mail (non falsifiable) et par IP.
// Une connexion réussie remet le compteur de l'e-mail à zéro.
const QUINZE_MINUTES = 15 * 60 * 1000;
const MAX_ECHECS_EMAIL = 10;
const MAX_ECHECS_IP = 30;
const limiterConnexion = (req, res, next) => {
  const email = emailDe(req);
  const cleEmail = `login-email:${email}`;
  const cleIp = `login-ip:${req.ip}`;
  const parEmail = email ? lire(cleEmail) : null;
  if (parEmail && parEmail.nombre >= MAX_ECHECS_EMAIL) {
    return refuser(res, parEmail, "Trop de tentatives de connexion pour ce compte.");
  }
  const parIp = lire(cleIp);
  if (parIp && parIp.nombre >= MAX_ECHECS_IP) {
    return refuser(res, parIp, "Trop de tentatives de connexion.");
  }
  res.on('finish', () => {
    if (res.statusCode === 200) {
      if (email) compteurs.delete(cleEmail);
    } else if (res.statusCode === 401 || res.statusCode === 404) {
      if (email) incrementer(cleEmail, QUINZE_MINUTES);
      incrementer(cleIp, QUINZE_MINUTES);
    }
  });
  return next();
};

const UNE_HEURE = 60 * 60 * 1000;
const limiterMotDePasseOublie = [
  limiter({ max: 5, fenetreMs: UNE_HEURE, prefixe: 'forgot-email', cle: emailDe, message: "Trop de demandes de réinitialisation pour ce compte." }),
  limiter({ max: 20, fenetreMs: UNE_HEURE, prefixe: 'forgot-ip', message: "Trop de demandes de réinitialisation." }),
];
const limiterReinitialisation = limiter({ max: 10, fenetreMs: QUINZE_MINUTES, prefixe: 'reset-ip', message: "Trop de tentatives." });

module.exports = { limiter, limiterConnexion, limiterMotDePasseOublie, limiterReinitialisation };
