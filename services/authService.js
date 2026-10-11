const connection = require('../config/db');

// Helper to execute SQL queries with Promises
const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

class AuthService {
    /**
     * Validate customer credentials
     */
    async validateUserLogin(username, password) {
        const sql = `SELECT * FROM users WHERE username=? AND password=?`;
        const rows = await query(sql, [username, password]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Check if a customer username is already registered
     */
    async checkUserExists(username) {
        const sql = `SELECT * FROM users WHERE username=?`;
        const rows = await query(sql, [username]);
        return rows.length > 0;
    }

    /**
     * Register a new customer record
     */
    async registerUser({ username, password, email, name, gender, photoPath, mobile, address }) {
        const sql = `INSERT INTO users(username, password, email, name, gender, photo, mobile, address) VALUES(?,?,?,?,?,?,?,?)`;
        return await query(sql, [username, password, email, name, gender, photoPath, mobile, address]);
    }

    /**
     * Change customer password after verifying existing password
     */
    async changeUserPassword(username, currentPassword, newPassword) {
        const checkSql = `SELECT * FROM users WHERE username=?`;
        const rows = await query(checkSql, [username]);
        if (rows.length === 0 || rows[0].password !== currentPassword) {
            return false;
        }
        const updateSql = `UPDATE users SET password=? WHERE username=?`;
        await query(updateSql, [newPassword, username]);
        return true;
    }

    /**
     * Validate administrator credentials
     */
    async validateAdminLogin(email, password) {
        const sql = `SELECT * FROM admin WHERE email=? AND password=?`;
        const rows = await query(sql, [email, password]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Change administrator password after verifying existing password
     */
    async changeAdminPassword(email, currentPassword, newPassword) {
        const checkSql = `SELECT * FROM admin WHERE email=?`;
        const rows = await query(checkSql, [email]);
        if (rows.length === 0 || rows[0].password != currentPassword) {
            return false;
        }
        const updateSql = `UPDATE admin SET \`password\`=? WHERE email=?`;
        await query(updateSql, [newPassword, email]);
        return true;
    }
}

module.exports = new AuthService();
