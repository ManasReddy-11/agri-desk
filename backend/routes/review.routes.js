const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { requireAuth, requireConsumer, requireFarmer, requireAdmin } = require('../middleware/auth.middleware');
const { validateReview } = require('../middleware/reviewAuth.middleware');

// ============================================================================
// PUBLIC ROUTES - No Authentication Required
// ============================================================================

/**
 * Get farmer's average rating and statistics
 * GET /api/review/farmer/:farmerId/stats
 */
router.get('/farmer/:farmerId/stats', reviewController.getFarmerRatings);

/**
 * Get farmer's reviews (paginated, filtered)
 * GET /api/review/farmer/:farmerId/reviews
 * Query params: page, limit, rating, sort
 */
router.get('/farmer/:farmerId/reviews', reviewController.getFarmerReviews);

/**
 * Get single review details
 * GET /api/review/:reviewId
 */
router.get('/:reviewId', reviewController.getReview);

/**
 * Mark review as helpful (public)
 * POST /api/review/:reviewId/helpful
 */
router.post('/:reviewId/helpful', reviewController.markHelpful);

// ============================================================================
// CONSUMER ROUTES - Authentication Required (Consumer)
// ============================================================================

/**
 * Submit a new review
 * POST /api/review/submit
 * Body: { orderId, farmerId, title, comment, rating, tags, attachments }
 */
router.post('/submit', requireAuth, requireConsumer, reviewController.submitReview);

/**
 * Get consumer's own reviews
 * GET /api/review/my-reviews
 * Query params: page, limit
 */
router.get('/my-reviews', requireAuth, requireConsumer, reviewController.getMyReviews);

/**
 * Update consumer's own review
 * PUT /api/review/:reviewId
 * Body: { title, comment, rating, tags, attachments }
 */
router.put('/:reviewId', requireAuth, requireConsumer, reviewController.updateReview);

/**
 * Delete consumer's own review
 * DELETE /api/review/:reviewId
 */
router.delete('/:reviewId', requireAuth, requireConsumer, reviewController.deleteReview);

// ============================================================================
// FARMER ROUTES - Authentication Required (Farmer)
// ============================================================================

/**
 * Add response to a review
 * POST /api/review/:reviewId/farmer-response
 * Body: { response }
 */
router.post('/:reviewId/farmer-response', requireAuth, requireFarmer, reviewController.addFarmerResponse);

/**
 * Get farmer's pending reviews (needing response)
 * GET /api/review/farmer/my-reviews/pending
 * Query params: page, limit
 */
router.get('/farmer/my-reviews/pending', requireAuth, requireFarmer, reviewController.getFarmerPendingReviews);

// ============================================================================
// ADMIN ROUTES - Authentication Required (Admin)
// ============================================================================

/**
 * Get pending reviews for moderation
 * GET /api/review/admin/pending
 * Query params: page, limit
 */
router.get('/admin/pending', requireAuth, requireAdmin, reviewController.getPendingReviews);

/**
 * Approve a review
 * POST /api/review/admin/:reviewId/approve
 */
router.post('/admin/:reviewId/approve', requireAuth, requireAdmin, reviewController.approveReview);

/**
 * Reject a review
 * POST /api/review/admin/:reviewId/reject
 * Body: { reason }
 */
router.post('/admin/:reviewId/reject', requireAuth, requireAdmin, reviewController.rejectReview);

/**
 * Flag review for inappropriate content
 * POST /api/review/admin/:reviewId/flag
 * Body: { reason }
 */
router.post('/admin/:reviewId/flag', requireAuth, requireAdmin, reviewController.flagReview);

/**
 * Get review statistics and analytics
 * GET /api/review/admin/stats
 */
router.get('/admin/stats', requireAuth, requireAdmin, reviewController.getReviewStatistics);

/**
 * Get farmers ranking by rating
 * GET /api/review/admin/farmers-ranking
 * Query params: limit
 */
router.get('/admin/farmers-ranking', requireAuth, requireAdmin, reviewController.getFarmersRanking);

/**
 * Delete review (admin force delete)
 * DELETE /api/review/admin/:reviewId
 * Body: { reason }
 */
router.delete('/admin/:reviewId', requireAuth, requireAdmin, reviewController.deleteReviewAdmin);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 - Route not found
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Review endpoint not found'
    });
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = router;
