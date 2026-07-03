const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'PORT'];

const checkEnv = () => {
  const missing = [];

  requiredEnv.forEach((key) => {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    console.error('\x1b[31m[CRITICAL CONFIGURATION ERROR] Missing required environment variables:\x1b[0m');
    missing.forEach((variable) => {
      console.error(`\x1b[33m ⚠️  ${variable} is not defined or is empty.\x1b[0m`);
    });
    console.error('\x1b[36mPlease check and configure your server/.env file before restarting the server.\x1b[0m');
    process.exit(1);
  }
};

export default checkEnv;
