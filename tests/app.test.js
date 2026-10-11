const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const connection = require('../connection');

// Generate valid customer JWT token for testing protected customer routes
const jwtSecret = "&123@abc#";
const testCustomerPayload = {
    fullname: "Test Customer",
    mobile: "1234567890",
    userName: "user1"
};
const validCustomerToken = jwt.sign(testCustomerPayload, jwtSecret, { expiresIn: "1h" });

describe('Aahar Application Test Suite - Golden Master Baseline', () => {

    before(async () => {
        await connection.connectDB();
    });

    after(() => {
        // Close DB connection after all tests finish
        connection.end();
    });

    describe('1. Public View Routes', () => {
        it('GET / should return 200 OK and render landing page', async () => {
            const res = await request(app).get('/');
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Aahar/i);
        });

        it('GET /user-login should return 200 OK', async () => {
            const res = await request(app).get('/user-login');
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /User Login/i);
        });

        it('GET /user-signup should return 200 OK', async () => {
            const res = await request(app).get('/user-signup');
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Create Account/i);
        });

        it('GET /admin-login should return 200 OK', async () => {
            const res = await request(app).get('/admin-login');
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Admin Login/i);
        });

        it('GET /non-existent-route should return 404 custom error page', async () => {
            const res = await request(app).get('/some-non-existent-url-404');
            assert.strictEqual(res.status, 404);
            assert.match(res.text, /Page Not Found/i);
        });
    });

    describe('2. Public Catalog & Data APIs', () => {
        it('GET /get-category-from-server should return categories array', async () => {
            const res = await request(app).get('/get-category-from-server');
            assert.strictEqual(res.status, 200);
            const categories = JSON.parse(res.text);
            assert.ok(Array.isArray(categories));
            assert.ok(categories.length > 0);
        });

        it('GET /get-products should return products array', async () => {
            const res = await request(app).get('/get-products');
            assert.strictEqual(res.status, 200);
            const products = JSON.parse(res.text);
            assert.ok(Array.isArray(products));
            assert.ok(products.length > 0);
        });

        it('GET /fetch-subcategory-related-to-category should respond with array', async () => {
            const res = await request(app).get('/fetch-subcategory-related-to-category?category_id=36');
            assert.strictEqual(res.status, 200);
            const subcategories = JSON.parse(res.text);
            assert.ok(Array.isArray(subcategories));
        });

        it('GET /get-products-according-to-sub-category should respond with array', async () => {
            const res = await request(app).get('/get-products-according-to-sub-category?id=22');
            assert.strictEqual(res.status, 200);
            const products = JSON.parse(res.text);
            assert.ok(Array.isArray(products));
        });

        it('GET /get-delivery-boy-from-server should return delivery boys JSON', async () => {
            const res = await request(app).get('/get-delivery-boy-from-server');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.error, false);
            assert.ok(Array.isArray(res.body.rows));
        });

        it('GET /admin/fetchDeliveryBoys should return available delivery boys', async () => {
            const res = await request(app).get('/admin/fetchDeliveryBoys');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.error, false);
            assert.ok(Array.isArray(res.body.rows));
        });
    });

    describe('3. Authentication Flow', () => {
        it('POST /admin-login with valid credentials should return "success"', async () => {
            const res = await request(app)
                .post('/admin-login')
                .send({ email: 'admin@yahoo.com', password: '1234' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
        });

        it('POST /admin-login with invalid credentials should return "invalid"', async () => {
            const res = await request(app)
                .post('/admin-login')
                .send({ email: 'wrong@admin.com', password: 'badpassword' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'invalid');
        });

        it('POST /user-login with valid credentials should set customerToken cookie and return "success"', async () => {
            const res = await request(app)
                .post('/user-login')
                .send({ username: 'kanish@123', password: '123' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
            const setCookie = res.headers['set-cookie'];
            assert.ok(setCookie, 'Expected Set-Cookie header to be present');
            assert.ok(setCookie.some(c => c.includes('customerToken=')), 'Expected customerToken in cookie');
        });

        it('POST /user-login with invalid credentials should return "invalid"', async () => {
            const res = await request(app)
                .post('/user-login')
                .send({ username: 'unknown_user_xyz', password: 'wrongpassword' });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'invalid');
        });
    });

    describe('4. Customer Protected Routes & Middleware', () => {
        it('GET /menu without cookie should redirect to /user-login (302)', async () => {
            const res = await request(app).get('/menu');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/user-login');
        });

        it('GET /menu with valid customerToken cookie should return 200 OK', async () => {
            const res = await request(app)
                .get('/menu')
                .set('Cookie', [`customerToken=${validCustomerToken}`]);
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Menu/i);
        });

        it('GET /users/ without cookie should redirect to /user-login (302)', async () => {
            const res = await request(app).get('/users/');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/user-login');
        });

        it('GET /users/ with valid customerToken cookie should return 200 OK', async () => {
            const res = await request(app)
                .get('/users/')
                .set('Cookie', [`customerToken=${validCustomerToken}`]);
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Dashboard/i);
        });

        it('GET /users/my-orders without cookie should redirect to /user-login (302)', async () => {
            const res = await request(app).get('/users/my-orders');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/user-login');
        });

        it('GET /users/my-orders with valid customerToken cookie should return 200 OK', async () => {
            const res = await request(app)
                .get('/users/my-orders')
                .set('Cookie', [`customerToken=${validCustomerToken}`]);
            assert.strictEqual(res.status, 200);
            assert.match(res.text, /My Orders/i);
        });

        it('POST /cart-count without token should return "jwt"', async () => {
            const res = await request(app).post('/cart-count');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'jwt');
        });

        it('POST /cart-count with valid token should return cart count string', async () => {
            const res = await request(app)
                .post('/cart-count')
                .set('Cookie', [`customerToken=${validCustomerToken}`]);
            assert.strictEqual(res.status, 200);
            assert.ok(!isNaN(parseInt(res.text, 10)));
        });

        it('POST /add-to-cart action=cartCount with valid token should return string count', async () => {
            const res = await request(app)
                .post('/add-to-cart')
                .set('Cookie', [`customerToken=${validCustomerToken}`])
                .send({ action: 'cartCount' });
            assert.strictEqual(res.status, 200);
            assert.ok(!isNaN(parseInt(res.text, 10)));
        });

        it('POST /add-to-cart action=get-products with valid token should return array', async () => {
            const res = await request(app)
                .post('/add-to-cart')
                .set('Cookie', [`customerToken=${validCustomerToken}`])
                .send({ action: 'get-products' });
            assert.strictEqual(res.status, 200);
            const cartItems = JSON.parse(res.text);
            assert.ok(Array.isArray(cartItems));
        });

        it('GET /users/fetch-my-order with valid token should return orders array', async () => {
            const res = await request(app)
                .get('/users/fetch-my-order')
                .set('Cookie', [`customerToken=${validCustomerToken}`]);
            assert.strictEqual(res.status, 200);
            const orders = JSON.parse(res.text);
            assert.ok(Array.isArray(orders));
        });
    });

    describe('5. Protected Admin Routes & Middleware', () => {
        it('GET /logout-admin should clear admin session', async () => {
            const res = await request(app).get('/logout-admin');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');
        });

        it('GET /admin/pending-orders without session should redirect to /admin-login (302)', async () => {
            const res = await request(app).get('/admin/pending-orders');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/admin-login');
        });

        it('GET /admin/assigned-orders without session should redirect to /admin-login (302)', async () => {
            const res = await request(app).get('/admin/assigned-orders');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/admin-login');
        });

        it('GET /admin/manage-delivery-boy without session should redirect to /admin-login (302)', async () => {
            const res = await request(app).get('/admin/manage-delivery-boy');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/admin-login');
        });

        it('GET /admin-home without session should redirect to /admin-login (302)', async () => {
            const res = await request(app).get('/admin-home');
            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/admin-login');
        });
    });
});
