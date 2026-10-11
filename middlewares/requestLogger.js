const morgan = require('morgan');

/**
 * Format local timestamp: YYYY-MM-DD HH:mm:ss
 */
const getLocalTimestamp = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ANSI 256/16 Color Palettes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    gray: '\x1b[90m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m'
};

/**
 * Format bytes into readable string (B, KB, MB)
 */
const formatBytes = (bytes) => {
    if (!bytes || isNaN(bytes)) return '-';
    const num = parseInt(bytes, 10);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Return concise canonical HTTP status label
 */
const getStatusPhrase = (status) => {
    const code = parseInt(status, 10);
    switch (code) {
        case 200: return 'OK';
        case 201: return 'CREATED';
        case 204: return 'NO_CONTENT';
        case 301: return 'MOVED';
        case 302: return 'FOUND';
        case 304: return 'NOT_MODIFIED';
        case 400: return 'BAD_REQ';
        case 401: return 'UNAUTHORIZED';
        case 403: return 'FORBIDDEN';
        case 404: return 'NOT_FOUND';
        case 409: return 'CONFLICT';
        case 500: return 'INTERNAL_ERR';
        case 502: return 'BAD_GATEWAY';
        case 503: return 'UNAVAILABLE';
        default: return '';
    }
};

/**
 * Professional Enterprise HTTP Request Logger
 */
const requestLogger = morgan((tokens, req, res) => {
    const status = parseInt(tokens.status(req, res) || '200', 10);
    const method = (tokens.method(req, res) || 'GET').toUpperCase();
    const url = tokens.url(req, res) || '/';
    const responseTime = parseFloat(tokens['response-time'](req, res) || '0').toFixed(2);
    const contentLength = tokens.res(req, res, 'content-length');

    // Extract and sanitize client IP
    const rawIp = tokens['remote-addr'](req, res) || req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
    const ip = rawIp === '::1' || rawIp === '::ffff:127.0.0.1' ? '127.0.0.1' : rawIp.replace(/^.*:/, '');

    // Status Level badge & coloring
    let levelBadge = `${colors.green}[INFO] ${colors.reset}`;
    let statusColor = colors.green;
    if (status >= 500) {
        levelBadge = `${colors.red}[ERROR]${colors.reset}`;
        statusColor = colors.red;
    } else if (status >= 400) {
        levelBadge = `${colors.yellow}[WARN] ${colors.reset}`;
        statusColor = colors.yellow;
    } else if (status >= 300) {
        levelBadge = `${colors.cyan}[INFO] ${colors.reset}`;
        statusColor = colors.cyan;
    }

    // Method badge & color coding
    const methodColors = {
        GET: colors.cyan,
        POST: colors.green,
        PUT: colors.yellow,
        DELETE: colors.red,
        PATCH: colors.magenta,
        HEAD: colors.gray
    };
    const mColor = methodColors[method] || colors.white;
    const paddedMethod = `${mColor}${method.padEnd(6, ' ')}${colors.reset}`;

    // Status label formatting e.g. "200 OK"
    const phrase = getStatusPhrase(status);
    const statusLabel = phrase ? `${status} ${phrase}` : `${status}`;
    const formattedStatus = `${statusColor}${statusLabel.padEnd(14, ' ')}${colors.reset}`;

    // Response latency color thresholds
    let timeColor = colors.magenta;
    if (parseFloat(responseTime) > 1000) timeColor = colors.red;
    else if (parseFloat(responseTime) > 300) timeColor = colors.yellow;
    const formattedTime = `${timeColor}${`${responseTime}ms`.padStart(9, ' ')}${colors.reset}`;

    // Byte size formatting
    const formattedSize = `${colors.gray}${formatBytes(contentLength).padStart(8, ' ')}${colors.reset}`;
    const paddedUrl = `${colors.bright}${url.padEnd(34, ' ')}${colors.reset}`;

    const timestamp = `${colors.gray}[${getLocalTimestamp()}]${colors.reset}`;
    const component = `${colors.blue}[HTTP]  ${colors.reset}`;
    const client = `${colors.dim}(${ip})${colors.reset}`;

    return `${timestamp} ${levelBadge} ${component} ${paddedMethod} ${paddedUrl} → ${formattedStatus} ${formattedTime} ${formattedSize}  ${client}`;
}, {
    skip: (req) => req.url === '/favicon.ico' || process.env.SILENT_LOGS === 'true'
});

module.exports = requestLogger;
module.exports.getLocalTimestamp = getLocalTimestamp;
