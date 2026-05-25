const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();



// 
const nbdeliverycharger = async (req, res) => {

    const { id } = req.params
    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id)
        }
    })
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" })


    await prisma.transactions.count({
        where: {
            user_id: parseInt(id)
        }
    }).then((results) => {
        if (results) {
            return res.status(200).json({ nbdeliverycharger: results })
        } else {
            return res.status(404).json({ message: "Aucune donnée" })
        }
    }).catch(err => {
        console.log(err)
    })
}

// 
const nbdeliverychargeurperperdiod = async (req, res) => {
    const { datedebut, datefin } = req.body
    const { id } = req.params

    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id)
        }
    })
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" })


    await prisma.transactions.count({
        where: {
            AND: [
                { user_id: parseInt(id) },
                { date_transaction: { gte: new Date(datedebut) } },
                { date_transaction: { lte: new Date(datefin) } }
            ]
        }
    }).then((results) => {
        if (results) {
            return res.status(200).json({ nbdeliverychargeurperperdiod: results });
        } else {
            return res.status(404).json({ message: "Aucune donnée" });
        }
    }).catch(err => {
        console.log(err);
        return res.status(500).json({ message: "Erreur serveur" });
    });
}

// 
const nbexitcharger = async (req, res) => {
    const { id } = req.params
    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id),
        },
    })
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" })
    console.log(id)
    await prisma.transactions.count({
        where: {
            AND: {
                user_id: parseInt(id),
                type_transaction: 'sortie'
            }
        }
    }).then((results) => {
        if (results) {
            return res.status(200).json({ nbexitcharger: results })
        } else {
            return res.status(404).json({ message: "Aucune donnée" })
        }
    }).catch(err => {
        console.log(err)
    })
}

// 
const nbreturncharger = async (req, res) => {
    // const {user_id} = req.body
    const { id } = req.params
    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id)
        }
    })
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" })

    console.log(id)
    await prisma.transactions.count({
        where: {
            AND: {
                user_id: parseInt(id),
                type_transaction: 'retour'
            }
        }
    }).then((results) => {
        if (results) {
            return res.status(200).json({ nbreturncharger: results })
        } else {
            return res.status(404).json({ message: "Aucune donnée" })
        }
    }).catch(err => {
        console.log(err)
    })
}


// 
const nblivraisonpartype = async (req, res) => {
    // const {user_id} = req.body
    const { id } = req.params
    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id)
        }
    })
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" })

    const [
        nblivraisontpegim,
        nblivraisontpemobile,
        livraisontperepare,
        livraisontpemaj,

    ] = await Promise.all([
        prisma.livraison.count({
            where: {
                type_livraison_id: 1,
                user_id: parseInt(id),
                statut_livraison: "livre"
            }
        }),
        prisma.livraison.count({
            where: {
                type_livraison_id: 4,
                user_id: parseInt(id),
                statut_livraison: "livre"
            }
        }),
        prisma.livraison.count({
            where: {
                type_livraison_id: 2,
                user_id: parseInt(id),
                statut_livraison: "livre"
            }
        }),
        prisma.livraison.count({
            where: {
                type_livraison_id: 3,
                user_id: parseInt(id),
                statut_livraison: "livre"
            }
        })
    ]).catch(err => {
        console.log(err)
    })

    const results = {
        nblivraisontpegim,
        nblivraisontpemobile,
        livraisontperepare,
        livraisontpemaj
    }
    if (results) {
        return res.status(200).json({ nblivraisonpartype: results });
    } else {
        return res.status(404).json({ message: "Aucune donnée" });
    }
}

// Stats receveurs

const statsreceveurs = async (req, res) => {
    // const {user_id} = req.body
    const { id } = req.params
    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id)
        },
        include: {
            roles: {
                where: {
                    id_role: 2
                }
            }
        }
    })
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" })
    console.log(user)
    if (user.role_id !== 2) return res.status(404).json({ message: "Utilisateur non recepteur" })


    const [
        nbtpegimreçus,
        nbtpemobilereçus,
        nbtpereparesreçus,
        nbtpemajreçus,
        nbchargeursreçus,
    ] = await Promise.all([
        prisma.validations.findMany({
            where: {
                user_id: parseInt(id),
                etat_validation: "valide",
                livraison: {
                    type_livraison_id: 1
                }
            },
            select: {
                livraison: {
                    select: {
                        qte_totale_livraison: true
                    }
                }
            }
        }).then((results) => {
            let total = 0;
            results.forEach((result) => {
                total += result.livraison.qte_totale_livraison;
            });
            return total;
        }).catch(err => {
            console.log(err);
        }),
        prisma.validations.findMany({
            where: {
                user_id: parseInt(id),
                etat_validation: "valide",
                livraison: {
                    type_livraison_id: 4
                }
            },
            select: {
                livraison: {
                    select: {
                        qte_totale_livraison: true
                    }
                }
            }
        }).then((results) => {
            let total = 0;
            results.forEach((result) => {
                total += result.livraison.qte_totale_livraison;
            });
            return total;
        }).catch(err => {
            console.log(err);
        }),
        prisma.validations.findMany({
            where: {
                user_id: parseInt(id),
                etat_validation: "valide",
                livraison: {
                    type_livraison_id: 2
                }
            },
            select: {
                livraison: {
                    select: {
                        qte_totale_livraison: true
                    }
                }
            }
        }).then((results) => {
            let total = 0;
            results.forEach((result) => {
                total += result.livraison.qte_totale_livraison;
            });
            return total;
        }).catch(err => {
            console.log(err);
        }),
        prisma.validations.findMany({
            where: {
                user_id: parseInt(id),
                etat_validation: "valide",
                livraison: {
                    type_livraison_id: 3
                }
            },
            select: {
                livraison: {
                    select: {
                        qte_totale_livraison: true
                    }
                }
            }
        }).then((results) => {
            let total = 0;
            results.forEach((result) => {
                total += result.livraison.qte_totale_livraison;
            });
            return total;
        }).catch(err => {
            console.log(err);
        }),
        prisma.validations.count({
            where: {
                user_id: parseInt(id),
                etat_validation: "valide",
                livraison: {
                    type_livraison_id: 5
                }
            }
        }).then((results) => {
            return results;
        }).catch(err => {
            console.log(err);
        }),
    ]).catch(err => {
        console.log(err);
    });

    const results = {
        nbtpegimreçus,
        nbtpemobilereçus,
        nbtpereparesreçus,
        nbtpemajreçus,
        nbchargeursreçus
    }
    if (results) {
        return res.status(200).json({ statsreceveurs: results });
    } else {
        return res.status(404).json({ message: "Aucune donnée" });
    }
}
// Filtrer id_pièce = 2 'terminal'

// Nombre TPE livrés par TYPE par période

const nbetpepartypeparperiod = async (req, res) => {
    const { id } = req.params;
    const { debut, fin } = req.body;

    // Validate dates
    if (!debut || !fin) {
        return res.status(400).json({ message: "Veuillez fournir les dates de début et de fin." });
    }

    const startDate = new Date(debut);
    const endDate = new Date(fin);

    const user = await prisma.users.findFirst({
        where: {
            id_user: parseInt(id)
        },
        include: {
            roles: {
                where: {
                    id_role: 1
                }
            }
        }
    });

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    if (user.role_id !== 1) return res.status(403).json({ message: "Utilisateur non livreur" });

    try {
        const [
            nbtpegimreçus,
            nbtpemobilereçus,
            nbtpereparesreçus,
            nbtpemajreçus,
            nbchargeursreçus,
        ] = await Promise.all([
            // Type 1 - TPE GIM
            prisma.livraison.count({
                where: {
                    type_livraison_id: 1,
                    user_id: parseInt(id),
                    statut_livraison: "livre",
                    date_validation: {
                        gte: startDate,
                        lte: endDate
                    },
                }
            }),

            // Type 4 - TPE Mobile
            prisma.validations.findMany({
                where: {
                    user_id: parseInt(id),
                    etat_validation: "valide",
                    date_validation: {
                        gte: startDate,
                        lte: endDate
                    },
                    livraison: {
                        type_livraison_id: 4
                    }
                },
                select: {
                    livraison: {
                        select: {
                            qte_totale_livraison: true
                        }
                    }
                }
            }).then((results) => {
                let total = 0;
                results.forEach((result) => {
                    total += result.livraison.qte_totale_livraison;
                });
                return total;
            }).catch(err => {
                console.log(err);
            }),

            // Type 2 - TPE Réparés
            prisma.validations.findMany({
                where: {
                    user_id: parseInt(id),
                    etat_validation: "valide",
                    date_validation: {
                        gte: startDate,
                        lte: endDate
                    },
                    livraison: {
                        type_livraison_id: 2
                    }
                },
                select: {
                    livraison: {
                        select: {
                            qte_totale_livraison: true
                        }
                    }
                }
            }).then((results) => {
                let total = 0;
                results.forEach((result) => {
                    total += result.livraison.qte_totale_livraison;
                });
                return total;
            }).catch(err => {
                console.log(err);
            }),

            // Type 3 - TPE MAJ
            prisma.validations.findMany({
                where: {
                    user_id: parseInt(id),
                    etat_validation: "valide",
                    date_validation: {
                        gte: startDate,
                        lte: endDate
                    },
                    livraison: {
                        type_livraison_id: 3
                    }
                },
                select: {
                    livraison: {
                        select: {
                            qte_totale_livraison: true
                        }
                    }
                }
            }).then((results) => {
                let total = 0;
                results.forEach((result) => {
                    total += result.livraison.qte_totale_livraison;
                });
                return total;
            }).catch(err => {
                console.log(err);
            }),

            // Type 5 - Chargeurs (count only)
            prisma.validations.count({
                where: {
                    user_id: parseInt(id),
                    etat_validation: "valide",
                    date_validation: {
                        gte: startDate,
                        lte: endDate
                    },
                    livraison: {
                        type_livraison_id: 5
                    }
                }
            })
        ]);

        const results = {
            nbtpegimreçus,
            nbtpemobilereçus,
            nbtpereparesreçus,
            nbtpemajreçus,
            nbchargeursreçus
        };

        return res.status(200).json({ statsreceveurs: results });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
    }
};


const getTpeDeliveredByLigne = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {
      statut_livraison: 'livre',
      deleted: false
    };
    
    if (startDate && endDate) {
      whereClause.date_livraison = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const results = await prisma.livraison.groupBy({
      by: ['service_id'],
      where: whereClause,
      _sum: {
        qte_totale_livraison: true
      }
    });

    // Get service names
    const services = await prisma.services.findMany({
      where: {
        id: {
          in: results.map(r => r.service_id).filter(Boolean)
        }
      },
      select: {
        id: true,
        nom_service: true
      }
    });

    const serviceMap = {};
    services.forEach(s => {
      serviceMap[s.id] = s.nom_service;
    });

    const stats = results.map(r => ({
      service_id: r.service_id,
      nom_ligne: serviceMap[r.service_id] || 'Non assigné',
      tpe_livres: r._sum.qte_totale_livraison || 0
    })).sort((a, b) => b.tpe_livres - a.tpe_livres);

    res.json({
      success: true,
      total_tpe: stats.reduce((sum, s) => sum + s.tpe_livres, 0),
      par_ligne: stats
    });
  } catch (error) {
    console.error('Erreur getTpeDeliveredByLigne:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      par_ligne: []
    });
  }
};

// const nbetpepartypeparperiod = async (req, res) => {
//     const { datedebut, datefin } = req.body;
//     const { id } = req.params;

//     try {
//         const user = await prisma.users.findFirst({
//             where: { id_user: parseInt(id) },
//             include: {
//                 roles: {
//                     where: { id_role: 1 }
//                 }
//             }
//         });

//         if (!user) {
//             return res.status(404).json({ message: "Utilisateur non trouvé" });
//         }

//         if (user.role_id !== 1) {
//             return res.status(403).json({ message: "Utilisateur non recepteur" });
//         }

//         const startDate = new Date(datedebut);
//         const endDate = new Date(datefin);

//         const getTotalLivraisonByType = async (typeId) => {
//             const records = await prisma.validations.findMany({
//                 where: {
//                     date_validation: {
//                         gte: startDate,
//                         lte: endDate
//                     },
//                     user_id: parseInt(id),
//                     etat_validation: "valide",
//                     livraison: {
//                         type_livraison_id: typeId
//                     }
//                 },
//                 select: {
//                     livraison: {
//                         select: {
//                             qte_totale_livraison: true
//                         }
//                     }
//                 }
//             });

//             return records.reduce((total, record) => total + record.livraison.qte_totale_livraison, 0);
//         };

//         const [
//             nbtpegimreçus,
//             nbtpemobilereçus,
//             nbtpereparesreçus,
//             nbtpemajreçus
//         ] = await Promise.all([
//             getTotalLivraisonByType(1),
//             getTotalLivraisonByType(4),
//             getTotalLivraisonByType(2),
//             getTotalLivraisonByType(3)
//         ]);

//         const nbchargeursreçus = await prisma.validations.count({
//             where: {
//                 date_validation: {
//                     gte: startDate,
//                     lte: endDate
//                 },
//                 user_id: parseInt(id),
//                 etat_validation: "valide",
//                 livraison: {
//                     type_livraison_id: 5
//                 }
//             }
//         });

//         const results = {
//             nbtpegimreçus,
//             nbtpemobilereçus,
//             nbtpereparesreçus,
//             nbtpemajreçus,
//             nbchargeursreçus
//         };

//         return res.status(200).json({ tpepartypeparperiod: results });
//     } catch (error) {
//         console.error("Erreur serveur :", error);
//         return res.status(500).json({ message: "Erreur interne du serveur" });
//     }
// };


// const nbetpepartypeparperiod = async(req,res)=>{
//     const {datedebut, datefin} = req.body
//     const {id} = req.params

//     const user = await prisma.users.findFirst({
//         where : {
//             id_user : parseInt(id)
//         },
//         include : {
//             roles : {
//                 where : {
//                     id_role : 1
//                 }
//             }
//         }
//     })
//     if(!user) return res.status(404).json({message :"Utilisateur non trouvé"})
//         console.log(user)
//     if(user.role_id !== 1) return res.status(404).json({message :"Utilisateur non recepteur"})

//     const [
//         nbtpegimreçus,
//         nbtpemobilereçus,
//         nbtpereparesreçus,
//         nbtpemajreçus,
//         nbchargeursreçus,
//     ] = await Promise.all([
//         prisma.validations.findMany({
//             where: {
//                 date_transaction: { gte: new Date(datedebut) },
//                 date_transaction: { lte: new Date(datefin) },
//                 user_id: parseInt(id),
//                 etat_validation: "valide",
//                 livraison: {
//                   type_livraison_id: 1
//                 }
//               },
//               select: {
//                 livraison: {
//                   select: {
//                     qte_totale_livraison: true
//                   }
//                 }
//               }
//         }).then((results) => {
//             let total = 0;
//             results.forEach((result) => {
//                 total += result.livraison.qte_totale_livraison;
//             });
//             return total;
//         }).catch(err => {
//             console.log(err);
//         }),
//         prisma.validations.findMany({
//             where: {
//                 user_id: parseInt(id),
//                 etat_validation: "valide",
//                 livraison: {
//                   type_livraison_id: 4
//                 }
//               },
//               select: {
//                 livraison: {
//                   select: {
//                     qte_totale_livraison: true
//                   }
//                 }
//               }
//         }).then((results) => {
//             let total = 0;
//             results.forEach((result) => {
//                 total += result.livraison.qte_totale_livraison;
//             });
//             return total;
//         }).catch(err => {
//             console.log(err);
//         }),
//         prisma.validations.findMany({
//             where: {
//                 user_id: parseInt(id),
//                 etat_validation: "valide",
//                 livraison: {
//                   type_livraison_id: 2
//                 }
//               },
//               select: {
//                 livraison: {
//                   select: {
//                     qte_totale_livraison: true
//                   }
//                 }
//               }
//         }).then((results) => {
//             let total = 0;
//             results.forEach((result) => {
//                 total += result.livraison.qte_totale_livraison;
//             });
//             return total;
//         }).catch(err => {
//             console.log(err);
//         }),
//         prisma.validations.findMany({
//             where: {
//                 user_id: parseInt(id),
//                 etat_validation: "valide",
//                 livraison: {
//                   type_livraison_id: 3
//                 }
//               },
//               select: {
//                 livraison: {
//                   select: {
//                     qte_totale_livraison: true
//                   }
//                 }
//               }
//         }).then((results) => {
//             let total = 0;
//             results.forEach((result) => {
//                 total += result.livraison.qte_totale_livraison;
//             });
//             return total;
//         }).catch(err => {
//             console.log(err);
//         }),
//         prisma.validations.count({
//             where: {
//                 user_id: parseInt(id),
//                 etat_validation: "valide",
//                 livraison: {
//                   type_livraison_id: 5
//                 }
//               }
//         }).then((results) => {
//             return results;
//         }).catch(err => {
//             console.log(err);
//         }),
//     ]).catch(err => {
//         console.log(err);
//     });

//     const results = {
//         nbtpegimreçus,
//         nbtpemobilereçus,
//         nbtpereparesreçus,
//         nbtpemajreçus,
//         nbchargeursreçus
//     }
//     if (results) {
//         return res.status(200).json({ statsreceveurs: results });
//     } else {
//         return res.status(404).json({ message: "Aucune donnée" });
//     }
// }


const getGeneralStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Validate dates - prevent future dates > today
        let whereDate = { deleted: false };
        if (startDate && endDate) {
            const today = new Date();
            today.setHours(23,59,59,999);
            
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            
            if (end > today) {
                end.setTime(today.getTime());
            }
            if (start > end) {
                start.setTime(end.getTime());
            }
            
            whereDate.date_livraison = {
                gte: start,
                lte: end
            };
        }

        // Livraisons stats with correct schema fields
        const livraisons = await prisma.livraison.findMany({
            where: whereDate,
            include: {
                type_livraison_commerciale: true,
                validations: {
                    select: { 
                        etat_validation: true 
                    }
                }
            }
        }).catch(err => {
            console.error('Livraisons query error:', err);
            return [];
        });

        // console.log("TEST DE CONSOLE")

        const statsTypesLivraisons = {};

        livraisons.forEach(l => {
            // ✅ on filtre uniquement les livraisons livrées
            if (l.statut_livraison === "livre") {
                const type = l.type_livraison_commerciale?.nom_type_livraison || "Inconnu";
                // Retour compatible UI: valeur = quantité livrée (qte_totale_livraison)
                statsTypesLivraisons[type] = (statsTypesLivraisons[type] || 0) + (l.qte_totale_livraison || 0);
            }
        });

        // console.log('Types livraisons:', statsTypesLivraisons);


        const statsLivraisons = {
            total: livraisons.length,
            attente: livraisons.filter(l => ['en_cours', 'en_attente'].includes(l.statut_livraison)).length,
            livrees: livraisons.filter(l => l.statut_livraison === 'livre').reduce((total, l) => total + (l.qte_totale_livraison || 0), 0),
            retours: livraisons.filter(l => l.validations?.some(v => v.etat_validation === 'retourne')).length || 0
        };


// Demandes stats - safe query
        let statsDemandes = [];
        let demandesValideesNonRecues = 0;
        if (startDate && endDate) {
            try {
                statsDemandes = await prisma.demandes.groupBy({
                    by: ['statut_demande'],
                    where: {
                        date_demande: {
                            gte: new Date(startDate + 'T00:00:00'),
                            lte: new Date(endDate + 'T23:59:59')
                        }
                    },
                    _count: { _all: true }
                });

                // NEW: Demandes validées non reçues
                demandesValideesNonRecues = await prisma.demandes.count({
                    where: {
                        date_demande: {
                            gte: new Date(startDate + 'T00:00:00'),
                            lte: new Date(endDate + 'T23:59:59')
                        },
                        statut_demande: 'valide',
                        demande_recue: false,
                        is_deleted: false
                    }
                }).catch(err => {
                    console.error('Demandes validees non recues count error:', err);
                    return 0;
                });
            } catch (err) {
                console.error('Demandes groupBy error:', err);
            }
        } else {
            demandesValideesNonRecues = await prisma.demandes.count({
                where: {
                    statut_demande: 'valide',
                    demande_recue: false,
                    is_deleted: false
                }
            }).catch(err => {
                console.error('Demandes validees non recues count error:', err);
                return 0;
            });
        }


        try {
            statsStocks = await prisma.stocks.aggregate({
                where: { is_deleted: false },
                _sum: { quantite_piece: true, quantite_carton: true, quantite_lot: true }
            });
        } catch (err) {
            console.error('Stocks aggregate error:', err);
        }

        // QR Codes stats
        // Objectif: affichage cumulatif “depuis début de période” quand startDate/endDate sont fournis,
        // sinon “depuis toujours”.
        // - soumise: somme demande_qr.quantite_qr (filtrée par forms.created_at si période)
        // - generee: somme generation_qr.quantite_qr (filtrée par generation_qr.forms.last_modified_at si période)
        // - imprimee: somme impression_qr.quantite_qr (filtrée par impression_qr.forms.last_modified_at si période)
        // - livree: somme livraison_qr.quantite_qr (filtrée par livraison_qr.forms.last_modified_at si période)
        // - recue: somme reception_qr.quantite_qr (filtrée par reception_qr.forms.last_modified_at si période)

        const safeNum = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

        let statsQrMap = { soumise: 0, generee: 0, imprimee: 0, livree: 0, recue: 0 };
        let statsQrQuantitiesMap = { soumise: 0, generee: 0, imprimee: 0, livree: 0, recue: 0 };

        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;

        // filtre dates optionnel
        const formsDateFilterCreated = start && end
            ? { created_at: { gte: start, lte: end }, is_deleted: false }
            : { is_deleted: false };

        const formsDateFilterModified = start && end
            ? { last_modified_at: { gte: start, lte: end }, is_deleted: false }
            : { is_deleted: false };

        try {
            const [soumiseAgg, genereeAgg, imprimeeAgg, livreeAgg, recueAgg] = await Promise.all([
                prisma.demande_qr.aggregate({
                    where: { forms: formsDateFilterCreated },
                    _sum: { quantite_qr: true }
                }),
                prisma.generation_qr.aggregate({
                    where: { forms: formsDateFilterModified },
                    _sum: { quantite_qr: true }
                }),
                prisma.impression_qr.aggregate({
                    where: { forms: formsDateFilterModified },
                    _sum: { quantite_qr: true }
                }),
                prisma.livraison_qr.aggregate({
                    where: { forms: formsDateFilterModified },
                    _sum: { quantite_qr: true }
                }),
                prisma.reception_qr.aggregate({
                    where: { forms: formsDateFilterModified },
                    _sum: { quantite_qr: true }
                }),
            ]);

            statsQrQuantitiesMap = {
                soumise: safeNum(soumiseAgg?._sum?.quantite_qr),
                generee: safeNum(genereeAgg?._sum?.quantite_qr),
                imprimee: safeNum(imprimeeAgg?._sum?.quantite_qr),
                livree: safeNum(livreeAgg?._sum?.quantite_qr),
                recue: safeNum(recueAgg?._sum?.quantite_qr),
                total: 0
            };

            // statsQrMap alimenté en cumul par étape (pour que les tuiles “Total des demandes” ne bougent plus quand statut change)
            // On réutilise les agrégats précédents (filtrés par période si startDate/endDate fournis).
            // CUMUL PAR “DEMANDES” (nombre de lignes / demandes par étape), basé sur l’historique des tables d’étape
            // On remplace donc le précédent calcul “quantité” utilisé par erreur.
            const [soumiseCount, genereeCount, imprimeeCount, livreeCount, recueCount] = await Promise.all([
                prisma.demande_qr.count({ where: { forms: formsDateFilterCreated } }),
                prisma.generation_qr.count({ where: { forms: formsDateFilterModified } }),
                prisma.impression_qr.count({ where: { forms: formsDateFilterModified } }),
                prisma.livraison_qr.count({ where: { forms: formsDateFilterModified } }),
                prisma.reception_qr.count({ where: { forms: formsDateFilterModified } }),
            ]);

            statsQrMap = {
                soumise: soumiseCount,
                generee: genereeCount,
                imprimee: imprimeeCount,
                livree: livreeCount,
                recue: recueCount,
            };
        } catch (err) {
            console.error('QR stats aggregate error:', err);
        }



        const statsDemandesMap = statsDemandes.reduce((acc, curr) => ({ 
            ...acc, 
            [curr.statut_demande]: curr._count._all 
        }), {});

        // Remplacements livrés stats (TPE remplacés dont statut = 'livre')
        let remplacementsLivres = 0;
        if (startDate && endDate) {
            remplacementsLivres = await prisma.remplacements.count({
                where: {
                    statut: 'livre',
                    deleted: false,
                    date_remplacement: {
                        gte: new Date(startDate + 'T00:00:00'),
                        lte: new Date(endDate + 'T23:59:59')
                    }
                }
            }).catch(err => {
                console.error('Remplacements count error:', err);
                return 0;
            });
        } else {
            remplacementsLivres = await prisma.remplacements.count({
                where: {
                    statut: 'livre',
                    deleted: false
                }
            }).catch(err => {
                console.error('Remplacements count error:', err);
                return 0;
            });
        }

        const stats = {
            typesLivraisons: statsTypesLivraisons,
            livraisons: statsLivraisons,
            demandes: statsDemandesMap,
            demandesValideesNonRecues,
            stocks: statsStocks._sum,
            qr_codes: statsQrMap,
            qr_quantities: statsQrQuantitiesMap,
            remplacementsLivres
        };

        res.json(stats);
    } catch (error) {
        console.error('General Stats error:', error);
        // Return empty stats instead of 500
        res.status(200).json({
            typesLivraisons: {},
            livraisons: { total: 0, attente: 0, livrees: 0, retours: 0 },
            demandes: {},
            stocks: { quantite_piece: 0, quantite_carton: 0, quantite_lot: 0 },
            qr_codes: {}
        });
    }
};

const getLivraisonsParTypeLivre = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {
      deleted: false,
      statut_livraison: "livre"
    };

    if (startDate && endDate) {
      whereClause.date_livraison = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Get all livraison types
    const types = await prisma.type_livraison_commerciale.findMany({
      where: { is_deleted: false },
      select: { id_type_livraison: true, nom_type_livraison: true }
    });

    // Count livraisons per type
    const counts = await Promise.all(
      types.map(async (type) => {
        const count = await prisma.livraison.count({
          where: {
            ...whereClause,
            type_livraison_id: type.id_type_livraison
          }
        });
        return {
          id: type.id_type_livraison,
          nom: type.nom_type_livraison || `Type ${type.id_type_livraison}`,
          count
        };
      })
    );

    res.status(200).json({ livraisonsParType: counts });
  } catch (error) {
    console.error("Erreur getLivraisonsParTypeLivre:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

const getTpeLivresParType = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {
      deleted: false,
      statut_livraison: "livre"
    };
    
    if (startDate && endDate) {
      whereClause.date_livraison = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Group by type and sum quantity
    const groupResults = await prisma.livraison.groupBy({
      by: ['type_livraison_id'],
      where: whereClause,
      _sum: {
        qte_totale_livraison: true
      }
    });

    // Get type names
    const typeIds = groupResults.map(r => r.type_livraison_id).filter(Boolean);
    const types = await prisma.type_livraison_commerciale.findMany({
      where: {
        id_type_livraison: { in: typeIds },
        is_deleted: false
      },
      select: {
        id_type_livraison: true,
        nom_type_livraison: true
      }
    });

    const typeMap = {};
    types.forEach(t => {
      typeMap[t.id_type_livraison] = t.nom_type_livraison || `Type ${t.id_type_livraison}`;
    });

    const tpeParType = groupResults.map(r => ({
      id: r.type_livraison_id,
      nom: typeMap[r.type_livraison_id] || 'Inconnu',
      quantite: r._sum.qte_totale_livraison || 0
    })).filter(item => item.quantite > 0)
     .sort((a, b) => b.quantite - a.quantite);

    const totalTpe = tpeParType.reduce((sum, item) => sum + item.quantite, 0);

    res.json({
      success: true,
      totalTpe,
      tpeParType
    });
  } catch (error) {
    console.error('Erreur getTpeLivresParType:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur',
      tpeParType: []
    });
  }
};

module.exports = {
    nbdeliverycharger,
    nbexitcharger,
    nbreturncharger,
    nblivraisonpartype,
    nbdeliverychargeurperperdiod,
    statsreceveurs,
    nbetpepartypeparperiod,
    getGeneralStats,
    getLivraisonsParTypeLivre,
    getTpeLivresParType,
}

