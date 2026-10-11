const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');
const authController = require('../controllers/authController');

const {
    authorizeCustomerForViews,
    authorizeCustomerForPOST
} = require('../middlewares/authMiddleware');

// ==========================================
// CUSTOMER PORTAL PROTECTED ROUTES
// ==========================================

router.get('/', authorizeCustomerForViews, customerController.renderUserDashboard);
router.get('/my-orders', authorizeCustomerForViews, customerController.renderMyOrders);
router.get('/order-details', authorizeCustomerForViews, customerController.renderOrderDetails);
router.get('/thank-you', authorizeCustomerForViews, customerController.renderThankYou);
router.get('/change-password', authorizeCustomerForViews, authController.renderUserChangePassword);
router.get('/logout', authorizeCustomerForViews, authController.userLogout);

// AJAX Customer Endpoints
router.get('/fetch-my-order', authorizeCustomerForPOST, customerController.fetchMyOrders);
router.post('/place-new-order', authorizeCustomerForPOST, customerController.placeNewOrder);
router.get('/cancel-order', authorizeCustomerForPOST, customerController.cancelOrder);
router.post('/change-password', authorizeCustomerForPOST, authController.userChangePassword);

module.exports = router;
