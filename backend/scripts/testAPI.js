import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const testLogin = async () => {
  try {
    console.log('🔐 Testing Login API...\n');

    // Test farmer login
    console.log('📝 Logging in as Farmer...');
    const farmerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'farmer@agriDesk.com',
      password: 'Password123!',
    });

    console.log('✅ Farmer Login Success:');
    console.log(`   Name: ${farmerLogin.data.data.user.name}`);
    console.log(`   Email: ${farmerLogin.data.data.user.email}`);
    console.log(`   Role: ${farmerLogin.data.data.user.role}`);
    console.log(`   Token: ${farmerLogin.data.data.accessToken.substring(0, 20)}...\n`);

    // Test consumer login
    console.log('📝 Logging in as Consumer...');
    const consumerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'consumer@agriDesk.com',
      password: 'Password123!',
    });

    console.log('✅ Consumer Login Success:');
    console.log(`   Name: ${consumerLogin.data.data.user.name}`);
    console.log(`   Email: ${consumerLogin.data.data.user.email}`);
    console.log(`   Role: ${consumerLogin.data.data.user.role}\n`);

    // Test admin login
    console.log('📝 Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@agriDesk.com',
      password: 'AdminPass123!',
    });

    console.log('✅ Admin Login Success:');
    console.log(`   Name: ${adminLogin.data.data.user.name}`);
    console.log(`   Email: ${adminLogin.data.data.user.email}`);
    console.log(`   Role: ${adminLogin.data.data.user.role}\n`);

    console.log('✅ All API tests passed! Database connection working.');
  } catch (error) {
    console.error('❌ API Test Failed:');
    console.error(`   ${error.response?.data?.message || error.message}`);
    process.exit(1);
  }
};

testLogin();
