const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL Connection Pool ማዋቀር
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 16066,
    ssl: {
        rejectUnauthorized: false // ለ Aiven SSL ግንኙነት አስፈላጊ ነው
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// የዳታቤዝ ግንኙነቱን የመሞከሪያ Function
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database successfully connected!');
        connection.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
}

// ቼክ ለማድረግ ፈንክሽኑን መጥራት
testConnection();

module.exports = pool;