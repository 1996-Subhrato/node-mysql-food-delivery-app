const path = require("path");
const { sign, verify } = require("jsonwebtoken");
const session = require("express-session");
const authService = require("../services/authService");
const { JWT_SECRET } = require("../middlewares/authMiddleware");

// ==========================================
// CUSTOMER AUTHENTICATION CONTROLLER
// ==========================================

const renderUserLogin = (req, res) => {
    res.render("user_login", { title: "Login", text: "Account Login" });
};

const renderUserSignup = (req, res) => {
    res.render("user_signup", { title: "Create Account", text: "Register", customer: req.customerInfo });
};

const userLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await authService.validateUserLogin(username, password);

        if (!user) {
            return res.send("invalid");
        }

        const payload = { fullname: user.name, mobile: user.mobile, userName: username };
        const jwtToken = sign(payload, JWT_SECRET, { expiresIn: "1d" });

        res.cookie('customerToken', jwtToken, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
        });

        if (req.session) {
            req.session.userName = username;
        }
        session.userName = username;

        res.send("success");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const userSignup = async (req, res) => {
    try {
        const { username, email, name, password, confirm, gender, address, mobile } = req.body;

        if (!username || !email || !name || !password || !confirm || !address || !mobile ||
            username.trim() === "" || email.trim() === "" || name.trim() === "" || password.trim() === "" ||
            confirm.trim() === "" || address.trim() === "" || mobile.trim() === "") {
            return res.send("empty");
        }
        if (req.files == null || !req.files.photo) {
            return res.send("photo");
        }
        if (password !== confirm) {
            return res.send("notMatched");
        }

        const userExists = await authService.checkUserExists(username);
        if (userExists) {
            return res.send("userExist");
        }

        const photo = req.files.photo;
        const serverPath = path.join(__dirname, '..', 'public', 'users', photo.name);
        const databasePath = `users/${photo.name}`;

        photo.mv(serverPath, async (uploadError) => {
            if (uploadError) {
                return res.send("notUploaded");
            }
            try {
                await authService.registerUser({
                    username,
                    password,
                    email,
                    name,
                    gender,
                    photoPath: databasePath,
                    mobile,
                    address
                });
                res.send("success");
            } catch (err) {
                console.error(err);
                res.send("error");
            }
        });
    } catch (e) {
        console.error(e.message);
        res.send("error");
    }
};

const userLogout = (req, res) => {
    res.clearCookie('customerToken');
    if (req.session) {
        req.session.userName = undefined;
    }
    session.userName = undefined;
    res.redirect("/user-login");
};

const userChangePassword = async (req, res) => {
    try {
        const { current, newPassword } = req.body;
        let userName = (req.customerInfo && req.customerInfo.userName) ||
                       (req.session && req.session.userName) ||
                       session.userName;

        if (!userName && req.cookies && req.cookies.customerToken) {
            try {
                const decoded = verify(req.cookies.customerToken, JWT_SECRET);
                userName = decoded.userName;
            } catch (e) {
                // Token verification error
            }
        }

        if (!userName) {
            return res.send("invalid");
        }

        const updated = await authService.changeUserPassword(userName, current, newPassword);
        if (!updated) {
            return res.send("invalid");
        }
        res.send("updated");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderUserChangePassword = (req, res) => {
    res.render('users/change_password', { title: "Change Password", text: "Change Password" });
};

// ==========================================
// ADMIN AUTHENTICATION CONTROLLER
// ==========================================

const renderAdminLogin = (req, res) => {
    res.render("admin_login", { title: "Admin Login", text: "Admin Login" });
};

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await authService.validateAdminLogin(email, password);

        if (!admin) {
            return res.send("invalid");
        }

        if (req.session) {
            req.session.adminEmail = email;
            req.session.adminName = admin.name;
        }
        session.adminEmail = email;
        session.adminName = admin.name;
        res.send("success");
    } catch (e) {
        console.error(e.message);
        return res.send("error");
    }
};

const logoutAdmin = (req, res) => {
    if (req.session) {
        req.session.adminName = undefined;
        req.session.adminEmail = undefined;
    }
    session.adminName = undefined;
    session.adminEmail = undefined;
    res.send("success");
};

const renderAdminChangePassword = (req, res) => {
    const adminName = (req.session && req.session.adminName) || session.adminName;
    if (adminName == undefined) {
        res.redirect("/admin-login");
    } else {
        res.render("admin_change_password", { title: "Change Password", text: "Change Password" });
    }
};

const adminChangePassword = async (req, res) => {
    try {
        const { current, newPassword } = req.body;
        const email = (req.session && req.session.adminEmail) || session.adminEmail;

        if (!email) {
            return res.send("invalid");
        }

        const updated = await authService.changeAdminPassword(email, current, newPassword);
        if (!updated) {
            return res.send("invalid");
        }
        res.send("updated");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

module.exports = {
    renderUserLogin,
    renderUserSignup,
    userLogin,
    userSignup,
    userLogout,
    userChangePassword,
    renderUserChangePassword,
    renderAdminLogin,
    adminLogin,
    logoutAdmin,
    renderAdminChangePassword,
    adminChangePassword
};
