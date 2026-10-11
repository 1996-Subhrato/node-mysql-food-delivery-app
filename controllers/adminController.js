const session = require("express-session");
const adminService = require("../services/adminService");

// ==========================================
// ADMIN DASHBOARD & FLEET CONTROLLER
// ==========================================

const renderAdminHome = async (req, res) => {
    const adminName = (req.session && req.session.adminName) || session.adminName;
    if (adminName == undefined) {
        res.redirect("/admin-login");
    } else {
        try {
            const stats = await adminService.getDashboardStats();
            res.render("admin_home", { name: adminName, stats });
        } catch (error) {
            console.error("Dashboard statistics retrieval error:", error);
            res.render("admin_home", {
                name: adminName,
                stats: {
                    categoriesCount: 0,
                    subcategoriesCount: 0,
                    productsCount: 0,
                    deliveryBoys: { total: 0, available: 0, assigned: 0 },
                    orders: { total: 0, pending: 0, assigned: 0, delivered: 0, cancelled: 0, revenue: 0 },
                    recentOrders: []
                }
            });
        }
    }
};

const getDashboardStatsApi = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.json({ error: false, stats });
    } catch (e) {
        res.json({ error: true, message: e.message });
    }
};

const fetchDeliveryBoys = async (req, res) => {
    try {
        const rows = await adminService.getAvailableDeliveryBoys();
        res.json({ error: false, message: "", rows });
    } catch (e) {
        res.json({ error: true, message: e.message, rows: [] });
    }
};

const renderManageDeliveryBoy = (req, res) => {
    res.render("admin/delivery-boy", { title: "Manage Delivery Boy", text: "Delivery Boy" });
};

const getDeliveryBoysFromServer = async (req, res) => {
    try {
        const rows = await adminService.getAllDeliveryBoys();
        res.json({ error: false, message: "", rows });
    } catch (error) {
        res.json({ error: true, message: error.message, rows: [] });
    }
};

const addDeliveryBoy = async (req, res) => {
    try {
        const { name, email, mobile } = req.body;
        await adminService.addDeliveryBoy(name, email, mobile);
        res.json({ error: false, message: "Data Added Successfully" });
    } catch (error) {
        res.json({ error: true, message: error.message });
    }
};

const getSingleDeliveryBoyInfo = async (req, res) => {
    try {
        const { db_id } = req.params;
        const row = await adminService.getDeliveryBoyById(db_id);
        res.json({ error: false, message: "", row: row || {} });
    } catch (error) {
        res.json({ error: true, message: error.message, row: {} });
    }
};

// ==========================================
// ORDER DISPATCH & FULFILLMENT CONTROLLERS
// ==========================================

const assignDeliveryBoyToOrder = async (req, res) => {
    try {
        const { deliveryBoy, order_id } = req.body;
        await adminService.assignDeliveryBoyToOrder(order_id, deliveryBoy);
        res.send("success");
    } catch (error) {
        console.error(error.message);
        res.send("error");
    }
};

const deliverOrderNow = async (req, res) => {
    try {
        const { name, oid } = req.body;
        await adminService.deliverOrderNow(oid, name);
        res.send("success");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const shipOrderNow = async (req, res) => {
    try {
        const { company, trackID, url, oid } = req.body;
        await adminService.shipOrderNow({ orderId: oid, company, trackId: trackID, url });
        res.send("success");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const deliverFoodNow = async (req, res) => {
    try {
        const { order_id, db_id } = req.params;
        await adminService.deliverFoodNow(order_id, db_id);
        res.json({ error: false, message: "Order Status Updated" });
    } catch (error) {
        res.json({ error: true, message: error.message });
    }
};

const fetchPendingOrders = async (req, res) => {
    try {
        const data = await adminService.getPendingOrders();
        res.send(data);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderPendingOrders = (req, res) => {
    res.render("admin/manage_orders", { title: "Manage Pending Orders", text: "Pending Orders" });
};

const fetchShippedOrders = async (req, res) => {
    try {
        const data = await adminService.getShippedOrders();
        res.send(data);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderAssignedOrders = (req, res) => {
    res.render("admin/shipped_orders", { title: "Manage Assigned Orders", text: "Assigned Orders" });
};

const fetchDeliveredOrders = async (req, res) => {
    try {
        const data = await adminService.getDeliveredOrders();
        res.send(data);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderDeliveredOrders = (req, res) => {
    res.render("admin/delivered_order", { title: "Delivered Orders", text: "Delivered Orders" });
};

const renderAdminOrderDetails = async (req, res) => {
    const { id } = req.query;
    try {
        const records = await adminService.getOrderDetailsById(id);
        res.render("admin/order_details", { title: "Order Details", text: "Order Details", records });
    } catch (error) {
        res.render("admin/order_details", { title: "Order Details", text: "Order Details", records: [] });
    }
};

module.exports = {
    renderAdminHome,
    fetchDeliveryBoys,
    renderManageDeliveryBoy,
    getDeliveryBoysFromServer,
    addDeliveryBoy,
    getSingleDeliveryBoyInfo,
    assignDeliveryBoyToOrder,
    deliverOrderNow,
    shipOrderNow,
    deliverFoodNow,
    fetchPendingOrders,
    renderPendingOrders,
    fetchShippedOrders,
    renderAssignedOrders,
    fetchDeliveredOrders,
    renderDeliveredOrders,
    renderAdminOrderDetails,
    getDashboardStatsApi
};
