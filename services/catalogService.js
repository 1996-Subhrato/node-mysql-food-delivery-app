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

class CatalogService {
    // ==========================================
    // CATEGORY OPERATIONS
    // ==========================================

    async getAllCategories() {
        return await query(`SELECT * FROM category`);
    }

    async getCategoriesSorted() {
        return await query(`SELECT * FROM category ORDER BY category_name ASC`);
    }

    async addCategory(categoryName) {
        return await query(`INSERT INTO category(category_name) VALUES(?)`, [categoryName]);
    }

    async updateCategory(categoryId, categoryName) {
        return await query(`UPDATE category SET category_name=? WHERE category_id=?`, [categoryName, categoryId]);
    }

    async deleteCategory(categoryId) {
        return await query(`DELETE FROM category WHERE category_id=?`, [categoryId]);
    }

    // ==========================================
    // SUBCATEGORY OPERATIONS
    // ==========================================

    async getSubcategoriesByCategory(categoryId) {
        return await query(`SELECT * FROM subcategory WHERE category=?`, [categoryId]);
    }

    async getAllSubcategoriesWithCategory() {
        return await query(`SELECT * FROM subcategory INNER JOIN category ON subcategory.category=category.category_id ORDER BY subcategory_id DESC`);
    }

    async addSubcategory(categoryId, subcategoryName) {
        return await query(`INSERT INTO subcategory(subcategory_name, category) VALUES(?,?)`, [subcategoryName, categoryId]);
    }

    async updateSubcategory(subcategoryId, categoryId, subcategoryName) {
        return await query(`UPDATE subcategory SET subcategory_name=?, category=? WHERE subcategory_id=?`, [subcategoryName, categoryId, subcategoryId]);
    }

    async deleteSubcategory(subcategoryId) {
        return await query(`DELETE FROM subcategory WHERE subcategory_id=?`, [subcategoryId]);
    }

    // ==========================================
    // PRODUCT OPERATIONS
    // ==========================================

    async getAllProducts() {
        return await query(`SELECT * FROM products`);
    }

    async getProductsBySubcategory(subcategoryId) {
        const sql = `SELECT products.*, subcategory.subcategory_name, category.category_name FROM products INNER JOIN subcategory ON products.subcategory_id=subcategory.subcategory_id INNER JOIN category ON subcategory.category=category.category_id WHERE products.subcategory_id=?`;
        return await query(sql, [subcategoryId]);
    }

    async getAllProductsWithSubcategory() {
        return await query(`SELECT * FROM products INNER JOIN subcategory ON products.subcategory_id=subcategory.subcategory_id ORDER BY id DESC`);
    }

    async addProduct({ productName, photoPath, price, discount, description, subcategoryId }) {
        const sql = `INSERT INTO products(product_name, photo, price, discount, description, subcategory_id) 
                     VALUES(?,?,?,?,?,?)`;
        return await query(sql, [productName, photoPath, price, discount, description, subcategoryId]);
    }

    async deleteProduct(productId) {
        return await query(`DELETE FROM products WHERE id=?`, [productId]);
    }

    // ==========================================
    // CART OPERATIONS
    // ==========================================

    async getCartCount(username) {
        const records = await query(`SELECT * FROM cart WHERE username=?`, [username]);
        return records.length.toString();
    }

    async getCartProducts(username) {
        return await query(`SELECT * FROM cart INNER JOIN products ON cart.product_id=products.id WHERE username=?`, [username]);
    }

    async addToCart(username, productObject) {
        const { id } = productObject;
        const record = await query(`SELECT * FROM cart WHERE product_id=? AND username=?`, [id, username]);

        if (record.length === 0) {
            await query(`INSERT INTO cart(product_id, quantity, username) VALUES(?,?,?)`, [id, 1, username]);
        } else {
            const quantity = record[0].quantity + 1;
            await query(`UPDATE cart SET quantity=? WHERE product_id=? AND username=?`, [quantity, id, username]);
        }
    }

    async updateQuantity(username, productId, action) {
        const record = await query(`SELECT * FROM cart WHERE product_id=? AND username=?`, [productId, username]);
        if (record.length === 0) return;

        let quantity;
        if (action === "plus") {
            if (record[0].quantity < 5) {
                quantity = record[0].quantity + 1;
            } else {
                return;
            }
        } else {
            if (record[0].quantity > 1) {
                quantity = record[0].quantity - 1;
            } else {
                return;
            }
        }

        await query(`UPDATE cart SET quantity=? WHERE product_id=? AND username=?`, [quantity, productId, username]);
    }

    async removeFromCart(username, productId) {
        await query(`DELETE FROM cart WHERE product_id=? AND username=?`, [productId, username]);
    }
}

module.exports = new CatalogService();
