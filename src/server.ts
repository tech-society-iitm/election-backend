import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { Server } from 'http';
import app from './app';

// Define error interface
interface ProcessError extends Error {
  name: string;
  message: string;
}

// Uncaught exception handler
process.on('uncaughtException', (err: ProcessError) => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Get MongoDB URI from environment variables
const DB = process.env.MONGODB_URI;

// Debug log to verify MONGODB_URI
console.log('MONGODB_URI:', process.env.MONGODB_URI);

// Connect to MongoDB using the URI from .env
mongoose
    .connect(DB as string)
    .then(() => console.log('DB connection successful!'));

// Start server
const port = process.env.PORT || 3000;
const server: Server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

// Unhandled rejection handler
process.on('unhandledRejection', (err: ProcessError) => {
    console.log('UNHANDLED REJECTION! 2 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM signal
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
