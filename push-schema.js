const { execSync } = require('child_process');

console.log('Pushing database schema...');

try {
  execSync('npx drizzle-kit push --dialect=postgresql --schema=./shared/schema.ts --url=' + process.env.DATABASE_URL, {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('Database schema pushed successfully!');
} catch (error) {
  console.error('Error pushing schema:', error.message);
  process.exit(1);
}