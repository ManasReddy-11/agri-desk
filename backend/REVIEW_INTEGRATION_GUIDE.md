# Review Module - Implementation Guide

## System Integration

The Review module integrates with several other components of AgriDesk:

```
Consumer (Browse Farmers)
    ↓
Order (Buy from Farmer)
    ├─→ order.status = 'delivered'
    ├─→ awaiting consumer feedback
    │
Review (Submit Rating)
    ├─→ review.status = 'pending'
    ├─→ awaiting admin approval
    │
Review Approval (Admin)
    ├─→ review.status = 'approved'
    ├─→ Farmer sees review
    ├─→ Can respond to review
    │
Farmer Profile (Public Rating)
    ├─→ farmer.rating = average
    ├─→ farmer.ratingCount = total
    ├─→ consumer sees before purchasing
    │
Farmer Ranking (Admin Analytics)
    └─→ Top farmers by rating
```

---

## Integration Points

### 1. Order Module Integration

**When:** After order is delivered  
**Need:** Order ID for review submission  
**Link:** Review tied to specific order

```javascript
// In Order model, add:
{
  // ... existing fields
  review: {
    reviewId: String,          // Link to review
    status: String,            // pending/submitted/completed
    submittedAt: Date
  }
}

// When review is submitted:
order.review.reviewId = newReview.reviewId;
order.review.status = 'submitted';
order.review.submittedAt = Date.now();
```

### 2. Farmer Profile Integration

**When:** Review is approved  
**Need:** Update farmer's rating stats  
**Link:** Display on farmer profile

```javascript
// Update farmer profile with:
{
  // ... existing fields
  rating: {
    average: Number,           // 1-5
    count: Number,             // Total reviews
    distribution: {
      1: Number,
      2: Number,
      3: Number,
      4: Number,
      5: Number
    },
    breakdown: {
      quality: Number,
      delivery: Number,
      packaging: Number,
      communication: Number
    }
  }
}

// Update on review approval:
farmer.rating.average = newAverage;
farmer.rating.count = totalReviews;
```

### 3. Consumer Profile Integration

**When:** Any review submitted  
**Need:** Track consumer review history  
**Link:** Consumer reputation

```javascript
// Add to Consumer model:
{
  // ... existing fields
  reviews: {
    submitted: Number,         // Total reviews written
    averageRating: Number,     // Avg of their ratings
    lastReviewAt: Date
  }
}
```

### 4. Search/Discovery Integration

**When:** Farmers list displayed  
**Need:** Sort/filter by ratings  
**Impact:** Better farmers appear first

```javascript
// Farmer search with rating filter:
db.farmers
  .find({...})
  .sort({ 'rating.average': -1 })
  .limit(items)
```

---

## Database Updates

### Add Review Reference to Order

```bash
db.orders.updateMany(
  {},
  {
    $set: {
      review: {
        reviewId: null,
        status: 'pending',
        submittedAt: null
      }
    }
  }
)
```

### Add Rating Stats to Farmer Profile

```bash
db.farmers.updateMany(
  {},
  {
    $set: {
      rating: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        breakdown: {
          quality: 0,
          delivery: 0,
          packaging: 0,
          communication: 0
        }
      }
    }
  }
)
```

---

## API Integration Points

### The Complete Flow

```
1. Order Placed
   └─→ Order.status = 'pending'

2. Order Delivered
   └─→ Order.status = 'delivered'
   └─→ Consumer notified to review

3. Consumer Reviews
   └─→ POST /api/review/submit
   └─→ Review.status = 'pending'

4. Admin Approves
   └─→ POST /api/review/admin/:reviewId/approve
   └─→ Review.status = 'approved'
   └─→ Update Order.review.status = 'completed'
   └─→ Update Farmer.rating stats

5. Farmer Views
   └─→ GET /api/review/farmer/my-reviews/pending
   └─→ Can respond

6. Consumer Sees Rating
   └─→ GET /api/review/farmer/:farmerId/stats
   └─→ Shows average rating
   └─→ Influences purchase decision

7. Discovery
   └─→ GET /api/farmer?sort=rating
   └─→ Top-rated farmers appear first
```

---

## Frontend Components Needed

### Consumer-Facing

1. **ReviewSubmitForm**
   - Star rating selector (1-5)
   - Detailed ratings breakdown
   - Comment textarea
   - Tag selection
   - Image upload

2. **MyReviewsList**
   - List of consumer's reviews
   - Status badge (pending/approved)
   - Edit/delete actions
   - Sort and filter

3. **FarmerRatingCard**
   - Average rating display
   - Review count
   - Rating distribution chart
   - Recent reviews preview

### Public-Facing

1. **FarmerReviewsPage**
   - All farmer reviews (paginated)
   - Filter by rating
   - Sort (newest/helpful/highest)
   - Mark helpful (voting)

2. **ReviewDetailModal**
   - Full review content
   - Farmer response (if any)
   - Rating breakdown
   - Engagement stats

### Farmer-Facing

1. **PendingReviewsList**
   - Reviews awaiting response
   - Respond interface
   - Response history

### Admin-Facing

1. **ModerationQueue**
   - Pending reviews list
   - Review viewer
   - Approve/reject actions
   - Bulk actions

2. **ReviewAnalytics**
   - Statistics dashboard
   - Farmer rankings
   - Flagged reviews

---

## Workflow Examples

### Scenario 1: Happy Customer

```
1. Consumer purchases: order_123 from farmer_abc
2. Order delivered ✓
3. Consumer submits 5-star review
4. Admin auto-approves (quality check)
5. Review appears on farmer profile
6. Farmer rating increases
7. More customers see good rating
8. Farmer gets more orders
```

### Scenario 2: Dissatisfied Customer

```
1. Consumer purchases: order_124 from farmer_xyz
2. Order has issues ✗
3. Consumer submits 1-star review with comments
4. Admin reviews for spam/abuse
5. Admin approves as legitimate
6. Farmer responds with explanation
7. Review visible with both perspectives
8. Other customers see balanced feedback
```

### Scenario 3: Suspicious Review

```
1. Someone submits 5-star review immediately
2. No verification checks passed
3. Admin flags for suspicious activity
4. Review set to "flagged" status
5. Manual review by admin team
6. Decision: approved/rejected/deleted
7. Action taken accordingly
```

---

## Data Migration

### If Moving from Old System

```javascript
// Map old review data to new schema
const migrateReviews = async () => {
  const oldReviews = await OldReview.find({});
  
  for (const oldReview of oldReviews) {
    const newReview = new Review({
      reviewId: generateReviewId(),
      orderId: oldReview.order_id,
      consumerId: oldReview.consumer_id,
      farmerId: oldReview.farmer_id,
      rating: {
        overall: oldReview.rating,
        quality: oldReview.quality_rating || null
      },
      comment: oldReview.comment,
      verified: true,
      status: oldReview.approved ? 'approved' : 'pending',
      createdAt: oldReview.created_at
    });
    
    await newReview.save();
  }
};
```

---

## Performance Considerations

### Query Optimization

1. **Index Strategy**
   ```javascript
   // Fast farmer lookups
   db.reviews.createIndex({ farmerId: 1, status: 1 })
   db.reviews.createIndex({ farmerId: 1, createdAt: -1 })
   
   // Fast consumer lookups  
   db.reviews.createIndex({ consumerId: 1, createdAt: -1 })
   
   // Fast analytics
   db.reviews.createIndex({ status: 1, verified: 1 })
   ```

2. **Aggregation Pipeline**
   ```javascript
   // Calculate stats efficiently
   db.reviews.aggregate([
     { $match: { farmerId, status: 'approved' } },
     { $group: { 
         _id: null,
         avg: { $avg: '$rating.overall' },
         count: { $sum: 1 }
       }
     }
   ])
   ```

3. **Caching**
   ```javascript
   // Cache farmer ratings for 1 hour
   cache.set(`farmer_${id}_rating`, avgRating, 3600);
   
   // Cache stats for 6 hours
   cache.set(`farmer_${id}_stats`, stats, 21600);
   ```

### Load Optimization

- Paginate large review lists (default 10-20 per page)
- Lazy load images in review attachments
- Limit top reviewer queries
- Archive old reviews (30+ days) optionally

---

## Security Considerations

### Input Validation
- ✓ Rating must be 1-5 integer
- ✓ Comment max 1000 chars, no HTML
- ✓ No spam detection
- ✓ No duplicate reviews per order

### Rate Limiting
- ✓ Max 5 reviews per day per consumer
- ✓ Max 2 reviews per hour per consumer
- ✓ Prevent bulk submission

### Authorization
- ✓ Consumer can only edit own reviews
- ✓ Farmer can only respond to own products
- ✓ Admin can moderate all reviews

### Data Sanitization
- ✓ Remove HTML/script tags
- ✓ Truncate long inputs
- ✓ Validate image URLs
- ✓ No sensitive data in responses

---

## Rollout Strategy

### Phase 1: Backend Setup (Current)
- [x] Create Review model
- [x] Create Review controller
- [x] Create Review routes
- [ ] Integrate with auth middleware
- [ ] Add to main app routes

### Phase 2: Frontend Components
- [ ] Rating submission form
- [ ] My reviews list
- [ ] Farmer rating card
- [ ] Review detail modal

### Phase 3: Testing & Validation
- [ ] Unit tests for model
- [ ] API endpoint tests
- [ ] Integration tests with Order
- [ ] Load testing

### Phase 4: Deployment
- [ ] Deploy to staging
- [ ] Beta test with users
- [ ] Deploy to production
- [ ] Monitor metrics

### Phase 5: Optimization
- [ ] Performance tuning
- [ ] Cache optimization
- [ ] Analytics setup

---

## Monitoring & Metrics

### Key Metrics

```javascript
// Review submission rate
reviewsPerDay = Reviews.countDocuments({
  createdAt: { $gte: yesterday }
})

// Moderation queue
queueLength = Reviews.countDocuments({
  status: 'pending'
})

// Average rating over time
avgRating = Reviews.aggregate([
  { $match: { status: 'approved' } },
  { $group: { _id: null, avg: { $avg: '$rating.overall' } } }
])

// Engagement rate
engagementRate = (helpfulCount / totalReviews) * 100

// Response rate (farmer responses)
responseRate = (respondedReviews / approvedReviews) * 100
```

### Alerts

- Queue length > 100 pending reviews
- Average approval time > 24 hours
- Negative reviews spike
- Spam detection rate > 5%

---

## Troubleshooting Guide

### Issue: Reviews not appearing

**Causes:**
- Review status is not 'approved'
- Review.verified = false
- Database connection issue

**Solution:**
```bash
# Check review status
db.reviews.findOne({}).pretty()

# Check approved count
db.reviews.countDocuments({ status: 'approved' })

# Re-approve if needed
db.reviews.updateOne(
  { _id: ObjectId('...') },
  { $set: { status: 'approved', verified: true } }
)
```

### Issue: Rating not updating

**Causes:**
- Aggregation pipeline not running
- Cache not cleared
- Farmer profile not updating

**Solution:**
```javascript
// Recalculate ratings
async recalculateFarmerRatings(farmerId) {
  const stats = await Review.getFarmerAverageRating(farmerId);
  await Farmer.findByIdAndUpdate(farmerId, {
    'rating.average': stats.averageRating,
    'rating.count': stats.totalReviews
  });
}
```

### Issue: Performance degradation

**Causes:**
- Missing indexes
- Large result sets
- N+1 query problem

**Solution:**
```bash
# Add missing indexes
db.reviews.createIndex({ farmerId: 1, status: 1 })
db.reviews.createIndex({ consumerId: 1 })

# Check query performance
db.reviews.find({farmerId: 'x'}).explain("executionStats")
```

---

## Checklist for Production

- [ ] All endpoints tested
- [ ] Error handling comprehensive
- [ ] Authentication/authorization verified
- [ ] Rate limiting enabled
- [ ] Database indexes created
- [ ] Caching configured
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Team trained
- [ ] Rollback plan ready

---

## Next Steps

1. **Integration:** Add route to main app
2. **Auth:** Configure middleware
3. **Testing:** Run test suite
4. **Staging:** Deploy to test environment
5. **Review:** Security audit
6. **Deploy:** Production deployment
7. **Monitor:** Setup alerts

---

**Status:** Ready for Integration ✅  
**Version:** 1.0

See related documentation:
- [REVIEW_MODULE_GUIDE.md](./REVIEW_MODULE_GUIDE.md)
- [REVIEW_QUICK_START.md](./REVIEW_QUICK_START.md)
