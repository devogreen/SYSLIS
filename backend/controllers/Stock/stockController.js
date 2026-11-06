const TEST_ENV = require("../../utils/consts")
const puppeteer = require("puppeteer");
const fs = require("fs");
const prisma = require('../../prisma/client');
const cloudinary = require("../../config/clouddinaryConifg");
const multer = require("multer")
const upload = multer({ storage: multer.memoryStorage() });
const ExcelJS = require("exceljs");
const {
  verifierModelesExistants,
  getTpesParc,
  trouverConflitsModele,
  creerTpesEtCompleterModeles,
} = require("../../utils/parcTpeModele");
const { text } = require("stream/consumers");
const { toInt: toIntGestion, estResponsableStock } = require("../../utils/stockDemande");
const {
  reserverCodeStock,
  estSuperAdmin,
  estGestionnaireStock,
  whereResponsablesStocks,
  peutGererStock,
  whereStocksFusionnables,
  fusionnerStocks,
  supprimerStock,
} = require("../../utils/gestionStock");

// baseUrl est l'addresse du site de livraison
const baseUrl = process.env.FRONTEND_BASE_URL || "https://livraisons.greenpayci.com";
// localUrl est l'addresse en local pour les tests
const localUrl = "http://localhost:5173"
// GENERAL_URL va être utilisée dans les mails envoyés pour pouvoir rediriger correctement l'utilisateur vers la page avec le bon lien
// En test GENERAL_URL doit avoir la valeur de localUrl et celle de baseUrl lors du deploiement.
let GENERAL_URL = baseUrl
let test_env = TEST_ENV
if (test_env) {
  GENERAL_URL = localUrl
}

const normalize = (value) => {
  if (value === null || value === undefined) return null;
  return String(value).trim();
};

const extractNumber = (value) => {
  if (value === null || value === undefined) return null;
  const match = String(value).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

// Code stock obligatoire et unique parmi les stocks non supprimés (même règle que le stock depuis le rebut et la réception)
const verifierCodeStock = async (codeStock) => {
  const code = codeStock ? String(codeStock).trim() : ''
  if (!code) return "Vous devez déterminer un code au stock !"
  const memeCode = await prisma.stocks.findFirst({ where: { code_stock: code, is_deleted: false } })
  return memeCode ? "Un stock du même code existe déjà !" : null
}

const TYPES_PIECE = ['TERMINAL', 'PIECE']

// Liste d'ids (tableau ou « 1,2 ») -> entiers uniques
const listeIdsSaisie = (valeur) => {
  const brut = Array.isArray(valeur) ? valeur : (typeof valeur === 'string' && valeur ? valeur.split(',') : [])
  return [...new Set(brut.map(toIntGestion))].filter((id) => id && id > 0)
}

// Contrôles communs à la création / modification d'une pièce. Renvoie { nom, type, modelIds, serviceIds } ou un message d'erreur.
const controlerSaisiePiece = async ({ nomPiece, type, itemModels, itemServices }, { idPiece = null, nomActuel = null } = {}) => {
  const nom = nomPiece ? String(nomPiece).trim() : ''
  if (!nom) return { erreur: "Le nom de la pièce est obligatoire !" }
  const typeNorm = type ? String(type).trim().toUpperCase() : ''
  if (!TYPES_PIECE.includes(typeNorm)) return { erreur: "Type de pièce invalide (TERMINAL ou PIECE)." }
  // Unicité du nom vérifiée seulement si le nom change (des doublons anciens ne bloquent pas la modification)
  if (nom !== nomActuel) {
    const memeNom = await prisma.items.findFirst({
      where: { nom_piece: nom, is_deleted: false, ...(idPiece ? { id_piece: { not: idPiece } } : {}) },
    })
    if (memeNom) return { erreur: "Une pièce du même nom existe déjà !" }
  }
  const modelIds = listeIdsSaisie(itemModels)
  const serviceIds = listeIdsSaisie(itemServices)
  if (modelIds.length && (await prisma.model_piece.count({ where: { id_model: { in: modelIds } } })) !== modelIds.length) {
    return { erreur: "Un des modèles choisis est introuvable." }
  }
  if (serviceIds.length && (await prisma.services.count({ where: { id: { in: serviceIds } } })) !== serviceIds.length) {
    return { erreur: "Un des services choisis est introuvable." }
  }
  return { nom, type: typeNorm, modelIds, serviceIds }
}

// Création d'une pièce : gestionnaire de stock (rôle 7) ou super administrateur
const addPiece = async (req, res) => {
  try {
    const userId = toIntGestion(req.body.user_id)
    const utilisateur = userId ? await prisma.users.findUnique({ where: { id_user: userId } }) : null
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (!(await estGestionnaireStock(prisma, userId))) {
      return res.status(403).json({ message: "Seul un gestionnaire de stock peut créer une pièce." });
    }

    const saisie = await controlerSaisiePiece(req.body)
    if (saisie.erreur) {
      return res.status(400).json({ message: saisie.erreur });
    }

    const nouvellePiece = await prisma.$transaction(async (tx) => {
      const piece = await tx.items.create({
        data: {
          nom_piece: saisie.nom,
          type: saisie.type,
          created_by: utilisateur.fullname,
          user_id: userId,
          created_at: new Date(),
        }
      })
      if (saisie.modelIds.length) {
        await tx.items_models.createMany({ data: saisie.modelIds.map((model_id) => ({ item_id: piece.id_piece, model_id })) })
      }
      if (saisie.serviceIds.length) {
        await tx.items_services.createMany({ data: saisie.serviceIds.map((service_id) => ({ item_id: piece.id_piece, service_id })) })
      }
      return piece
    })

    res.status(201).json({
      message: "Nouvelle pièce enregistrée avec succès",
      stock_dt: nouvellePiece
    });
  } catch (error) {
    console.log("Erreur lors de la création :", error);
    res.status(500).json({ message: "Erreur interne" });
  }
}

const getAllItems = async (req, res) => {
  try {
    const items = await prisma.items.findMany({
      orderBy: { id_piece: 'desc' },
    });

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du stock", error });
  }
}

const createStock = async (req, res) => {
  try {
    const {
      selectedPiece,
      selectedModel,
      selectedService,
      origine,
      codeStock,
      motif,
      detailsMouvement,
      userId,
      commentaire,
    } = req.body

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(userId)
      }
    });
    if (!utilisateur) {
      console.log("Utilisateur non trouvé")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (!(await estGestionnaireStock(prisma, utilisateur.id_user))) {
      return res.status(403).json({ message: "Seul un gestionnaire de stock peut créer un stock." });
    }

    const erreurCode = await verifierCodeStock(codeStock)
    if (erreurCode) {
      return res.status(400).json({ message: erreurCode });
    }

    const details = typeof detailsMouvement === "string"
      ? JSON.parse(detailsMouvement)
      : detailsMouvement;

    const item = parseInt(selectedPiece)
    const itemModel = parseInt(selectedModel)
    const itemService = parseInt(selectedService)

    let quantite_lot = 0
    let quantite_carton = 0
    let quantite_piece = 0

    let nouveauMouvement = null

    const typeMouvement = details.typeMouvement

    const dateAction = new Date()

    const creationStock = await prisma.$transaction(async (tx) => {
      // Verrou + unicité du code dans la transaction (deux créations simultanées ne peuvent plus passer)
      const codeReserve = await reserverCodeStock(tx, codeStock)
      const nouveauStock = await tx.stocks.create({
        data: {
          code_stock: codeReserve,
          piece_id: item,
          model_id: itemModel,
          service_id: itemService,
          quantite_lot,
          quantite_carton,
          quantite_piece,
          created_at: dateAction,
          created_by: utilisateur.id_user,
          last_update: dateAction,
          updated_by: utilisateur.id_user,
          owner: utilisateur.id_user,
        }
      })

      await tx.stock_owners.create({
        data: {
          user_id: parseInt(userId),
          stock_id: nouveauStock.id,
          type: 'owner',
        }
      })

      if (typeMouvement == 5) {
        quantite_piece = details.stockFinalPiece

        nouveauMouvement = await tx.mouvement_stock.create({
          data: {
            type: 'entree',
            mouvement: 5,
            stock_id: nouveauStock.id,
            piece_id: item,
            service_origine: null,
            service_destination: itemService,
            origine,
            model_id: itemModel,
            stock_initial: 0,
            quantite: details.quantiteMouvement,
            stock_final: details.stockFinalPiece,
            quantite_totale_piece: details.stockFinalPiece,
            motif,
            commentaire,
            details_mouvement: JSON.stringify(details),
          }
        })
      } else if (typeMouvement == 4) {
        quantite_carton = details.stockFinalCarton
        quantite_piece = details.stockFinalPiece

        nouveauMouvement = await tx.mouvement_stock.create({
          data: {
            type: 'entree',
            mouvement: 4,
            stock_id: nouveauStock.id,
            piece_id: item,
            service_origine: null,
            service_destination: itemService,
            origine,
            model_id: itemModel,
            stock_initial: 0,
            quantite: details.quantiteMouvementCarton,
            stock_final: details.stockFinalCarton,
            quantite_totale_piece: details.stockFinalPiece,
            motif,
            commentaire,
            details_mouvement: JSON.stringify(details),
          }
        })

        const cartonsData = Array.from({ length: quantite_carton }, (_, i) => ({
          numero_carton: i + 1,
          stock_id: nouveauStock.id,
          piece_id: item,
          model_id: itemModel,
          service_id: itemService,
          quantite_piece_carton: details.quantitePieceCarton,
          quantite_totale_piece: details.quantitePieceCarton,
        }));

        await tx.stock_carton.createMany({
          data: cartonsData,
        });

      } else if (typeMouvement == 1) {
        quantite_lot = Number(details.stockFinalLot)
        quantite_carton = Number(details.stockFinalCarton)
        quantite_piece = Number(details.stockFinalPiece)

        nouveauMouvement = await tx.mouvement_stock.create({
          data: {
            type: 'entree',
            mouvement: 1,
            stock_id: nouveauStock.id,
            piece_id: item,
            service_origine: null,
            service_destination: itemService,
            origine,
            model_id: itemModel,
            stock_initial: 0,
            quantite: details.quantiteMouvementLot,
            stock_final: details.stockFinalLot,
            quantite_totale_piece: details.stockFinalPiece,
            motif,
            commentaire,
            details_mouvement: JSON.stringify(details),
          }
        })

        // 1. Create lots in bulk
        const lotsData = Array.from({ length: quantite_lot }, (_, i) => ({
          numero_lot: i + 1,
          stock_id: nouveauStock.id,
          quantite_carton_lot: details.quantiteCartonLot,
          quantite_carton: details.quantiteCartonLot,
          quantite_piece: details.quantitePieceLot,
          piece_id: item,
          model_id: itemModel,
          service_id: itemService,
        }));

        await tx.stock_lot.createMany({ data: lotsData });

        // 2. Fetch created lots
        const createdLots = await tx.stock_lot.findMany({
          where: { stock_id: nouveauStock.id },
          orderBy: { numero_lot: 'asc' }, // important!
        });

        // 3. Build cartons data
        const cartonsData = [];

        for (const lot of createdLots) {
          for (let i = 0; i < details.quantiteCartonLot; i++) {
            cartonsData.push({
              numero_carton: i + 1,
              stock_id: nouveauStock.id,
              lot_id: lot.id,
              numero_lot: lot.numero_lot,
              piece_id: item,
              service_id: itemService,
              model_id: itemModel,
              quantite_piece_carton: details.quantitePieceCarton,
              quantite_totale_piece: details.quantitePieceCarton,
            });
          }
        }

        // 4. Bulk insert cartons
        await tx.stock_carton.createMany({ data: cartonsData });
      }

      await tx.stocks.update({
        where: {
          id: nouveauStock.id,
        },
        data: {
          quantite_lot,
          quantite_carton,
          quantite_piece,
        }
      })

      return {
        nouveauStock,
        nouveauMouvement,
      }
    }, { isolationLevel: 'ReadCommitted' })

    res.status(201).json({
      message: "Nouveau stock enregistré avec succès",
      data: creationStock,
    });
  } catch (error) {
    if (error.status) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.log("Erreur lors de la création :", error);
    res.status(500).json({ message: "Erreur interne" });
  }
}

const getAllStocks = async (req, res) => {
  try {
    const stocks = await prisma.stocks.findMany({
      orderBy: { id: 'desc' },
      include: {
        items: true,
        model_piece: true,
        services: true,
        stockOwner: true,
      }
    });

    res.status(200).json(stocks);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des stocks", error });
  }
}

const getOneStock = async (req, res) => {
  const { id } = req.params;
  try {
    const stock = await prisma.stocks.findUnique({
      where: {
        id: parseInt(id)
      },
      include: {
        items: true,
        model_piece: true,
        services: true,
        stockOwner: true,
      }
    });

    if (!stock) {
      return res.status(404).json({ message: "Stock introuvable !" })
    }

    return res.status(200).json(stock)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getPiece = async (req, res) => {
  const { id } = req.params;
  try {
    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(id)
      }
    })

    if (!piece) {
      return res.status(404).json({ message: "Pièce introuvable !" })
    }

    return res.status(200).json(piece)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

// Modification d'une pièce : gestionnaire de stock (rôle 7) ou super administrateur.
// Tout est fait dans une transaction. Refusé : changer le type tant que la pièce a des stocks actifs,
// retirer un modèle ou un service encore utilisé par un stock actif de la pièce.
const modifyPiece = async (req, res) => {
  try {
    const idPiece = toIntGestion(req.params.id)
    const userId = toIntGestion(req.body.user_id)
    const piece = idPiece ? await prisma.items.findUnique({ where: { id_piece: idPiece } }) : null
    if (!piece) {
      return res.status(404).json({ message: "Pièce introuvable !" })
    }
    const utilisateur = userId ? await prisma.users.findUnique({ where: { id_user: userId } }) : null
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (!(await estGestionnaireStock(prisma, userId))) {
      return res.status(403).json({ message: "Seul un gestionnaire de stock peut modifier une pièce." });
    }

    const saisie = await controlerSaisiePiece(req.body, { idPiece, nomActuel: piece.nom_piece })
    if (saisie.erreur) {
      return res.status(400).json({ message: saisie.erreur });
    }

    const stocksActifs = await prisma.stocks.findMany({
      where: { piece_id: idPiece, is_deleted: false },
      select: { code_stock: true, model_id: true, service_id: true },
    })
    // Une pièce sans type peut en recevoir un ; un type existant ne change pas tant que des stocks actifs existent
    if (piece.type && saisie.type !== piece.type && stocksActifs.length > 0) {
      return res.status(400).json({ message: `Impossible de changer le type de la pièce : ${stocksActifs.length} stock(s) actif(s) l'utilisent.` })
    }
    const modelesUtilises = stocksActifs.filter((s) => !saisie.modelIds.includes(s.model_id))
    if (modelesUtilises.length > 0) {
      return res.status(400).json({ message: `Impossible de retirer un modèle encore utilisé par un stock actif (${[...new Set(modelesUtilises.map((s) => s.code_stock))].join(', ')}).` })
    }
    const servicesUtilises = stocksActifs.filter((s) => !saisie.serviceIds.includes(s.service_id))
    if (servicesUtilises.length > 0) {
      return res.status(400).json({ message: `Impossible de retirer un service encore utilisé par un stock actif (${[...new Set(servicesUtilises.map((s) => s.code_stock))].join(', ')}).` })
    }

    const pieceUpdated = await prisma.$transaction(async (tx) => {
      await tx.items_models.deleteMany({ where: { item_id: idPiece } })
      await tx.items_services.deleteMany({ where: { item_id: idPiece } })
      if (saisie.modelIds.length) {
        await tx.items_models.createMany({ data: saisie.modelIds.map((model_id) => ({ item_id: idPiece, model_id })) })
      }
      if (saisie.serviceIds.length) {
        await tx.items_services.createMany({ data: saisie.serviceIds.map((service_id) => ({ item_id: idPiece, service_id })) })
      }
      // Le créateur (user_id / created_by) est conservé
      return tx.items.update({
        where: { id_piece: idPiece },
        data: { nom_piece: saisie.nom, type: saisie.type },
      })
    })

    return res.status(200).json(pieceUpdated)

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
}

const getAllModels = async (req, res) => {
  try {
    const models = await prisma.model_piece.findMany({
      orderBy: { id_model: 'asc' },
    });

    res.status(200).json(models);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des models", error });
  }
}

const getItemModels = async (req, res) => {
  try {
    const { id } = req.params;

    const items_models = await prisma.items_models.findMany({
      where: { item_id: parseInt(id) },
      include: { model_piece: true }
    })

    res.status(200).json({
      model_piece: items_models.map(m => m.model_piece)
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
}

const getItemServices = async (req, res) => {
  try {
    const { id } = req.params;

    const items_services = await prisma.items_services.findMany({
      where: { item_id: parseInt(id) },
      include: { services: true }
    })

    res.status(200).json({
      services: items_services.map(s => s.services)
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
}

// // Création d'un stock à partir d'un fichier Excel de numéros de série (colonnes SERIAL NUMBER, LOT et CARTON optionnelles).
// - Un SN déjà actif en stock bloque l'import ; un SN sorti auparavant (is_deleted) est réutilisé et rattaché au nouveau stock
//   (serial_number est unique en base : on ne peut pas le recréer).
// - Le créateur devient owner du stock (stocks.owner + stock_owners).
// - Terminaux : parc TPE (statut 1) et historique écrits dans une transaction, après la création du stock.
const OPTIONS_TRANSACTION_IMPORT = { maxWait: 10000, timeout: 60000, isolationLevel: 'ReadCommitted' }

const setStockSn = async (req, res) => {
  const {
    item_id,
    model_id,
    service_id,
    origine,
    codeStock,
    motif,
    userId,
    commentaire,
  } = req.body;

  const file = req.file;

  try {
    const utilisateur = await prisma.users.findUnique({
      where: { id_user: parseInt(userId) }
    });
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    if (!(await estGestionnaireStock(prisma, utilisateur.id_user))) {
      return res.status(403).json({ message: "Seul un gestionnaire de stock peut créer un stock." });
    }

    const piece = await prisma.items.findUnique({
      where: { id_piece: parseInt(item_id) }
    });
    if (!piece) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }
    const estTerminal = String(piece.type || '').toUpperCase() == "TERMINAL"

    if (!parseInt(model_id) || !parseInt(service_id)) {
      return res.status(400).json({ message: "Vous devez choisir le modèle et le service du stock." });
    }

    const erreurCode = await verifierCodeStock(codeStock)
    if (erreurCode) {
      return res.status(400).json({ message: erreurCode });
    }
    const code = String(codeStock).trim()

    if (!file) {
      console.error("No file uploaded");
      return res.status(400).json({ message: "Excel file is required" });
    }

    /* =========================
       1️⃣ LOAD EXCEL
    ========================== */
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      console.error("No worksheet found in Excel file");
      return res.status(400).json({ message: "Invalid Excel file" });
    }

    /* =========================
       2️⃣ READ HEADERS
    ========================== */
    const headers = {};
    worksheet.getRow(1).eachCell((cell, col) => {
      headers[String(cell.value).trim().toUpperCase()] = col;
    });

    if (!headers["SERIAL NUMBER"]) {
      console.error("Missing SERIAL NUMBER column in Excel file")
      return res.status(400).json({
        message: "Missing required column: SERIAL NUMBER",
      });
    }

    const hasLot = !!headers["LOT"];
    const hasCarton = !!headers["CARTON"];

    /* =========================
       3️⃣ PARSE ROWS → HIERARCHY
    ========================== */
    const serialSet = new Set();
    const doublons = [];
    const hierarchy = {}; // lot → carton → [sn]

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const sn = normalize(row.getCell(headers["SERIAL NUMBER"]).value);
      if (!sn) return;

      if (serialSet.has(sn)) {
        doublons.push(`${sn} (ligne ${rowNumber})`);
        return;
      }

      serialSet.add(sn);

      const lot = hasLot
        ? extractNumber(row.getCell(headers["LOT"]).value)
        : null;

      const carton = hasCarton
        ? extractNumber(row.getCell(headers["CARTON"]).value)
        : null;

      const lotKey = lot ?? "NO_LOT";
      const cartonKey = carton ?? "NO_CARTON";

      if (!hierarchy[lotKey]) hierarchy[lotKey] = {};
      if (!hierarchy[lotKey][cartonKey]) hierarchy[lotKey][cartonKey] = [];

      hierarchy[lotKey][cartonKey].push(sn);
    });

    if (doublons.length > 0) {
      return res.status(400).json({ message: `SN en double dans le fichier : ${doublons.join(", ")}` });
    }

    if (serialSet.size === 0) {
      console.error("No serial numbers found in Excel file");
      return res.status(400).json({ message: "Excel file is empty" });
    }

    /* =========================
       4️⃣ CHECK EXISTING SNs
    ========================== */
    const existants = await prisma.serial_numbers.findMany({
      where: { serial_number: { in: [...serialSet] } },
      select: { id: true, serial_number: true, is_deleted: true },
    });

    const actifs = existants.filter((e) => !e.is_deleted)
    if (actifs.length > 0) {
      const message = `Serial numbers already exist: ${actifs.map(e => e.serial_number).join(", ")}`
      console.error(message);
      return res.status(400).json({ message });
    }
    // SN sortis auparavant : réutilisés (rattachés au nouveau stock)
    const sortisParSerial = new Map(existants.map((e) => [e.serial_number, e.id]))

    const serials = [...serialSet];

    // Terminaux : modèle obligatoire, existant, et identique à celui déjà enregistré au parc (vérifié AVANT la création du stock)
    if (estTerminal) {
      const itemsModele = serials.map((serial) => ({ serial, modelId: model_id }))
      const erreurModele = await verifierModelesExistants(prisma, itemsModele, { obligatoire: true })
      if (erreurModele) {
        console.error(erreurModele)
        return res.status(400).json({ message: erreurModele });
      }
      const conflits = trouverConflitsModele(itemsModele, await getTpesParc(prisma, serials))
      if (conflits.length > 0) {
        const message = `Le modèle choisi ne correspond pas au modèle enregistré au parc pour : ${conflits.map((c) => `${c.serial} (${String(c.nomModeleParc || c.modeleParc).toUpperCase()})`).join(", ")}`
        console.error(message)
        return res.status(400).json({ message });
      }
    }

    const idPiece = piece.id_piece
    const idModel = parseInt(model_id)
    const idService = parseInt(service_id)
    const dateAction = new Date();

    const creationStock = await prisma.$transaction(async (tx) => {
      // Verrou + unicité du code dans la transaction
      await reserverCodeStock(tx, code)
      /* =========================
         5️⃣ CREATE STOCK + OWNER
      ========================== */
      const stock = await tx.stocks.create({
        data: {
          code_stock: code,
          piece_id: idPiece,
          model_id: idModel,
          service_id: idService,
          quantite_lot: Object.keys(hierarchy).filter(k => k !== "NO_LOT").length,
          quantite_carton: Object.values(hierarchy)
            .reduce((acc, l) => acc + Object.keys(l).length, 0),
          quantite_piece: serialSet.size,
          created_at: dateAction,
          created_by: utilisateur.id_user,
          last_update: dateAction,
          updated_by: utilisateur.id_user,
          owner: utilisateur.id_user,
        },
      });

      await tx.stock_owners.create({
        data: {
          user_id: utilisateur.id_user,
          stock_id: stock.id,
          type: 'owner',
        }
      })

      /* =========================
         6️⃣ MOUVEMENT STOCK
      ========================== */
      const mouvementDetails = {
        typeMouvement: 6,
        lots: Object.entries(hierarchy).map(([lotKey, cartons]) => ({
          lot: lotKey === "NO_LOT" ? null : Number(lotKey),
          cartons: Object.entries(cartons).map(([cartonKey, sns]) => ({
            carton: cartonKey === "NO_CARTON" ? null : Number(cartonKey),
            serial_numbers: sns
          }))
        })),
        stockFinalLot: stock.quantite_lot,
        stockFinalCarton: stock.quantite_carton,
        stockFinalPiece: serialSet.size,
        snReutilises: [...sortisParSerial.keys()],
      };

      await tx.mouvement_stock.create({
        data: {
          type: "entree",
          mouvement: 6,
          created_at: dateAction,
          stock_id: stock.id,
          piece_id: idPiece,
          origine,
          service_destination: idService,
          model_id: idModel,
          stock_initial: 0,
          quantite: serialSet.size,
          stock_final: serialSet.size,
          quantite_totale_piece: serialSet.size,
          motif,
          commentaire,
          details_mouvement: JSON.stringify(mouvementDetails),
          created_by: utilisateur.id_user,
        },
      });

      /* =========================
         7️⃣ LOTS
      ========================== */
      const lotsData = [];
      const cartonsData = [];

      for (const [lotKey, cartons] of Object.entries(hierarchy)) {
        const numeroLot = lotKey === "NO_LOT" ? null : parseInt(lotKey);

        lotsData.push({
          numero_lot: numeroLot,
          stock_id: stock.id,
          piece_id: idPiece,
          service_id: idService,
          model_id: idModel,
          quantite_carton: Object.keys(cartons).length,
          quantite_piece: Object.values(cartons)
            .reduce((a, sns) => a + sns.length, 0),
        });

        for (const [cartonKey, sns] of Object.entries(cartons)) {
          cartonsData.push({
            numero_lot: numeroLot,
            numero_carton: cartonKey === "NO_CARTON" ? null : parseInt(cartonKey),
            sns,
          });
        }
      }

      await tx.stock_lot.createMany({ data: lotsData });

      const insertedLots = await tx.stock_lot.findMany({
        where: { stock_id: stock.id },
        select: { id: true, numero_lot: true },
      });

      // Un seul lot « sans numéro » possible (clé NO_LOT)
      const lotMap = new Map(insertedLots.map((lot) => [lot.numero_lot, lot.id]));

      /* =========================
         8️⃣ CARTONS
      ========================== */
      const cartonsFinal = cartonsData.map((c) => ({
        numero_carton: c.numero_carton,
        lot_id: lotMap.get(c.numero_lot),
        numero_lot: c.numero_lot,
        stock_id: stock.id,
        piece_id: idPiece,
        service_id: idService,
        model_id: idModel,
        quantite_piece_carton: c.sns.length,
        quantite_totale_piece: c.sns.length,
      }));

      await tx.stock_carton.createMany({ data: cartonsFinal });

      const insertedCartons = await tx.stock_carton.findMany({
        where: { stock_id: stock.id },
        select: { id: true, numero_carton: true, lot_id: true },
      });

      // Dans un lot, un seul carton « sans numéro » possible (clé NO_CARTON)
      const cartonMap = new Map(insertedCartons.map((carton) => [`${carton.lot_id}-${carton.numero_carton ?? "NULL"}`, carton.id]));

      /* =========================
         9️⃣ SERIAL NUMBERS (création ou réutilisation)
      ========================== */
      const nouveaux = [];
      for (const c of cartonsData) {
        const lotId = lotMap.get(c.numero_lot);
        const cartonId = cartonMap.get(`${lotId}-${c.numero_carton ?? "NULL"}`);
        const reutilises = [];

        c.sns.forEach((sn) => {
          if (sortisParSerial.has(sn)) {
            reutilises.push(sortisParSerial.get(sn));
          } else {
            nouveaux.push({
              serial_number: sn,
              stock_id: stock.id,
              lot_id: lotId,
              carton_id: cartonId,
              item_id: idPiece,
              service_id: idService,
              model_id: idModel,
              created_at: dateAction,
            });
          }
        });

        if (reutilises.length > 0) {
          await tx.serial_numbers.updateMany({
            where: { id: { in: reutilises } },
            data: {
              stock_id: stock.id,
              lot_id: lotId,
              carton_id: cartonId,
              item_id: idPiece,
              service_id: idService,
              model_id: idModel,
              is_deleted: false,
            },
          });
        }
      }

      if (nouveaux.length > 0) {
        await tx.serial_numbers.createMany({ data: nouveaux });
      }

      return {
        stock,
        mouvementDetails,
      };
    }, OPTIONS_TRANSACTION_IMPORT);

    let allTpes = null
    if (estTerminal) {
      allTpes = await prisma.$transaction(async (tx) => {
        // 1. Créer les TPE manquants avec le modèle du stock, compléter le modèle des TPE existants sans modèle
        await creerTpesEtCompleterModeles(tx, serials.map((serial) => ({ serial, modelId: model_id })), {
          created_by: utilisateur.id_user,
          created_at: dateAction,
          last_modified_at: dateAction,
          statut_id: 1,
        });

        // 2. Update ALL (existing + newly created)
        await tx.parc_tpe.updateMany({
          where: { serial_number: { in: serials } },
          data: {
            updated_by: utilisateur.id_user,
            updated_at: dateAction,
            last_modified_at: dateAction,
            statut_id: 1,
          }
        });

        const tpes = await tx.parc_tpe.findMany({
          where: { serial_number: { in: serials } },
          select: { id: true, serial_number: true }
        });

        // Nouveaux historiques pour chaque TPE mis à jour ou nouvellement créé
        await tx.history_tpe.createMany({
          data: tpes.map(tpe => ({
            id_tpe: tpe.id,
            created_by: utilisateur.id_user,
            created_at: dateAction,
            statut_id: 1,
          }))
        });
        return tpes
      }, OPTIONS_TRANSACTION_IMPORT);
    }

    console.log('Stock SN created successfully')
    return res.status(200).json({
      message: "Stock SN created successfully",
      inserted: serialSet.size,
      reutilises: sortisParSerial.size,
      data: creationStock,
      tpe: allTpes,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Failed to process Excel file",
    });
  }
};

const getAllMouvementStock = async (req, res) => {
  try {
    const mouvement = await prisma.mouvement_stock.findMany({
      orderBy: { id: 'desc' },
      include: {
        items: true,
        model_piece: true,
        type_mouvement_stock: true,
        services_mouvement_stock_service_origineToservices: true,
        services_mouvement_stock_service_destinationToservices: true,
        stocks: {
          select: {
            id: true,
            code_stock: true,
            stockOwner: true,
            created_by: true,
          }
        },
      }
    });

    res.status(200).json(mouvement);
  } catch (error) {
    console.log("Error : ", error)
    res.status(500).json({ message: "Erreur lors de la récupération des entrées sorties", error });
  }
}

const getOneMouvement = async (req, res) => {
  const { id } = req.params;
  try {
    const mouvement = await prisma.mouvement_stock.findUnique({
      where: {
        id: parseInt(id)
      }
    })

    if (!mouvement) {
      return res.status(404).json({ message: "Mouvement introuvable !" })
    }

    return res.status(200).json(mouvement)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getOneStockMouvements = async (req, res) => {
  const { id } = req.params;
  try {
    const mouvements = await prisma.mouvement_stock.findMany({
      where: {
        stock_id: parseInt(id)
      },
      include: {
        stocks: true,
        livraison: {
          include: {
            forms: true,
          },
        },
        demandes: {
          include: {
            forms: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc'
      },
    })

    if (!mouvements) {
      return res.status(404).json({ message: "Aucun mouvement éffectué pour stock !" })
    }

    return res.status(200).json(mouvements)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getLotPiece = async (req, res) => {
  const { item_id, model_id, service_id } = req.params
  try {
    const lot = await prisma.stock_lot.findMany({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id)
      },
      orderBy: {
        numero_lot: 'asc'
      },
    })
    if (!lot) {
      console.log("Zero lot trouvé")
      return res.status(404).json({ message: "Aucun lot trouvé pour cette pièce !" })
    }

    return res.status(200).json(lot)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getCartonLot = async (req, res) => {
  const { id } = req.params
  try {
    const carton = await prisma.stock_carton.findMany({
      where: {
        lot_id: parseInt(id)
      }
    })
    if (!carton) {
      console.log("Zero carton trouvé")
      return res.status(404).json({ message: "Aucun carton trouvé dans ce lot !" })
    }

    return res.status(200).json(carton)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getCartonPiece = async (req, res) => {
  const { item_id, model_id, service_id } = req.params
  try {
    const cartons = await prisma.stock_carton.findMany({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id)
      },
      orderBy: {
        numero_carton: 'asc'
      },

    })
    if (!cartons) {
      console.log("Zero carton trouvé")
      return res.status(404).json({ message: "Aucun carton trouvé pour cette pièce !" })
    }

    return res.status(200).json(cartons)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getAllTypeMouvementStock = async (req, res) => {
  try {
    const types = await prisma.type_mouvement_stock.findMany({
      orderBy: { id: 'asc' },
    });

    res.status(200).json(types);
  } catch (error) {
    console.log("Error : ", error)
    res.status(500).json({ message: "Erreur lors de la récupération des types de mouvement stock", error });
  }
}

const getAllItemModels = async (req, res) => {
  try {
    const models = await prisma.items_models.findMany({
      orderBy: { item_id: 'asc' }
    })

    res.status(200).json(models);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des modèles pièces ", error });
  }
}

const getAllItemServices = async (req, res) => {
  try {
    const services = await prisma.items_services.findMany({
      orderBy: { item_id: 'asc' }
    })

    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des services pièces ", error });
  }
}

const getCartonStock = async (req, res) => {
  const { id } = req.params
  try {
    const cartons = await prisma.stock_carton.findMany({
      where: {
        stock_id: parseInt(id),
      },
      orderBy: {
        numero_carton: 'asc'
      },

    })
    if (!cartons) {
      console.log("Zero carton trouvé")
      return res.status(404).json({ message: "Aucun carton trouvé pour ce stock !" })
    }

    return res.status(200).json(cartons)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getLotStock = async (req, res) => {
  const { id } = req.params
  try {
    const lot = await prisma.stock_lot.findMany({
      where: {
        stock_id: parseInt(id)
      },
      orderBy: {
        numero_lot: 'asc'
      },
    })
    if (!lot) {
      console.log("Zero lot trouvé")
      return res.status(404).json({ message: "Aucun lot trouvé pour ce stock !" })
    }

    return res.status(200).json(lot)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getStockParPiece = async (req, res) => {
  const { id } = req.params;
  try {
    // Stocks actifs de la pièce (les stocks supprimés / fusionnés n'apparaissent plus sur la fiche pièce)
    const stock = await prisma.stocks.findMany({
      where: {
        piece_id: parseInt(id),
        is_deleted: false,
      },
      orderBy: {
        id: 'desc',
      },
    })

    if (!stock) {
      return res.status(404).json({ message: "Stock introuvable !" })
    }

    return res.status(200).json(stock)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

// Responsables des stocks actifs d'une pièce / modèle / service (propriétaires et sous-propriétaires ;
// créateur seulement pour un stock sans propriétaire). Champs limités : pas de données sensibles.
const getAllUserTypeStocks = async (req, res) => {
  const pieceId = toIntGestion(req.params.itemId)
  const modelId = toIntGestion(req.params.modelId)
  const serviceId = toIntGestion(req.params.serviceId)
  if (!pieceId) {
    return res.status(400).json({ message: "Pièce invalide." });
  }

  try {
    const users = await prisma.users.findMany({
      where: whereResponsablesStocks({ pieceId, modelId, serviceId }),
      select: { id_user: true, fullname: true, email: true },
    });
    return res.status(200).json(users);
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs par type de stock" });
  }
};

// Modification du code, du propriétaire et des sous-propriétaires d'un stock.
// Autorisé : propriétaire du stock ou super administrateur (rôle 39). Code obligatoire et unique.
const modifyStock = async (req, res) => {
  try {
    const stockId = toIntGestion(req.params.id)
    const userId = toIntGestion(req.body.userId)
    const ownerId = toIntGestion(req.body.selectedOwner)
    if (!stockId || !userId) {
      return res.status(400).json({ message: "Paramètres invalides." });
    }

    const stock = await prisma.stocks.findUnique({ where: { id: stockId } })
    if (!stock) {
      return res.status(404).json({ message: "Stock introuvable !" });
    }
    if (stock.is_deleted) {
      return res.status(400).json({ message: "Stock supprimé !" });
    }

    const utilisateur = await prisma.users.findUnique({ where: { id_user: userId } });
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable !" });
    }

    const superAdmin = await estSuperAdmin(prisma, userId)
    if (!peutGererStock(stock, userId, superAdmin)) {
      return res.status(403).json({ message: "Seul le propriétaire du stock (ou un super administrateur) peut le modifier." });
    }

    // Code : obligatoire, unique parmi les stocks non supprimés (hors celui-ci)
    const code = req.body.code_stock ? String(req.body.code_stock).trim() : ''
    if (!code) {
      return res.status(400).json({ message: "Vous devez préciser un code stock !" });
    }
    const memeCode = await prisma.stocks.findFirst({ where: { code_stock: code, is_deleted: false, id: { not: stockId } } })
    if (memeCode) {
      return res.status(400).json({ message: "Un stock du même code existe déjà !" });
    }

    // Propriétaire obligatoire ; sous-propriétaires existants, sans doublon ni propriétaire
    if (!ownerId) {
      return res.status(400).json({ message: "Un stock ne peut rester sans propriétaire !" });
    }
    const brut = req.body.selectedSubOwners
    const liste = Array.isArray(brut) ? brut : (typeof brut === 'string' && brut ? brut.split(',') : [])
    const subOwnerIds = [...new Set(liste.map(toIntGestion))].filter((id) => id && id !== ownerId)
    const utilisateursConnus = await prisma.users.findMany({
      where: { id_user: { in: [ownerId, ...subOwnerIds] } },
      select: { id_user: true },
    })
    const connus = new Set(utilisateursConnus.map((u) => u.id_user))
    if (!connus.has(ownerId)) {
      return res.status(404).json({ message: "Propriétaire introuvable !" });
    }
    if (subOwnerIds.some((id) => !connus.has(id))) {
      return res.status(404).json({ message: "Un des sous-propriétaires est introuvable !" });
    }

    const dateAction = new Date()
    const stockModifie = await prisma.$transaction(async (tx) => {
      // Verrou + unicité du code (hors ce stock) dans la transaction
      await reserverCodeStock(tx, code, { saufStockId: stockId })
      const maj = await tx.stocks.update({
        where: { id: stockId },
        data: {
          code_stock: code,
          owner: ownerId,
          updated_by: userId,
          last_update: dateAction,
        }
      });

      // Propriétaires remplacés : l'ancien propriétaire n'a plus de droits s'il n'est pas repris en sous-propriétaire
      await tx.stock_owners.deleteMany({ where: { stock_id: stockId } });
      await tx.stock_owners.createMany({
        data: [
          { user_id: ownerId, stock_id: stockId, type: 'owner' },
          ...subOwnerIds.map((id) => ({ user_id: id, stock_id: stockId, type: 'sub_owner' })),
        ],
      });

      return maj
    }, { isolationLevel: 'ReadCommitted' });

    console.log(`Stock ${stockId} modifié avec succès par ${utilisateur.username}.`)
    return res.status(200).json({
      message: `Stock ${code} modifié avec succès.`,
      stock: stockModifie,
    });
  } catch (error) {
    if (error.status) {
      console.error(error.message)
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la modification du stock" });
  }
}

// Mouvement manuel sur un stock (page détails du stock). Seul le mouvement « par pièce » (typeMouvement 5) existe.
// Les quantités sont recalculées côté serveur à partir du stock verrouillé (les valeurs envoyées par le client sont ignorées).
// Une sortie par pièce ne peut prendre que des pièces hors cartons : les cartons/lots se sortent par une demande.
const createMouvementStock = async (req, res) => {
  try {
    const {
      stockId,
    } = req.params;
    const {
      origine,
      destination,
      details,
      userId,
      typeMouvement,
      motif,
      commentaire,
    } = req.body;

    const utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(userId)
      }
    });

    if (!utilisateur) {
      console.error("Utilisateur introuvable !");
      return res.status(404).json({ message: "Utilisateur introuvable !" });
    }

    const stock = await prisma.stocks.findUnique({
      where: { id: parseInt(stockId) },
      include: { stock_owners: true },
    });

    if (!stock) {
      console.error("Stock introuvable !");
      return res.status(404).json({ message: "Stock introuvable !" });
    }

    if (stock.is_deleted) {
      console.error("Stock supprimé !");
      return res.status(400).json({ message: "Stock supprimé !" });
    }

    if (!estResponsableStock(stock, utilisateur.id_user)) {
      return res.status(403).json({ message: "Vous n'êtes ni propriétaire ni co-propriétaire de ce stock." });
    }

    if (!['entree', 'sortie'].includes(typeMouvement)) {
      return res.status(400).json({ message: "Type de mouvement invalide (entrée ou sortie)." });
    }

    const detailsMouvement = (typeof details === "string" ? JSON.parse(details) : details) || {};
    if (Number(detailsMouvement.typeMouvement) !== 5) {
      return res.status(400).json({ message: "Seul le mouvement par pièce est disponible depuis la page du stock." });
    }

    const quantite = Number(detailsMouvement.quantiteMouvement)
    if (!Number.isInteger(quantite) || quantite < 1) {
      return res.status(400).json({ message: "Quantité invalide !" });
    }

    if (!motif || !String(motif).trim()) {
      return res.status(400).json({ message: "Veuillez préciser le motif !" });
    }

    const dateAction = new Date();

    const operation = await prisma.$transaction(async (tx) => {
      // Verrou sur le stock (UPDATE en premier) puis valeurs à jour
      const stockVerrouille = await tx.stocks.update({
        where: { id: stock.id },
        data: { last_update: dateAction, updated_by: utilisateur.id_user },
      })
      const initial = stockVerrouille.quantite_piece ?? 0

      let final = initial + quantite
      if (typeMouvement === 'sortie') {
        const cartons = await tx.stock_carton.findMany({
          where: { stock_id: stock.id, is_deleted: false },
          select: { quantite_totale_piece: true },
        })
        const dansCartons = cartons.reduce((acc, c) => acc + (c.quantite_totale_piece || 0), 0)
        const horsCartons = Math.max(0, initial - dansCartons)
        if (quantite > horsCartons) {
          const err = new Error(dansCartons > 0
            ? `Stock insuffisant hors cartons : ${horsCartons} pièce(s) disponible(s). Les pièces en cartons/lots se sortent par une demande.`
            : `Stock insuffisant : ${initial} pièce(s) disponible(s).`)
          err.status = 409
          throw err
        }
        final = initial - quantite
      }

      const detailsServeur = {
        ...detailsMouvement,
        typeMouvement: 5,
        stockInitialPiece: initial,
        quantiteMouvement: quantite,
        stockFinalPiece: final,
      }

      const mouvement = await tx.mouvement_stock.create({
        data: {
          type: typeMouvement,
          mouvement: 5,
          created_at: dateAction,
          stock_id: stock.id,
          piece_id: stock.piece_id,
          origine: typeMouvement === 'entree' ? origine : null,
          destination: typeMouvement === 'sortie' ? destination : null,
          service_origine: typeMouvement === 'sortie' ? stock.service_id : null,
          service_destination: typeMouvement === 'entree' ? stock.service_id : null,
          model_id: stock.model_id,
          stock_initial: initial,
          quantite,
          stock_final: final,
          quantite_totale_piece: final,
          motif,
          commentaire,
          details_mouvement: JSON.stringify(detailsServeur),
          created_by: utilisateur.id_user,
        }
      });

      await tx.stocks.update({
        where: { id: stock.id },
        data: { quantite_piece: final },
      });

      return {
        mouvement,
      }
    }, { isolationLevel: 'ReadCommitted' }) // relectures à jour après le verrou

    console.log(`Mouvement de stock créé avec succès par ${utilisateur.username}.`)
    return res.status(201).json({
      message: `Mouvement de stock créé avec succès par ${utilisateur.username}.`,
      operation,
    });
  } catch (error) {
    if (error.status) {
      console.error(error.message);
      return res.status(error.status).json({ message: error.message });
    }
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la création du mouvement de stock", error });
  }
}

/* ===================================================================================
   ASSOCIER (FUSIONNER) / SUPPRIMER UN STOCK — propriétaire du stock ou super administrateur (rôle 39)
   =================================================================================== */

const repondreErreurGestion = (res, error, messageDefaut) => {
  if (error.status) {
    console.error(error.message)
    return res.status(error.status).json({ message: error.message, ...(error.contenu ? { contenu: error.contenu } : {}) })
  }
  console.error(error)
  return res.status(500).json({ message: messageDefaut })
}

// Stocks que l'utilisateur peut associer (fusionner) au stock :stockId
const getStocksFusionnables = async (req, res) => {
  try {
    const stockId = toIntGestion(req.params.stockId)
    const userId = toIntGestion(req.params.userId)
    if (!stockId || !userId) return res.status(400).json({ message: "Paramètres invalides." })

    const cible = await prisma.stocks.findUnique({ where: { id: stockId } })
    if (!cible) return res.status(404).json({ message: "Stock introuvable !" })
    if (cible.is_deleted) return res.status(400).json({ message: "Stock supprimé !" })

    const superAdmin = await estSuperAdmin(prisma, userId)
    if (!peutGererStock(cible, userId, superAdmin)) {
      return res.status(403).json({ message: "Seul le propriétaire du stock (ou un super administrateur) peut y associer d'autres stocks." })
    }

    const stocks = await prisma.stocks.findMany({
      where: whereStocksFusionnables(cible, userId, superAdmin),
      select: {
        id: true,
        code_stock: true,
        quantite_piece: true,
        quantite_carton: true,
        quantite_lot: true,
        owner: true,
        stockOwner: { select: { id_user: true, fullname: true } },
        _count: { select: { serial_numbers: { where: { is_deleted: false } } } },
      },
      orderBy: { id: 'desc' },
    })
    return res.status(200).json(stocks.map(({ _count, ...s }) => ({ ...s, quantite_sn: _count.serial_numbers })))
  } catch (error) {
    return repondreErreurGestion(res, error, "Erreur lors de la récupération des stocks à associer.")
  }
}

// Fusionne les stocks `sourceIds` dans le stock :stockId
const associerStocks = async (req, res) => {
  try {
    const stockId = toIntGestion(req.params.stockId)
    const userId = toIntGestion(req.body.userId)
    if (!stockId || !userId) return res.status(400).json({ message: "Paramètres invalides." })

    const superAdmin = await estSuperAdmin(prisma, userId)
    const dateAction = new Date()
    const resultat = await prisma.$transaction((tx) => fusionnerStocks(tx, {
      cibleId: stockId,
      sourceIds: req.body.sourceIds,
      userId,
      superAdmin,
      motif: req.body.motif,
      commentaire: req.body.commentaire,
      dateAction,
    }), { maxWait: 10000, timeout: 30000, isolationLevel: 'ReadCommitted' })

    return res.status(201).json({
      message: `${resultat.sources.length} stock(s) associé(s) au stock ${resultat.stock.code_stock}.`,
      data: resultat,
    })
  } catch (error) {
    return repondreErreurGestion(res, error, "Erreur lors de l'association des stocks.")
  }
}

// Supprime (logiquement) le stock :stockId ; contenu restant sorti automatiquement si `confirmerSortie`
const deleteStock = async (req, res) => {
  try {
    const stockId = toIntGestion(req.params.stockId)
    const userId = toIntGestion(req.body.userId)
    if (!stockId || !userId) return res.status(400).json({ message: "Paramètres invalides." })

    const superAdmin = await estSuperAdmin(prisma, userId)
    const dateAction = new Date()
    const confirmerSortie = req.body.confirmerSortie === true || req.body.confirmerSortie === 'true'
    const resultat = await prisma.$transaction((tx) => supprimerStock(tx, {
      stockId,
      userId,
      superAdmin,
      motif: req.body.motif,
      confirmerSortie,
      dateAction,
    }), { maxWait: 10000, timeout: 30000, isolationLevel: 'ReadCommitted' })

    return res.status(200).json({
      message: `Stock ${resultat.stock.code_stock} supprimé.`,
      data: resultat,
    })
  } catch (error) {
    return repondreErreurGestion(res, error, "Erreur lors de la suppression du stock.")
  }
}

const getAllStockSubOwners = async (req, res) => {
  try {
    const { stockId } = req.params;

    const subOwners = await prisma.stock_owners.findMany({
      where: {
        stock_id: parseInt(stockId),
        type: 'sub_owner',
      },
      include: {
        users: true,
      },
    });
    return res.status(200).json(subOwners);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la récupération des sous-propriétaires du stock", error });
  }
}

module.exports = {
  getAllItems,
  getAllModels,
  addPiece,
  getAllMouvementStock,
  getPiece,
  modifyPiece,
  getLotPiece,
  getCartonLot,
  getCartonPiece,
  getItemModels,
  getItemServices,
  getAllTypeMouvementStock,
  getOneMouvement,
  createStock,
  getAllStocks,
  getAllItemModels,
  getAllItemServices,
  getOneStock,
  getCartonStock,
  getLotStock,
  getOneStockMouvements,
  getStockParPiece,
  setStockSn,
  getAllUserTypeStocks,
  modifyStock,
  createMouvementStock,
  getAllStockSubOwners,
  getStocksFusionnables,
  associerStocks,
  deleteStock,
}
