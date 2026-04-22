import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Product from '../models/Product.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep data)
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Sample Users Data
    const users = [
      {
        name: 'John Farmer',
        email: 'farmer@agriDesk.com',
        password: 'Password123!', // Will be hashed by schema
        role: 'farmer',
        phone: '9876543210',
        address: {
          street: '123 Farm Road',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          zipCode: '560001',
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: 'Jane Consumer',
        email: 'consumer@agriDesk.com',
        password: 'Password123!',
        role: 'consumer',
        phone: '9876543211',
        address: {
          street: '456 Market Street',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          zipCode: '560002',
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: 'Admin User',
        email: 'admin@agriDesk.com',
        password: 'AdminPass123!',
        role: 'admin',
        phone: '9876543212',
        address: {
          street: '789 Admin Lane',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          zipCode: '560003',
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: 'Ram Kumar',
        email: 'ram@agriDesk.com',
        password: 'Password123!',
        role: 'farmer',
        phone: '9876543213',
        address: {
          street: '321 Village Road',
          city: 'Mysore',
          state: 'Karnataka',
          country: 'India',
          zipCode: '570001',
        },
        isVerified: true,
        isActive: true,
      },
      {
        name: 'Priya Sharma',
        email: 'priya@agriDesk.com',
        password: 'Password123!',
        role: 'consumer',
        phone: '9876543214',
        address: {
          street: '654 City Center',
          city: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          zipCode: '411001',
        },
        isVerified: true,
        isActive: true,
      },
    ];

    // Create users one by one to trigger password hashing
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
    }
    console.log(`✅ Created ${createdUsers.length} users`);

    // Seed sample products for farmer accounts
    const farmers = createdUsers.filter((user) => user.role === 'farmer');

    // Clear existing products to keep seed deterministic
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products');

    const products = [
      {
        name: 'Organic Tomatoes',
        description: 'Fresh organic tomatoes harvested this morning from pesticide-free farms.',
        category: 'vegetables',
        price: 45,
        quantity: 120,
        unit: 'kg',
        organicCertified: true,
        inStock: true,
        isActive: true,
        location: { city: 'Bangalore', state: 'Karnataka', country: 'India', zipCode: '560001' },
      },
      {
        name: 'Farm Fresh Carrots',
        description: 'Crunchy naturally grown carrots with high nutrients and sweet taste.',
        category: 'vegetables',
        price: 35,
        quantity: 90,
        unit: 'kg',
        organicCertified: true,
        inStock: true,
        isActive: true,
        location: { city: 'Mysore', state: 'Karnataka', country: 'India', zipCode: '570001' },
      },
      {
        name: 'Alphonso Mangoes',
        description: 'Premium seasonal mangoes directly from orchard, naturally ripened.',
        category: 'fruits',
        price: 180,
        quantity: 60,
        unit: 'kg',
        inStock: true,
        isActive: true,
        location: { city: 'Pune', state: 'Maharashtra', country: 'India', zipCode: '411001' },
      },
      {
        name: 'Pure Cow Milk',
        description: 'Unadulterated farm milk delivered fresh daily with quality checks.',
        category: 'dairy',
        price: 60,
        quantity: 200,
        unit: 'l',
        inStock: true,
        isActive: true,
        location: { city: 'Bangalore', state: 'Karnataka', country: 'India', zipCode: '560002' },
      },
      {
        name: 'Raw Forest Honey',
        description: 'Natural unprocessed honey collected sustainably from forest apiaries.',
        category: 'honey',
        price: 320,
        quantity: 40,
        unit: 'kg',
        organicCertified: true,
        inStock: true,
        isActive: true,
        location: { city: 'Coorg', state: 'Karnataka', country: 'India', zipCode: '571201' },
      },
    ];

    const productsWithFarmers = products.map((product, index) => ({
      ...product,
      farmer: farmers[index % farmers.length]._id,
    }));

    await Product.insertMany(productsWithFarmers);
    console.log(`✅ Created ${productsWithFarmers.length} products`);

    // Display created users
    console.log('\n📋 Created Users:');
    createdUsers.forEach((user) => {
      console.log(`  • ${user.name} (${user.email}) - Role: ${user.role}`);
    });

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('  Farmer: farmer@agridesk.com / Password123!');
    console.log('  Consumer: consumer@agridesk.com / Password123!');
    console.log('  Admin: admin@agridesk.com / AdminPass123!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
