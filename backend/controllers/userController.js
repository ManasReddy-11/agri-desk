import User from '../models/User.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * User Controller
 * Handles user-related operations
 */

export const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -resetPasswordToken -verificationToken');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user.getPublicProfile(),
    });
  } catch (error) {
    next(error);
  }
};

export const getFarmerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const farmer = await User.findById(id).select('-password -resetPasswordToken -verificationToken');

    if (!farmer || farmer.role !== 'farmer') {
      throw new AppError('Farmer not found', 404);
    }

    // Get farmer's products
    const products = await Product.find({ farmer: id, isActive: true }).limit(10);

    res.status(200).json({
      success: true,
      data: {
        farmer,
        products,
        productCount: await Product.countDocuments({ farmer: id, isActive: true }),
      },
    });
  } catch (error) {
    next(error);
  }
};
