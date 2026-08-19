const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

// ቴብሎች ከሌሉ አውቶማቲክ የሚፈጥር Function
async function initDB() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL Database successfully connected!');

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
    } catch (error) {
        console.error('❌ Database initialization error:', error);
    }
}

initDB();

module.exports = pool;