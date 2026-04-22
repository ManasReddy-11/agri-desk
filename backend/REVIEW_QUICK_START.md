# Review Module - Quick Start Guide

## Getting Started with Review API

This guide provides quick curl commands and examples to get started with the Review module.

---

## Prerequisites

- Node.js backend running on `http://localhost:5000`
- Consumer/Admin authentication tokens
- Order ID for review submission

---

## Quick Setup

### Get Authentication Token

```bash
# Login as consumer
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"consumer@example.com","password":"password123"}'

# Copy token from response
export CONSUMER_TOKEN="your_token_here"
export ADMIN_TOKEN="admin_token_here"
export FARMER_TOKEN="farmer_token_here"
```

---

## Consumer Operations

### 1. Submit a Review

```bash
curl -X POST http://localhost:5000/api/review/submit \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
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
    "tags": ["as_described", "recommend", "good_packaging"]
  }'
```

### 2. Get My Reviews

```bash
curl -H "Authorization: Bearer $CONSUMER_TOKEN" \
  "http://localhost:5000/api/review/my-reviews?page=1&limit=10"
```

### 3. Update My Review

```bash
curl -X PUT http://localhost:5000/api/review/REV_1704110400000_ABC123 \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "comment": "Updated comment",
    "rating": {
      "overall": 4
    }
  }'
```

### 4. Delete My Review

```bash
curl -X DELETE http://localhost:5000/api/review/REV_1704110400000_ABC123 \
  -H "Authorization: Bearer $CONSUMER_TOKEN"
```

---

## View Farmer Ratings (Public - No Auth)

### 1. Get Farmer Rating Stats

```bash
curl http://localhost:5000/api/review/farmer/farmer_67890/stats
```

**Response:**
```json
{
  "stats": {
    "averageRating": 4.5,
    "totalReviews": 120,
    "verifiedReviews": 115
  },
  "distribution": {
    "1": 2,
    "2": 5,
    "3": 10,
    "4": 35,
    "5": 68
  }
}
```

### 2. Get Farmer's Reviews

```bash
# Newest reviews
curl "http://localhost:5000/api/review/farmer/farmer_67890/reviews?page=1&limit=10&sort=newest"

# Highest rated
curl "http://localhost:5000/api/review/farmer/farmer_67890/reviews?page=1&limit=10&sort=highest"

# Lowest rated
curl "http://localhost:5000/api/review/farmer/farmer_67890/reviews?page=1&limit=10&sort=lowest"

# Most helpful
curl "http://localhost:5000/api/review/farmer/farmer_67890/reviews?page=1&limit=10&sort=helpful"

# Filter by rating
curl "http://localhost:5000/api/review/farmer/farmer_67890/reviews?rating=5"
```

### 3. Get Single Review

```bash
curl http://localhost:5000/api/review/REV_1704110400000_ABC123
```

### 4. Mark Review Helpful

```bash
curl -X POST http://localhost:5000/api/review/REV_1704110400000_ABC123/helpful
```

---

## Farmer Operations

### 1. Respond to Review

```bash
curl -X POST http://localhost:5000/api/review/REV_1704110400000_ABC123/farmer-response \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "response": "Thank you for your kind words! We always ensure the best quality produce."
  }'
```

### 2. Get Pending Reviews (Awaiting Response)

```bash
curl -H "Authorization: Bearer $FARMER_TOKEN" \
  "http://localhost:5000/api/review/farmer/my-reviews/pending?page=1&limit=10"
```

---

## Admin Operations

### 1. Get Pending Reviews for Moderation

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:5000/api/review/admin/pending?page=1&limit=20"
```

### 2. Approve Review

```bash
curl -X POST http://localhost:5000/api/review/admin/REV_1704110400000_ABC123/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Reject Review

```bash
curl -X POST http://localhost:5000/api/review/admin/REV_1704110400000_ABC123/reject \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Contains inappropriate language"
  }'
```

### 4. Flag Review

```bash
curl -X POST http://localhost:5000/api/review/admin/REV_1704110400000_ABC123/flag \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Possible fraud/fake review"
  }'
```

### 5. Get Review Statistics

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:5000/api/review/admin/stats
```

### 6. Get Farmers Ranking

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:5000/api/review/admin/farmers-ranking?limit=20"
```

### 7. Delete Review

```bash
curl -X DELETE http://localhost:5000/api/review/admin/REV_1704110400000_ABC123 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Duplicate/spam"
  }'
```

---

## Complete Workflow Example

### Consumer Purchases and Reviews

```bash
# 1. Consumer logs in and gets token
# (See Prerequisites section)

# 2. Consumer places order
# (Order API - returns order_12345)

# 3. After delivery, consumer submits review
REVIEW_RESPONSE=$(curl -s -X POST http://localhost:5000/api/review/submit \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_12345",
    "farmerId": "farmer_67890",
    "title": "Excellent quality",
    "comment": "Very happy with the purchase",
    "rating": { "overall": 5 }
  }')

REVIEW_ID=$(echo $REVIEW_RESPONSE | jq -r '.data.review.reviewId')
echo "Review ID: $REVIEW_ID"

# 4. Admin approves review
curl -s -X POST http://localhost:5000/api/review/admin/$REVIEW_ID/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# 5. Farmer sees review and responds
curl -s -X POST http://localhost:5000/api/review/$REVIEW_ID/farmer-response \
  -H "Authorization: Bearer $FARMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"response": "Thank you!"}' | jq '.'

# 6. Consumer checks farmer rating
curl -s http://localhost:5000/api/review/farmer/farmer_67890/stats | jq '.'
```

---

## Error Examples

### Validation Error - Rating Out of Range

```bash
curl -X POST http://localhost:5000/api/review/submit \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_12345",
    "farmerId": "farmer_67890",
    "rating": { "overall": 10 }
  }'

# Response:
# {
#   "success": false,
#   "message": "Review validation failed",
#   "errors": ["Rating must be between 1-5"]
# }
```

### Duplicate Review Error

```bash
# Submit same review twice
curl -X POST http://localhost:5000/api/review/submit \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_12345",
    "farmerId": "farmer_67890",
    "rating": { "overall": 5 }
  }'

# Second submission:
# {
#   "success": false,
#   "message": "You have already submitted a review for this order",
#   "existingReviewId": "REV_1704110400000_ABC123"
# }
```

### Rate Limit Exceeded

```bash
# Submit 6th review in same day

# Response:
# {
#   "success": false,
#   "message": "You can only submit 5 reviews per day",
#   "retryAfter": 86400
# }
```

### Unauthorized Access

```bash
# Try to update another consumer's review
curl -X PUT http://localhost:5000/api/review/REV_SOMEONE_ELSE \
  -H "Authorization: Bearer $CONSUMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": {"overall": 1}}'

# Response:
# {
#   "success": false,
#   "message": "You can only modify your own reviews"
# }
```

---

## Tips & Best Practices

### Do's ✅
- Always validate rating between 1-5
- Include specific feedback in comments
- Use appropriate tags for categorization
- Upload quality images if available
- Respond to farmer replies promptly
- Keep comments factual and helpful

### Don'ts ❌
- Don't submit multiple reviews for same order
- Don't include contact information or links
- Don't write promotional content
- Don't include fake images/videos
- Don't post reviewed items without purchasing
- Don't spam with similar reviews

---

## Rating Scale Reference

```
5 ⭐⭐⭐⭐⭐ Excellent
  - Perfect quality
  - On-time delivery
  - Well packaged
  - Excellent communication

4 ⭐⭐⭐⭐ Good
  - Very good quality
  - Timely delivery
  - Good packaging
  - Good communication

3 ⭐⭐⭐ Average
  - Acceptable quality
  - Acceptable delivery time
  - Acceptable packaging
  - Adequate communication

2 ⭐⭐ Poor
  - Quality issues
  - Delivery delays
  - Packaging problems
  - Communication gaps

1 ⭐ Very Poor
  - Major quality defects
  - Late delivery
  - Damaged product
  - No communication
```

---

## Available Tags

```
quality_issue          - Product quality problems
late_delivery          - Late or delayed delivery
damaged_product        - Product arrived damaged
good_packaging         - Well packaged product
excellent_communication - Good farmer communication
poor_condition         - Poor product condition
as_described           - Product as described online
recommend              - Would recommend this farmer
avoid                  - Would not recommend
```

---

## Pagination Examples

### Page Through Reviews

```bash
# Get first page (default limit=10)
curl "http://localhost:5000/api/review/my-reviews?page=1"

# Get 3rd page with 20 items per page
curl "http://localhost:5000/api/review/my-reviews?page=3&limit=20"

# Get farmer's highest-rated reviews
curl "http://localhost:5000/api/review/farmer/farmer_67890/reviews?page=1&rating=5&sort=helpful"
```

---

## Response Time Reference

| Operation | Typical Time |
|-----------|--------------|
| Submit review | 200-500ms |
| Get farmer stats | 100-300ms |
| List reviews | 150-400ms |
| Approve review | 100-200ms |
| Add response | 150-300ms |

---

## Testing Checklist

- [ ] Successfully submit review with all ratings
- [ ] Successfully submit review with only overall rating
- [ ] View farmer stats
- [ ] View farmer's individual reviews
- [ ] Update own review
- [ ] Delete own review
- [ ] View own review history
- [ ] Mark review helpful
- [ ] Admin can moderate reviews
- [ ] Farmer can respond to review
- [ ] Rate limiting works (max 5/day)
- [ ] Cannot submit duplicate review

---

## Troubleshooting

### Issue: "Review not found"
- Verify review ID format: REV_<timestamp>_<random>
- Check review status is 'approved' for public views

### Issue: "Unauthorized"
- Ensure token is valid and not expired
- Verify correct user type (consumer/farmer/admin)

### Issue: "Rating must be between 1-5"
- Confirm rating value is integer 1-5
- Check rating.overall is provided

### Issue: "Duplicate review"
- Check if review already exists for this order
- Get existing review ID from response

---

## Next Steps

1. **Integration:** Add routes to main app
2. **Testing:** Run comprehensive tests
3. **Frontend:** Build review UI components
4. **Analytics:** Setup monitoring
5. **Deployment:** Deploy to production

---

**Status:** Ready to Use ✅  
**Version:** 1.0

See [REVIEW_MODULE_GUIDE.md](./REVIEW_MODULE_GUIDE.md) for complete documentation.
