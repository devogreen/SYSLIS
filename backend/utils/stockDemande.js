// utils/stockDemande.js
// Mouvements de stock liés aux demandes de pièces.
//  - Livraison  : on débite UNIQUEMENT le stock d'origine. Les lots / cartons / SN livrés sortent du stock
//                 (is_deleted = true) mais gardent leur id : c'est le « contenu livré », enregistré dans les détails.
//  - Réception  : le demandeur choisit de créer un nouveau stock, d'alimenter un de ses stocks existants
//                 (même pièce, même modèle, même service) ou de ne pas mettre les pièces en stock.
//                 En cas de mise en stock, les lots / cartons / SN livrés sont rattachés au stock cible.
// Toutes les quantités sont recalculées côté serveur à partir de la base (les valeurs envoyées par le client sont ignorées).

const { getTpesParc, creerTpesEtCompleterModeles, toModelId } = require('./parcTpeModele')

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const TYPES_MOUVEMENT = [1, 2, 3, 4, 5] // 1 lot, 2 cartons d'un lot, 3 pièces d'un carton, 4 cartons, 5 pièces
const ACTIONS_RECEPTION = ['nouveau_stock', 'stock_existant', 'ignore']

const toInt = (valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return null
  const n = Number(valeur)
  return Number.isInteger(n) ? n : null
}

const toEntierPositif = (valeur, message) => {
  const n = toInt(valeur)
  if (n === null || n < 1) throw new HttpError(400, message)
  return n
}

const listeIds = (valeur, message) => {
  const brut = Array.isArray(valeur) ? valeur : (valeur === null || valeur === undefined || valeur === '' ? [] : [valeur])
  const ids = [...new Set(brut.map(toInt))]
  if (ids.length === 0 || ids.some((id) => id === null || id < 1)) throw new HttpError(400, message)
  return ids
}

const parseJson = (valeur, defaut = null) => {
  if (valeur === null || valeur === undefined || valeur === '') return defaut
  if (typeof valeur !== 'string') return valeur
  try {
    return JSON.parse(valeur)
  } catch (e) {
    return defaut
  }
}

const somme = (lignes, champ) => lignes.reduce((acc, l) => acc + (Number(l[champ]) || 0), 0)
const positif = (n) => Math.max(0, n)

// L'utilisateur est-il propriétaire ou co-propriétaire du stock ?
// Le créateur ne compte que pour un stock sans propriétaire (anciennes données) : après un changement
// de propriétaire, l'ancien propriétaire / créateur perd ses droits.
const estResponsableStock = (stock, userId) =>
  stock.owner === userId ||
  (stock.owner == null && stock.created_by === userId) ||
  (stock.stock_owners || []).some((o) => o.user_id === userId)

// Verrouille la ligne du stock pour la durée de la transaction et renvoie ses valeurs à jour.
// (UPDATE en premier : InnoDB pose un verrou exclusif, une livraison concurrente attend la fin de celle-ci.)
const verrouillerStock = async (tx, stockId, userId, dateAction) => {
  const stock = await tx.stocks.update({
    where: { id: stockId },
    data: { last_update: dateAction, updated_by: userId },
  })
  return {
    ...stock,
    quantite_piece: stock.quantite_piece ?? 0,
    quantite_carton: stock.quantite_carton ?? 0,
    quantite_lot: stock.quantite_lot ?? 0,
  }
}

/* ===================================================================================
   LIVRAISON : sortie du stock d'origine
   =================================================================================== */

/**
 * Débite le stock d'origine selon le type de mouvement et la sélection du livreur.
 * À appeler dans une transaction. Ne crée pas le mouvement : renvoie tout ce qu'il faut pour l'écrire.
 * @returns {{ stockAvant, stockApres, unites: {initial, quantite, final}, contenuLivre, details, serialNumbers }}
 */
const debiterStockLivraison = async (tx, { stockId, typeMouvement, selection, userId, dateAction }) => {
  const stock = await verrouillerStock(tx, stockId, userId, dateAction)

  let pieces = 0
  let cartonsSortis = 0
  let lotsSortis = 0
  let unites = null
  let lotIds = []
  let cartonIds = []
  let snIds = []
  const extra = {}

  const marquerSnSortis = async (where) => {
    const sns = await tx.serial_numbers.findMany({
      where: { ...where, is_deleted: false },
      select: { id: true, serial_number: true, model_id: true, lot_id: true, carton_id: true },
    })
    if (sns.length > 0) {
      await tx.serial_numbers.updateMany({
        where: { id: { in: sns.map((s) => s.id) } },
        data: { is_deleted: true },
      })
    }
    return sns
  }

  let serialNumbers = []

  if (typeMouvement === 5) {
    // Par pièce
    pieces = toEntierPositif(selection.quantiteMouvement, "Quantité à livrer invalide !")
    if (stock.quantite_piece < pieces) {
      throw new HttpError(409, `Stock insuffisant : ${stock.quantite_piece} pièce(s) disponible(s).`)
    }
    unites = { initial: stock.quantite_piece, quantite: pieces, final: stock.quantite_piece - pieces }

  } else if (typeMouvement === 4) {
    // Cartons simples (hors lot)
    cartonIds = listeIds(selection.cartons, "Vous devez sélectionner des cartons !")
    const cartons = await tx.stock_carton.findMany({
      where: { id: { in: cartonIds }, stock_id: stock.id, lot_id: null, is_deleted: false },
    })
    if (cartons.length !== cartonIds.length) {
      throw new HttpError(409, "Certains cartons sélectionnés ne sont plus disponibles dans ce stock.")
    }
    const maj = await tx.stock_carton.updateMany({
      where: { id: { in: cartonIds }, is_deleted: false },
      data: { is_deleted: true },
    })
    if (maj.count !== cartonIds.length) throw new HttpError(409, "Les cartons ont changé entre-temps, veuillez réessayer.")
    pieces = somme(cartons, 'quantite_totale_piece')
    cartonsSortis = cartons.length
    serialNumbers = await marquerSnSortis({ carton_id: { in: cartonIds } })
    unites = { initial: stock.quantite_carton, quantite: cartonsSortis, final: positif(stock.quantite_carton - cartonsSortis) }

  } else if (typeMouvement === 3) {
    // Pièces d'un carton
    const cartonId = toEntierPositif(selection.selectedCarton, "Vous devez choisir le carton !")
    pieces = toEntierPositif(selection.quantiteMouvementPieceCarton ?? selection.quantiteMouvement, "Quantité à livrer invalide !")
    const carton = await tx.stock_carton.findFirst({
      where: { id: cartonId, stock_id: stock.id, is_deleted: false },
    })
    if (!carton) throw new HttpError(409, "Le carton sélectionné n'est plus disponible dans ce stock.")
    const dansCarton = carton.quantite_totale_piece ?? 0
    if (dansCarton < pieces) throw new HttpError(409, `Stock insuffisant : ${dansCarton} pièce(s) dans ce carton.`)
    const resteCarton = dansCarton - pieces
    const maj = await tx.stock_carton.updateMany({
      where: { id: cartonId, is_deleted: false, quantite_totale_piece: carton.quantite_totale_piece },
      data: { quantite_totale_piece: resteCarton, is_deleted: resteCarton === 0 },
    })
    if (maj.count !== 1) throw new HttpError(409, "Le carton a changé entre-temps, veuillez réessayer.")
    if (resteCarton === 0) cartonsSortis = 1

    if (carton.lot_id) {
      const lot = await tx.stock_lot.findUnique({ where: { id: carton.lot_id } })
      if (lot) {
        const cartonsLot = positif((lot.quantite_carton ?? 0) - cartonsSortis)
        const lotVide = cartonsSortis === 1 && cartonsLot === 0
        await tx.stock_lot.update({
          where: { id: lot.id },
          data: {
            quantite_piece: positif((lot.quantite_piece ?? 0) - pieces),
            quantite_carton: cartonsLot,
            is_deleted: lotVide ? true : lot.is_deleted,
          },
        })
        if (lotVide) lotsSortis = 1
      }
    }
    extra.cartonOrigine = { id: carton.id, numero_carton: carton.numero_carton, lot_id: carton.lot_id, numero_lot: carton.numero_lot }
    unites = { initial: dansCarton, quantite: pieces, final: resteCarton }

  } else if (typeMouvement === 2) {
    // Cartons d'un lot
    const lotId = toEntierPositif(selection.selectedLot, "Vous devez choisir le lot !")
    cartonIds = listeIds(selection.cartons, "Vous devez sélectionner des cartons !")
    const lot = await tx.stock_lot.findFirst({ where: { id: lotId, stock_id: stock.id, is_deleted: false } })
    if (!lot) throw new HttpError(409, "Le lot sélectionné n'est plus disponible dans ce stock.")
    const cartons = await tx.stock_carton.findMany({
      where: { id: { in: cartonIds }, lot_id: lotId, is_deleted: false },
    })
    if (cartons.length !== cartonIds.length) {
      throw new HttpError(409, "Certains cartons sélectionnés ne sont plus disponibles dans ce lot.")
    }
    const maj = await tx.stock_carton.updateMany({
      where: { id: { in: cartonIds }, is_deleted: false },
      data: { is_deleted: true },
    })
    if (maj.count !== cartonIds.length) throw new HttpError(409, "Les cartons ont changé entre-temps, veuillez réessayer.")
    pieces = somme(cartons, 'quantite_totale_piece')
    cartonsSortis = cartons.length
    const cartonsLot = positif((lot.quantite_carton ?? 0) - cartonsSortis)
    const lotVide = cartonsLot === 0
    await tx.stock_lot.update({
      where: { id: lot.id },
      data: {
        quantite_carton: cartonsLot,
        quantite_piece: positif((lot.quantite_piece ?? 0) - pieces),
        is_deleted: lotVide,
      },
    })
    if (lotVide) lotsSortis = 1
    serialNumbers = await marquerSnSortis({ carton_id: { in: cartonIds } })
    extra.lotOrigine = { id: lot.id, numero_lot: lot.numero_lot }
    unites = { initial: lot.quantite_carton ?? 0, quantite: cartonsSortis, final: cartonsLot }

  } else if (typeMouvement === 1) {
    // Lots entiers
    lotIds = listeIds(selection.listeLots, "Vous devez sélectionner des lots !")
    const lots = await tx.stock_lot.findMany({
      where: { id: { in: lotIds }, stock_id: stock.id, is_deleted: false },
    })
    if (lots.length !== lotIds.length) {
      throw new HttpError(409, "Certains lots sélectionnés ne sont plus disponibles dans ce stock.")
    }
    const maj = await tx.stock_lot.updateMany({
      where: { id: { in: lotIds }, is_deleted: false },
      data: { is_deleted: true },
    })
    if (maj.count !== lotIds.length) throw new HttpError(409, "Les lots ont changé entre-temps, veuillez réessayer.")
    const cartons = await tx.stock_carton.findMany({
      where: { lot_id: { in: lotIds }, is_deleted: false },
      select: { id: true },
    })
    cartonIds = cartons.map((c) => c.id)
    if (cartonIds.length > 0) {
      await tx.stock_carton.updateMany({ where: { id: { in: cartonIds } }, data: { is_deleted: true } })
    }
    pieces = somme(lots, 'quantite_piece')
    cartonsSortis = cartonIds.length
    lotsSortis = lots.length
    serialNumbers = await marquerSnSortis({
      OR: [{ lot_id: { in: lotIds } }, ...(cartonIds.length ? [{ carton_id: { in: cartonIds } }] : [])],
    })
    unites = { initial: stock.quantite_lot, quantite: lotsSortis, final: positif(stock.quantite_lot - lotsSortis) }

  } else {
    throw new HttpError(400, "Type de mouvement invalide !")
  }

  if (pieces > stock.quantite_piece) {
    throw new HttpError(409, `Stock insuffisant : ${stock.quantite_piece} pièce(s) disponible(s) dans le stock.`)
  }

  const stockApres = await tx.stocks.update({
    where: { id: stock.id },
    data: {
      quantite_piece: stock.quantite_piece - pieces,
      quantite_carton: positif(stock.quantite_carton - cartonsSortis),
      quantite_lot: positif(stock.quantite_lot - lotsSortis),
    },
  })

  snIds = serialNumbers.map((s) => s.id)

  const contenuLivre = {
    version: 1,
    typeMouvement,
    stockOrigineId: stock.id,
    codeStockOrigine: stock.code_stock,
    serviceOrigineId: stock.service_id,
    pieceId: stock.piece_id,
    modelId: stock.model_id,
    quantitePiece: pieces,
    // Seuls les lots / cartons sortis ENTIERS sont transférables (types 1, 2, 4)
    quantiteCarton: [1, 2, 4].includes(typeMouvement) ? cartonsSortis : 0,
    quantiteLot: typeMouvement === 1 ? lotsSortis : 0,
    lotIds,
    cartonIds,
    snIds,
    ...extra,
  }

  return { stockAvant: stock, stockApres, unites, pieces, contenuLivre, serialNumbers }
}

// Détails de livraison au format attendu par DemandeDetails et le PDF (clés historiques par type de mouvement)
const construireDetailsLivraison = ({ detailsDemande, typeMouvement, selection, stockAvant, stockApres, unites, pieces, contenuLivre, serialNumbers }) => {
  const details = {
    ...(detailsDemande || {}),
    model: stockAvant.model_id,
    service: stockAvant.service_id,
    typeMouvement,
    stockInitialPiece: stockAvant.quantite_piece,
    quantiteMouvementPiece: pieces,
    stockFinalPiece: stockApres.quantite_piece,
  }
  if (typeMouvement === 5) {
    details.quantiteMouvement = pieces
  } else if (typeMouvement === 4) {
    Object.assign(details, {
      stockInitialCarton: unites.initial, quantiteMouvementCarton: unites.quantite, stockFinalCarton: unites.final,
      cartons: contenuLivre.cartonIds,
    })
  } else if (typeMouvement === 3) {
    Object.assign(details, {
      stockInitialPieceCarton: unites.initial, quantiteMouvementPieceCarton: unites.quantite, stockFinalPieceCarton: unites.final,
      selectedCarton: contenuLivre.cartonOrigine?.id ?? null,
      selectedLot: contenuLivre.cartonOrigine?.lot_id ?? null,
    })
  } else if (typeMouvement === 2) {
    Object.assign(details, {
      stockInitialCartonLot: unites.initial, quantiteMouvementCartonLot: unites.quantite, stockFinalCartonLot: unites.final,
      stockInitialCarton: stockAvant.quantite_carton, quantiteMouvementCarton: contenuLivre.quantiteCarton, stockFinalCarton: stockApres.quantite_carton,
      cartons: contenuLivre.cartonIds,
      selectedLot: contenuLivre.lotOrigine?.id ?? toInt(selection.selectedLot),
    })
  } else if (typeMouvement === 1) {
    Object.assign(details, {
      stockInitialLot: unites.initial, quantiteMouvementLot: unites.quantite, stockFinalLot: unites.final,
      stockInitialCarton: stockAvant.quantite_carton, quantiteMouvementCarton: contenuLivre.quantiteCarton, stockFinalCarton: stockApres.quantite_carton,
      listeLots: contenuLivre.lotIds,
    })
  }
  details.listeSn = serialNumbers.map((s) => ({ id: s.id, serial_number: s.serial_number, model_id: s.model_id }))
  details.contenuLivre = contenuLivre
  return details
}

/* ===================================================================================
   RÉCEPTION : mise en stock chez le demandeur
   =================================================================================== */

// Contenu livré d'une demande (dernière livraison). null pour les livraisons antérieures à cette fonctionnalité.
const lireContenuLivre = (livraisonPiece) => {
  if (!livraisonPiece) return null
  const details = parseJson(livraisonPiece.details_demande, {})
  const contenu = details && details.contenuLivre
  return contenu && contenu.version === 1 ? contenu : null
}

// Stocks que le demandeur peut alimenter : non supprimés, même pièce / modèle / service, dont il est owner ou sub-owner
const whereStocksAlimentables = ({ pieceId, modelId, serviceId, userId }) => ({
  piece_id: pieceId,
  model_id: modelId,
  service_id: serviceId,
  is_deleted: false,
  OR: [
    { owner: userId },
    { stock_owners: { some: { user_id: userId } } },
  ],
})

// Numérotation des lots / cartons entrants dans le stock cible :
// on garde le numéro d'origine quand il est libre, les autres prennent max + 1, max + 2…
// (les éléments sans numéro — lot/carton « sans numéro » d'un import SN — le restent)
const planifierNumeros = (numerosExistants, numerosEntrants) => {
  const pris = new Set(numerosExistants.filter((n) => n !== null && n !== undefined))
  const resultat = numerosEntrants.map(() => undefined)
  numerosEntrants.forEach((numero, i) => {
    if (numero === null || numero === undefined) {
      resultat[i] = null
    } else if (!pris.has(numero)) {
      pris.add(numero)
      resultat[i] = numero
    }
  })
  let max = pris.size ? Math.max(...pris) : 0
  resultat.forEach((numero, i) => {
    if (numero === undefined) {
      max += 1
      resultat[i] = max
    }
  })
  return resultat
}

/**
 * Met en stock le contenu livré : création d'un stock ou alimentation d'un stock existant.
 * À appeler dans une transaction. Renvoie { stock, mouvement }.
 */
const mettreEnStockReception = async (tx, { demande, contenu, action, stockId, codeStock, user, dateAction, commentaire }) => {
  const serviceId = demande.service_demandeur
  if (!serviceId) throw new HttpError(400, "La demande n'a pas de service demandeur : mise en stock impossible.")

  let cible = null
  if (action === 'nouveau_stock') {
    if (!codeStock || !String(codeStock).trim()) throw new HttpError(400, "Vous devez donner un code au nouveau stock !")
    // Verrou + unicité (require ici : gestionStock dépend lui-même de ce fichier)
    const { reserverCodeStock } = require('./gestionStock')
    const code = await reserverCodeStock(tx, codeStock)
    cible = await tx.stocks.create({
      data: {
        code_stock: code,
        piece_id: contenu.pieceId,
        model_id: contenu.modelId,
        service_id: serviceId,
        quantite_lot: 0,
        quantite_carton: 0,
        quantite_piece: 0,
        created_at: dateAction,
        created_by: user.id_user,
        last_update: dateAction,
        updated_by: user.id_user,
        owner: user.id_user,
      },
    })
    await tx.stock_owners.create({ data: { user_id: user.id_user, stock_id: cible.id, type: 'owner' } })
    cible = { ...cible, quantite_piece: 0, quantite_carton: 0, quantite_lot: 0 }
  } else {
    const id = toEntierPositif(stockId, "Vous devez choisir le stock à alimenter !")
    const existant = await tx.stocks.findFirst({
      where: { id, ...whereStocksAlimentables({ pieceId: contenu.pieceId, modelId: contenu.modelId, serviceId, userId: user.id_user }) },
    })
    if (!existant) {
      throw new HttpError(403, "Stock invalide : il doit être à vous (propriétaire ou co-propriétaire) et avoir la même pièce, le même modèle et le même service.")
    }
    cible = await verrouillerStock(tx, existant.id, user.id_user, dateAction)
  }

  const type = contenu.typeMouvement
  const transfereStructure = [1, 2, 4].includes(type)

  if (transfereStructure) {
    const lotIds = contenu.lotIds || []
    const cartonIds = contenu.cartonIds || []
    const snIds = contenu.snIds || []

    // Les éléments doivent toujours être « sortis » (livrés, pas encore rattachés à un autre stock)
    const cartons = cartonIds.length
      ? await tx.stock_carton.findMany({ where: { id: { in: cartonIds }, is_deleted: true } })
      : []
    if (cartons.length !== cartonIds.length) {
      throw new HttpError(409, "Les cartons livrés ont déjà été mis en stock ou modifiés.")
    }

    if (type === 1) {
      const lots = await tx.stock_lot.findMany({ where: { id: { in: lotIds }, is_deleted: true } })
      if (lots.length !== lotIds.length) throw new HttpError(409, "Les lots livrés ont déjà été mis en stock ou modifiés.")
      const lotsCible = await tx.stock_lot.findMany({
        where: { stock_id: cible.id, is_deleted: false },
        select: { numero_lot: true },
      })
      const lotsTries = [...lots].sort((a, b) => (a.numero_lot ?? 0) - (b.numero_lot ?? 0))
      const numerosLots = planifierNumeros(lotsCible.map((l) => l.numero_lot), lotsTries.map((l) => l.numero_lot))
      for (const [index, lot] of lotsTries.entries()) {
        const numero = numerosLots[index]
        await tx.stock_lot.update({
          where: { id: lot.id },
          data: { stock_id: cible.id, service_id: serviceId, numero_lot: numero, is_deleted: false },
        })
        const cartonsDuLot = cartons.filter((c) => c.lot_id === lot.id).map((c) => c.id)
        if (cartonsDuLot.length) {
          await tx.stock_carton.updateMany({
            where: { id: { in: cartonsDuLot } },
            data: { stock_id: cible.id, service_id: serviceId, numero_lot: numero, is_deleted: false },
          })
        }
      }
    } else {
      // Types 2 et 4 : les cartons deviennent des cartons simples du stock cible
      const cartonsCible = await tx.stock_carton.findMany({
        where: { stock_id: cible.id, lot_id: null, is_deleted: false },
        select: { numero_carton: true },
      })
      const cartonsTries = [...cartons].sort((a, b) => (a.numero_carton ?? 0) - (b.numero_carton ?? 0))
      const numerosCartons = planifierNumeros(cartonsCible.map((c) => c.numero_carton), cartonsTries.map((c) => c.numero_carton))
      const inchanges = []
      for (const [index, carton] of cartonsTries.entries()) {
        const numero = numerosCartons[index]
        if (numero === carton.numero_carton) {
          inchanges.push(carton.id)
        } else {
          await tx.stock_carton.update({
            where: { id: carton.id },
            data: { stock_id: cible.id, service_id: serviceId, lot_id: null, numero_lot: null, numero_carton: numero, is_deleted: false },
          })
        }
      }
      if (inchanges.length) {
        await tx.stock_carton.updateMany({
          where: { id: { in: inchanges } },
          data: { stock_id: cible.id, service_id: serviceId, lot_id: null, numero_lot: null, is_deleted: false },
        })
      }
    }

    if (snIds.length) {
      await tx.serial_numbers.updateMany({
        where: { id: { in: snIds } },
        data: {
          stock_id: cible.id,
          service_id: serviceId,
          is_deleted: false,
          ...(type === 2 ? { lot_id: null } : {}),
        },
      })
    }
  }

  const ajoutPieces = contenu.quantitePiece || 0
  const ajoutCartons = transfereStructure ? (contenu.quantiteCarton || 0) : 0
  const ajoutLots = type === 1 ? (contenu.quantiteLot || 0) : 0

  const stockApres = await tx.stocks.update({
    where: { id: cible.id },
    data: {
      quantite_piece: cible.quantite_piece + ajoutPieces,
      quantite_carton: cible.quantite_carton + ajoutCartons,
      quantite_lot: cible.quantite_lot + ajoutLots,
      last_update: dateAction,
      updated_by: user.id_user,
    },
  })

  // Unités du mouvement : lots (type 1), cartons (types 2 et 4), pièces (types 3 et 5)
  const champ = type === 1 ? 'quantite_lot' : (type === 2 || type === 4) ? 'quantite_carton' : 'quantite_piece'
  const quantite = type === 1 ? ajoutLots : (type === 2 || type === 4) ? ajoutCartons : ajoutPieces

  const mouvement = await tx.mouvement_stock.create({
    data: {
      type: 'entree',
      mouvement: type,
      demande_id: demande.id,
      created_at: dateAction,
      stock_id: cible.id,
      piece_id: contenu.pieceId,
      origine: contenu.codeStockOrigine ? `Demande ${demande.id} - stock ${contenu.codeStockOrigine}` : `Demande ${demande.id}`,
      service_origine: contenu.serviceOrigineId ?? null,
      service_destination: serviceId,
      model_id: contenu.modelId,
      stock_initial: cible[champ],
      quantite,
      stock_final: stockApres[champ],
      quantite_totale_piece: stockApres.quantite_piece,
      motif: demande.motif_demande,
      commentaire,
      details_mouvement: JSON.stringify({
        source: 'reception_demande',
        action,
        demandeId: demande.id,
        typeMouvement: type,
        stockInitialPiece: cible.quantite_piece,
        quantiteMouvementPiece: ajoutPieces,
        stockFinalPiece: stockApres.quantite_piece,
        contenuLivre: contenu,
      }),
      created_by: user.id_user,
    },
  })

  return { stock: stockApres, mouvement }
}

/* ===================================================================================
   LIVRAISONS PARTIELLES : quantité livrée dans l'unité de la demande
   =================================================================================== */

// Unité de la demande (choisie à la création : « Par lot », « Par carton », « Par pièce »)
const uniteDemande = (detailsDemande) => {
  const texte = String((detailsDemande && detailsDemande.typeDemande) || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (texte.includes('lot')) return 'lot'
  if (texte.includes('carton')) return 'carton'
  if (texte.includes('piece')) return 'piece'
  return null
}

// Quantité d'une livraison exprimée dans l'unité de la demande, ou null si elle ne s'y mesure pas
// (ex. une demande « Par lot » livrée en cartons, ou des pièces sorties d'un carton pour une demande « Par carton »)
const quantiteDansUnite = (contenu, unite) => {
  if (!contenu || !unite) return null
  if (unite === 'piece') return contenu.quantitePiece ?? null
  if (unite === 'carton') return [1, 2, 4].includes(contenu.typeMouvement) ? (contenu.quantiteCarton ?? null) : null
  if (unite === 'lot') return contenu.typeMouvement === 1 ? (contenu.quantiteLot ?? null) : null
  return null
}

const LIBELLES_UNITE = { lot: 'lot(s)', carton: 'carton(s)', piece: 'pièce(s)' }

// Clés écrites par une livraison dans details_demande : retirées avant d'écrire la livraison suivante
const CLES_LIVRAISON = [
  'model', 'service', 'typeMouvement', 'stockInitialPiece', 'quantiteMouvementPiece', 'stockFinalPiece', 'quantiteMouvement',
  'stockInitialCarton', 'quantiteMouvementCarton', 'stockFinalCarton', 'cartons',
  'stockInitialPieceCarton', 'quantiteMouvementPieceCarton', 'stockFinalPieceCarton', 'selectedCarton',
  'stockInitialCartonLot', 'quantiteMouvementCartonLot', 'stockFinalCartonLot', 'selectedLot',
  'stockInitialLot', 'quantiteMouvementLot', 'stockFinalLot', 'listeLots',
  'listeSn', 'contenuLivre', 'livraison',
]
const detailsSansLivraison = (details) => {
  const copie = { ...(details || {}) }
  CLES_LIVRAISON.forEach((cle) => { delete copie[cle] })
  return copie
}

/**
 * Bilan des livraisons d'une demande dans son unité : validé, déjà livré, reste.
 * `livraisons` = livraison_piece de la demande (details_demande JSON).
 */
const bilanLivraisons = ({ detailsDemande, quantiteValidee, livraisons }) => {
  const unite = uniteDemande(detailsDemande)
  let livre = 0
  let nonMesurables = 0
  for (const livraison of livraisons || []) {
    const contenu = lireContenuLivre(livraison)
    const q = quantiteDansUnite(contenu, unite)
    if (q === null) nonMesurables++
    else livre += q
  }
  const validee = Number.isInteger(quantiteValidee) && quantiteValidee > 0 ? quantiteValidee : null
  return {
    unite,
    libelleUnite: unite ? LIBELLES_UNITE[unite] : null,
    quantiteValidee: validee,
    quantiteLivree: livre,
    livraisonsNonMesurables: nonMesurables,
    reste: unite && validee !== null ? Math.max(0, validee - livre) : null,
  }
}

/**
 * Suivi des livraisons d'une demande pour l'affichage (demande chargée avec validation_demande,
 * livraison_piece{forms} et reception_piece{forms, stocks}) : bilan + une ligne par livraison avec sa réception.
 */
const suiviLivraisons = (demande) => {
  const details = detailsSansLivraison(parseJson(demande.details_demande, {}))
  const validation = [...(demande.validation_demande || [])]
    .filter((v) => v.statut_validation_demande === 'valide')
    .sort((a, b) => b.id_validation_demande - a.id_validation_demande)[0]
  const livraisons = [...(demande.livraison_piece || [])].sort((a, b) => a.id - b.id)
  const bilan = bilanLivraisons({
    detailsDemande: details,
    quantiteValidee: validation ? validation.quantite_validee : null,
    livraisons,
  })
  const receptions = demande.reception_piece || []
  const lignes = livraisons.map((livraison, i) => {
    const contenu = lireContenuLivre(livraison)
    const reception = receptions.find((r) => r.livraison_id === livraison.id)
      // Réception antérieure aux livraisons partielles (sans livraison_id) : vaut pour la livraison unique
      || (livraisons.length === 1 ? receptions.find((r) => !r.livraison_id) : null)
    return {
      id: livraison.id,
      numero: i + 1,
      date: livraison.forms ? livraison.forms.created_at : null,
      quantiteUnite: quantiteDansUnite(contenu, bilan.unite),
      contenu: contenu ? {
        typeMouvement: contenu.typeMouvement,
        quantitePiece: contenu.quantitePiece,
        quantiteCarton: contenu.quantiteCarton,
        quantiteLot: contenu.quantiteLot,
        quantiteSn: (contenu.snIds || []).length,
        codeStockOrigine: contenu.codeStockOrigine,
      } : null,
      reception: reception ? {
        id: reception.id,
        date: reception.forms ? reception.forms.created_at : null,
        actionStock: reception.action_stock,
        codeStock: reception.stocks ? reception.stocks.code_stock : null,
      } : null,
      enAttenteReception: !reception && !demande.demande_recue,
    }
  })
  return { ...bilan, livraisons: lignes, enAttente: lignes.filter((l) => l.enAttenteReception).length }
}

/* ===================================================================================
   PARC TPE : changement de statut daté (règle des régularisations antidatées)
   =================================================================================== */

/**
 * Passe des TPE au statut `statutId` à la date `dateAction`, avec une ligne d'historique pour chacun.
 * - TPE absents du parc : créés au statut (modèle `modelId` de chaque item).
 * - TPE présents : statut mis à jour seulement si dateAction est postérieure (ou égale) à leur dernier changement ;
 *   sinon (régularisation antidatée) historique seul, le statut actuel plus récent est conservé.
 * `items` = [{ serial, modelId }]. À appeler dans une transaction.
 */
const appliquerStatutParc = async (tx, { items, statutId, userId, dateAction, formId }) => {
  const serials = [...new Set(items.map((i) => String(i.serial)).filter(Boolean))]
  if (serials.length === 0) return { misAJour: 0, historiqueSeul: 0 }

  const avant = await getTpesParc(tx, serials)
  await creerTpesEtCompleterModeles(tx, items.map((i) => ({ serial: i.serial, modelId: toModelId(i.modelId) })), {
    created_by: userId,
    created_at: dateAction,
    last_modified_at: dateAction,
    statut_id: statutId,
  })

  const aMettreAJour = serials.filter((serial) => {
    const tpe = avant.get(serial)
    if (!tpe) return false // créé ci-dessus, déjà au bon statut
    return !tpe.lastModifiedAt || dateAction >= new Date(tpe.lastModifiedAt)
  })
  if (aMettreAJour.length > 0) {
    await tx.parc_tpe.updateMany({
      where: { serial_number: { in: aMettreAJour } },
      data: {
        updated_by: userId,
        updated_at: new Date(),
        last_modified_at: dateAction,
        statut_id: statutId,
      },
    })
  }

  const tpes = await tx.parc_tpe.findMany({
    where: { serial_number: { in: serials } },
    select: { id: true, serial_number: true },
  })
  await tx.history_tpe.createMany({
    data: tpes.map((tpe) => ({
      id_tpe: tpe.id,
      created_by: userId,
      created_at: dateAction,
      statut_id: statutId,
      ...(formId ? { form_id: formId } : {}),
    })),
  })

  const crees = serials.filter((serial) => !avant.has(serial)).length
  return { misAJour: aMettreAJour.length + crees, historiqueSeul: serials.length - aMettreAJour.length - crees, tpes }
}

module.exports = {
  HttpError,
  TYPES_MOUVEMENT,
  ACTIONS_RECEPTION,
  toInt,
  parseJson,
  estResponsableStock,
  verrouillerStock,
  planifierNumeros,
  debiterStockLivraison,
  construireDetailsLivraison,
  lireContenuLivre,
  whereStocksAlimentables,
  mettreEnStockReception,
  uniteDemande,
  quantiteDansUnite,
  detailsSansLivraison,
  bilanLivraisons,
  LIBELLES_UNITE,
  suiviLivraisons,
  appliquerStatutParc,
}
