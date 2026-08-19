const mysql = require('mysql2/promise');
require('dotenv').config();

// Aiven MySQL የሰጠህ Port 28723 ስለሆነ በ Default መያዝ አለበት
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 28723;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'defaultdb',
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    ssl: {
        rejectUnauthorized: false // Aiven MySQL 8.4 SSL ግንኙነት እንዲያልፍ ያደርጋል
    }
});

// ቴብሎች ከሌሉ አውቶማቲክ የሚፈጥር Function (ከ Retry Logic ጋር)
async function initDB(retries = 5) {
    while (retries) {
        try {
            const connection = await pool.getConnection();
            console.log('✅ Aiven MySQL Database successfully connected!');

            // 1. Users Table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS users (
                    telegram_id BIGINT PRIMARY KEY,
                    full_name VARCHAR(255),
                    language VARCHAR(10) DEFAULT 'am',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            // 2. Properties Table
            await connection.query(`
                CREATE TABLE IF NOT EXISTS properties (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    category VARCHAR(20) NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    price DECIMAL(15, 2) NOT NULL,
                    price_usd DECIMAL(15, 2) NULL,
                    location VARCHAR(255) NOT NULL,
                    phone_number VARCHAR(50) NOT NULL,
                    owner_username VARCHAR(100) NULL,
                    photo_id VARCHAR(255) NULL,
                    bedrooms INT NULL,
                    bathrooms INT NULL,
                    living_rooms INT NULL,
                    area_sqm DECIMAL(10, 2) NULL,
                    furnished_status VARCHAR(50) NULL,
                    make VARCHAR(100) NULL,
                    model VARCHAR(100) NULL,
                    year_built INT NULL,
                    transmission VARCHAR(50) NULL,
                    fuel_type VARCHAR(50) NULL,
                    mileage INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            console.log('✅ Database tables initialized successfully!');
            connection.release();
            break;
        } catch (error) {
            console.error(`❌ Database connection failed. Retries left: ${retries - 1}`);
            console.error('Error detail:', error.message);
            retries -= 1;
            if (retries === 0) {
                console.error('❌ Could not connect to Aiven MySQL database.');
            } else {
                // ከ 5 ሰከንድ በኋላ ድጋሚ ይሞክራል
                await new Promise(res => setTimeout(res, 5000));
            }
        }
    }
}

initDB();

module.exports = pool;