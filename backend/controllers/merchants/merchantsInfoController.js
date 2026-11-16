// import { createPool } from 'mysql2';
const {createPool} = require("mysql2");

// Base PowerBI (marchands / TPE) : les accès sont lus dans le .env, jamais écrits dans le code
// (POWERBI_DB_HOST, POWERBI_DB_PORT, POWERBI_DB_USER, POWERBI_DB_PASSWORD, POWERBI_DB_NAME).
// Utiliser un compte MySQL en LECTURE SEULE limité aux tables POINT_MARCHAND, TPE et CHAINES.
const pool = createPool({
    host: process.env.POWERBI_DB_HOST,
    port: Number(process.env.POWERBI_DB_PORT) || 3306,
    user: process.env.POWERBI_DB_USER,
    password: process.env.POWERBI_DB_PASSWORD,
    database: process.env.POWERBI_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

const findMerchant =  async (req,res)=>{
    // const {sn} = req.body
    try {
        // const query = 'SELECT DISTINCT POINT_MARCHAND.POINT_MARCHAND, TPE.SERIAL_NUMBER,TPE.TPE,POINT_MARCHAND.BANQUE,POINT_MARCHAND.NUM_ORANGE,POINT_MARCHAND.NUM_MTN, POINT_MARCHAND.NUM_MOOV  '+
        // 'FROM TPE INNER JOIN POINT_MARCHAND ON TPE.ID_POINT_MARCHAND = POINT_MARCHAND.ID_POINT_MARCHAND WHERE TPE.SERIAL_NUMBER NOT LIKE \'100%\';'

        // const query = 'SELECT * FROM CHAINES INNER JOIN POINT_MARCHAND ON CHAINES.CHAINE = POINT_MARCHAND.GROUPE JOIN TPE ON POINT_MARCHAND.ID_POINT_MARCHAND = TPE.ID_POINT_MARCHAND WHERE TPE.SERIAL_NUMBER NOT LIKE "100%" AND TPE.SERIAL_NUMBER NOT LIKE "101%" AND POINT_MARCHAND.GROUPE != "SOFTPOS"'
        const query = 'SELECT POINT_MARCHAND.POINT_MARCHAND,TPE.SERIAL_NUMBER, POINT_MARCHAND.GROUPE, POINT_MARCHAND.BANQUE, TPE.TPE, POINT_MARCHAND.NUM_ORANGE,POINT_MARCHAND.NUM_MTN, POINT_MARCHAND.NUM_MOOV, POINT_MARCHAND.RNE, TPE.ETAT_ACTUEL, TPE.Id_Terminal_CB, TPE.Id_Terminal_GIM FROM CHAINES INNER JOIN POINT_MARCHAND ON CHAINES.CHAINE = POINT_MARCHAND.GROUPE JOIN TPE ON POINT_MARCHAND.ID_POINT_MARCHAND = TPE.ID_POINT_MARCHAND WHERE TPE.SERIAL_NUMBER NOT LIKE "100%" AND TPE.SERIAL_NUMBER NOT LIKE "101%" AND POINT_MARCHAND.GROUPE != "SOFTPOS"'
        pool.query(query, (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                return res.status(500).json({ message: 'Erreur interne du serveur.' });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: 'Aucun marchand trouvé.' });
            }
            return res.status(200).json(results);
        });
    } catch (error) {
        console.error('Erreur lors de la recherche du marchand:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
}

module.exports = {findMerchant}