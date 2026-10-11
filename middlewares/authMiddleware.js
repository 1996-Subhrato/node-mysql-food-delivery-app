const { verify } = require("jsonwebtoken");
const session = require("express-session");

const JWT_SECRET = process.env.JWT_SECRET || "&123@abc#";

/**
 * Middleware: Protect customer view routes (redirects to /user-login on failure)
 */
const authorizeCustomerForViews = (req, res, next) => {
    const accessToken = req.cookies.customerToken;

    if (!accessToken) {
        return res.redirect("/user-login");
    }

    try {
        req.customerInfo = verify(accessToken, JWT_SECRET);
        next();
    } catch (err) {
        return res.redirect("/user-login");
    }
};

/**
 * Middleware: Protect customer AJAX/POST endpoints (responds with "jwt" string on failure)
 */
const authorizeCustomerForPOST = (req, res, next) => {
    const accessToken = req.cookies.customerToken;

    if (!accessToken) {
        return res.send("jwt");
    }

    try {
        req.customerInfo = verify(accessToken, JWT_SECRET);
        next();
    } catch (err) {
        return res.send("jwt");
    }
};

/**
 * Middleware: Optional customer authentication for public views (home, menu, etc.)
 */
const authorizeCustomerForPublicViews = (req, res, next) => {
    const accessToken = req.cookies.customerToken;

    if (!accessToken) {
        req.customerInfo = null;
    } else {
        try {
            req.customerInfo = verify(accessToken, JWT_SECRET);
        } catch (err) {
            req.customerInfo = null;
        }
    }
    next();
};

/**
 * Middleware: Protect admin routes (redirects to /admin-login on failure)
 */
const isAdminLoggedIn = (req, res, next) => {
    const adminName = (req.session && req.session.adminName) || session.adminName;
    if (adminName === undefined) {
        res.redirect("/admin-login");
    } else {
        next();
    }
};

module.exports = {
    JWT_SECRET,
    authorizeCustomerForViews,
    authorizeCustomerForPOST,
    authorizeCustomerForPublicViews,
    isAdminLoggedIn
};
