/**
 * Review validation utilities
 */

// Sanitize comment text
function sanitizeComment(comment) {
    if (!comment) return '';
    
    // Remove potentially harmful HTML/script tags
    return comment
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>"{}&]/g, match => {
            const char_map = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '&': '&amp;'
            };
            return char_map[match];
        })
        .trim();
}

// Validate rating value
function validateRating(rating) {
    if (!rating) return false;
    const value = parseInt(rating);
    return !isNaN(value) && value >= 1 && value <= 5;
}

// Validate review tags
function validateTags(tags) {
    const validTags = [
        'quality_issue',
        'late_delivery',
        'damaged_product',
        'good_packaging',
        'excellent_communication',
        'poor_condition',
        'as_described',
        'recommend',
        'avoid'
    ];
    
    if (!Array.isArray(tags)) return false;
    return tags.every(tag => validTags.includes(tag));
}

// Validate review submission
function validateReviewSubmission(data) {
    const errors = [];
    
    // Check required fields
    if (!data.orderId) errors.push('Order ID is required');
    if (!data.farmerId) errors.push('Farmer ID is required');
    if (!data.rating || !data.rating.overall) {
        errors.push('Overall rating is required');
    } else if (!validateRating(data.rating.overall)) {
        errors.push('Rating must be between 1-5');
    }
    
    // Check comment length
    if (data.comment && data.comment.length > 1000) {
        errors.push('Comment cannot exceed 1000 characters');
    }
    
    // Check title length
    if (data.title && data.title.length > 100) {
        errors.push('Title cannot exceed 100 characters');
    }
    
    // Validate optional ratings if provided
    if (data.rating.quality && !validateRating(data.rating.quality)) {
        errors.push('Quality rating must be between 1-5');
    }
    if (data.rating.delivery && !validateRating(data.rating.delivery)) {
        errors.push('Delivery rating must be between 1-5');
    }
    if (data.rating.packaging && !validateRating(data.rating.packaging)) {
        errors.push('Packaging rating must be between 1-5');
    }
    if (data.rating.communication && !validateRating(data.rating.communication)) {
        errors.push('Communication rating must be between 1-5');
    }
    
    // Validate tags if provided
    if (data.tags && data.tags.length > 0) {
        if (!validateTags(data.tags)) {
            errors.push('Invalid tags provided');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

// Validate image URLs
function validateImageUrl(url) {
    try {
        const urlObj = new URL(url);
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const pathname = urlObj.pathname.toLowerCase();
        return validExtensions.some(ext => pathname.endsWith(ext));
    } catch (e) {
        return false;
    }
}

// Validate attachments
function validateAttachments(attachments) {
    if (!attachments) return true;
    
    if (attachments.images) {
        if (!Array.isArray(attachments.images)) return false;
        if (attachments.images.length > 5) return false;
        if (!attachments.images.every(url => validateImageUrl(url))) return false;
    }
    
    if (attachments.videos) {
        if (!Array.isArray(attachments.videos)) return false;
        if (attachments.videos.length > 2) return false;
    }
    
    return true;
}

// Check for spam/inappropriate content
function checkForSpam(text) {
    if (!text) return false;
    
    // Spam patterns
    const spamPatterns = [
        /(?:https?|ftp):\/\/[^\s]+/i,  // URLs outside attachments
        /(?:telegram|whatsapp|whatapp|call\s*me)/i,  // Contact info
        /(?:click\s*here|buy\s*now|order\s*now)/i,  // Promotional
        /(?:follow\s*us|subscribe|like\s*us)/i,  // Social media
        /(?:viagra|cialis|casino|lottery|prize)/i  // Spam keywords
    ];
    
    return spamPatterns.some(pattern => pattern.test(text));
}

// Clean review data
function cleanReviewData(data) {
    return {
        orderId: data.orderId.trim(),
        farmerId: data.farmerId.trim(),
        title: data.title ? sanitizeComment(data.title) : null,
        comment: data.comment ? sanitizeComment(data.comment) : '',
        rating: {
            overall: parseInt(data.rating.overall),
            quality: data.rating.quality ? parseInt(data.rating.quality) : null,
            delivery: data.rating.delivery ? parseInt(data.rating.delivery) : null,
            packaging: data.rating.packaging ? parseInt(data.rating.packaging) : null,
            communication: data.rating.communication ? parseInt(data.rating.communication) : null
        },
        tags: Array.isArray(data.tags) ? data.tags.filter(t => t.trim().length > 0) : [],
        attachments: data.attachments || { images: [], videos: [] }
    };
}

module.exports = {
    sanitizeComment,
    validateRating,
    validateTags,
    validateReviewSubmission,
    validateImageUrl,
    validateAttachments,
    checkForSpam,
    cleanReviewData
};
