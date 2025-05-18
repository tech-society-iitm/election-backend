// routes/webhook.routes.ts
import express, { Request, Response } from 'express';
import User from "../models/userModel";
import { verifyWebhook } from '@clerk/express/webhooks';

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req:Request, res:Response): Promise<any> => {
  try {
    const evt = await verifyWebhook(req)

    // Do something with payload
    // For this guide, log payload to console
    const eventType = evt.type
    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;
      if (!email_addresses || email_addresses.length === 0) {
        console.error('No email address found for user');
        return res.status(400).json({ error: 'No email address found for user' });
      }

      console.log(`User ${id} was created`);

      // Check if user already exists in your database
      const existingUser = await User.findOne({ clerkId: id });

      if (!existingUser) {
        // Create new user in MongoDB
        const newUser = new User({
          clerkId: id,
          email: email_addresses[0].email_address,
          name: `${first_name || ''} ${last_name || ''}`.trim(),
          role: 'user', // Default role
          active: true,
          profileImage: image_url,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await newUser.save();
        console.log('User saved to database');
      }
    }

    return res.status(200).send('Webhook received')
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return res.status(400).send('Error verifying webhook')
  }
})

export default router;
