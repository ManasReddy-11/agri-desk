/**
 * Generate unique Review ID
 * Format: REV_<timestamp>_<random>
 * Example: REV_1704110400000_ABC123
 */

function generateReviewId() {
    const timestamp = Date.now();
    const randomString = generateRandomString(6);
    return `REV_${timestamp}_${randomString}`;
}

/**
 * Generate random alphanumeric string
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
function generateRandomString(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Validate review ID format
 * @param {string} reviewId - Review ID to validate
 * @returns {boolean} True if valid
 */
function validateReviewId(reviewId) {
    const regex = /^REV_\d+_[A-Z0-9]+$/;
    return regex.test(reviewId);
}

module.exports = {
    generateReviewId,
    generateRandomString,
    validateReviewId
};
