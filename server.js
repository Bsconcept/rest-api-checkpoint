// Import required modules
const express = require('express');      // Express framework for building REST API
const mongoose = require('mongoose');    // MongoDB ODM for database operations
const dotenv = require('dotenv');        // Environment variables management

// Load environment variables from config/.env file
dotenv.config({ path: './config/.env' });

// Import User model
const User = require('./models/User');

// Initialize Express application
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

/**
 * Database Connection
 * Connect to MongoDB using Mongoose
 */
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1); // Exit process with failure
    }
};

// Call the database connection function
connectDB();

/**
 * Handle MongoDB connection events
 */
mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected from MongoDB');
});

/**
 * ========================
 * REST API ROUTES
 * ========================
 */

/**
 * @route   GET /api/users
 * @desc    Get all users from the database
 * @access  Public
 * @returns Array of user objects
 */
app.get('/api/users', async (req, res) => {
    try {
        // Fetch all users from database, exclude __v field
        const users = await User.find().select('-__v');
        
        // Send success response with users data
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        // Handle any server errors
        console.error('GET /api/users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to fetch users',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/users
 * @desc    Create a new user in the database
 * @access  Public
 * @returns Created user object
 */
app.post('/api/users', async (req, res) => {
    try {
        // Extract user data from request body
        const { name, email, age, role, isActive } = req.body;
        
        // Validate required fields
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name and email'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }
        
        // Create new user instance
        const newUser = new User({
            name,
            email,
            age: age || null,
            role: role || 'user',
            isActive: isActive !== undefined ? isActive : true
        });
        
        // Save user to database
        const savedUser = await newUser.save();
        
        // Remove __v field from response
        const userResponse = savedUser.toObject();
        delete userResponse.__v;
        
        // Send success response with created user
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userResponse
        });
    } catch (error) {
        // Handle validation or duplicate key errors
        console.error('POST /api/users error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Duplicate key error: Email already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to create user',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update a user by ID
 * @access  Public
 * @returns Updated user object
 */
app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updateData = req.body;
        
        // Validate if ID is provided
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Remove fields that shouldn't be updated
        delete updateData._id;
        delete updateData.__v;
        delete updateData.createdAt;
        
        // Add updated timestamp
        updateData.updatedAt = Date.now();
        
        // Find user by ID and update
        // { new: true } returns the updated document
        // { runValidators: true } ensures validation rules are applied
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { 
                new: true,           // Return the updated document
                runValidators: true, // Run model validations
                context: 'query'     // Required for some validators
            }
        ).select('-__v');
        
        // Check if user exists
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: `User with ID ${userId} not found`
            });
        }
        
        // Send success response with updated user
        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (error) {
        // Handle invalid ID format or other errors
        console.error('PUT /api/users/:id error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to update user',
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete a user by ID
 * @access  Public
 * @returns Success message
 */
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Validate if ID is provided
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        // Find user by ID and delete
        const deletedUser = await User.findByIdAndDelete(userId);
        
        // Check if user exists
        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: `User with ID ${userId} not found`
            });
        }
        
        // Send success response
        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: {
                id: userId,
                name: deletedUser.name,
                email: deletedUser.email
            }
        });
    } catch (error) {
        // Handle invalid ID format or other errors
        console.error('DELETE /api/users/:id error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to delete user',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get a single user by ID (Bonus route)
 * @access  Public
 * @returns User object
 */
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Find user by ID
        const user = await User.findById(userId).select('-__v');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: `User with ID ${userId} not found`
            });
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('GET /api/users/:id error:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to fetch user',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/users/active/status
 * @desc    Get all active users (Bonus route)
 * @access  Public
 * @returns Array of active users
 */
app.get('/api/users/active/status', async (req, res) => {
    try {
        const activeUsers = await User.findActiveUsers().select('-__v');
        
        res.status(200).json({
            success: true,
            count: activeUsers.length,
            data: activeUsers
        });
    } catch (error) {
        console.error('GET /api/users/active/status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to fetch active users',
            error: error.message
        });
    }
});

/**
 * Root route - API information
 */
app.get('/', (req, res) => {
    res.status(200).json({
        name: 'REST API with Express and Mongoose',
        version: '1.0.0',
        endpoints: {
            'GET /api/users': 'Get all users',
            'GET /api/users/:id': 'Get user by ID',
            'POST /api/users': 'Create new user',
            'PUT /api/users/:id': 'Update user by ID',
            'DELETE /api/users/:id': 'Delete user by ID',
            'GET /api/users/active/status': 'Get all active users'
        }
    });
});

/**
 * Handle 404 - Route not found
 * This middleware catches all undefined routes
 */
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

/**
 * Global error handling middleware
 * Catches any unhandled errors in the application
 */
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

/**
 * Start the server
 * Listen on specified port from environment variables
 */
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

/**
 * Handle graceful shutdown
 * Close server and database connections on app termination
 */
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// Export app for testing purposes
module.exports = app;
