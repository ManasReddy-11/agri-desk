import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema(
  {
    consumer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    indexes: [{ consumer: 1, product: 1 }], // Unique combination
  }
);

// Prevent duplicates
wishlistSchema.index({ consumer: 1, product: 1 }, { unique: true });

// Static method to add to wishlist
wishlistSchema.statics.toggleWishlist = async function (consumerId, productId) {
  const existing = await this.findOne({ consumer: consumerId, product: productId });

  if (existing) {
    await this.deleteOne({ _id: existing._id });
    return { added: false };
  } else {
    await this.create({ consumer: consumerId, product: productId });
    return { added: true };
  }
};

// Static method to get consumer wishlist
wishlistSchema.statics.getConsumerWishlist = async function (consumerId) {
  return await this.find({ consumer: consumerId })
    .populate('product')
    .sort({ addedAt: -1 });
};

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
