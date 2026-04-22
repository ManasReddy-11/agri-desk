# Review Module - Complete Guide

## Overview

The Review module enables consumers to submit ratings and feedback for farmers after purchases. It includes:
- Consumer rating submission (1-5 stars)
- Detailed feedback comments
- Farmer response capability
- Admin moderation system
- Analytics and farmer ranking

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Consumer Operations](#consumer-operations)
4. [Farmer Operations](#farmer-operations)
5. [Admin Operations](#admin-operations)
6. [Error Handling](#error-handling)
7. [Configuration](#configuration)

---

## Database Schema

### Review Model

```javascript
{
  // Identifiers
  reviewId: String,        // Unique: REV_<timestamp>_<random>
  orderId: String,         // Related order
  consumerId: String,      // Who wrote review
  farmerId: String,        // Farmer being reviewed
  
  // Rating (1-5 stars)
  rating: {
    overall: Number,       // Required
    quality: Number,       // Optional breakdown
    delivery: Number,
    packaging: Number,
    communication: Number
  },
  
  // Content
  title: String,           // Review title
  comment: String,         // Full feedback (max 1000 chars)
  tags: [String],          // Predefined categories
  
  // Media
  attachments: {
    images: [String],      // URLs (max 5)
    videos: [String]       // URLs (max 2)
  },
  
  // Status & Moderation
  status: String,          // pending/approved/rejected/flagged
  verified: Boolean,       // Purchase verified?
  moderation: {
    approvedBy: String,
    approvedAt: Date,
    rejectionReason: String,
    flaggedReason: String,
    flaggedAt: Date
  },
  
  // Farmer Response
  farmerResponse: {
    response: String,      // Farmer's reply
    respondedAt: Date
  },
  
  // Engagement
  engagement: {
    likes: Number,
    dislikes: Number,
    helpful: Number
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

### Summary Table

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| **PUBLIC** |
| GET | `/api/review/farmer/:farmerId/stats` | None | Farmer rating stats |
| GET | `/api/review/farmer/:farmerId/reviews` | None | Farmer's reviews |
| GET | `/api/review/:reviewId` | None | Single review |
| POST | `/api/review/:reviewId/helpful` | None | Mark helpful |
| **CONSUMER** |
| POST | `/api/review/submit` | Consumer | Submit review |
| GET | `/api/review/my-reviews` | Consumer | My reviews |
| PUT | `/api/review/:reviewId` | Consumer | Update review |
| DELETE | `/api/review/:reviewId` | Consumer | Delete review |
| **FARMER** |
| POST | `/api/review/:reviewId/farmer-response` | Farmer | Reply to review |
| GET | `/api/review/farmer/my-reviews/pending` | Farmer | Pending responses |
| **ADMIN** |
| GET | `/api/review/admin/pending` | Admin | Moderation queue |
| POST | `/api/review/admin/:reviewId/approve` | Admin | Approve review |
| POST | `/api/review/admin/:reviewId/reject` | Admin | Reject review |
| POST | `/api/review/admin/:reviewId/flag` | Admin | Flag content |
| GET | `/api/review/admin/stats` | Admin | Analytics |
| GET | `/api/review/admin/farmers-ranking` | Admin | Top farmers |
| DELETE | `/api/review/admin/:reviewId` | Admin | Force delete |

---

## Consumer Operations

### 1. Submit a Review

**Endpoint:** `POST /api/review/submit`

**Authentication:** Required (Consumer)

**Request Body:**
```json
{
  "orderId": "order_12345",
  "farmerId": "farmer_67890",
  "title": "Fresh vegetables, excellent quality",
  "comment": "Received fresh tomatoes, exactly as described. Well packaged. Would recommend.",
  "rating": {
    "overall": 5,
    "quality": 5,
    "delivery": 4,
    "packaging": 5,
    "communication": 5
  },
  "tags": ["as_described", "recommend", "good_packaging"],
  "attachments": {
    "images": ["https://cdn.example.com/img1.jpg"],
    "videos": []
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully. Pending approval.",
  "data": {
    "review": {
      "reviewId": "REV_1704110400000_ABC123",
      "orderId": "order_12345",
      "farmerId": "farmer_67890",
      "rating": 5,
      "status": "pending",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

**Validation Rules:**
- Overall rating (1-5): Required
- Comment: Max 1000 characters
- Title: Max 100 characters
- Max 5 images, 2 videos
- Rate limit: 5 reviews per day
- No duplicate reviews per order

---

### 2. Get My Reviews

**Endpoint:** `GET /api/review/my-reviews`

**Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "reviewId": "REV_1704110400000_ABC123",
        "orderId": "order_12345",
        "farmerId": "farmer_67890",
        "rating": {
          "overall": 5,
          "quality": 5,
          "delivery": 4,
          "packaging": 5,
          "communication": 5
        },
        "title": "Fresh vegetables, excellent quality",
        "comment": "Received fresh tomatoes...",
        "status": "approved",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

### 3. Update Review

**Endpoint:** `PUT /api/review/:reviewId`

**Request Body:**
```json
{
  "title": "Updated title",
  "comment": "Updated comment",
  "rating": {
    "overall": 4
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": {
    "review": {
      "reviewId": "REV_1704110400000_ABC123",
      "rating": 4,
      "status": "pending",
      "updatedAt": "2024-01-02T10:00:00Z"
    }
  }
}
```

**Notes:**
- Only update pending/approved reviews
- Cannot update rejected reviews
- Updates reset status to pending for re-moderation

---

### 4. Delete Review

**Endpoint:** `DELETE /api/review/:reviewId`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review deleted successfully"
}
```

---

## Public Operations

### 1. Get Farmer's Rating Statistics

**Endpoint:** `GET /api/review/farmer/:farmerId/stats`

**No Authentication Required**

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "averageRating": 4.5,
      "totalReviews": 120,
      "verifiedReviews": 115,
      "ratings": {
        "average": 4.5,
        "quality": 4.6,
        "delivery": 4.4,
        "packaging": 4.5,
        "communication": 4.7
      }
    },
    "distribution": {
      "1": 2,
      "2": 5,
      "3": 10,
      "4": 35,
      "5": 68
    },
    "topReviews": [
      {
        "reviewId": "REV_1704110400000_ABC123",
        "rating": 5,
        "comment": "Excellent farmer!",
        "helpful": 25,
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ]
  }
}
```

---

### 2. Get Farmer's Reviews

**Endpoint:** `GET /api/review/farmer/:farmerId/reviews`

**Parameters:**
- `page` (default: 1)
- `limit` (default: 10)
- `rating` (optional: 1-5)
- `sort` (default: newest | highest | lowest | helpful)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "reviewId": "REV_1704110400000_ABC123",
        "rating": 5,
        "title": "Fresh vegetables",
        "comment": "Received fresh tomatoes...",
        "helpful": 12,
        "verified": true,
        "hasResponse": true,
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 120,
      "page": 1,
      "limit": 10,
      "pages": 12
    }
  }
}
```

---

### 3. Mark Review Helpful

**Endpoint:** `POST /api/review/:reviewId/helpful`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review marked as helpful",
  "data": {
    "helpful": 26
  }
}
```

---

## Farmer Operations

### 1. Add Response to Review

**Endpoint:** `POST /api/review/:reviewId/farmer-response`

**Authentication:** Required (Farmer)

**Request Body:**
```json
{
  "response": "Thank you for your kind words! We always ensure the best quality produce. We'll maintain these standards for future orders."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Response added successfully",
  "data": {
    "reviewId": "REV_1704110400000_ABC123",
    "farmerResponse": {
      "response": "Thank you for your kind words...",
      "respondedAt": "2024-01-02T10:00:00Z"
    }
  }
}
```

**Constraints:**
- Max 500 characters
- Only respond to approved reviews
- One response per review

---

### 2. Get Pending Reviews

**Endpoint:** `GET /api/review/farmer/my-reviews/pending`

**Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "reviewId": "REV_1704110400000_ABC123",
        "rating": 4,
        "title": "Good quality",
        "comment": "Vegetables were fresh...",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10,
      "pages": 1
    }
  }
}
```

---

## Admin Operations

### 1. Get Pending Moderation Queue

**Endpoint:** `GET /api/review/admin/pending`

**Parameters:**
- `page` (default: 1)
- `limit` (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "reviewId": "REV_1704110400000_ABC123",
        "orderId": "order_12345",
        "consumerId": "consumer_1",
        "farmerId": "farmer_67890",
        "rating": 5,
        "comment": "Great quality...",
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

---

### 2. Approve Review

**Endpoint:** `POST /api/review/admin/:reviewId/approve`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review approved successfully",
  "data": {
    "reviewId": "REV_1704110400000_ABC123",
    "status": "approved"
  }
}
```

---

### 3. Reject Review

**Endpoint:** `POST /api/review/admin/:reviewId/reject`

**Request Body:**
```json
{
  "reason": "Contains inappropriate language"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review rejected successfully",
  "data": {
    "reviewId": "REV_1704110400000_ABC123",
    "status": "rejected"
  }
}
```

---

### 4. Flag Review

**Endpoint:** `POST /api/review/admin/:reviewId/flag`

**Request Body:**
```json
{
  "reason": "Possible fraud/fake review"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review flagged for review",
  "data": {
    "reviewId": "REV_1704110400000_ABC123",
    "status": "flagged"
  }
}
```

---

### 5. Get Review Statistics

**Endpoint:** `GET /api/review/admin/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "overview": [
        {
          "total": 500,
          "approved": 450,
          "pending": 30,
          "rejected": 15,
          "flagged": 5,
          "verified": 420,
          "averageRating": 4.3
        }
      ],
      "byRating": [
        { "_id": 1, "count": 5 },
        { "_id": 2, "count": 15 },
        { "_id": 3, "count": 40 },
        { "_id": 4, "count": 150 },
        { "_id": 5, "count": 290 }
      ],
      "recentFlags": [...]
    }
  }
}
```

---

### 6. Get Farmers Ranking

**Endpoint:** `GET /api/review/admin/farmers-ranking`

**Parameters:**
- `limit` (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "_id": "farmer_123",
        "averageRating": 4.8,
        "totalReviews": 150,
        "verifiedReviews": 145
      },
      {
        "_id": "farmer_456",
        "averageRating": 4.6,
        "totalReviews": 120,
        "verifiedReviews": 115
      }
    ]
  }
}
```

---

### 7. Delete Review

**Endpoint:** `DELETE /api/review/admin/:reviewId`

**Request Body:**
```json
{
  "reason": "Duplicate/spam"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": {
    "deletedReviewId": "REV_1704110400000_ABC123",
    "reason": "Duplicate/spam"
  }
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "success": false,
  "message": "Review validation failed",
  "errors": [
    "Rating must be between 1-5",
    "Comment cannot exceed 1000 characters"
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Review not found"
}
```

**409 Conflict - Duplicate:**
```json
{
  "success": false,
  "message": "You have already submitted a review for this order",
  "existingReviewId": "REV_1704110400000_ABC123"
}
```

**429 Too Many Requests - Rate Limit:**
```json
{
  "success": false,
  "message": "You can only submit 5 reviews per day",
  "retryAfter": 86400
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Error submitting review",
  "error": "Database error details..."
}
```

---

## Configuration

### Review Module Configuration

Create `backend/config/review.config.js`:

```javascript
module.exports = {
  // Rating constraints
  rating: {
    min: 1,
    max: 5,
    breakdown: ['quality', 'delivery', 'packaging', 'communication']
  },
  
  // Comment constraints
  comment: {
    minLength: 10,
    maxLength: 1000
  },
  
  // Title constraints
  title: {
    minLength: 5,
    maxLength: 100
  },
  
  // Rate limiting
  rateLimit: {
    submissionsPerDay: 5,
    submissionsPerHour: 2
  },
  
  // Media constraints
  media: {
    maxImages: 5,
    maxVideos: 2,
    allowedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },
  
  // Moderation
  moderation: {
    autoApproveThreshold: 0.9,
    requireApprovalPercentage: 100,
    flagReviewThreshold: 3
  },
  
  // Tags
  tags: [
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
};
```

---

## Review Status Flow

```
Submitted Review
    ↓
Review.status = 'pending'
    ↓
Admin Moderation
    ├─→ Approve → status = 'approved' ✓
    │   ├─→ Farmer can respond
    │   ├─→ Public visibility
    │   └─→ Not editable
    │
    ├─→ Reject → status = 'rejected'
    │   └─→ Consumer can resubmit
    │
    └─→ Flag → status = 'flagged'
        └─→ Further review needed
```

---

## Next Steps

1. **Setup:** Integrate routes into main app
2. **Authentication:** Configure auth middleware
3. **Testing:** Run API tests
4. **Frontend:** Build rating submission UI
5. **Analytics:** Monitor review metrics

---

**Status:** Complete & Ready ✅  
**Version:** 1.0
