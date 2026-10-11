const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fileUpload = require("express-fileupload");
const session = require("express-session");

const routes = require('./routes');
const requestLogger = require('./middlewares/requestLogger');

const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session configuration
app.use(
    session({
        key: "aahar",
        secret: process.env.SESSION_SECRET || "abc@123",
        saveUninitialized: true,
        resave: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24
        }
    })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(fileUpload({}));
app.use(express.urlencoded({ extended: false }));

// Mount Application Routes
app.use('/', routes);

// Handle 404 errors
app.use((req, res) => {
    res.status(404).render('pageNotFound', { title: "404", text: "Page Not Found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

// Database client
const db = require('./config/db');

// Port configuration & Server listener
const PORT = process.env.PORT || 3000;
app.set('port', PORT);

if (require.main === module) {
    const getTimestamp = requestLogger.getLocalTimestamp;

    db.connectDB()
        .then(() => {
            app.listen(PORT, () => {
                const env = process.env.NODE_ENV || 'development';
                console.log(`[${getTimestamp()}] [INFO]  [Server] Express HTTP Service Started Successfully`);
                console.log(`  ├─ Local URL   : http://localhost:${PORT}`);
                console.log(`  ├─ Environment : ${env}`);
                console.log(`  ├─ Process PID : ${process.pid}`);
                console.log(`  └─ Status      : Ready & accepting incoming requests\n`);
            });
        })
        .catch((error) => {
            console.error(`[${getTimestamp()}] [FATAL] [Server] Startup aborted due to database connection error:`, error.message);
            process.exit(1);
        });
}

module.exports = app;
