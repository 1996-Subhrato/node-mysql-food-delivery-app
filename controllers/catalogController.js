const path = require("path");
const session = require("express-session");
const catalogService = require("../services/catalogService");

// ==========================================
// CATEGORY CONTROLLER
// ==========================================

const getCategories = async (req, res) => {
    try {
        const data = await catalogService.getAllCategories();
        res.send(data);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const addCategory = async (req, res) => {
    try {
        const { category } = req.body;
        await catalogService.addCategory(category);
        res.send("success");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const updateCategory = async (req, res) => {
    try {
        const categoryName = req.body.category;
        const categoryID = req.body.category_id;
        await catalogService.updateCategory(categoryID, categoryName);
        res.send("updated");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const deleteCategory = async (req, res) => {
    try {
        const catID = req.body.category_id;
        await catalogService.deleteCategory(catID);
        res.send("deleted");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderManageCategory = (req, res) => {
    const adminName = (req.session && req.session.adminName) || session.adminName;
    if (adminName == undefined) {
        res.redirect("/admin-login");
    } else {
        res.render("category", { title: "Manage Category", text: "Category" });
    }
};

// ==========================================
// SUBCATEGORY CONTROLLER
// ==========================================

const getSubcategoriesByCategory = async (req, res) => {
    try {
        const categoryid = req.query.category_id;
        const rows = await catalogService.getSubcategoriesByCategory(categoryid);
        res.send(rows);
    } catch (error) {
        console.error(error);
    }
};

const getAllSubcategories = async (req, res) => {
    try {
        const rows = await catalogService.getAllSubcategoriesWithCategory();
        res.send(rows);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const addSubcategory = async (req, res) => {
    try {
        const categoryID = req.body.category;
        const subCategory = req.body.subCategory;
        await catalogService.addSubcategory(categoryID, subCategory);
        res.send("added");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const updateSubcategory = async (req, res) => {
    try {
        const category = req.body.category;
        const subCategory = req.body.subCategory;
        const subCategory_ID = req.body.subCategory_ID;
        await catalogService.updateSubcategory(subCategory_ID, category, subCategory);
        res.send("updated");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const deleteSubcategory = async (req, res) => {
    try {
        const id = req.query.id;
        await catalogService.deleteSubcategory(id);
        res.send("deleted");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderManageSubcategory = async (req, res) => {
    const adminName = (req.session && req.session.adminName) || session.adminName;
    if (adminName == undefined) {
        res.redirect("/admin-login");
    } else {
        try {
            const rows = await catalogService.getCategoriesSorted();
            res.render("sub_category", { category: rows, title: "Manage SubCategory", text: "Manage SubCategory" });
        } catch (error) {
            console.error(error);
            res.render("sub_category", { category: [], title: "Manage SubCategory", text: "Manage SubCategory" });
        }
    }
};

// ==========================================
// PRODUCTS CONTROLLER
// ==========================================

const getAllProducts = async (req, res) => {
    try {
        const rows = await catalogService.getAllProducts();
        res.send(rows);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const getProductsBySubcategory = async (req, res) => {
    try {
        const { id } = req.query;
        const rows = await catalogService.getProductsBySubcategory(parseInt(id, 10));
        res.send(rows);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const viewProducts = async (req, res) => {
    try {
        const rows = await catalogService.getAllProductsWithSubcategory();
        res.send(rows);
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const addProduct = async (req, res) => {
    try {
        const subcategory = req.body.subcategory;
        const productName = req.body.productName;
        const price = req.body.price;
        const discount = req.body.discount;
        const description = req.body.description;
        const photo = req.files.image;

        const filePath = path.join(__dirname, '..', 'public', 'products', photo.name);
        const databasePath = `products/${photo.name}`;

        photo.mv(filePath, function (error) {
            if (error) {
                console.error(error);
            }
        });

        await catalogService.addProduct({
            productName,
            photoPath: databasePath,
            price,
            discount,
            description,
            subcategoryId: subcategory
        });
        res.send("added");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product_id = req.body.product_id;
        await catalogService.deleteProduct(product_id);
        res.send("deleted");
    } catch (error) {
        console.error(error);
        res.send("error");
    }
};

const renderManageProduct = async (req, res) => {
    const adminName = (req.session && req.session.adminName) || session.adminName;
    if (adminName === undefined) {
        res.redirect("/admin-login");
    } else {
        try {
            const rows = await catalogService.getCategoriesSorted();
            res.render("products", { category: rows, title: "Manage Products", text: "Manage Products" });
        } catch (error) {
            console.error(error);
            res.render("products", { category: [], title: "Manage Products", text: "Manage Products" });
        }
    }
};

// ==========================================
// CART CONTROLLER
// ==========================================

const getCartCount = async (req, res) => {
    try {
        const { userName } = req.customerInfo;
        const count = await catalogService.getCartCount(userName);
        res.send(count);
    } catch (e) {
        console.error(e.message);
        res.send("0");
    }
};

const handleCartAction = async (req, res) => {
    try {
        const { userName } = req.customerInfo;
        const { action } = req.body;

        if (action === "add") {
            const productObject = JSON.parse(req.body.productObject);
            await catalogService.addToCart(userName, productObject);
            res.send("success");
        } else if (action === "plus" || action === "minus") {
            const { pid } = req.body;
            await catalogService.updateQuantity(userName, pid, action);
            res.send("updated");
        } else if (action === "remove") {
            const { pid } = req.body;
            await catalogService.removeFromCart(userName, pid);
            res.send("removed");
        } else if (action === "cartCount") {
            const count = await catalogService.getCartCount(userName);
            res.send(count);
        } else if (action === "get-products") {
            const products = await catalogService.getCartProducts(userName);
            res.send(products);
        } else {
            res.send("");
        }
    } catch (e) {
        console.error(e.message);
        res.send("error");
    }
};

const renderShoppingCart = (req, res) => {
    res.render("shopping-cart", { title: "Your Cart", text: "Your Cart", customer: req.customerInfo });
};

module.exports = {
    getCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    renderManageCategory,
    getSubcategoriesByCategory,
    getAllSubcategories,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    renderManageSubcategory,
    getAllProducts,
    getProductsBySubcategory,
    viewProducts,
    addProduct,
    deleteProduct,
    renderManageProduct,
    getCartCount,
    handleCartAction,
    renderShoppingCart
};
