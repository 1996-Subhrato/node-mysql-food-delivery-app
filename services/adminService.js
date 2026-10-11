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

class AdminService {
    // ==========================================
    // DELIVERY FLEET OPERATIONS
    // ==========================================

    async getAvailableDeliveryBoys() {
        return await query(`SELECT * FROM delivery_boy WHERE status='Available' OR status='Active'`);
    }

    async getAllDeliveryBoys() {
        return await query(`SELECT * FROM delivery_boy ORDER BY name ASC`);
    }

    async addDeliveryBoy(name, email, mobile) {
        return await query(`INSERT INTO delivery_boy(name, email, mobile) VALUES(?,?,?)`, [name, email, mobile]);
    }

    async getDeliveryBoyById(dbId) {
        const rows = await query(`SELECT * FROM delivery_boy WHERE id=?`, [dbId]);
        return rows.length > 0 ? rows[0] : null;
    }

    // ==========================================
    // ORDER DISPATCH & STATUS OPERATIONS
    // ==========================================

    async assignDeliveryBoyToOrder(orderId, deliveryBoyId) {
        await query(`UPDATE orders SET delivery_boy=?, order_status='Assigned' WHERE id=?`, [deliveryBoyId, orderId]);
        await query(`UPDATE delivery_boy SET status='Assigned' WHERE id=?`, [deliveryBoyId]);
    }

    async deliverOrderNow(orderId, customerName) {
        const sql = `UPDATE orders SET person_received=?, order_status='Delivered', payment_status='Complete' WHERE id=?`;
        return await query(sql, [customerName, orderId]);
    }

    async shipOrderNow({ orderId, company, trackId, url }) {
        const sql = `UPDATE orders SET tracking_id=?, company_name=?, tracking_url=?, order_status='Shipped' WHERE id=?`;
        return await query(sql, [trackId, company, url, orderId]);
    }

    async deliverFoodNow(orderId, dbId) {
        await query(`UPDATE orders SET order_status='Delivered', payment_status='Paid' WHERE id=?`, [orderId]);
        await query(`UPDATE delivery_boy SET status='Available' WHERE id=?`, [dbId]);
    }

    async getPendingOrders() {
        const sql = `SELECT orders.*, DATE_FORMAT(orders.date_time, "%W %M %e %Y %r") as date_time, users.name, users.mobile, users.email FROM orders INNER JOIN users ON orders.username=users.username WHERE orders.order_status = "Pending" Order By id DESC`;
        return await query(sql);
    }

    async getShippedOrders() {
        const sql = `SELECT orders.*, DATE_FORMAT(orders.date_time, "%W %M %e %Y %r") as date_time, users.name, users.mobile, users.email FROM orders INNER JOIN users ON orders.username=users.username WHERE orders.order_status="Assigned"`;
        return await query(sql);
    }

    async getDeliveredOrders() {
        const sql = `SELECT orders.*, DATE_FORMAT(orders.date_time, "%W %M %e %Y %r") as date_time, users.name, users.mobile, users.email FROM orders INNER JOIN users ON orders.username=users.username WHERE orders.order_status="Delivered"`;
        return await query(sql);
    }

    async getOrderDetailsById(orderId) {
        const sql = `SELECT * FROM order_details INNER JOIN products ON order_details.product_id=products.id WHERE order_id=?`;
        return await query(sql, [orderId]);
    }

    /**
     * Aggregate real-time statistics across catalog, fleet, and orders
     */
    async getDashboardStats() {
        const [categories] = await query(`SELECT COUNT(*) as count FROM category`);
        const [subcategories] = await query(`SELECT COUNT(*) as count FROM subcategory`);
        const [products] = await query(`SELECT COUNT(*) as count FROM products`);
        const [deliveryBoys] = await query(`SELECT COUNT(*) as total, 
            COALESCE(SUM(CASE WHEN status='Available' OR status='Active' THEN 1 ELSE 0 END), 0) as available,
            COALESCE(SUM(CASE WHEN status='Assigned' THEN 1 ELSE 0 END), 0) as assigned
            FROM delivery_boy`);
        const [orders] = await query(`SELECT COUNT(*) as total,
            COALESCE(SUM(CASE WHEN order_status='Pending' THEN 1 ELSE 0 END), 0) as pending,
            COALESCE(SUM(CASE WHEN order_status='Assigned' THEN 1 ELSE 0 END), 0) as assigned,
            COALESCE(SUM(CASE WHEN order_status='Delivered' THEN 1 ELSE 0 END), 0) as delivered,
            COALESCE(SUM(CASE WHEN order_status='Cancelled' THEN 1 ELSE 0 END), 0) as cancelled,
            COALESCE(SUM(CASE WHEN payment_status='Paid' OR order_status='Delivered' THEN CAST(grand_total AS DECIMAL(10,2)) ELSE 0 END), 0) as revenue
            FROM orders`);
        const recentOrders = await query(`SELECT orders.*, users.name as customer_name, users.mobile as customer_mobile, 
            DATE_FORMAT(orders.date_time, "%b %d, %Y %h:%i %p") as formatted_date 
            FROM orders 
            LEFT JOIN users ON orders.username=users.username 
            ORDER BY orders.id DESC LIMIT 8`);

        return {
            categoriesCount: categories ? categories.count : 0,
            subcategoriesCount: subcategories ? subcategories.count : 0,
            productsCount: products ? products.count : 0,
            deliveryBoys: {
                total: deliveryBoys ? deliveryBoys.total : 0,
                available: deliveryBoys ? deliveryBoys.available : 0,
                assigned: deliveryBoys ? deliveryBoys.assigned : 0
            },
            orders: {
                total: orders ? orders.total : 0,
                pending: orders ? orders.pending : 0,
                assigned: orders ? orders.assigned : 0,
                delivered: orders ? orders.delivered : 0,
                cancelled: orders ? orders.cancelled : 0,
                revenue: orders ? Math.round(orders.revenue) : 0
            },
            recentOrders: recentOrders || []
        };
    }
}

module.exports = new AdminService();
