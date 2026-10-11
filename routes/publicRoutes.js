const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const catalogController = require('../controllers/catalogController');
const customerController = require('../controllers/customerController');
const adminController = require('../controllers/adminController');

const {
    authorizeCustomerForViews,
    authorizeCustomerForPublicViews,
    authorizeCustomerForPOST
} = require('../middlewares/authMiddleware');

// ==========================================
// STOREFRONT & PUBLIC VIEWS
// ==========================================
router.get('/', authorizeCustomerForPublicViews, customerController.renderHome);
router.get('/menu', authorizeCustomerForViews, customerController.renderMenu);
router.get('/about-us', authorizeCustomerForViews, customerController.renderAbout);
router.get('/shopping-cart', authorizeCustomerForViews, catalogController.renderShoppingCart);
router.get('/checkout', authorizeCustomerForViews, customerController.renderCheckout);

// ==========================================
// SESSION & DIAGNOSTIC ENDPOINTS
// ==========================================
router.get('/check-user-loggedIn', customerController.checkUserLoggedIn);
router.get('/check-session-created', customerController.checkSessionCreated);
router.get('/test-session', customerController.testSession);
router.get('/index-2', customerController.renderIndex2);
router.get('/check-user-session', customerController.checkUserSession);

// ==========================================
// AUTHENTICATION (CUSTOMER & ADMIN)
// ==========================================
router.get('/user-login', authController.renderUserLogin);
router.post('/user-login', authController.userLogin);
router.get('/user-signup', authorizeCustomerForPublicViews, authController.renderUserSignup);
router.post('/user-signup', authController.userSignup);
router.post('/user-change-password', authController.userChangePassword);

router.get('/admin-login', authController.renderAdminLogin);
router.post('/admin-login', authController.adminLogin);
router.get('/logout-admin', authController.logoutAdmin);
router.get('/admin-change-password', authController.renderAdminChangePassword);
router.post('/admin-change-password', authController.adminChangePassword);

router.get('/admin-home', adminController.renderAdminHome);

// ==========================================
// PUBLIC CATALOG & CART APIS
// ==========================================
router.get('/get-category-from-server', catalogController.getCategories);
router.get('/fetch-subcategory-related-to-category', catalogController.getSubcategoriesByCategory);
router.get('/fetch-sub-category-from-server', catalogController.getAllSubcategories);
router.get('/get-products', catalogController.getAllProducts);
router.get('/get-products-according-to-sub-category', catalogController.getProductsBySubcategory);
router.get('/view-product', catalogController.viewProducts);
router.get('/get-delivery-boy-from-server', adminController.getDeliveryBoysFromServer);

router.post('/cart-count', authorizeCustomerForPOST, catalogController.getCartCount);
router.post('/add-to-cart', authorizeCustomerForPOST, catalogController.handleCartAction);

// ==========================================
// ADMIN CATALOG MANAGEMENT ENDPOINTS
// ==========================================
router.get('/manage-category', catalogController.renderManageCategory);
router.post('/add-category', catalogController.addCategory);
router.post('/update-category', catalogController.updateCategory);
router.post('/delete-category', catalogController.deleteCategory);

router.get('/manage-sub-category', catalogController.renderManageSubcategory);
router.post('/add-sub-category', catalogController.addSubcategory);
router.post('/update-sub-category', catalogController.updateSubcategory);
router.get('/delete-sub-category', catalogController.deleteSubcategory);

router.get('/manage-product', catalogController.renderManageProduct);
router.post('/add-product', catalogController.addProduct);
router.post('/delete-product', catalogController.deleteProduct);

router.post('/add-delivery-boy', adminController.addDeliveryBoy);

module.exports = router;
