const Review = require('../models/review.model');
const { validateReviewSubmission, checkForSpam } = require('../utils/reviewValidator');

/**
 * Validate review submission middleware
 * Checks for required fields, format, and spam
 */
exports.validateReview = async (req, res, next) => {
    try {
        const { orderId, farmerId, rating, comment, title, tags, attachments } = req.body;
        
        // Basic validation
        const validation = validateReviewSubmission(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Review validation failed',
                errors: validation.errors
            });
        }
        
        // Check for spam/inappropriate content
        if (comment && checkForSpam(comment)) {
            return res.status(400).json({
                success: false,
                message: 'Review contains inappropriate content or spam links'
            });
        }
        
        if (title && checkForSpam(title)) {
            return res.status(400).json({
                success: false,
                message: 'Review title contains inappropriate content'
            });
        }
        
        next();
        
    } catch (error) {
        console.error('Error validating review:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating review',
            error: error.message
        });
    }
};

/**
 * Check if user owns the review
 */
exports.checkReviewOwnership = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const consumerId = req.user.id;
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        if (review.consumerId !== consumerId) {
            return res.status(403).json({
                success: false,
                message: 'You can only modify your own reviews'
            });
        }
        
        req.review = review;
        next();
        
    } catch (error) {
        console.error('Error checking ownership:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking ownership',
            error: error.message
        });
    }
};

/**
 * Check if user is the farmer of the reviewed product
 */
exports.checkFarmerOwnership = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const farmerId = req.user.id;
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        if (review.farmerId !== farmerId) {
            return res.status(403).json({
                success: false,
                message: 'You can only respond to reviews on your products'
            });
        }
        
        req.review = review;
        next();
        
    } catch (error) {
        console.error('Error checking farmer ownership:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking ownership',
            error: error.message
        });
    }
};

/**
 * Check if review status is modifiable
 */
exports.checkReviewModifiable = (req, res, next) => {
    const review = req.review;
    
    // Can only modify pending or approved reviews
    if (review.status === 'rejected' || review.status === 'flagged') {
        return res.status(403).json({
            success: false,
            message: `Cannot modify ${review.status} reviews`
        });
    }
    
    next();
};

/**
 * Check review approval status
 */
exports.checkReviewApproved = (req, res, next) => {
    const review = req.review;
    
    if (review.status !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Only approved reviews can be acted upon'
        });
    }
    
    next();
};

/**
 * Rate limit for review submissions
 * Prevent spam: max 5 reviews per day per consumer
 */
exports.reviewSubmissionRateLimit = async (req, res, next) => {
    try {
        const consumerId = req.user.id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const reviewsToday = await Review.countDocuments({
            consumerId,
            createdAt: { $gte: today }
        });
        
        if (reviewsToday >= 5) {
            return res.status(429).json({
                success: false,
                message: 'You can only submit 5 reviews per day',
                retryAfter: 86400
            });
        }
        
        next();
        
    } catch (error) {
        console.error('Error checking rate limit:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking rate limit',
            error: error.message
        });
    }
};

/**
 * Check for duplicate review
 * Prevent submitting multiple reviews for same order
 */
exports.checkDuplicateReview = async (req, res, next) => {
    try {
        const { orderId } = req.body;
        const consumerId = req.user.id;
        
        const existingReview = await Review.findOne({
            orderId,
            consumerId
        });
        
        if (existingReview) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted a review for this order',
                existingReviewId: existingReview.reviewId
            });
        }
        
        next();
        
    } catch (error) {
        console.error('Error checking duplicate:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking duplicate review',
            error: error.message
        });
    }
};

/**
 * Log review action (audit trail)
 */
exports.logReviewAction = (action) => {
    return async (req, res, next) => {
        try {
            // This would integrate with an audit log system
            const audit = {
                action,
                userId: req.user.id,
                userType: req.user.type,
                reviewId: req.params.reviewId || 'new',
                timestamp: new Date(),
                ipAddress: req.ip
            };
            
            // TODO: Log to audit collection
            console.log('Review Action Log:', audit);
            
            next();
        } catch (error) {
            // Don't block request if logging fails
            console.error('Error logging action:', error);
            next();
        }
    };
};

/**
 * Sanitize review response
 * Remove sensitive data before sending to client
 */
exports.sanitizeReviewResponse = (review) => {
    const sanitized = {
        reviewId: review.reviewId,
        orderId: review.orderId,
        farmerId: review.farmerId,
        rating: review.rating.overall,
        title: review.title,
        comment: review.comment,
        tags: review.tags,
        verified: review.verified,
        createdAt: review.createdAt,
        attachments: review.attachments
    };
    
    if (review.status === 'approved') {
        sanitized.farmerResponse = review.farmerResponse.response;
        sanitized.helpful = review.engagement.helpful;
    }
    
    return sanitized;
};

/**
 * Validate and update review
 */
exports.validateReviewUpdate = async (req, res, next) => {
    try {
        const review = req.review;
        const { title, comment, rating, tags, attachments } = req.body;
        
        // Validate new data
        if (title && title.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Title cannot exceed 100 characters'
            });
        }
        
        if (comment && comment.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Comment cannot exceed 1000 characters'
            });
        }
        
        if (rating) {
            if (rating.overall && (rating.overall < 1 || rating.overall > 5)) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating must be between 1-5'
                });
            }
        }
        
        next();
        
    } catch (error) {
        console.error('Error validating update:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating update',
            error: error.message
        });
    }
};
