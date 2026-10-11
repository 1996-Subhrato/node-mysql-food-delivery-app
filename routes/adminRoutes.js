const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { isAdminLoggedIn } = require('../middlewares/authMiddleware');

// ==========================================
// ADMIN LOGISTICS & ORDER DISPATCH ROUTES
// ==========================================

// Delivery Boy Management
router.get('/fetchDeliveryBoys', adminController.fetchDeliveryBoys);
router.get('/manage-delivery-boy', isAdminLoggedIn, adminController.renderManageDeliveryBoy);
router.get('/getSingleDBInfo/:db_id', adminController.getSingleDeliveryBoyInfo);

// Order Pipelines (Views)
router.get('/pending-orders', isAdminLoggedIn, adminController.renderPendingOrders);
router.get('/assigned-orders', isAdminLoggedIn, adminController.renderAssignedOrders);
router.get('/delivered-orders', isAdminLoggedIn, adminController.renderDeliveredOrders);
router.get('/order-details', isAdminLoggedIn, adminController.renderAdminOrderDetails);

// Order Operations & AJAX Data
router.get('/dashboard-stats', adminController.getDashboardStatsApi);
router.get('/fetch-pending-order', adminController.fetchPendingOrders);
router.get('/fetch-shipped-order', adminController.fetchShippedOrders);
router.get('/fetch-delivered-order', adminController.fetchDeliveredOrders);

router.post('/assign-delivery-boy-to-order', adminController.assignDeliveryBoyToOrder);
router.post('/deliver-order-now', adminController.deliverOrderNow);
router.post('/ship-order-now', adminController.shipOrderNow);
router.get('/deliver-food-now/:order_id/:db_id', adminController.deliverFoodNow);

module.exports = router;
