const Review = require('../models/review.model');
const { generateReviewId } = require('../utils/reviewId');

// ============================================================================
// CONSUMER OPERATIONS
// ============================================================================

/**
 * Submit a review for a farmer after purchase
 * POST /api/review/submit
 */
exports.submitReview = async (req, res) => {
    try {
        const {
            orderId,
            farmerId,
            title,
            comment,
            rating,
            tags,
            attachments
        } = req.body;
        
        const consumerId = req.user.id;
        
        // Validation
        if (!orderId || !farmerId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and Farmer ID are required'
            });
        }
        
        if (!rating || !rating.overall || rating.overall < 1 || rating.overall > 5) {
            return res.status(400).json({
                success: false,
                message: 'Valid overall rating (1-5) is required'
            });
        }
        
        // Check if review already exists for this order
        const existingReview = await Review.findOne({
            orderId: orderId,
            consumerId: consumerId
        });
        
        if (existingReview) {
            return res.status(409).json({
                success: false,
                message: 'You have already submitted a review for this order'
            });
        }
        
        // Create new review
        const reviewId = generateReviewId();
        
        const newReview = new Review({
            reviewId,
            orderId,
            consumerId,
            farmerId,
            title: title || `Review for order ${orderId}`,
            comment: comment || '',
            rating: {
                overall: rating.overall,
                quality: rating.quality || null,
                delivery: rating.delivery || null,
                packaging: rating.packaging || null,
                communication: rating.communication || null
            },
            tags: tags || [],
            attachments: attachments || { images: [], videos: [] },
            verified: false,
            status: 'pending'
        });
        
        await newReview.save();
        
        res.status(201).json({
            success: true,
            message: 'Review submitted successfully. Pending approval.',
            data: {
                review: {
                    reviewId: newReview.reviewId,
                    orderId: newReview.orderId,
                    farmerId: newReview.farmerId,
                    rating: newReview.rating.overall,
                    status: newReview.status,
                    createdAt: newReview.createdAt
                }
            }
        });
        
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting review',
            error: error.message
        });
    }
};

/**
 * Update consumer's own review
 * PUT /api/review/:reviewId
 */
exports.updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const consumerId = req.user.id;
        
        const { title, comment, rating, tags, attachments } = req.body;
        
        // Find review
        const review = await Review.findOne({
            reviewId: reviewId,
            consumerId: consumerId
        });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        // Can only update pending or approved reviews, not rejected
        if (review.status === 'rejected') {
            return res.status(403).json({
                success: false,
                message: 'Cannot update rejected reviews'
            });
        }
        
        // Update fields
        if (title) review.title = title;
        if (comment) review.comment = comment;
        if (rating && rating.overall) {
            review.rating.overall = rating.overall;
            if (rating.quality) review.rating.quality = rating.quality;
            if (rating.delivery) review.rating.delivery = rating.delivery;
            if (rating.packaging) review.rating.packaging = rating.packaging;
            if (rating.communication) review.rating.communication = rating.communication;
        }
        if (tags) review.tags = tags;
        if (attachments) review.attachments = attachments;
        
        // Reset status to pending if approved (for re-review)
        if (review.status === 'approved') {
            review.status = 'pending';
        }
        
        await review.save();
        
        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: {
                review: {
                    reviewId: review.reviewId,
                    rating: review.rating.overall,
                    comment: review.comment,
                    status: review.status,
                    updatedAt: review.updatedAt
                }
            }
        });
        
    } catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating review',
            error: error.message
        });
    }
};

/**
 * Delete consumer's own review
 * DELETE /api/review/:reviewId
 */
exports.deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const consumerId = req.user.id;
        
        const review = await Review.findOne({
            reviewId: reviewId,
            consumerId: consumerId
        });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        await Review.deleteOne({ reviewId });
        
        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
};

/**
 * Get consumer's own reviews
 * GET /api/review/my-reviews
 */
exports.getMyReviews = async (req, res) => {
    try {
        const consumerId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        
        const skip = (page - 1) * limit;
        
        const [reviews, total] = await Promise.all([
            Review.find({ consumerId })
                .sort({ createdAt: -1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            Review.countDocuments({ consumerId })
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
};

// ============================================================================
// PUBLIC OPERATIONS - GET RATINGS & REVIEWS
// ============================================================================

/**
 * Get farmer's average rating and stats
 * GET /api/review/farmer/:farmerId/stats
 */
exports.getFarmerRatings = async (req, res) => {
    try {
        const { farmerId } = req.params;
        
        const [stats, distribution, topReviews] = await Promise.all([
            Review.getFarmerAverageRating(farmerId),
            Review.getRatingDistribution(farmerId),
            Review.find({
                farmerId,
                status: 'approved'
            })
            .sort({ 'engagement.helpful': -1, createdAt: -1 })
            .limit(5)
            .lean()
        ]);
        
        if (!stats) {
            return res.status(200).json({
                success: true,
                data: {
                    farmerId,
                    stats: null,
                    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                    topReviews: [],
                    message: 'No reviews yet'
                }
            });
        }
        
        res.status(200).json({
            success: true,
            data: {
                stats: {
                    averageRating: stats.averageRating,
                    totalReviews: stats.totalReviews,
                    verifiedReviews: stats.verified,
                    ratings: {
                        average: stats.averageRating,
                        quality: stats.avgQuality || 0,
                        delivery: stats.avgDelivery || 0,
                        packaging: stats.avgPackaging || 0,
                        communication: stats.avgCommunication || 0
                    }
                },
                distribution,
                topReviews: topReviews.map(r => ({
                    reviewId: r.reviewId,
                    rating: r.rating.overall,
                    comment: r.comment,
                    title: r.title,
                    helpful: r.engagement.helpful,
                    createdAt: r.createdAt
                }))
            }
        });
        
    } catch (error) {
        console.error('Error fetching farmer ratings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ratings',
            error: error.message
        });
    }
};

/**
 * Get farmer's reviews (paginated, filtered)
 * GET /api/review/farmer/:farmerId/reviews
 */
exports.getFarmerReviews = async (req, res) => {
    try {
        const { farmerId } = req.params;
        const { page = 1, limit = 10, rating, sort = 'newest' } = req.query;
        
        const skip = (page - 1) * limit;
        
        let query = {
            farmerId,
            status: 'approved',
            verified: true
        };
        
        if (rating) {
            query['rating.overall'] = parseInt(rating);
        }
        
        let sortOption = { createdAt: -1 };
        if (sort === 'highest') sortOption = { 'rating.overall': -1, createdAt: -1 };
        if (sort === 'lowest') sortOption = { 'rating.overall': 1, createdAt: -1 };
        if (sort === 'helpful') sortOption = { 'engagement.helpful': -1, createdAt: -1 };
        
        const [reviews, total] = await Promise.all([
            Review.find(query)
                .sort(sortOption)
                .limit(parseInt(limit))
                .skip(skip)
                .select('reviewId title comment rating engagement verified createdAt farmerResponse consumerId')
                .lean(),
            Review.countDocuments(query)
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                reviews: reviews.map(r => ({
                    reviewId: r.reviewId,
                    rating: r.rating.overall,
                    title: r.title,
                    comment: r.comment,
                    helpful: r.engagement.helpful,
                    verified: r.verified,
                    hasResponse: !!r.farmerResponse.response,
                    createdAt: r.createdAt
                })),
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching farmer reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
};

/**
 * Get single review
 * GET /api/review/:reviewId
 */
exports.getReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        
        const review = await Review.findOne({ reviewId })
            .select('-_version');
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        if (review.status !== 'approved' && review.status !== 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Review not available'
            });
        }
        
        // Increment view count
        review.incrementView().catch(err => console.error('Error updating view:', err));
        
        res.status(200).json({
            success: true,
            data: { review }
        });
        
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching review',
            error: error.message
        });
    }
};

/**
 * Mark review as helpful
 * POST /api/review/:reviewId/helpful
 */
exports.markHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        review.engagement.helpful += 1;
        await review.save();
        
        res.status(200).json({
            success: true,
            message: 'Review marked as helpful',
            data: {
                helpful: review.engagement.helpful
            }
        });
        
    } catch (error) {
        console.error('Error marking helpful:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking review',
            error: error.message
        });
    }
};

// ============================================================================
// FARMER OPERATIONS
// ============================================================================

/**
 * Add farmer response to review
 * POST /api/review/:reviewId/farmer-response
 */
exports.addFarmerResponse = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { response } = req.body;
        const farmerId = req.user.id;
        
        if (!response || response.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Response cannot be empty'
            });
        }
        
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
        
        if (review.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Can only respond to approved reviews'
            });
        }
        
        review.farmerResponse.response = response.trim();
        review.farmerResponse.respondedAt = new Date();
        await review.save();
        
        res.status(200).json({
            success: true,
            message: 'Response added successfully',
            data: {
                reviewId: review.reviewId,
                farmerResponse: review.farmerResponse
            }
        });
        
    } catch (error) {
        console.error('Error adding farmer response:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding response',
            error: error.message
        });
    }
};

/**
 * Get farmer's reviews (awaiting response)
 * GET /api/review/farmer/my-reviews
 */
exports.getFarmerPendingReviews = async (req, res) => {
    try {
        const farmerId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        
        const skip = (page - 1) * limit;
        
        const [reviews, total] = await Promise.all([
            Review.find({
                farmerId,
                status: 'approved',
                'farmerResponse.response': null
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .lean(),
            Review.countDocuments({
                farmerId,
                status: 'approved',
                'farmerResponse.response': null
            })
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                reviews: reviews.map(r => ({
                    reviewId: r.reviewId,
                    rating: r.rating.overall,
                    title: r.title,
                    comment: r.comment,
                    createdAt: r.createdAt
                })),
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
};

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * Get all pending reviews for moderation
 * GET /api/review/admin/pending
 */
exports.getPendingReviews = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        
        const skip = (page - 1) * limit;
        
        const [reviews, total] = await Promise.all([
            Review.find({ status: 'pending' })
                .sort({ createdAt: 1 })
                .limit(parseInt(limit))
                .skip(skip)
                .lean(),
            Review.countDocuments({ status: 'pending' })
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                reviews,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Error fetching pending reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reviews',
            error: error.message
        });
    }
};

/**
 * Approve review
 * POST /api/review/:reviewId/approve
 */
exports.approveReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const adminId = req.user.id;
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        await review.approveReview(adminId);
        
        res.status(200).json({
            success: true,
            message: 'Review approved successfully',
            data: {
                reviewId: review.reviewId,
                status: review.status
            }
        });
        
    } catch (error) {
        console.error('Error approving review:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving review',
            error: error.message
        });
    }
};

/**
 * Reject review
 * POST /api/review/:reviewId/reject
 */
exports.rejectReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        await review.rejectReview(adminId, reason);
        
        res.status(200).json({
            success: true,
            message: 'Review rejected successfully',
            data: {
                reviewId: review.reviewId,
                status: review.status
            }
        });
        
    } catch (error) {
        console.error('Error rejecting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting review',
            error: error.message
        });
    }
};

/**
 * Flag review (abuse/inappropriate content)
 * POST /api/review/:reviewId/flag
 */
exports.flagReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        
        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason is required'
            });
        }
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        await review.flagReview(reason);
        
        res.status(200).json({
            success: true,
            message: 'Review flagged for review',
            data: {
                reviewId: review.reviewId,
                status: review.status
            }
        });
        
    } catch (error) {
        console.error('Error flagging review:', error);
        res.status(500).json({
            success: false,
            message: 'Error flagging review',
            error: error.message
        });
    }
};

/**
 * Get review statistics
 * GET /api/review/admin/stats
 */
exports.getReviewStatistics = async (req, res) => {
    try {
        const stats = await Review.aggregate([
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                                pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                                flagged: { $sum: { $cond: [{ $eq: ['$status', 'flagged'] }, 1, 0] } },
                                verified: { $sum: { $cond: ['$verified', 1, 0] } },
                                averageRating: { $avg: '$rating.overall' }
                            }
                        }
                    ],
                    byRating: [
                        {
                            $group: {
                                _id: '$rating.overall',
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    recentFlags: [
                        { $match: { status: 'flagged' } },
                        { $sort: { 'moderation.flaggedAt': -1 } },
                        { $limit: 10 },
                        { $project: { reviewId: 1, farmerId: 1, reason: '$moderation.flaggedReason' } }
                    ]
                }
            }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                stats: stats[0]
            }
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};

/**
 * Delete review (admin force delete)
 * DELETE /api/review/admin/:reviewId
 */
exports.deleteReviewAdmin = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { reason } = req.body;
        
        const review = await Review.findOne({ reviewId });
        
        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            });
        }
        
        await Review.deleteOne({ reviewId });
        
        res.status(200).json({
            success: true,
            message: 'Review deleted successfully',
            data: {
                deletedReviewId: reviewId,
                reason: reason || 'No reason provided'
            }
        });
        
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting review',
            error: error.message
        });
    }
};

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get farmers ranking by rating
 * GET /api/review/admin/farmers-ranking
 */
exports.getFarmersRanking = async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const ranking = await Review.aggregate([
            {
                $match: { status: 'approved' }
            },
            {
                $group: {
                    _id: '$farmerId',
                    averageRating: { $avg: '$rating.overall' },
                    totalReviews: { $sum: 1 },
                    verifiedReviews: { $sum: { $cond: ['$verified', 1, 0] } }
                }
            },
            {
                $sort: { averageRating: -1, totalReviews: -1 }
            },
            {
                $limit: parseInt(limit)
            }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                ranking
            }
        });
        
    } catch (error) {
        console.error('Error fetching ranking:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ranking',
            error: error.message
        });
    }
};
