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

class CustomerService {
    /**
     * Get user address for checkout
     */
    async getUserAddress(username) {
        const rows = await query(`SELECT address FROM users WHERE username=?`, [username]);
        return rows.length > 0 ? rows[0].address : "";
    }

    /**
     * Check if user has items in cart
     */
    async hasCartItems(username) {
        const rows = await query(`SELECT * FROM cart WHERE username=?`, [username]);
        return rows.length > 0;
    }

    /**
     * Place new order, itemize details, and clear user cart
     */
    async placeOrder({ grandTotal, address, remarks, payment_mode, userName }) {
        const remarksValue = (remarks && typeof remarks === "string" && remarks.trim() !== "") ? remarks.trim() : null;
        const payment_status = payment_mode === "Online" ? "Paid" : "Pending";

        const orderSQL = `INSERT INTO orders(grand_total, payment_mode, address, remarks, order_status, username, payment_status) 
                          VALUES(?, ?, ?, ?, 'Pending', ?, ?)`;
        const orderResult = await query(orderSQL, [grandTotal, payment_mode, address, remarksValue, userName, payment_status]);
        const orderId = orderResult.insertId;

        // Fetch user cart
        const cart = await query(
            `SELECT cart.*, products.price, products.discount FROM cart INNER JOIN products ON cart.product_id=products.id WHERE cart.username=?`,
            [userName]
        );

        // Insert line items
        for (const item of cart) {
            const { product_id, id, quantity, price, discount } = item;
            const targetProductId = product_id || id;
            const discount_amount = (parseInt(price, 10) * parseInt(discount, 10)) / 100;
            const discounted_price = parseInt(price, 10) - discount_amount;

            await query(
                `INSERT INTO order_details(price, discount, discounted_price, quantity, product_id, order_id) VALUES(?,?,?,?,?,?)`,
                [price, discount, discounted_price, quantity, targetProductId, orderId]
            );
        }

        // Empty user cart
        await query(`DELETE FROM cart WHERE username=?`, [userName]);
        return orderId;
    }

    /**
     * Cancel pending order
     */
    async cancelOrder(orderId) {
        return await query(`UPDATE orders SET order_status='Cancelled' WHERE id=?`, [orderId]);
    }

    /**
     * Get customer orders with formatted date
     */
    async getCustomerOrders(username) {
        return await query(
            `SELECT *, DATE_FORMAT(date_time, "%W %M %e %Y %r") as date_time FROM orders WHERE username=?`,
            [username]
        );
    }

    /**
     * Check if order belongs to customer
     */
    async checkCustomerOrderExists(orderId, username) {
        const rows = await query(`SELECT * FROM orders WHERE id=? AND username=?`, [orderId, username]);
        return rows.length > 0;
    }

    /**
     * Get itemized order details for customer view
     */
    async getOrderDetails(orderId) {
        return await query(
            `SELECT order_details.*, products.product_name, products.photo FROM order_details INNER JOIN products ON order_details.product_id=products.id WHERE order_details.order_id=?`,
            [orderId]
        );
    }
}

module.exports = new CustomerService();
