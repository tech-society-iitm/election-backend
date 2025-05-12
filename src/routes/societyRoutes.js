const express = require('express');
const societyController = require('../controllers/societyController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware.protect);

// Routes accessible to all authenticated users
router.get('/', societyController.getAllSocieties);
router.get('/:id', societyController.getSociety);

// Admin only routes for creation
router.post('/', 
  authMiddleware.restrictTo('admin'),
  societyController.createSociety
);

// Admin and society lead routes
router.patch('/:id',
  societyController.checkSocietyAccess,
  societyController.updateSociety
);

router.delete('/:id',
  authMiddleware.restrictTo('admin'),
  societyController.deleteSociety
);

// Member management
router.post('/:id/members',
  societyController.checkSocietyAccess,
  societyController.addMembers
);

router.delete('/:id/members/:userId',
  societyController.checkSocietyAccess,
  societyController.removeMember
);

module.exports = router;
