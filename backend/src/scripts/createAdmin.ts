import bcrypt from 'bcrypt';
import pool from '../config/database';
import * as dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Admin credentials
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@lottodrop.com',
      password: 'Admin@123456', // Default password - should be changed after first login
      isAdmin: true
    };

    console.log('🔧 Creating admin user...');

    // Check if admin already exists
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminData.email]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists!');
      console.log('📧 Email: admin@lottodrop.com');
      console.log('🔑 Use your existing password to login');
      process.exit(0);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminData.password, saltRounds);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, is_admin, balance) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email`,
      [adminData.firstName, adminData.lastName, adminData.email, passwordHash, true, 1000.00]
    );

    console.log('✅ Admin user created successfully!');
    console.log('=====================================');
    console.log('📧 Email: admin@lottodrop.com');
    console.log('🔑 Password: Admin@123456');
    console.log('💰 Initial Balance: $1000.00');
    console.log('=====================================');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createAdminUser();