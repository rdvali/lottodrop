import pool from '../config/database';
import fs from 'fs';
import path from 'path';

const runMigration = async () => {
  const client = await pool.connect();
  
  try {
    console.log('Starting seed persistence fix migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migration_002_fix_seed_persistence.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Verify the migration
    const verificationQueries = [
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'game_rounds' AND column_name = 'archived_at'",
      "SELECT indexname FROM pg_indexes WHERE tablename = 'game_rounds' AND indexname LIKE '%archived%'",
      "SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = 'game_rounds' AND constraint_name = 'check_server_seed_format'",
      "SELECT COUNT(*) as archived_rounds FROM game_rounds WHERE archived_at IS NOT NULL",
      "SELECT COUNT(*) as active_rounds FROM game_rounds WHERE completed_at IS NULL AND archived_at IS NULL"
    ];
    
    console.log('\nMigration verification:');
    for (const query of verificationQueries) {
      const result = await client.query(query);
      console.log(`Query: ${query.substring(0, 50)}...`);
      console.log('Result:', result.rows);
      console.log('---');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run the migration if this script is called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default runMigration;