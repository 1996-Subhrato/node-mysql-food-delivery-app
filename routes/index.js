const express = require('express');
const router = express.Router();

const publicRoutes = require('./publicRoutes');
const customerRoutes = require('./customerRoutes');
const adminRoutes = require('./adminRoutes');

router.use('/', publicRoutes);
router.use('/users', customerRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
