/*
 * Modèle (model_piece) des TPE du parc — règles communes à tous les flux qui injectent des TPE au parc :
 *  - un TPE créé au parc reçoit le modèle du formulaire ;
 *  - un TPE déjà au parc SANS modèle reçoit celui du formulaire ;
 *  - un modèle déjà enregistré au parc n'est JAMAIS écrasé : il fait foi.
 *
 * `db` = le client prisma ou le client d'une transaction interactive (tx).
 * Les écritures sont séquentielles (pas de Promise.all dans une transaction interactive).
 * `items` = [{ serial, modelId }] (modelId peut être null pour les anciens formulaires).
 */

// Normalise un id de modèle : entier > 0, sinon null
const toModelId = (valeur) => {
    const n = Number(valeur)
    return Number.isInteger(n) && n > 0 ? n : null
}

// Vérifie que les modèles renseignés existent dans model_piece.
// obligatoire = true : chaque TPE doit avoir un modèle.
// Retourne un message d'erreur, ou null si tout est correct.
const verifierModelesExistants = async (db, items, { obligatoire = false } = {}) => {
    if (obligatoire) {
        const sansModele = items.find((item) => !toModelId(item.modelId))
        if (sansModele) {
            return `Modèle manquant pour le TPE ${sansModele.serial} !`
        }
    }
    const ids = [...new Set(items.map((item) => toModelId(item.modelId)).filter(Boolean))]
    if (ids.length === 0) return null

    const modeles = await db.model_piece.findMany({
        where: { id_model: { in: ids } },
        select: { id_model: true },
    })
    const connus = new Set(modeles.map((m) => m.id_model))
    const inconnu = items.find((item) => toModelId(item.modelId) && !connus.has(toModelId(item.modelId)))
    return inconnu ? `Modèle invalide pour le TPE ${inconnu.serial} !` : null
}

// TPE déjà présents au parc : Map serial -> { id, modelId, nomModele, statutId, lastModifiedAt }
const getTpesParc = async (db, serials) => {
    const uniques = [...new Set(serials.filter(Boolean).map(String))]
    if (uniques.length === 0) return new Map()

    const tpes = await db.parc_tpe.findMany({
        where: { serial_number: { in: uniques } },
        select: {
            id: true,
            serial_number: true,
            model_id: true,
            statut_id: true,
            last_modified_at: true,
            model_piece: { select: { nom_model: true } },
        },
    })
    return new Map(tpes.map((t) => [t.serial_number, {
        id: t.id,
        modelId: t.model_id,
        nomModele: t.model_piece?.nom_model || null,
        statutId: t.statut_id,
        lastModifiedAt: t.last_modified_at,
    }]))
}

// TPE déjà au parc avec un modèle DIFFÉRENT de celui du formulaire
const trouverConflitsModele = (items, tpesParc) => items
    .filter((item) => {
        const modeleParc = tpesParc.get(String(item.serial))?.modelId
        const modeleForm = toModelId(item.modelId)
        return modeleParc && modeleForm && modeleParc !== modeleForm
    })
    .map((item) => ({
        serial: item.serial,
        modeleParc: tpesParc.get(String(item.serial)).modelId,
        nomModeleParc: tpesParc.get(String(item.serial)).nomModele,
        modeleFormulaire: toModelId(item.modelId),
    }))

// Modèle qui fait foi pour un TPE : celui du parc s'il existe, sinon celui du formulaire
const modeleDeReference = (serial, modelId, tpesParc) =>
    tpesParc.get(String(serial))?.modelId || toModelId(modelId)

// Crée les TPE manquants AVEC leur modèle, puis complète model_id des TPE existants sans modèle.
// Le statut des TPE déjà au parc n'est PAS modifié ici : chaque flux garde ses propres règles
// (régularisation antidatée, historique, etc.).
// base = { created_by, created_at, last_modified_at, statut_id } pour les TPE créés.
const creerTpesEtCompleterModeles = async (tx, items, base) => {
    // Dédoublonnage par SN (le premier modèle renseigné l'emporte)
    const parSerial = new Map()
    for (const item of items) {
        if (!item.serial) continue
        const serial = String(item.serial)
        const modelId = toModelId(item.modelId)
        if (!parSerial.has(serial) || (!parSerial.get(serial) && modelId)) {
            parSerial.set(serial, modelId)
        }
    }
    if (parSerial.size === 0) return

    // 1. Créer uniquement les TPE manquants
    await tx.parc_tpe.createMany({
        data: [...parSerial].map(([serial, modelId]) => ({
            serial_number: serial,
            model_id: modelId,
            ...base,
        })),
        skipDuplicates: true,
    })

    // 2. Compléter le modèle des TPE déjà présents sans modèle (jamais d'écrasement)
    await completerModelesManquants(tx, [...parSerial].map(([serial, modelId]) => ({ serial, modelId })))
}

// Complète model_id des TPE déjà au parc SANS modèle (aucune création, aucun écrasement)
const completerModelesManquants = async (tx, items) => {
    const snParModele = new Map()
    for (const item of items) {
        const modelId = toModelId(item.modelId)
        if (!item.serial || !modelId) continue
        if (!snParModele.has(modelId)) snParModele.set(modelId, [])
        snParModele.get(modelId).push(String(item.serial))
    }
    for (const [modelId, serials] of snParModele) {
        await tx.parc_tpe.updateMany({
            where: { serial_number: { in: serials }, model_id: null },
            data: { model_id: modelId },
        })
    }
}

module.exports = {
    toModelId,
    verifierModelesExistants,
    getTpesParc,
    trouverConflitsModele,
    modeleDeReference,
    creerTpesEtCompleterModeles,
    completerModelesManquants,
}
