// utils/gestionStock.js
// Fusion (« Associer stocks ») et suppression logique d'un stock, depuis la page du stock.
//  - Fusion : le contenu des stocks sources (lots, cartons, SN, pièces hors cartons) passe dans le stock cible ;
//             les sources sont vidées, marquées supprimées et « fusionnées dans » la cible ; leurs propriétaires
//             et sous-propriétaires deviennent sous-propriétaires de la cible.
//  - Suppression : jamais de DELETE (les cartons / lots / SN seraient effacés en cascade). Le stock est marqué supprimé ;
//             s'il contient encore quelque chose, une sortie automatique de tout le contenu est enregistrée (après confirmation).
//             Exception : un stock de terminaux non vide ne peut pas être supprimé (le statut au parc des TPE deviendrait faux) ;
//             il faut d'abord déplacer les terminaux (association à un autre stock, livraison par une demande).
// Autorisés : le propriétaire du stock, ou un super administrateur (rôle 39).
// Toutes les quantités sont relues en base sur des stocks verrouillés.

const { HttpError, toInt, planifierNumeros, verrouillerStock } = require('./stockDemande')

const ROLE_SUPER_ADMIN = 39

/**
 * Réserve un code de stock dans une transaction (création ou renommage) : prend le verrou applicatif « code_stock »
 * (relâché au commit / rollback), puis vérifie qu'aucun stock non supprimé ne porte déjà ce code.
 * Deux créations simultanées avec le même code ne peuvent donc plus passer toutes les deux.
 * La transaction appelante doit être en ReadCommitted (pour voir le stock créé par la transaction précédente).
 * Renvoie le code nettoyé ; HttpError 400 si vide ou déjà pris.
 */
const reserverCodeStock = async (tx, code, { saufStockId = null } = {}) => {
  const nettoye = code ? String(code).trim() : ''
  if (!nettoye) throw new HttpError(400, "Vous devez déterminer un code au stock !")
  await tx.$executeRaw`INSERT INTO verrous_applicatifs (nom, maj) VALUES ('code_stock', NOW()) ON DUPLICATE KEY UPDATE maj = NOW()`
  const meme = await tx.stocks.findFirst({
    where: { code_stock: nettoye, is_deleted: false, ...(saufStockId ? { id: { not: saufStockId } } : {}) },
    select: { id: true },
  })
  if (meme) throw new HttpError(400, "Un stock du même code existe déjà !")
  return nettoye
}
const ROLE_GESTION_STOCK = 7

// Gestionnaire de stock (rôle 7) ou super administrateur (rôle 39) : création / modification des pièces et des stocks
const estGestionnaireStock = async (db, userId) =>
  !!(await db.user_roles.findFirst({ where: { user_id: userId, role_id: { in: [ROLE_GESTION_STOCK, ROLE_SUPER_ADMIN] } } }))

// Utilisateurs responsables des stocks ACTIFS d'une pièce (modèle / service si fournis) :
// propriétaires et sous-propriétaires ; créateur seulement pour un stock sans propriétaire (anciennes données).
const whereResponsablesStocks = ({ pieceId, modelId, serviceId }) => {
  const stocks = {
    piece_id: pieceId,
    is_deleted: false,
    ...(modelId ? { model_id: modelId } : {}),
    ...(serviceId ? { service_id: serviceId } : {}),
  }
  return {
    OR: [
      { stockOwner: { some: stocks } },
      { stock_owners: { some: { stocks } } },
      { stocks_stocks_created_byTousers: { some: { ...stocks, owner: null } } },
    ],
  }
}

const estSuperAdmin = async (db, userId) =>
  !!(await db.user_roles.findFirst({ where: { user_id: userId, role_id: ROLE_SUPER_ADMIN } }))

// Propriétaire, super admin, ou créateur d'un stock sans propriétaire (anciennes données)
const peutGererStock = (stock, userId, superAdmin) =>
  superAdmin || stock.owner === userId || (stock.owner == null && stock.created_by === userId)

const nombre = (n) => Number(n) || 0

const estPieceTerminal = async (db, pieceId) => {
  const piece = await db.items.findUnique({ where: { id_piece: pieceId }, select: { type: true } })
  return String((piece && piece.type) || '').toUpperCase() === 'TERMINAL'
}

// Contenu actif d'un stock (éléments non sortis)
const lireContenuStock = async (db, stockId) => {
  const [lots, cartons, sns] = await Promise.all([
    db.stock_lot.findMany({ where: { stock_id: stockId, is_deleted: false }, orderBy: { id: 'asc' } }),
    db.stock_carton.findMany({ where: { stock_id: stockId, is_deleted: false }, orderBy: { id: 'asc' } }),
    db.serial_numbers.findMany({ where: { stock_id: stockId, is_deleted: false }, select: { id: true, serial_number: true } }),
  ])
  return { lots, cartons, sns }
}

const resumeContenu = (stock, contenu) => {
  const resume = {
    pieces: nombre(stock.quantite_piece),
    cartons: Math.max(nombre(stock.quantite_carton), contenu.cartons.length),
    lots: Math.max(nombre(stock.quantite_lot), contenu.lots.length),
    serialNumbers: contenu.sns.length,
  }
  resume.vide = resume.pieces === 0 && resume.cartons === 0 && resume.lots === 0 && resume.serialNumbers === 0
  return resume
}

const libelleContenu = (r) => [
  r.lots ? `${r.lots} lot(s)` : null,
  r.cartons ? `${r.cartons} carton(s)` : null,
  `${r.pieces} pièce(s)`,
  r.serialNumbers ? `${r.serialNumbers} SN` : null,
].filter(Boolean).join(', ')

/* ===================================================================================
   FUSION
   =================================================================================== */

// Stocks qui peuvent être absorbés par le stock `cible` : même pièce / modèle / service, non supprimés,
// gérables par l'utilisateur (propriétaire, ou tous pour le super admin)
const whereStocksFusionnables = (cible, userId, superAdmin) => ({
  id: { not: cible.id },
  piece_id: cible.piece_id,
  model_id: cible.model_id,
  service_id: cible.service_id,
  is_deleted: false,
  ...(superAdmin ? {} : { owner: userId }),
})

// Rattache le contenu actif de `source` à `cible` (renumérotation des lots et cartons simples)
const transfererContenu = async (tx, { source, cible }) => {
  const contenu = await lireContenuStock(tx, source.id)
  const lotIds = contenu.lots.map((l) => l.id)
  const cartonIds = contenu.cartons.map((c) => c.id)
  const snIds = contenu.sns.map((s) => s.id)

  // Lots (et leurs cartons) : numéro conservé s'il est libre dans la cible, sinon max + 1
  if (contenu.lots.length) {
    const lotsCible = await tx.stock_lot.findMany({ where: { stock_id: cible.id, is_deleted: false }, select: { numero_lot: true } })
    const lotsTries = [...contenu.lots].sort((a, b) => nombre(a.numero_lot) - nombre(b.numero_lot))
    const numeros = planifierNumeros(lotsCible.map((l) => l.numero_lot), lotsTries.map((l) => l.numero_lot))
    for (const [i, lot] of lotsTries.entries()) {
      await tx.stock_lot.update({ where: { id: lot.id }, data: { stock_id: cible.id, numero_lot: numeros[i] } })
      await tx.stock_carton.updateMany({
        where: { lot_id: lot.id, stock_id: source.id, is_deleted: false },
        data: { stock_id: cible.id, numero_lot: numeros[i] },
      })
    }
  }

  // Cartons simples (hors lot)
  const cartonsSimples = contenu.cartons.filter((c) => c.lot_id === null)
  if (cartonsSimples.length) {
    const cartonsCible = await tx.stock_carton.findMany({
      where: { stock_id: cible.id, lot_id: null, is_deleted: false },
      select: { numero_carton: true },
    })
    const tries = [...cartonsSimples].sort((a, b) => nombre(a.numero_carton) - nombre(b.numero_carton))
    const numeros = planifierNumeros(cartonsCible.map((c) => c.numero_carton), tries.map((c) => c.numero_carton))
    const inchanges = []
    for (const [i, carton] of tries.entries()) {
      if (numeros[i] === carton.numero_carton) {
        inchanges.push(carton.id)
      } else {
        await tx.stock_carton.update({ where: { id: carton.id }, data: { stock_id: cible.id, numero_carton: numeros[i] } })
      }
    }
    if (inchanges.length) {
      await tx.stock_carton.updateMany({ where: { id: { in: inchanges } }, data: { stock_id: cible.id } })
    }
  }

  // Cartons restants d'un lot non actif (cas anormal) : suivent quand même le stock
  await tx.stock_carton.updateMany({ where: { stock_id: source.id, is_deleted: false }, data: { stock_id: cible.id } })

  if (snIds.length) {
    await tx.serial_numbers.updateMany({ where: { id: { in: snIds } }, data: { stock_id: cible.id } })
  }

  return { lotIds, cartonIds, snIds, resume: resumeContenu(source, contenu) }
}

// Propriétaire et sous-propriétaires de la source → sous-propriétaires de la cible (sans doublon)
const reprendreProprietaires = async (tx, { source, cible }) => {
  const existants = await tx.stock_owners.findMany({ where: { stock_id: cible.id }, select: { user_id: true } })
  const pris = new Set([cible.owner, ...existants.map((o) => o.user_id)].filter(Boolean))
  const ownersSource = await tx.stock_owners.findMany({ where: { stock_id: source.id }, select: { user_id: true } })
  const candidats = [source.owner, ...ownersSource.map((o) => o.user_id)].filter(Boolean)
  const ajouts = [...new Set(candidats)].filter((id) => !pris.has(id))
  if (ajouts.length) {
    await tx.stock_owners.createMany({ data: ajouts.map((user_id) => ({ user_id, stock_id: cible.id, type: 'sub_owner' })) })
  }
  return ajouts
}

/**
 * Fusionne les stocks `sourceIds` dans le stock `cibleId`. À appeler dans une transaction (ReadCommitted).
 */
const fusionnerStocks = async (tx, { cibleId, sourceIds, userId, superAdmin, motif, commentaire, dateAction }) => {
  const ids = [...new Set((Array.isArray(sourceIds) ? sourceIds : [sourceIds]).map(toInt))]
  if (ids.length === 0 || ids.some((id) => id === null || id < 1)) {
    throw new HttpError(400, "Choisissez au moins un stock à associer !")
  }
  if (ids.includes(cibleId)) throw new HttpError(400, "Un stock ne peut pas être associé à lui-même.")
  if (!motif || !String(motif).trim()) throw new HttpError(400, "Veuillez préciser le motif !")

  // Verrous dans l'ordre des id (pas d'interblocage entre deux fusions croisées)
  const verrouilles = new Map()
  for (const id of [cibleId, ...ids].sort((a, b) => a - b)) {
    const existe = await tx.stocks.findUnique({ where: { id }, select: { id: true } })
    if (!existe) throw new HttpError(404, `Stock ${id} introuvable.`)
    verrouilles.set(id, await verrouillerStock(tx, id, userId, dateAction))
  }

  const cible = verrouilles.get(cibleId)
  if (cible.is_deleted) throw new HttpError(409, "Le stock cible est supprimé ou a été fusionné.")
  if (!peutGererStock(cible, userId, superAdmin)) {
    throw new HttpError(403, "Seul le propriétaire du stock (ou un super administrateur) peut y associer d'autres stocks.")
  }

  const sources = ids.map((id) => verrouilles.get(id))
  for (const s of sources) {
    if (s.is_deleted) throw new HttpError(409, `Le stock ${s.code_stock} est déjà supprimé ou fusionné.`)
    if (s.piece_id !== cible.piece_id || s.model_id !== cible.model_id || s.service_id !== cible.service_id) {
      throw new HttpError(400, `Le stock ${s.code_stock} n'a pas la même pièce, le même modèle et le même service.`)
    }
    if (!peutGererStock(s, userId, superAdmin)) {
      throw new HttpError(403, `Vous n'êtes pas propriétaire du stock ${s.code_stock}.`)
    }
  }

  const motifTexte = String(motif).trim()
  const bilanSources = []
  for (const source of sources) {
    const transfert = await transfererContenu(tx, { source, cible })
    const sousProprietaires = await reprendreProprietaires(tx, { source, cible })

    await tx.mouvement_stock.create({
      data: {
        type: 'sortie',
        mouvement: 5,
        created_at: dateAction,
        stock_id: source.id,
        piece_id: source.piece_id,
        model_id: source.model_id,
        destination: `Fusion vers le stock ${cible.code_stock}`,
        service_origine: source.service_id,
        service_destination: cible.service_id,
        stock_initial: transfert.resume.pieces,
        quantite: transfert.resume.pieces,
        stock_final: 0,
        quantite_totale_piece: 0,
        motif: motifTexte,
        commentaire: commentaire || null,
        details_mouvement: JSON.stringify({
          source: 'fusion',
          sens: 'sortie',
          typeMouvement: 5,
          stockInitialPiece: transfert.resume.pieces,
          quantiteMouvement: transfert.resume.pieces,
          stockFinalPiece: 0,
          stockCible: { id: cible.id, code: cible.code_stock },
          contenu: transfert.resume,
          lotIds: transfert.lotIds,
          cartonIds: transfert.cartonIds,
          snIds: transfert.snIds,
        }),
        created_by: userId,
      },
    })

    await tx.stocks.update({
      where: { id: source.id },
      data: {
        quantite_piece: 0,
        quantite_carton: 0,
        quantite_lot: 0,
        is_deleted: true,
        deleted_at: dateAction,
        deleted_by: userId,
        motif_suppression: `Fusionné dans le stock ${cible.code_stock} : ${motifTexte}`,
        fusionne_dans: cible.id,
        last_update: dateAction,
        updated_by: userId,
      },
    })

    bilanSources.push({ id: source.id, code: source.code_stock, ...transfert.resume, sousProprietairesAjoutes: sousProprietaires, lotIds: transfert.lotIds, cartonIds: transfert.cartonIds, snIds: transfert.snIds })
  }

  const ajout = bilanSources.reduce((acc, s) => ({
    pieces: acc.pieces + s.pieces,
    cartons: acc.cartons + s.cartons,
    lots: acc.lots + s.lots,
    serialNumbers: acc.serialNumbers + s.serialNumbers,
  }), { pieces: 0, cartons: 0, lots: 0, serialNumbers: 0 })

  const cibleApres = await tx.stocks.update({
    where: { id: cible.id },
    data: {
      quantite_piece: cible.quantite_piece + ajout.pieces,
      quantite_carton: cible.quantite_carton + ajout.cartons,
      quantite_lot: cible.quantite_lot + ajout.lots,
      last_update: dateAction,
      updated_by: userId,
    },
  })

  const codes = bilanSources.map((s) => s.code).join(', ')
  const mouvement = await tx.mouvement_stock.create({
    data: {
      type: 'entree',
      mouvement: 5,
      created_at: dateAction,
      stock_id: cible.id,
      piece_id: cible.piece_id,
      model_id: cible.model_id,
      origine: `Fusion depuis le(s) stock(s) ${codes}`,
      service_destination: cible.service_id,
      stock_initial: cible.quantite_piece,
      quantite: ajout.pieces,
      stock_final: cibleApres.quantite_piece,
      quantite_totale_piece: cibleApres.quantite_piece,
      motif: motifTexte,
      commentaire: commentaire || null,
      details_mouvement: JSON.stringify({
        source: 'fusion',
        sens: 'entree',
        typeMouvement: 5,
        stockInitialPiece: cible.quantite_piece,
        quantiteMouvement: ajout.pieces,
        stockFinalPiece: cibleApres.quantite_piece,
        stocksSources: bilanSources,
      }),
      created_by: userId,
    },
  })

  return { stock: cibleApres, mouvement, sources: bilanSources, ajout }
}

/* ===================================================================================
   SUPPRESSION
   =================================================================================== */

/**
 * Supprime (logiquement) un stock. S'il n'est pas vide, `confirmerSortie` doit être vrai :
 * tout le contenu sort (lots / cartons / SN marqués sortis) avec un mouvement de sortie automatique.
 * Sinon HttpError 409 avec `contenu` (pour l'avertissement côté écran). À appeler dans une transaction.
 */
const supprimerStock = async (tx, { stockId, userId, superAdmin, motif, confirmerSortie, dateAction }) => {
  if (!motif || !String(motif).trim()) throw new HttpError(400, "Veuillez préciser le motif de la suppression !")
  const existe = await tx.stocks.findUnique({ where: { id: stockId }, select: { id: true } })
  if (!existe) throw new HttpError(404, "Stock introuvable !")

  const stock = await verrouillerStock(tx, stockId, userId, dateAction)
  if (stock.is_deleted) throw new HttpError(409, "Ce stock est déjà supprimé.")
  if (!peutGererStock(stock, userId, superAdmin)) {
    throw new HttpError(403, "Seul le propriétaire du stock (ou un super administrateur) peut le supprimer.")
  }

  const contenu = await lireContenuStock(tx, stock.id)
  const resume = resumeContenu(stock, contenu)
  const motifTexte = String(motif).trim()

  // Terminaux : suppression bloquée tant que le stock n'est pas vide
  if (!resume.vide && await estPieceTerminal(tx, stock.piece_id)) {
    const nb = resume.serialNumbers || resume.pieces
    const err = new HttpError(409, `Ce stock contient encore ${nb} terminal(aux) : il ne peut pas être supprimé. ` +
      `Déplacez-les d'abord (« Associer stocks » depuis le stock qui doit les recevoir, ou livraison par une demande).`)
    err.contenu = { ...resume, terminaux: true }
    throw err
  }

  let mouvement = null
  if (!resume.vide) {
    if (!confirmerSortie) {
      const err = new HttpError(409, `Le stock contient encore ${libelleContenu(resume)}. Confirmez la sortie de tout le contenu pour le supprimer.`)
      err.contenu = resume
      throw err
    }
    if (contenu.sns.length) {
      await tx.serial_numbers.updateMany({ where: { id: { in: contenu.sns.map((s) => s.id) } }, data: { is_deleted: true } })
    }
    if (contenu.cartons.length) {
      await tx.stock_carton.updateMany({ where: { id: { in: contenu.cartons.map((c) => c.id) } }, data: { is_deleted: true } })
    }
    if (contenu.lots.length) {
      await tx.stock_lot.updateMany({ where: { id: { in: contenu.lots.map((l) => l.id) } }, data: { is_deleted: true } })
    }
    mouvement = await tx.mouvement_stock.create({
      data: {
        type: 'sortie',
        mouvement: 5,
        created_at: dateAction,
        stock_id: stock.id,
        piece_id: stock.piece_id,
        model_id: stock.model_id,
        destination: 'Suppression du stock',
        service_origine: stock.service_id,
        stock_initial: resume.pieces,
        quantite: resume.pieces,
        stock_final: 0,
        quantite_totale_piece: 0,
        motif: motifTexte,
        details_mouvement: JSON.stringify({
          source: 'suppression',
          typeMouvement: 5,
          stockInitialPiece: resume.pieces,
          quantiteMouvement: resume.pieces,
          stockFinalPiece: 0,
          contenu: resume,
          lotIds: contenu.lots.map((l) => l.id),
          cartonIds: contenu.cartons.map((c) => c.id),
          snIds: contenu.sns.map((s) => s.id),
          serialNumbers: contenu.sns.map((s) => s.serial_number),
        }),
        created_by: userId,
      },
    })
  }

  const stockApres = await tx.stocks.update({
    where: { id: stock.id },
    data: {
      quantite_piece: 0,
      quantite_carton: 0,
      quantite_lot: 0,
      is_deleted: true,
      deleted_at: dateAction,
      deleted_by: userId,
      motif_suppression: motifTexte,
      last_update: dateAction,
      updated_by: userId,
    },
  })

  return { stock: stockApres, mouvement, contenu: resume }
}

module.exports = {
  ROLE_SUPER_ADMIN,
  ROLE_GESTION_STOCK,
  reserverCodeStock,
  estSuperAdmin,
  estGestionnaireStock,
  whereResponsablesStocks,
  estPieceTerminal,
  peutGererStock,
  lireContenuStock,
  resumeContenu,
  whereStocksFusionnables,
  fusionnerStocks,
  supprimerStock,
}
