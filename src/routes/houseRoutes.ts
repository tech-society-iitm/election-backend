const express = require('express');
const houseController = require('../controllers/houseController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Protect all routes
// router.use(authMiddleware.protect);

// Routes accessible to all authenticated users
router.get('/', houseController.getAllHouses);
router.get('/:id', houseController.getHouse);

// Admin only routes
router.use(authMiddleware.restrictTo('admin'));

router.route('/')
  .post(houseController.createHouse);

router.route('/:id')
  .patch(houseController.updateHouse)
  .delete(houseController.deleteHouse);

// Member management
router.post('/:id/members', houseController.addMembers);
router.delete('/:id/members/:userId', houseController.removeMember);

export default router;
