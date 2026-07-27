const prisma = require('../../prisma/client');

const enterStock = async (req,res)=>{


    const {type_transaction, qte, chargeur_id, user_id} = req.body

    try {

        if (!type_transaction || !["entree", "sortie", "retour"].includes(type_transaction)) {
            return res.status(404).json({ message: "Type de transaction introuvable." });
        }

        const user = await prisma.users.findUnique({
            where: { id_user: parseInt(user_id) },
            include: { agents: true },
        });

        if (!user || !user.agents) {
            return res.status(404).json({ message: "Utilisateur ou agent non trouvé." });
        }

        const newTransaction = await prisma.transactions.create({
            data: {
                quantite: qte,
                chargeur_id,
                user_id,
                date_transaction: new Date(),
                type_transaction : "entree"
            }
        }).then(async (transaction) => {
            if(!transaction) {
                throw new Error("Erreur lors de la création de la transaction.");
            }else if(transaction) {
                await prisma.chargeurs.update({
                    where: { id_chargeur: chargeur_id },
                    data: {
                        stock: { increment: qte },
                        qte : { increment: qte },
                    },
                });
                return transaction;
            }
        }).catch((error) => {
            console.error("Erreur lors de la mise à jour du stock :", error);
            throw new Error("Erreur lors de la mise à jour du stock.");
        });

        return res.status(201).json(newTransaction);

    } catch (error) {
        console.error("Erreur lors de l'entrée en stock :", error);
        return res.status(500).json({ message: "Erreur interne du serveur." });
    }
}

const retourStock = async (req,res)=>{

    const {type_transaction, qte, chargeur_id, user_id} = req.body

    try {

        if (!type_transaction || !["entree", "sortie", "retour"].includes(type_transaction)) {
            return res.status(404).json({ message: "Type de transaction introuvable." });
        }

        const user = await prisma.users.findUnique({
            where: { id_user: parseInt(user_id) },
            include: { agents: true },
        });

        if (!user || !user.agents) {
            return res.status(404).json({ message: "Utilisateur ou agent non trouvé." });
        }

        const newTransaction = await prisma.transactions.create({
            data: {
                quantite: qte,
                chargeur_id,
                user_id,
                date_transaction: new Date(),
                type_transaction : "retour"
            }
        }).then(async (transaction) => {
            if(!transaction) {
                throw new Error("Erreur lors de la création de la transaction.");
            }else if(transaction) {
                await prisma.chargeurs.update({
                    where: { id_chargeur: chargeur_id },
                    data: {
                        stock: { decrement: qte }
                    },
                });
                return transaction;
            }
        }).catch((error) => {
            console.error("Erreur lors de la mise à jour du stock :", error);
            throw new Error("Erreur lors de la mise à jour du stock.");
        });

        return res.status(201).json(newTransaction);

    } catch (error) {
        console.error("Erreur lors de l'entrée en stock :", error);
        return res.status(500).json({ message: "Erreur interne du serveur." });
    }
}

module.exports = {
    enterStock,
    retourStock
}