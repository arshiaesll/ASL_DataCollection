const ENV = {
  development: {
    apiUrl: 'http://localhost:3000',
  },
  production: {
    apiUrl: 'https://your-production-server.com', // Replace with your actual production server URL
  },
};

const getEnvVars = () => {
  // Check if we're running in development or production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Return the appropriate environment variables
  return isProduction ? ENV.production : ENV.development;
};

export default getEnvVars; 