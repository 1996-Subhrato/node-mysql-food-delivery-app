const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

// Helper to query database with Promises
const dbQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

describe('Aahar End-to-End Client & Admin Flow Test Suite', () => {
    const testUsername = `user_${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;
    const testPassword = 'InitialPassword123!';
    const testNewPassword = 'UpdatedPassword456!';
    let customerCookie = '';
    let adminCookie = '';
    let placedOrderId = null;
    let cancelOrderId = null;
    let createdDeliveryBoyId = null;

    before(async () => {
        // Ensure clean test starting state
        await dbQuery(`DELETE FROM cart WHERE username=?`, [testUsername]);
        await dbQuery(`DELETE FROM orders WHERE username=?`, [testUsername]);
        await dbQuery(`DELETE FROM users WHERE username=?`, [testUsername]);
    });

    after(async () => {
        try {
            // Clean up test data
            if (placedOrderId) {
                await dbQuery(`DELETE FROM order_details WHERE order_id=?`, [placedOrderId]);
                await dbQuery(`DELETE FROM orders WHERE id=?`, [placedOrderId]);
            }
            if (cancelOrderId) {
                await dbQuery(`DELETE FROM order_details WHERE order_id=?`, [cancelOrderId]);
                await dbQuery(`DELETE FROM orders WHERE id=?`, [cancelOrderId]);
            }
            if (createdDeliveryBoyId) {
                await dbQuery(`DELETE FROM delivery_boy WHERE id=?`, [createdDeliveryBoyId]);
            }
            await dbQuery(`DELETE FROM cart WHERE username=?`, [testUsername]);
            await dbQuery(`DELETE FROM users WHERE username=?`, [testUsername]);

            const fs = require('fs');
            const path = require('path');
            const avatarPath = path.join(__dirname, '..', 'public', 'users', 'avatar.png');
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        } catch (err) {
            console.error('Cleanup error:', err.message);
        } finally {
            db.end();
        }
    });

    // =========================================================================
    // SECTION 1: CLIENT / CUSTOMER LIFECYCLE FLOW
    // =========================================================================
    describe('1. Client Registration & Authentication Flow', () => {

        it('POST /user-signup should reject requests with empty fields ("empty")', async () => {
            const res = await request(app)
                .post('/user-signup')
                .field('username', '')
                .field('email', testEmail)
                .field('name', 'Test User')
                .field('password', testPassword)
                .field('confirm', testPassword)
                .field('mobile', '9876543210')
                .field('address', '123 Food Street');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'empty');
        });

        it('POST /user-signup should reject requests without a photo attachment ("photo")', async () => {
            const res = await request(app)
                .post('/user-signup')
                .field('username', testUsername)
                .field('email', testEmail)
                .field('name', 'Test User')
                .field('password', testPassword)
                .field('confirm', testPassword)
                .field('mobile', '9876543210')
                .field('address', '123 Food Street');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'photo');
        });

        it('POST /user-signup should reject requests with mismatched passwords ("notMatched")', async () => {
            const dummyPhoto = Buffer.from('fake-avatar-image-data');
            const res = await request(app)
                .post('/user-signup')
                .field('username', testUsername)
                .field('email', testEmail)
                .field('name', 'Test User')
                .field('password', testPassword)
                .field('confirm', 'WrongPasswordMatch')
                .field('mobile', '9876543210')
                .field('address', '123 Food Street')
                .attach('photo', dummyPhoto, 'avatar.png');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'notMatched');
        });

        it('POST /user-signup should successfully register a new customer ("success")', async () => {
            const dummyPhoto = Buffer.from('fake-avatar-image-data');
            const res = await request(app)
                .post('/user-signup')
                .field('username', testUsername)
                .field('email', testEmail)
                .field('name', 'Flow Customer')
                .field('gender', 'Male')
                .field('password', testPassword)
                .field('confirm', testPassword)
                .field('mobile', '9876543210')
                .field('address', '123 Food Street, Tasty Town')
                .attach('photo', dummyPhoto, 'avatar.png');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');

            // Verify user exists in database
            const rows = await dbQuery('SELECT * FROM users WHERE username=?', [testUsername]);
            assert.strictEqual(rows.length, 1);
            assert.strictEqual(rows[0].email, testEmail);
        });

        it('POST /user-signup should reject duplicate username registration ("userExist")', async () => {
            const dummyPhoto = Buffer.from('fake-avatar-image-data');
            const res = await request(app)
                .post('/user-signup')
                .field('username', testUsername)
                .field('email', 'other@example.com')
                .field('name', 'Another User')
                .field('gender', 'Male')
                .field('password', testPassword)
                .field('confirm', testPassword)
                .field('mobile', '9876543211')
                .field('address', '456 Other St')
                .attach('photo', dummyPhoto, 'avatar.png');

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'userExist');
        });

        it('POST /user-login should reject incorrect password ("invalid")', async () => {
            const res = await request(app)
                .post('/user-login')
                .send({ username: testUsername, password: 'IncorrectPassword' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'invalid');
        });

        it('POST /user-login should authenticate valid customer, set customerToken cookie, and return "success"', async () => {
            const res = await request(app)
                .post('/user-login')
                .send({ username: testUsername, password: testPassword });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');

            // Save session cookie for subsequent requests
            const cookies = res.headers['set-cookie'];
            assert.ok(cookies, 'Cookie must be returned upon successful login');
            customerCookie = cookies.find(c => c.startsWith('customerToken='));
            assert.ok(customerCookie, 'customerToken cookie must be present');
        });

        it('GET /users/ should render customer dashboard for logged-in user', async () => {
            const res = await request(app)
                .get('/users/')
                .set('Cookie', customerCookie);

            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Dashboard/i);
            assert.match(res.text, /Flow Customer/i);
        });

        it('GET /checkout should redirect to /shopping-cart if cart is empty', async () => {
            const res = await request(app)
                .get('/checkout')
                .set('Cookie', customerCookie);

            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/shopping-cart');
        });
    });

    // =========================================================================
    // SECTION 2: SHOPPING CART & ORDER PLACEMENT FLOW
    // =========================================================================
    describe('2. Client Shopping Cart, Checkout & Order Placement', () => {

        it('POST /cart-count should return "0" for newly registered customer', async () => {
            const res = await request(app)
                .post('/cart-count')
                .set('Cookie', customerCookie);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, '0');
        });

        it('POST /add-to-cart (action: "add") should add product to cart and increment count to "1"', async () => {
            const res = await request(app)
                .post('/add-to-cart')
                .set('Cookie', customerCookie)
                .send({
                    action: 'add',
                    productObject: JSON.stringify({ id: 15, product_name: 'Hyderabadi Biryani' })
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');

            // Verify cart count
            const countRes = await request(app)
                .post('/cart-count')
                .set('Cookie', customerCookie);
            assert.strictEqual(countRes.text, '1');
        });

        it('POST /add-to-cart (action: "plus") should increment product quantity in cart', async () => {
            const res = await request(app)
                .post('/add-to-cart')
                .set('Cookie', customerCookie)
                .send({ action: 'plus', pid: 15 });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'updated');

            // Verify items via action: "get-products"
            const getRes = await request(app)
                .post('/add-to-cart')
                .set('Cookie', customerCookie)
                .send({ action: 'get-products' });

            assert.strictEqual(getRes.status, 200);
            const items = JSON.parse(getRes.text);
            assert.strictEqual(items.length, 1);
            assert.strictEqual(items[0].quantity, 2);
        });

        it('POST /add-to-cart (action: "minus") should decrement product quantity in cart', async () => {
            const res = await request(app)
                .post('/add-to-cart')
                .set('Cookie', customerCookie)
                .send({ action: 'minus', pid: 15 });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'updated');

            const getRes = await request(app)
                .post('/add-to-cart')
                .set('Cookie', customerCookie)
                .send({ action: 'get-products' });

            const items = JSON.parse(getRes.text);
            assert.strictEqual(items[0].quantity, 1);
        });

        it('GET /checkout should now render 200 OK because cart has items', async () => {
            const res = await request(app)
                .get('/checkout')
                .set('Cookie', customerCookie);

            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Order Checkout/i);
            assert.match(res.text, /123 Food Street, Tasty Town/i);
        });

        it('POST /users/place-new-order should place an order, itemize details, and clear cart', async () => {
            const res = await request(app)
                .post('/users/place-new-order')
                .set('Cookie', customerCookie)
                .send({
                    grandTotal: '475',
                    address: '123 Food Street, Tasty Town',
                    remarks: 'Ring doorbell twice',
                    payment_mode: 'COD'
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');

            // Verify cart count is now 0
            const countRes = await request(app)
                .post('/cart-count')
                .set('Cookie', customerCookie);
            assert.strictEqual(countRes.text, '0');

            // Verify order in user history
            const ordersRes = await request(app)
                .get('/users/fetch-my-order')
                .set('Cookie', customerCookie);

            assert.strictEqual(ordersRes.status, 200);
            const orders = JSON.parse(ordersRes.text);
            assert.ok(orders.length >= 1);
            const myOrder = orders.find(o => o.remarks === 'Ring doorbell twice');
            assert.ok(myOrder, 'Placed order must exist in customer orders');
            assert.strictEqual(myOrder.order_status, 'Pending');
            placedOrderId = myOrder.id;
        });

        it('GET /users/order-details should display itemized items for the placed order', async () => {
            const res = await request(app)
                .get(`/users/order-details?order_id=${placedOrderId}`)
                .set('Cookie', customerCookie);

            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Order Details/i);
            assert.match(res.text, /Hyderabadi Chicken Biryani/i);
        });

        it('GET /users/cancel-order should cancel a pending order successfully', async () => {
            // First add an item and place a second order to test cancellation
            await request(app)
                .post('/add-to-cart')
                .set('Cookie', customerCookie)
                .send({
                    action: 'add',
                    productObject: JSON.stringify({ id: 17, product_name: 'Aloo Parantha' })
                });

            await request(app)
                .post('/users/place-new-order')
                .set('Cookie', customerCookie)
                .send({
                    grandTotal: '180',
                    address: '123 Food Street, Tasty Town',
                    remarks: 'Cancel this order',
                    payment_mode: 'COD'
                });

            const ordersRes = await request(app)
                .get('/users/fetch-my-order')
                .set('Cookie', customerCookie);
            const orders = JSON.parse(ordersRes.text);
            const toCancel = orders.find(o => o.remarks === 'Cancel this order');
            assert.ok(toCancel);
            cancelOrderId = toCancel.id;

            // Cancel the order
            const cancelRes = await request(app)
                .get(`/users/cancel-order?id=${cancelOrderId}`)
                .set('Cookie', customerCookie);

            assert.strictEqual(cancelRes.status, 200);
            assert.strictEqual(cancelRes.text, 'success');

            // Verify status in DB is Cancelled
            const checkRows = await dbQuery('SELECT order_status FROM orders WHERE id=?', [cancelOrderId]);
            assert.strictEqual(checkRows[0].order_status, 'Cancelled');
        });
    });

    // =========================================================================
    // SECTION 3: CLIENT PASSWORD CHANGE & LOGOUT FLOW
    // =========================================================================
    describe('3. Client Password Change & Session Logout', () => {

        it('POST /user-change-password should reject incorrect old password ("invalid")', async () => {
            const res = await request(app)
                .post('/user-change-password')
                .set('Cookie', customerCookie)
                .send({
                    current: 'WrongOldPassword',
                    newPassword: testNewPassword
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'invalid');
        });

        it('POST /user-change-password should successfully change customer password ("updated")', async () => {
            const res = await request(app)
                .post('/user-change-password')
                .set('Cookie', customerCookie)
                .send({
                    current: testPassword,
                    newPassword: testNewPassword
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'updated');
        });

        it('POST /user-login should fail with old password and succeed with new password', async () => {
            const oldRes = await request(app)
                .post('/user-login')
                .send({ username: testUsername, password: testPassword });
            assert.strictEqual(oldRes.text, 'invalid');

            const newRes = await request(app)
                .post('/user-login')
                .send({ username: testUsername, password: testNewPassword });
            assert.strictEqual(newRes.text, 'success');

            // Update cookie with new session
            const cookies = newRes.headers['set-cookie'];
            customerCookie = cookies.find(c => c.startsWith('customerToken='));
        });

        it('GET /users/logout should clear cookie and redirect to /user-login', async () => {
            const res = await request(app)
                .get('/users/logout')
                .set('Cookie', customerCookie);

            assert.strictEqual(res.status, 302);
            assert.strictEqual(res.headers.location, '/user-login');

            // Verify customerToken cookie was cleared
            const clearedCookie = res.headers['set-cookie'].find(c => c.startsWith('customerToken=;'));
            assert.ok(clearedCookie, 'customerToken must be cleared');
        });
    });

    // =========================================================================
    // SECTION 4: ADMIN AUTHENTICATION & DASHBOARD FLOW
    // =========================================================================
    describe('4. Admin Authentication & Dashboard Navigation', () => {

        it('POST /admin-login should reject invalid credentials ("invalid")', async () => {
            const res = await request(app)
                .post('/admin-login')
                .send({ email: 'admin@yahoo.com', password: 'WrongAdminPassword' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'invalid');
        });

        it('POST /admin-login should succeed with valid credentials and establish session', async () => {
            const res = await request(app)
                .post('/admin-login')
                .send({ email: 'admin@yahoo.com', password: '1234' });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');

            const cookies = res.headers['set-cookie'];
            assert.ok(cookies);
            adminCookie = cookies.find(c => c.startsWith('aahar='));
        });

        it('GET /admin-home should render 200 OK for logged-in admin', async () => {
            const res = await request(app)
                .get('/admin-home')
                .set('Cookie', adminCookie);

            assert.strictEqual(res.status, 200);
            assert.match(res.text, /John Doe/i);
        });

        it('Admin order views should all return 200 OK', async () => {
            const pendingRes = await request(app).get('/admin/pending-orders').set('Cookie', adminCookie);
            assert.strictEqual(pendingRes.status, 200);

            const assignedRes = await request(app).get('/admin/assigned-orders').set('Cookie', adminCookie);
            assert.strictEqual(assignedRes.status, 200);

            const deliveredRes = await request(app).get('/admin/delivered-orders').set('Cookie', adminCookie);
            assert.strictEqual(deliveredRes.status, 200);
        });
    });

    // =========================================================================
    // SECTION 5: ADMIN CATALOG CRUD OPERATIONS
    // =========================================================================
    describe('5. Admin Catalog Management Flow', () => {
        let testCategoryId = null;
        let testSubcategoryId = null;

        it('POST /add-category, update, and delete lifecycle', async () => {
            // 1. Add category
            const addRes = await request(app)
                .post('/add-category')
                .set('Cookie', adminCookie)
                .send({ category: 'E2E Flow Beverages' });

            assert.strictEqual(addRes.status, 200);
            assert.strictEqual(addRes.text, 'success');

            // Find created category ID
            const listRes = await request(app).get('/get-category-from-server');
            const categories = JSON.parse(listRes.text);
            const foundCat = categories.find(c => c.category_name === 'E2E Flow Beverages');
            assert.ok(foundCat);
            testCategoryId = foundCat.category_id;

            // 2. Update category
            const updateRes = await request(app)
                .post('/update-category')
                .set('Cookie', adminCookie)
                .send({
                    category_id: testCategoryId,
                    category: 'E2E Flow Beverages Updated'
                });
            assert.strictEqual(updateRes.status, 200);
            assert.strictEqual(updateRes.text, 'updated');

            // 3. Add Subcategory under this category
            const addSubRes = await request(app)
                .post('/add-sub-category')
                .set('Cookie', adminCookie)
                .send({
                    category: testCategoryId,
                    subCategory: 'Fresh Shakes'
                });
            assert.strictEqual(addSubRes.status, 200);
            assert.strictEqual(addSubRes.text, 'added');

            // Find created subcategory ID
            const subRes = await request(app).get(`/fetch-subcategory-related-to-category?category_id=${testCategoryId}`);
            const subcategories = JSON.parse(subRes.text);
            const foundSub = subcategories.find(s => s.subcategory_name === 'Fresh Shakes');
            assert.ok(foundSub);
            testSubcategoryId = foundSub.subcategory_id;

            // 4. Update Subcategory
            const updateSubRes = await request(app)
                .post('/update-sub-category')
                .set('Cookie', adminCookie)
                .send({
                    subCategory_ID: testSubcategoryId,
                    category: testCategoryId,
                    subCategory: 'Fresh Smoothies'
                });
            assert.strictEqual(updateSubRes.status, 200);
            assert.strictEqual(updateSubRes.text, 'updated');

            // 5. Delete Subcategory
            const delSubRes = await request(app)
                .get(`/delete-sub-category?id=${testSubcategoryId}`)
                .set('Cookie', adminCookie);
            assert.strictEqual(delSubRes.status, 200);
            assert.strictEqual(delSubRes.text, 'deleted');

            // 6. Delete Category
            const delCatRes = await request(app)
                .post('/delete-category')
                .set('Cookie', adminCookie)
                .send({ category_id: testCategoryId });
            assert.strictEqual(delCatRes.status, 200);
            assert.strictEqual(delCatRes.text, 'deleted');
        });
    });

    // =========================================================================
    // SECTION 6: DELIVERY FLEET & ORDER FULFILLMENT PIPELINE
    // =========================================================================
    describe('6. Delivery Fleet & Order Fulfillment Pipeline', () => {

        it('POST /add-delivery-boy should register a new delivery personnel', async () => {
            const res = await request(app)
                .post('/add-delivery-boy')
                .set('Cookie', adminCookie)
                .send({
                    name: 'Test Speed Rider',
                    email: `rider_${Date.now()}@delivery.com`,
                    mobile: '9123456780'
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.error, false);
            assert.strictEqual(res.body.message, 'Data Added Successfully');

            // Fetch available delivery boys
            const listRes = await request(app).get('/admin/fetchDeliveryBoys');
            assert.strictEqual(listRes.body.error, false);
            const riders = listRes.body.rows;
            const rider = riders.find(r => r.name === 'Test Speed Rider');
            assert.ok(rider, 'Added delivery boy must be listed');
            createdDeliveryBoyId = rider.id;
        });

        it('GET /admin/fetch-pending-order should include customer order placed earlier', async () => {
            const res = await request(app).get('/admin/fetch-pending-order');
            assert.strictEqual(res.status, 200);
            const orders = JSON.parse(res.text);
            const order = orders.find(o => o.id === placedOrderId);
            assert.ok(order, 'Pending orders must contain our test placed order');
            assert.strictEqual(order.order_status, 'Pending');
        });

        it('GET /admin/order-details should display itemized records of the order', async () => {
            const res = await request(app)
                .get(`/admin/order-details?id=${placedOrderId}`)
                .set('Cookie', adminCookie);

            assert.strictEqual(res.status, 200);
            assert.match(res.text, /Order Details/i);
            assert.match(res.text, /Hyderabadi Chicken Biryani/i);
        });

        it('POST /admin/assign-delivery-boy-to-order should assign rider to order ("success")', async () => {
            const res = await request(app)
                .post('/admin/assign-delivery-boy-to-order')
                .send({
                    order_id: placedOrderId,
                    deliveryBoy: createdDeliveryBoyId
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'success');

            // Verify order moved to Assigned/Shipped pipeline
            const shippedRes = await request(app).get('/admin/fetch-shipped-order');
            assert.strictEqual(shippedRes.status, 200);
            const shippedOrders = JSON.parse(shippedRes.text);
            const assignedOrder = shippedOrders.find(o => o.id === placedOrderId);
            assert.ok(assignedOrder);
            assert.strictEqual(assignedOrder.order_status, 'Assigned');
            assert.strictEqual(Number(assignedOrder.delivery_boy), Number(createdDeliveryBoyId));
        });

        it('GET /admin/getSingleDBInfo/:db_id should fetch assigned rider info', async () => {
            const res = await request(app).get(`/admin/getSingleDBInfo/${createdDeliveryBoyId}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.error, false);
            assert.strictEqual(res.body.row.name, 'Test Speed Rider');
        });

        it('GET /admin/deliver-food-now/:order_id/:db_id should complete delivery and release rider', async () => {
            const res = await request(app).get(`/admin/deliver-food-now/${placedOrderId}/${createdDeliveryBoyId}`);
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.error, false);
            assert.strictEqual(res.body.message, 'Order Status Updated');

            // Verify order moved to Delivered pipeline
            const deliveredRes = await request(app).get('/admin/fetch-delivered-order');
            assert.strictEqual(deliveredRes.status, 200);
            const deliveredOrders = JSON.parse(deliveredRes.text);
            const completedOrder = deliveredOrders.find(o => o.id === placedOrderId);
            assert.ok(completedOrder);
            assert.strictEqual(completedOrder.order_status, 'Delivered');
            assert.strictEqual(completedOrder.payment_status, 'Paid');

            // Verify delivery boy status returned to Available
            const riderRes = await request(app).get(`/admin/getSingleDBInfo/${createdDeliveryBoyId}`);
            assert.strictEqual(riderRes.body.row.status, 'Available');
        });
    });

    // =========================================================================
    // SECTION 7: ADMIN PASSWORD CHANGE & LOGOUT FLOW
    // =========================================================================
    describe('7. Admin Password Change & Logout Flow', () => {

        it('POST /admin-change-password should reject incorrect current password ("invalid")', async () => {
            const res = await request(app)
                .post('/admin-change-password')
                .set('Cookie', adminCookie)
                .send({
                    current: 'WrongAdminPassword',
                    newPassword: 'newadminpass999'
                });

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.text, 'invalid');
        });

        it('POST /admin-change-password should successfully update password and restore idempotency', async () => {
            // Update password
            const updateRes = await request(app)
                .post('/admin-change-password')
                .set('Cookie', adminCookie)
                .send({
                    current: '1234',
                    newPassword: 'tempAdminPass123!'
                });

            assert.strictEqual(updateRes.status, 200);
            assert.strictEqual(updateRes.text, 'updated');

            // Verify login with updated password
            const newLoginRes = await request(app)
                .post('/admin-login')
                .send({ email: 'admin@yahoo.com', password: 'tempAdminPass123!' });
            assert.strictEqual(newLoginRes.text, 'success');

            // Restore original password '1234'
            const restoreRes = await request(app)
                .post('/admin-change-password')
                .set('Cookie', adminCookie)
                .send({
                    current: 'tempAdminPass123!',
                    newPassword: '1234'
                });
            assert.strictEqual(restoreRes.status, 200);
            assert.strictEqual(restoreRes.text, 'updated');
        });

        it('GET /logout-admin should clear admin session and redirect /admin-home', async () => {
            const logoutRes = await request(app)
                .get('/logout-admin')
                .set('Cookie', adminCookie);

            assert.strictEqual(logoutRes.status, 200);
            assert.strictEqual(logoutRes.text, 'success');

            // Accessing admin home should redirect to login
            const homeRes = await request(app).get('/admin-home');
            assert.strictEqual(homeRes.status, 302);
            assert.strictEqual(homeRes.headers.location, '/admin-login');
        });
    });
});
