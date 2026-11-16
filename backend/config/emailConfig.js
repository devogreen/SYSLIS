const nodemailer = require("nodemailer");

// ✅ Configuration du service d'email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * ✅ Fonction d'envoi d'email avec support des copies (CC) et des pièces jointes
 * @param {string} destinataire - Email principal
 * @param {string} sujet - Objet de l'email
 * @param {string} message - Contenu HTML du mail
 * @param {Array} attachments - Liste des pièces jointes [{filename, path}]
 * @param {Array} ccEmails - Liste des emails en copie (CC)
 */
const envoyerEmail = async (destinataire, sujet, message, attachments = [], ccEmails = []) => {
    // Pas d'adresses e-mail dans les journaux (données personnelles)

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: destinataire,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        subject: sujet,
        html: message, // ✅ Format HTML pour un rendu soigné
        attachments: attachments.length > 0 ? attachments : undefined, // ✅ Ajout des pièces jointes
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email envoyé (${1 + ccEmails.length} destinataire(s))`);
    } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error?.message || error);
    }
};

module.exports = { envoyerEmail };
