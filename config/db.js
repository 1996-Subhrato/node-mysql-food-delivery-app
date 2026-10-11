const mysql = require("mysql");

const dbConfig = {
    host: process.env.FOOD_DB_HOST || "localhost",
    user: process.env.FOOD_DB_USER || "root",
    password: process.env.FOOD_DB_PASSWORD || "system",
    database: process.env.FOOD_DB_NAME || "node_food_delivery",
    port: parseInt(process.env.FOOD_DB_PORT || "3306", 10)
};

const connection = mysql.createConnection(dbConfig);

let isConnected = false;

const getTimestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const connectDB = () => {
    return new Promise((resolve, reject) => {
        if (isConnected || connection.state === 'authenticated') {
            return resolve(connection);
        }
        connection.connect(function (error) {
            if (error) {
                console.error(`[${getTimestamp()}] [ERROR] [Database] Connection failed: ${error.message}`);
                return reject(error);
            }
            isConnected = true;
            console.log(`[${getTimestamp()}] [INFO]  [Database] MySQL Connection Established Successfully`);
            console.log(`  ├─ Database : ${dbConfig.database}`);
            console.log(`  ├─ Host     : ${dbConfig.host}:${dbConfig.port}`);
            console.log(`  ├─ User     : ${dbConfig.user}`);
            console.log(`  └─ Status   : Online (Thread ID: ${connection.threadId || 'active'})\n`);
            resolve(connection);
        });
    });
};

connection.connectDB = connectDB;

module.exports = connection;
