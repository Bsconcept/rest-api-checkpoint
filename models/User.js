// Import mongoose for database modeling
const mongoose = require('mongoose');

/**
 * User Schema Definition
 * Defines the structure of user documents in the database
 */
const userSchema = new mongoose.Schema({
    // User's full name - required field
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    
    // User's email address - unique identifier
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    
    // User's age - optional field with validation
    age: {
        type: Number,
        min: [0, 'Age cannot be negative'],
        max: [150, 'Age cannot exceed 150']
    },
    
    // User's role - with default value
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    
    // User's active status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // User's creation date (automatically managed)
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    // User's last update date
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    // Enable timestamps for automatic createdAt/updatedAt management
    timestamps: true,
    // Enable virtual properties to be included in JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

/**
 * Pre-save middleware: Hash password or modify data before saving
 * This runs before saving any user document
 */
userSchema.pre('save', function(next) {
    // Update the updatedAt field
    this.updatedAt = Date.now();
    next();
});

/**
 * Instance method: Get user's full profile information
 * This method is available on all user instances
 */
userSchema.methods.getProfile = function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        age: this.age,
        role: this.role,
        isActive: this.isActive,
        createdAt: this.createdAt
    };
};

/**
 * Static method: Find active users
 * This method is available on the User model itself
 */
userSchema.statics.findActiveUsers = function() {
    return this.find({ isActive: true });
};

/**
 * Virtual property: Get user's display name
 * This is a computed property not stored in the database
 */
userSchema.virtual('displayName').get(function() {
    return `${this.name} (${this.email})`;
});

// Create and export the User model
const User = mongoose.model('User', userSchema);

module.exports = User;
