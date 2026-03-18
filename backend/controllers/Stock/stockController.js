const TEST_ENV = require("../../utils/consts")
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cloudinary = require("../../config/clouddinaryConifg");
const multer = require("multer")
const upload = multer({ storage: multer.memoryStorage() });
const ExcelJS = require("exceljs");

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

const addPiece = async (req, res) => {
  try {
    const {
      nomPiece,
      type,
      itemModels,
      itemServices,
      user_id,
    } = req.body

    let utilisateur = null;
    utilisateur = await prisma.users.findUnique({
      where: {
        id_user: parseInt(user_id)
      }
    });
    if (!utilisateur) {
      console.log("Utilisateur non trouvé")
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    let nomUser = utilisateur.fullname

    const nouvellePiece = await prisma.items.create({
      data: {
        nom_piece: nomPiece,
        type: type,
        created_by: nomUser,
        user_id: parseInt(user_id),
        created_at: new Date(),
      }
    })

    const pieceId = nouvellePiece.id_piece

    if (itemModels && Array.isArray(itemModels)) {
      await prisma.items_models.createMany({
        data: itemModels.map(modelId => ({
          item_id: pieceId,
          model_id: modelId,
        })),
      });
    }

    if (itemServices && Array.isArray(itemServices)) {
      await prisma.items_services.createMany({
        data: itemServices.map(serviceId => ({
          item_id: pieceId,
          service_id: serviceId,
        })),
      });
    }

    res.status(201).json({
      message: "Nouvelle pièce enregistrée avec succès",
      stock_dt: nouvellePiece
    });
  } catch (error) {
    console.log("Erreur lors de la création :", error);
    res.status(500).json({ message: "Erreur interne", error });
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

    const details = typeof detailsMouvement === "string"
      ? JSON.parse(detailsMouvement)
      : detailsMouvement;

    const item = parseInt(selectedPiece)
    const itemModel = parseInt(selectedModel)
    const itemService = parseInt(selectedService)

    let quantite_lot = 0
    let quantite_carton = 0
    let quantite_piece = 0

    const creationStock = await prisma.$transaction(async (tx) => {
      const nouveauStock = await tx.stocks.create({
        data: {
          code_stock: codeStock,
          piece_id: item,
          model_id: itemModel,
          service_id: itemService,
          quantite_lot,
          quantite_carton,
          quantite_piece,
          created_at: new Date(),
          created_by: utilisateur.id_user,
          last_update: new Date(),
          updated_by: utilisateur.id_user,
          owner: utilisateur.id_user,
        }
      })
  
      let nouveauMouvement = null
  
      const typeMouvement = details.typeMouvement
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
  
        for (let i = 0; i < quantite_carton; i++) {
          await tx.stock_carton.create({
            data: {
              numero_carton: i + 1,
              stock_id: nouveauStock.id,
              piece_id: item,
              model_id: itemModel,
              service_id: itemService,
              quantite_piece_carton: details.quantitePieceCarton,
              quantite_totale_piece: details.quantitePieceCarton,
            },
          });
        }
      } else if (typeMouvement == 1) {
        quantite_lot = details.stockFinalLot
        quantite_carton = details.stockFinalCarton
        quantite_piece = details.stockFinalPiece
  
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
  
        for (let i = 0; i < quantite_lot; i++) {
          const newLot = await tx.stock_lot.create({
            data: {
              numero_lot: i + 1,
              stock_id: nouveauStock.id,
              quantite_carton_lot: details.quantiteCartonLot,
              quantite_carton: details.quantiteCartonLot,
              quantite_piece: details.quantitePieceLot,
              piece_id: item,
              model_id: itemModel,
              service_id: itemService,
            },
          });
          for (let i = 0; i < details.quantiteCartonLot; i++) {
            await tx.stock_carton.create({
              data: {
                numero_carton: i + 1,
                stock_id: nouveauStock.id,
                lot_id: newLot.id,
                numero_lot: newLot.numero_lot,
                piece_id: item,
                service_id: itemService,
                model_id: itemModel,
                quantite_piece_carton: details.quantitePieceCarton,
                quantite_totale_piece: details.quantitePieceCarton,
              }
            })
          }
        }
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

      return{
        nouveauStock,
        nouveauMouvement,
      }
    })

    res.status(201).json({
      message: "Nouveau stock enregistré avec succès",
      data: creationStock,
    });
  } catch (error) {
    console.log("Erreur lors de la création :", error);
    res.status(500).json({ message: "Erreur interne", error });
  }
}

const getAllStocks = async (req, res) => {
  try {
    const stocks = await prisma.stocks.findMany({
      orderBy: { id: 'desc' },
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
      }
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

const modifyPiece = async (req, res) => {
  try {
    const {
      id
    } = req.params
    const {
      nomPiece,
      type,
      itemModels,
      itemServices,
      code_piece,
      user_id,
    } = req.body

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(id)
      }
    })

    if (!piece) {
      return res.status(404).json({ message: "Pièce introuvable !" })
    }

    const dataToUpdate = {
      nom_piece: nomPiece,
      type: type,
      code_piece,
      user_id: parseInt(user_id),
    }

    await prisma.items_models.deleteMany({
      where: {
        item_id: parseInt(id)
      }
    })

    await prisma.items_services.deleteMany({
      where: {
        item_id: parseInt(id)
      }
    })

    if (itemModels && Array.isArray(itemModels)) {
      await prisma.items_models.createMany({
        data: itemModels.map(modelId => ({
          item_id: piece.id_piece,
          model_id: modelId,
        })),
      });
    }

    if (itemServices && Array.isArray(itemServices)) {
      await prisma.items_services.createMany({
        data: itemServices.map(serviceId => ({
          item_id: piece.id_piece,
          service_id: serviceId,
        })),
      });
    }

    const pieceUpdated = await prisma.items.update({
      where: {
        id_piece: parseInt(id),
      },
      data: dataToUpdate,
    })

    return res.status(200).json(pieceUpdated)

  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
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

// Attribuer une quantité à un stock choisi en fonction de l'ID du stock.
const setStockPiece = async (req, res) => {

  const {
    item_id,
    model_id,
    service_id,
  } = req.params

  const {
    stockInitial,
    quantiteMouvement,
    stockFinal,
    motif,
    commentaire,
    isEntree,
    userId,
  } = req.body;

  try {

    let utilisateur = null;
    if (userId != null) {
      utilisateur = await prisma.users.findUnique({
        where: {
          id_user: parseInt(userId)
        }
      })
      if (!utilisateur) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
    }

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(item_id)
      }
    })
    if (!piece) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    const type = isEntree ? 'entree' : 'sortie'

    const initial = Number(stockInitial)
    const stock = Number(quantiteMouvement)
    const final = Number(stockFinal)

    const mouvement = await prisma.mouvement_stock.create({
      data: {
        type,
        mouvement: 5,
        piece_id: parseInt(item_id),
        service_origine: isEntree ? null : parseInt(service_id),
        service_destination: isEntree ? parseInt(service_id) : null,
        model_id: parseInt(model_id),
        stock_initial: initial,
        quantite: stock,
        stock_final: final,
        quantite_totale_piece: final,
        motif,
        commentaire,
      }
    })

    const quantite = await prisma.stock_piece.findFirst({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      }
    })

    if (!quantite) {
      const newQuantite = await prisma.stock_piece.create({
        data: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          quantite: parseInt(stockFinal),
        }
      })
      return res.status(201).json(newQuantite, mouvement)
    }

    const dataToUpdate = {
      quantite: parseInt(stockFinal)
    }

    const updated_quantite = await prisma.stock_piece.update({
      where: {
        id: quantite.id,
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      },
      data: dataToUpdate
    })

    return res.status(200).json(updated_quantite, mouvement);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

// Attribuer une quantité à un stock de cartons choisi en fonction de l'ID du stock.
const setStockCarton = async (req, res) => {

  const {
    item_id,
    model_id,
    service_id,
  } = req.params

  const {
    stockInitialCarton,
    quantiteMouvementCarton,
    stockFinalCarton,
    details,
    motif,
    commentaire,
    isEntree,
    userId
  } = req.body;

  try {

    const detailsCartons = typeof details === "string" ? JSON.parse(details) : details;

    let utilisateur = null;
    if (userId != null) {
      utilisateur = await prisma.users.findUnique({
        where: {
          id_user: parseInt(userId)
        }
      })
      if (!utilisateur) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
    }

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(item_id)
      }
    })
    if (!piece) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    const type = isEntree ? 'entree' : 'sortie'

    const initialCarton = Number(stockInitialCarton)
    const stockCarton = Number(quantiteMouvementCarton)
    const finalCarton = Number(stockFinalCarton)
    const finalPiece = Number(detailsCartons.stockFinalPiece)

    const mouvement = await prisma.mouvement_stock.create({
      data: {
        type,
        mouvement: 4,
        piece_id: parseInt(item_id),
        service_origine: isEntree ? null : parseInt(service_id),
        service_destination: isEntree ? parseInt(service_id) : null,
        model_id: parseInt(model_id),
        stock_initial: initialCarton,
        quantite: stockCarton,
        stock_final: finalCarton,
        quantite_totale_piece: finalPiece,
        motif,
        commentaire,
        details_mouvement: JSON.stringify(detailsCartons),
      }
    })

    const quantite = await prisma.stock_piece.findFirst({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      }
    })

    let updatedQuantite = null

    if (quantite) {
      const dataToUpdate = {
        quantite: parseInt(detailsCartons.stockFinalPiece)
      }
      updatedQuantite = await prisma.stock_piece.update({
        where: {
          id: quantite.id,
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
        },
        data: dataToUpdate
      })
    } else {
      updatedQuantite = await prisma.stock_piece.create({
        data: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          quantite: parseInt(detailsCartons.stockFinalPiece),
        }
      })
    }

    if (isEntree) {
      const listCarton = await prisma.stock_carton.findMany({
        where: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          lot_id: null,
        },
        orderBy: { numero_carton: "asc" },
      });

      const lastCarton = listCarton[listCarton.length - 1];
      const lastId = lastCarton ? lastCarton.numero_carton : 0;
      const piecesPerCarton = Number(detailsCartons.quantitePieceCarton);

      for (let i = 0; i < stockCarton; i++) {
        await prisma.stock_carton.create({
          data: {
            numero_carton: lastId + i + 1,
            piece_id: parseInt(item_id),
            model_id: parseInt(model_id),
            service_id: parseInt(service_id),
            quantite_piece_carton: piecesPerCarton,
            quantite_totale_piece: piecesPerCarton,
          },
        });
      }
    } else {
      const listCarton = detailsCartons.listeCartons
      for (let id of listCarton) {
        await prisma.stock_carton.update({
          where: {
            id: parseInt(id)
          },
          data: {
            is_deleted: true,
          }
        })
      }
    }

    return res.status(200).json(updatedQuantite, mouvement);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

// Attribuer une quantité à un carton choisi en fonction de l'ID du carton.
const setStockPieceCarton = async (req, res) => {
  const {
    item_id,
    model_id,
    service_id,
  } = req.params

  const {
    stockInitialPieceCarton,
    quantiteMouvementPieceCarton,
    stockFinalPieceCarton,
    details,
    motif,
    commentaire,
    isEntree,
    userId
  } = req.body;

  try {

    const detailsPieceCarton = typeof details === "string" ? JSON.parse(details) : details;

    let utilisateur = null;
    if (userId != null) {
      utilisateur = await prisma.users.findUnique({
        where: {
          id_user: parseInt(userId)
        }
      })
      if (!utilisateur) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
    }

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(item_id)
      }
    })
    if (!piece) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    const type = isEntree ? 'entree' : 'sortie'

    const initialPieceCarton = Number(stockInitialPieceCarton)
    const stockPieceCarton = Number(quantiteMouvementPieceCarton)
    const finalPieceCarton = Number(stockFinalPieceCarton)
    const finalPiece = Number(detailsPieceCarton.stockFinalPiece)

    const mouvement = await prisma.mouvement_stock.create({
      data: {
        type,
        mouvement: 3,
        piece_id: parseInt(item_id),
        service_origine: isEntree ? null : parseInt(service_id),
        service_destination: isEntree ? parseInt(service_id) : null,
        model_id: parseInt(model_id),
        stock_initial: initialPieceCarton,
        quantite: stockPieceCarton,
        stock_final: finalPieceCarton,
        quantite_totale_piece: finalPiece,
        motif,
        commentaire,
        details_mouvement: JSON.stringify(detailsPieceCarton),
      }
    })

    const quantite = await prisma.stock_piece.findFirst({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      }
    })

    let updatedQuantite = null

    if (quantite) {
      const dataToUpdate = {
        quantite: parseInt(detailsPieceCarton.stockFinalPiece)
      }

      updatedQuantite = await prisma.stock_piece.update({
        where: {
          id: quantite.id,
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
        },
        data: dataToUpdate
      })
    } else {
      updatedQuantite = await prisma.stock_piece.create({
        data: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          quantite: parseInt(detailsPieceCarton.stockFinalPiece),
        }
      })
    }

    let updatedCarton = await prisma.stock_carton.update({
      where: { id: parseInt(detailsPieceCarton.selectedCarton) },
      data: {
        quantite_totale_piece: finalPieceCarton
      },
    })

    if (finalPieceCarton == 0) {
      updatedCarton = await prisma.stock_carton.update({
        where: { id: parseInt(detailsPieceCarton.selectedCarton) },
        data: {
          quantite_totale_piece: finalPieceCarton,
          is_deleted: true,
        },
      })
    }

    if (detailsPieceCarton.selectedLot) {
      const finalPieceLot = Number(detailsPieceCarton.stockFinalPieceLot)
      let updatedLot = await prisma.stock_lot.update({
        where: {
          id: parseInt(detailsPieceCarton.selectedLot)
        },
        data: {
          quantite_piece: finalPieceLot,
        }
      })
      if (finalPieceCarton == 0) {
        updatedLot = await prisma.stock_lot.update({
          where: {
            id: parseInt(detailsPieceCarton.selectedLot)
          },
          data: {
            quantite_piece: finalPieceLot,
            quantite_carton: updatedLot.quantite_carton - 1,
          },
        })
      }
      if (updatedLot.quantite_carton == 0) {
        updatedLot = await prisma.stock_lot.update({
          where: {
            id: parseInt(detailsPieceCarton.selectedLot)
          },
          data: {
            quantite_piece: finalPieceLot,
            quantite_carton: 0,
            is_deleted: true
          }
        })
      }
    }

    return res.status(200).json(updatedQuantite, mouvement, updatedCarton);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

// Attribuer une quantité de carton à un lot choisi en fonction de l'ID du lot.
const setStockCartonLot = async (req, res) => {

  const {
    item_id,
    model_id,
    service_id,
  } = req.params

  const {
    stockInitialCartonLot,
    quantiteMouvementCartonLot,
    stockFinalCartonLot,
    details,
    motif,
    commentaire,
    isEntree,
    userId
  } = req.body;

  try {

    const detailsCartonsLot = typeof details === "string" ? JSON.parse(details) : details;

    let utilisateur = null;
    if (userId != null) {
      utilisateur = await prisma.users.findUnique({
        where: {
          id_user: parseInt(userId)
        }
      })
      if (!utilisateur) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
    }

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(item_id)
      }
    })
    if (!piece) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    const type = isEntree ? 'entree' : 'sortie'

    const initialCartonLot = Number(stockInitialCartonLot)
    const stockCartonLot = Number(quantiteMouvementCartonLot)
    const finalCartonLot = Number(stockFinalCartonLot)
    const finalPiece = Number(detailsCartonsLot.stockFinalPiece)
    const finalPieceLot = Number(detailsCartonsLot.stockFinalPieceLot)

    const mouvement = await prisma.mouvement_stock.create({
      data: {
        type,
        mouvement: 2,
        piece_id: parseInt(item_id),
        service_origine: isEntree ? null : parseInt(service_id),
        service_destination: isEntree ? parseInt(service_id) : null,
        model_id: parseInt(model_id),
        stock_initial: initialCartonLot,
        quantite: stockCartonLot,
        stock_final: finalCartonLot,
        quantite_totale_piece: finalPiece,
        motif,
        commentaire,
        details_mouvement: JSON.stringify(detailsCartonsLot),
      }
    })

    const quantite = await prisma.stock_piece.findFirst({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      }
    })

    let updatedQuantite = null

    if (quantite) {
      const dataToUpdate = {
        quantite: parseInt(detailsCartonsLot.stockFinalPiece)
      }
      updatedQuantite = await prisma.stock_piece.update({
        where: {
          id: quantite.id,
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
        },
        data: dataToUpdate
      })
    } else {
      updatedQuantite = await prisma.stock_piece.create({
        data: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          quantite: parseInt(detailsCartonsLot.stockFinalPiece),
        }
      })
    }

    let updatedLot = await prisma.stock_lot.update({
      where: {
        id: parseInt(detailsCartonsLot.selectedLot),
      },
      data: {
        quantite_carton: finalCartonLot,
        quantite_piece: finalPieceLot,
      },
    })

    if (finalCartonLot == 0) {
      updatedLot = await prisma.stock_lot.update({
        where: {
          id: parseInt(detailsCartonsLot.selectedLot),
        },
        data: {
          quantite_carton: finalCartonLot,
          quantite_piece: finalPieceLot,
          is_deleted: true,
        },
      })
    }

    if (isEntree) {
      const listCartonLot = await prisma.stock_carton.findMany({
        where: {
          piece_id: parseInt(item_id),
          lot_id: parseInt(detailsCartonsLot.selectedLot),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
        },
        orderBy: { numero_carton: "asc" },
      });

      const lastCarton = listCartonLot[listCartonLot.length - 1];
      const lastId = lastCarton ? lastCarton.numero_carton : 0;
      const piecesPerCarton = Number(detailsCartonsLot.quantitePieceCarton);

      for (let i = 0; i < stockCartonLot; i++) {
        await prisma.stock_carton.create({
          data: {
            numero_carton: lastId + i + 1,
            lot_id: updatedLot.id,
            numero_lot: updatedLot.numero_lot,
            piece_id: parseInt(item_id),
            model_id: parseInt(model_id),
            service_id: parseInt(service_id),
            quantite_piece_carton: piecesPerCarton,
            quantite_totale_piece: piecesPerCarton,
          },
        });
      }
    } else {
      const listCartonLot = detailsCartonsLot.listeCartons
      for (let id of listCartonLot) {
        await prisma.stock_carton.update({
          where: {
            id: parseInt(id),
            lot_id: updatedLot.id,
            model_id: parseInt(model_id),
            service_id: parseInt(service_id),
          },
          data: {
            is_deleted: true,
          }
        })
      }
    }

    return res.status(200).json(updatedQuantite, mouvement);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

// Attribuer une quantité de lots à un stock en fonction de l'ID du stock.
const setStockLot = async (req, res) => {

  const {
    item_id,
    model_id,
    service_id,
  } = req.params

  const {
    stockInitialLot,
    quantiteMouvementLot,
    stockFinalLot,
    details,
    motif,
    commentaire,
    isEntree,
    userId
  } = req.body;

  try {

    const detailsLots = typeof details === "string" ? JSON.parse(details) : details;

    let utilisateur = null;
    if (userId != null) {
      utilisateur = await prisma.users.findUnique({
        where: {
          id_user: parseInt(userId)
        }
      })
      if (!utilisateur) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
    }

    const piece = await prisma.items.findUnique({
      where: {
        id_piece: parseInt(item_id)
      }
    })
    if (!piece) {
      return res.status(404).json({ message: "Pièce non trouvée" });
    }

    const type = isEntree ? 'entree' : 'sortie'

    const initialLot = Number(stockInitialLot)
    const stockLot = Number(quantiteMouvementLot)
    const finalLot = Number(stockFinalLot)
    const finalPiece = Number(detailsLots.stockFinalPiece)

    const mouvement = await prisma.mouvement_stock.create({
      data: {
        type,
        mouvement: 1,
        piece_id: parseInt(item_id),
        service_origine: isEntree ? null : parseInt(service_id),
        service_destination: isEntree ? parseInt(service_id) : null,
        model_id: parseInt(model_id),
        stock_initial: initialLot,
        quantite: stockLot,
        stock_final: finalLot,
        quantite_totale_piece: finalPiece,
        motif,
        commentaire,
        details_mouvement: JSON.stringify(detailsLots),
      }
    })

    const quantite = await prisma.stock_piece.findFirst({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      }
    })

    let updatedQuantite = null
    if (quantite) {
      const dataToUpdate = {
        quantite: parseInt(detailsLots.stockFinalPiece)
      }
      updatedQuantite = await prisma.stock_piece.update({
        where: {
          id: quantite.id,
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
        },
        data: dataToUpdate
      })
    } else {
      updatedQuantite = await prisma.stock_piece.create({
        data: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          quantite: parseInt(detailsLots.stockFinalPiece),
        }
      })
    }

    if (isEntree) {
      const listLot = await prisma.stock_lot.findMany({
        where: {
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
        },
        orderBy: { numero_lot: "asc" },
      });

      const lastLot = listLot[listLot.length - 1];
      const lastId = lastLot ? lastLot.numero_lot : 0;
      const cartonPerLot = Number(detailsLots.quantiteCartonLot);
      const piecesPerCarton = Number(detailsLots.quantitePieceCarton);
      const piecesPerLot = Number(detailsLots.quantiteCartonLot * detailsLots.quantitePieceCarton)
      for (let i = 0; i < stockLot; i++) {
        const newLot = await prisma.stock_lot.create({
          data: {
            numero_lot: lastId + i + 1,
            quantite_carton_lot: cartonPerLot,
            quantite_carton: cartonPerLot,
            quantite_piece: piecesPerLot,
            piece_id: parseInt(item_id),
            model_id: parseInt(model_id),
            service_id: parseInt(service_id),
          },
        });
        for (let i = 0; i < cartonPerLot; i++) {
          await prisma.stock_carton.create({
            data: {
              numero_carton: i + 1,
              lot_id: newLot.id,
              numero_lot: newLot.numero_lot,
              piece_id: parseInt(item_id),
              service_id: parseInt(service_id),
              model_id: parseInt(model_id),
              quantite_piece_carton: piecesPerCarton,
              quantite_totale_piece: piecesPerCarton,
            }
          })
        }
      }
    } else {
      const listLot = detailsLots.listeLots
      for (let id of listLot) {
        await prisma.stock_lot.update({
          where: {
            id: parseInt(id)
          },
          data: {
            is_deleted: true,
          }
        })
        await prisma.stock_carton.updateMany({
          where: {
            lot_id: parseInt(id)
          },
          data: {
            is_deleted: true,
          }
        })
      }
    }

    return res.status(200).json(updatedQuantite, mouvement);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de la mise à jour", error });
  }
}

// const setStockSn = async (req, res) => {
//   const {
//     item_id,
//     model_id,
//     service_id,
//     origine,
//     codeStock,
//     motif,
//     userId,
//     commentaire,
//   } = req.body;

//   const file = req.file;

//   try {
//     /* =========================
//        1️⃣ VALIDATION
//     ========================== */
//     if (!file) {
//       return res.status(400).json({ message: "Excel file is required" });
//     }

//     /* =========================
//        2️⃣ LOAD EXCEL
//     ========================== */
//     const workbook = new ExcelJS.Workbook();
//     await workbook.xlsx.load(file.buffer);
//     const worksheet = workbook.worksheets[0];

//     const headers = {};
//     worksheet.getRow(1).eachCell((cell, col) => {
//       headers[String(cell.value).trim().toUpperCase()] = col;
//     });

//     if (!headers["SERIAL NUMBER"]) {
//       return res.status(400).json({
//         message: "Missing required column: SERIAL NUMBER",
//       });
//     }

//     /* =========================
//        3️⃣ PARSE ROWS
//     ========================== */
//     const serialNumbers = new Set();
//     const rows = [];

//     worksheet.eachRow((row, rowNumber) => {
//       if (rowNumber === 1) return;

//       const sn = normalize(row.getCell(headers["SERIAL NUMBER"]).value);
//       if (!sn) return;

//       if (serialNumbers.has(sn)) {
//         throw new Error(`Duplicate SERIAL NUMBER in file: ${sn} (row ${rowNumber})`);
//       }

//       serialNumbers.add(sn);

//       const carton = headers["CARTON"]
//         ? extractNumber(row.getCell(headers["CARTON"]).value)
//         : null;

//       rows.push({ sn, carton });
//     });

//     if (rows.length === 0) {
//       return res.status(400).json({ message: "Excel file is empty" });
//     }

//     /* =========================
//        4️⃣ CHECK EXISTING SNs
//     ========================== */
//     const existingSNs = await prisma.serial_numbers.findMany({
//       where: {
//         serial_number: { in: [...serialNumbers] },
//         is_deleted: false,
//       },
//       select: { serial_number: true },
//     });

//     if (existingSNs.length > 0) {
//       return res.status(400).json({
//         message: `Serial numbers already exist: ${existingSNs
//           .map(e => e.serial_number)
//           .join(", ")}`,
//       });
//     }

//     /* =========================
//        5️⃣ BUILD CARTON HIERARCHY
//     ========================== */
//     const hierarchy = {};

//     for (const r of rows) {
//       const cartonKey = r.carton ?? "NO_CARTON";

//       if (!hierarchy[cartonKey]) hierarchy[cartonKey] = [];
//       hierarchy[cartonKey].push(r.sn);
//     }

//     /* =========================
//        6️⃣ CREATE STOCK (TX 1)
//     ========================== */
//     const [newStock] = await prisma.$transaction([
//       prisma.stocks.create({
//         data: {
//           code_stock: codeStock,
//           piece_id: parseInt(item_id),
//           model_id: parseInt(model_id),
//           service_id: parseInt(service_id),
//           quantite_lot: 0,
//           quantite_carton: Object.keys(hierarchy)
//             .filter(k => k !== "NO_CARTON").length,
//           quantite_piece: serialNumbers.size,
//           created_at: new Date(),
//           created_by: parseInt(userId),
//           last_update: new Date(),
//           updated_by: parseInt(userId),
//         },
//       }),
//     ]);

//     /* =========================
//        7️⃣ MOUVEMENT
//     ========================== */
//     const details = {
//       stockFinalCarton: Object.keys(hierarchy).length,
//       stockFinalPiece: serialNumbers.size,
//     }
//     await prisma.mouvement_stock.create({
//       data: {
//         type: "entree",
//         mouvement: 6,
//         date: new Date(),
//         stock_id: newStock.id,
//         piece_id: parseInt(item_id),
//         origine,
//         service_destination: parseInt(service_id),
//         model_id: parseInt(model_id),
//         stock_initial: 0,
//         quantite: serialNumbers.size,
//         stock_final: serialNumbers.size,
//         quantite_totale_piece: serialNumbers.size,
//         motif,
//         commentaire,
//         details_mouvement: JSON.stringify(details),
//       },
//     });

//     /* =========================
//        8️⃣ CREATE CARTONS + SNs
//     ========================== */
//     for (const [cartonKey, sns] of Object.entries(hierarchy)) {

//       let cartonId = null;

//       if (cartonKey !== "NO_CARTON") {
//         const carton = await prisma.stock_carton.create({
//           data: {
//             numero_carton: parseInt(cartonKey),
//             stock_id: newStock.id,
//             piece_id: parseInt(item_id),
//             service_id: parseInt(service_id),
//             model_id: parseInt(model_id),
//             quantite_piece_carton: sns.length,
//             quantite_totale_piece: sns.length,
//           },
//         });
//         cartonId = carton.id;
//       }

//       const CHUNK = 1000;
//       for (let i = 0; i < sns.length; i += CHUNK) {
//         await prisma.serial_numbers.createMany({
//           data: sns.slice(i, i + CHUNK).map(sn => ({
//             serial_number: sn,
//             stock_id: newStock.id,
//             carton_id: cartonId,
//             item_id: parseInt(item_id),
//             service_id: parseInt(service_id),
//             model_id: parseInt(model_id),
//             created_at: new Date(),
//           })),
//         });
//       }
//     }

//     return res.status(200).json({
//       message: "Stock SN created successfully (no LOT)",
//       inserted: serialNumbers.size,
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       message: error.message || "Failed to process Excel file",
//     });
//   }
// };


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
    /* =========================
       1️⃣ VALIDATION
    ========================== */
    if (!file) {
      return res.status(400).json({ message: "Excel file is required" });
    }

    /* =========================
       2️⃣ LOAD EXCEL
    ========================== */
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({ message: "Invalid Excel file" });
    }

    /* =========================
       3️⃣ READ HEADERS
    ========================== */
    const headers = {};
    worksheet.getRow(1).eachCell((cell, col) => {
      headers[String(cell.value).trim().toUpperCase()] = col;
    });

    if (!headers["SERIAL NUMBER"]) {
      return res.status(400).json({
        message: "Missing required column: SERIAL NUMBER",
      });
    }

    const hasLot = !!headers["LOT"];
    const hasCarton = !!headers["CARTON"];

    /* =========================
       4️⃣ PARSE ROWS → HIERARCHY
    ========================== */
    const serialSet = new Set();
    const hierarchy = {}; // lot → carton → [sn]

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const sn = normalize(row.getCell(headers["SERIAL NUMBER"]).value);
      if (!sn) return;

      if (serialSet.has(sn)) {
        throw new Error(`Duplicate SERIAL NUMBER: ${sn} (row ${rowNumber})`);
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

    if (serialSet.size === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    /* =========================
       5️⃣ CHECK EXISTING SNs
    ========================== */
    const existing = await prisma.serial_numbers.findMany({
      where: {
        serial_number: { in: [...serialSet] },
        is_deleted: false,
      },
      select: { serial_number: true },
    });

    if (existing.length > 0) {
      return res.status(400).json({
        message: `Serial numbers already exist: ${existing
          .map(e => e.serial_number)
          .join(", ")}`,
      });
    }

    const creationStock = await prisma.$transaction(async (tx) => {
      /* =========================
         6️⃣ CREATE STOCK
      ========================== */
      const stock = await tx.stocks.create({
        data: {
          code_stock: codeStock,
          piece_id: parseInt(item_id),
          model_id: parseInt(model_id),
          service_id: parseInt(service_id),
          quantite_lot: Object.keys(hierarchy).filter(k => k !== "NO_LOT").length,
          quantite_carton: Object.values(hierarchy)
            .reduce((acc, l) => acc + Object.keys(l).length, 0),
          quantite_piece: serialSet.size,
          created_at: new Date(),
          created_by: parseInt(userId),
          last_update: new Date(),
          updated_by: parseInt(userId),
          owner: parseInt(userId),
        },
      });
  
  
      const mouvementDetails = {
        lots: Object.entries(hierarchy).map(([lotKey, cartons]) => ({
          lot: lotKey === "NO_LOT" ? null : Number(lotKey),
          cartons: Object.entries(cartons).map(([cartonKey, sns]) => ({
            carton: cartonKey === "NO_CARTON" ? null : Number(cartonKey),
            serial_numbers: sns
          }))
        })),
        stockFinalLot: Object.keys(hierarchy).length,
        stockFinalCarton: Object.values(hierarchy)
          .reduce((a, l) => a + Object.keys(l).length, 0),
        stockFinalPiece: serialSet.size,
      };
  
      /* =========================
         7️⃣ MOUVEMENT STOCK
      ========================== */
      await tx.mouvement_stock.create({
        data: {
          type: "entree",
          mouvement: 6,
          stock_id: stock.id,
          piece_id: parseInt(item_id),
          origine,
          service_destination: parseInt(service_id),
          model_id: parseInt(model_id),
          stock_initial: 0,
          quantite: serialSet.size,
          stock_final: serialSet.size,
          quantite_totale_piece: serialSet.size,
          motif,
          commentaire,
          details_mouvement: JSON.stringify(mouvementDetails),
        },
      });
  
      /* =========================
         8️⃣ CREATE LOTS + CARTONS
      ========================== */
      for (const [lotKey, cartons] of Object.entries(hierarchy)) {
        const lot = await tx.stock_lot.create({
          data: {
            numero_lot: lotKey === "NO_LOT" ? null : parseInt(lotKey),
            stock_id: stock.id,
            piece_id: parseInt(item_id),
            service_id: parseInt(service_id),
            model_id: parseInt(model_id),
            quantite_carton: Object.keys(cartons).length,
            quantite_piece: Object.values(cartons)
              .reduce((a, sns) => a + sns.length, 0),
          },
        });
  
        for (const [cartonKey, sns] of Object.entries(cartons)) {
          const carton = await tx.stock_carton.create({
            data: {
              numero_carton: cartonKey === "NO_CARTON" ? null : parseInt(cartonKey),
              lot_id: lot.id,
              stock_id: stock.id,
              piece_id: parseInt(item_id),
              service_id: parseInt(service_id),
              model_id: parseInt(model_id),
              quantite_piece_carton: sns.length,
              quantite_totale_piece: sns.length,
            },
          });
  
          const CHUNK = 1000;
          for (let i = 0; i < sns.length; i += CHUNK) {
            await tx.serial_numbers.createMany({
              data: sns.slice(i, i + CHUNK).map(sn => ({
                serial_number: sn,
                stock_id: stock.id,
                lot_id: lot.id,
                carton_id: carton.id,
                item_id: parseInt(item_id),
                service_id: parseInt(service_id),
                model_id: parseInt(model_id),
                created_at: new Date(),
              })),
            });
          }
        }
      }

    })

    console.log('Stock SN created successfully')
    return res.status(200).json({
      message: "Stock SN created successfully",
      inserted: serialSet.size,
      data: creationStock,
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

const getQuantitePiece = async (req, res) => {
  const { item_id, model_id, service_id } = req.params
  try {
    const quantite = await prisma.stock_piece.findFirst({
      where: {
        piece_id: parseInt(item_id),
        model_id: parseInt(model_id),
        service_id: parseInt(service_id),
      },
    })
    if (!quantite) {
      console.log("Stock pas encore initialisé")
      return res.status(404).json({ message: "Stock pas encore initialisé" })
    }

    return res.status(200).json(quantite.quantite)
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error })
    console.log(error)
  }
}

const getAllOneQuantitePiece = async (req, res) => {
  const { id } = req.params;
  try {
    const stock = await prisma.stock_piece.findMany({
      where: {
        piece_id: parseInt(id),
      },
      orderBy: {
        id: 'desc',
      },
    })

    if (!stock) {
      return res.status(404).json({ message: "Aucune quantité trouvée !" })
    }

    return res.status(200).json(stock)
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
    const stock = await prisma.stocks.findMany({
      where: {
        piece_id: parseInt(id),
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

const getAllUserTypeStocks = async (req, res) => {
  const {
    itemId,
    modelId,
    serviceId,
  } = req.params

  try {
    const users = await prisma.users.findMany({
      where: {
        stocks_stocks_created_byTousers: {
          some: {
            piece_id: +itemId,
            model_id: +modelId,
            service_id: +serviceId,
          }
        }
      }
    });

    console.log('Succès récupération des users')
    return res.status(200).json(users);
  } catch (error) {
    console.log("Error : ", error)
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs par type de stock", error });
  }
}

module.exports = {
  setStockPiece,
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
  getQuantitePiece,
  getAllTypeMouvementStock,
  setStockCarton,
  setStockPieceCarton,
  setStockLot,
  setStockCartonLot,
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
  getAllOneQuantitePiece,
  setStockSn,
  getAllUserTypeStocks,
}
