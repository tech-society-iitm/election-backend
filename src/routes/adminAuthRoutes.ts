import express from 'express';
import * as adminAuthController from '../controllers/adminAuthController';

const router = express.Router();

router.post('/', adminAuthController.login);

export default router;
