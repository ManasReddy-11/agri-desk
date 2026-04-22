const mongoose = require('mongoose');

// ============================================================================
// REVIEW SCHEMA
// ============================================================================

const reviewSchema = new mongoose.Schema({
    // Core Identifiers
    reviewId: {
        type: String,
        unique: true,
        required: true,
        index: true,
        trim: true
    },
    
    orderId: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    
    consumerId: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    
    farmerId: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    
    // Rating Information
    rating: {
        overall: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: {
                validator: function(v) {
                    return Number.isInteger(v) && v >= 1 && v <= 5;
                },
                message: 'Rating must be an integer between 1 and 5'
            }
        },
        
        quality: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        
        delivery: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        
        packaging: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        
        communication: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        }
    },
    
    // Review Content
    comment: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: null
    },
    
    title: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null
    },
    
    // Tags/Categories
    tags: {
        type: [String],
        default: [],
        enum: [
            'quality_issue',
            'late_delivery',
            'damaged_product',
            'good_packaging',
            'excellent_communication',
            'poor_condition',
            'as_described',
            'recommend',
            'avoid'
        ]
    },
    
    // Engagement
    engagement: {
        likes: {
            type: Number,
            default: 0,
            min: 0
        },
        dislikes: {
            type: Number,
            default: 0,
            min: 0
        },
        helpful: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Status & Moderation
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'flagged'],
        default: 'pending',
        index: true
    },
    
    moderation: {
        approvedBy: {
            type: String,
            default: null
        },
        approvedAt: {
            type: Date,
            default: null
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: null
        },
        flaggedReason: {
            type: String,
            trim: true,
            default: null
        },
        flaggedAt: {
            type: Date,
            default: null
        }
    },
    
    // Media & Attachments
    attachments: {
        images: {
            type: [String],
            default: [],
            validate: {
                validator: function(v) {
                    return Array.isArray(v) && v.length <= 5;
                },
                message: 'Maximum 5 images allowed'
            }
        },
        videos: {
            type: [String],
            default: [],
            validate: {
                validator: function(v) {
                    return Array.isArray(v) && v.length <= 2;
                },
                message: 'Maximum 2 videos allowed'
            }
        }
    },
    
    // Verification
    verified: {
        type: Boolean,
        default: false,
        index: true
    },
    
    verificationDetails: {
        purchaseVerified: {
            type: Boolean,
            default: false
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        verificationMethod: {
            type: String,
            enum: ['order_match', 'manual_review'],
            default: null
        }
    },
    
    // Farmer Response
    farmerResponse: {
        response: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null
        },
        respondedAt: {
            type: Date,
            default: null
        }
    },
    
    // Analytics
    analytics: {
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        },
        shareCount: {
            type: Number,
            default: 0,
            min: 0
        },
        reportCount: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Version Control (for optimistic locking)
    _version: {
        type: Number,
        default: 0
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'reviews'
});

// ============================================================================
// INDICES FOR PERFORMANCE
// ============================================================================

// Composite indices for common queries
reviewSchema.index({ farmerId: 1, status: 1 });
reviewSchema.index({ farmerId: 1, createdAt: -1 });
reviewSchema.index({ consumerId: 1, createdAt: -1 });
reviewSchema.index({ 'rating.overall': 1, farmerId: 1 });
reviewSchema.index({ status: 1, verified: 1 });
reviewSchema.index({ createdAt: -1 });

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

// Average rating considering all rating factors
reviewSchema.virtual('averageRating').get(function() {
    const ratings = [
        this.rating.overall,
        this.rating.quality,
        this.rating.delivery,
        this.rating.packaging,
        this.rating.communication
    ].filter(r => r !== null);
    
    if (ratings.length === 0) return this.rating.overall;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
});

// Engagement ratio
reviewSchema.virtual('engagementRatio').get(function() {
    const total = this.engagement.likes + this.engagement.dislikes;
    if (total === 0) return 0;
    return ((this.engagement.likes / total) * 100).toFixed(1);
});

// ============================================================================
// METHODS
// ============================================================================

// Approve review
reviewSchema.methods.approveReview = function(adminId) {
    this.status = 'approved';
    this.moderation.approvedBy = adminId;
    this.moderation.approvedAt = new Date();
    this.verified = true;
    this.verificationDetails.purchaseVerified = true;
    this.verificationDetails.verifiedAt = new Date();
    this.verificationDetails.verificationMethod = 'manual_review';
    return this.save();
};

// Reject review
reviewSchema.methods.rejectReview = function(adminId, reason) {
    this.status = 'rejected';
    this.moderation.approvedBy = adminId;
    this.moderation.rejectionReason = reason;
    this.moderation.approvedAt = new Date();
    return this.save();
};

// Flag review for inappropriate content
reviewSchema.methods.flagReview = function(reason) {
    this.status = 'flagged';
    this.moderation.flaggedReason = reason;
    this.moderation.flaggedAt = new Date();
    return this.save();
};

// Add farmer response
reviewSchema.methods.addFarmerResponse = function(response) {
    if (!response || response.trim().length === 0) {
        throw new Error('Response cannot be empty');
    }
    
    this.farmerResponse.response = response.trim();
    this.farmerResponse.respondedAt = new Date();
    return this.save();
};

// Mark helpful
reviewSchema.methods.markHelpful = function() {
    this.engagement.helpful += 1;
    return this.save();
};

// Add analytics
reviewSchema.methods.incrementView = function() {
    this.analytics.viewCount += 1;
    return this.save();
};

// ============================================================================
// STATICS
// ============================================================================

// Get average rating for farmer
reviewSchema.statics.getFarmerAverageRating = async function(farmerId) {
    const result = await this.aggregate([
        {
            $match: {
                farmerId: farmerId,
                status: 'approved'
            }
        },
        {
            $group: {
                _id: '$farmerId',
                averageRating: { $avg: '$rating.overall' },
                totalReviews: { $sum: 1 },
                verified: { $sum: { $cond: ['$verified', 1, 0] } },
                avgQuality: { $avg: '$rating.quality' },
                avgDelivery: { $avg: '$rating.delivery' },
                avgPackaging: { $avg: '$rating.packaging' },
                avgCommunication: { $avg: '$rating.communication' }
            }
        }
    ]);
    
    return result.length > 0 ? result[0] : null;
};

// Get rating distribution
reviewSchema.statics.getRatingDistribution = async function(farmerId) {
    const result = await this.aggregate([
        {
            $match: {
                farmerId: farmerId,
                status: 'approved'
            }
        },
        {
            $group: {
                _id: '$rating.overall',
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);
    
    // Create distribution object (1-5 stars)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    result.forEach(item => {
        distribution[item._id] = item.count;
    });
    
    return distribution;
};

// Get farmer reviews by rating
reviewSchema.statics.getFarmerReviewsByRating = async function(farmerId, rating, limit = 10, skip = 0) {
    return this.find({
        farmerId: farmerId,
        'rating.overall': rating,
        status: 'approved'
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Get recent reviews
reviewSchema.statics.getRecentReviews = async function(limit = 10) {
    return this.find({ status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// ============================================================================
// HOOKS/MIDDLEWARE
// ============================================================================

// Update 'updatedAt' before saving
reviewSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = mongoose.model('Review', reviewSchema);
