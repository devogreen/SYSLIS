const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


// Stats livreurs
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

        console.log("TEST DE CONSOLE")

        const statsTypesLivraisons = {};

        livraisons.forEach(l => {
            console.log("TEST DE FONCTION")
            // ✅ on filtre uniquement les livraisons livrées
            if (l.statut_livraison === "livre") {
                const type = l.type_livraison_commerciale?.nom_type_livraison || "Inconnu";
                statsTypesLivraisons[type] = (statsTypesLivraisons[type] || 0) + 1;
            }
        });
        console.log('Types livraisons:', statsTypesLivraisons);

        const statsLivraisons = {
            total: livraisons.length,
            attente: livraisons.filter(l => ['en_cours', 'en_attente'].includes(l.statut_livraison)).length,
            livrees: livraisons.filter(l => l.statut_livraison === 'livre').length,
            retours: livraisons.filter(l => l.validations?.some(v => v.etat_validation === 'retourne')).length || 0
        };

        // Demandes stats - safe query
        let statsDemandes = [];
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
            } catch (err) {
                console.error('Demandes groupBy error:', err);
            }
        }

        // Stocks summary - safe query
        let statsStocks = { _sum: { quantite_piece: 0, quantite_carton: 0, quantite_lot: 0 } };
        try {
            statsStocks = await prisma.stocks.aggregate({
                where: { is_deleted: false },
                _sum: { quantite_piece: true, quantite_carton: true, quantite_lot: true }
            });
        } catch (err) {
            console.error('Stocks aggregate error:', err);
        }

        // QR Codes stats - fix filter (no forms.created_at in schema)
        let statsQr = [];
        if (startDate && endDate) {
            try {
                statsQr = await prisma.demande_qr.findMany({
                    where: {
                        // Use direct date filter or skip if no date field
                        // created_at: { gte: ..., lte: ... } // if exists
                    },
                    select: { statut: true }
                });
            } catch (err) {
                console.error('QR stats error:', err);
            }
        } else {
            statsQr = await prisma.demande_qr.findMany({
                select: { statut: true }
            }).catch(() => []);
        }

        const statsDemandesMap = statsDemandes.reduce((acc, curr) => ({ 
            ...acc, 
            [curr.statut_demande]: curr._count._all 
        }), {});

        const statsQrMap = statsQr.reduce((acc, curr) => ({ 
            ...acc, 
            [curr.statut]: (acc[curr.statut] || 0) + 1 
        }), {});

        const stats = {
            typesLivraisons: statsTypesLivraisons,
            livraisons: statsLivraisons,
            demandes: statsDemandesMap,
            stocks: statsStocks._sum,
            qr_codes: statsQrMap
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

module.exports = {
    nbdeliverycharger,
    nbexitcharger,
    nbreturncharger,
    nblivraisonpartype,
    nbdeliverychargeurperperdiod,
    statsreceveurs,
    nbetpepartypeparperiod,
    getGeneralStats,
    getLivraisonsParTypeLivre
}
