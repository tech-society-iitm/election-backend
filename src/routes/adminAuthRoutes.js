const express = require('express');
const adminAuthController = require('../controllers/adminAuthController');

const router = express.Router();

router.post('/', adminAuthController.login);

module.exports = router;
