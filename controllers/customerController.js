const session = require("express-session");
const customerService = require("../services/customerService");

// ==========================================
// STOREFRONT & DASHBOARD VIEW CONTROLLERS
// ==========================================

const renderHome = (req, res) => {
    res.render('index', { title: "Home", text: "Account Register", customer: req.customerInfo });
};

const renderMenu = (req, res) => {
    res.render("menu", { title: "Menu", text: "Menu", customer: req.customerInfo });
};

const renderAbout = (req, res) => {
    res.render('about', { title: "About Us", customer: req.customerInfo });
};

const renderUserDashboard = (req, res) => {
    const { fullname } = req.customerInfo;
    res.render('users/user_home', { username: fullname, title: "Dashboard", text: "Dashboard" });
};

const renderThankYou = (req, res) => {
    res.render("users/thank_you", { title: "Thank You", text: "Thank You", customer: req.customerInfo });
};

const renderMyOrders = (req, res) => {
    res.render("users/my_orders", { title: "My Orders", text: "My Orders" });
};

// ==========================================
// CHECKOUT & ORDER LIFECYCLE CONTROLLERS
// ==========================================

const renderCheckout = async (req, res) => {
    try {
        const { userName } = req.customerInfo;
        const hasItems = await customerService.hasCartItems(userName);

        if (!hasItems) {
            return res.redirect("/shopping-cart");
        }

        const address = await customerService.getUserAddress(userName);
        res.render("checkout", {
            title: "Order Checkout",
            text: "Order Checkout",
            address,
            customer: req.customerInfo
        });
    } catch (error) {
        console.error(error);
        res.redirect("/shopping-cart");
    }
};

const placeNewOrder = async (req, res) => {
    try {
        const { grandTotal, address, remarks, payment_mode } = req.body;
        const { userName } = req.customerInfo;

        await customerService.placeOrder({
            grandTotal,
            address,
            remarks,
            payment_mode,
            userName
        });

        res.send("success");
    } catch (e) {
        console.error(e.message);
        res.send("error");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { id } = req.query;
        const userName = req.customerInfo ? req.customerInfo.userName : null;
        if (userName) {
            const exists = await customerService.checkCustomerOrderExists(id, userName);
            if (!exists) {
                return res.send("error");
            }
        }
        await customerService.cancelOrder(id);
        res.send("success");
    } catch (err) {
        console.error(err);
        res.send("error");
    }
};

const fetchMyOrders = async (req, res) => {
    try {
        const { userName } = req.customerInfo;
        const data = await customerService.getCustomerOrders(userName);
        res.send(data);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderOrderDetails = async (req, res) => {
    if (!req.query.order_id) {
        return res.redirect("/users/my-orders");
    }

    try {
        const { order_id } = req.query;
        const { userName } = req.customerInfo;

        const exists = await customerService.checkCustomerOrderExists(order_id, userName);
        if (!exists) {
            return res.redirect("/users/my-orders");
        }

        const records = await customerService.getOrderDetails(order_id);
        res.render("users/my_orders_details", { title: "Order Details", text: "Order Details", records });
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

// ==========================================
// SESSION HELPER ENDPOINTS
// ==========================================

const checkUserLoggedIn = (req, res) => {
    res.json({ login: true });
};

const checkSessionCreated = (req, res) => {
    if (session.username === undefined) {
        res.redirect("/admin-login");
    } else {
        res.send(session.username);
    }
};

const testSession = (req, res) => {
    session.username = "John";
    res.send("Session Created.");
};

const renderIndex2 = (req, res) => {
    res.render("index_new");
};

const checkUserSession = (req, res) => {
    const userName = (req.customerInfo && req.customerInfo.userName) ||
                     (req.session && req.session.userName) ||
                     session.userName;
    if (userName === undefined) {
        res.redirect("/user-login");
    } else {
        res.redirect("/checkout");
    }
};

module.exports = {
    renderHome,
    renderMenu,
    renderAbout,
    renderUserDashboard,
    renderThankYou,
    renderMyOrders,
    renderCheckout,
    placeNewOrder,
    cancelOrder,
    fetchMyOrders,
    renderOrderDetails,
    checkUserLoggedIn,
    checkSessionCreated,
    testSession,
    renderIndex2,
    checkUserSession
};
