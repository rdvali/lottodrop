import crypto from 'crypto';

/**
 * Security configuration with proper validation
 */
export class SecurityConfig {
  private static instance: SecurityConfig;
  
  private constructor() {
    this.validateEnvironment();
  }

  static getInstance(): SecurityConfig {
    if (!SecurityConfig.instance) {
      SecurityConfig.instance = new SecurityConfig();
    }
    return SecurityConfig.instance;
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const required = [
      'JWT_SECRET',
      'DB_PASSWORD',
      'ADMIN_PASSWORD'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please ensure all required variables are set in your .env file'
      );
    }

    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Validate admin password strength
    if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters long');
    }

    // Warn about default values
    if (process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
      console.error('⚠️  WARNING: Using default JWT_SECRET. This is a security risk!');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Cannot use default JWT_SECRET in production');
      }
    }
  }

  /**
   * Get JWT configuration
   */
  getJWTConfig() {
    return {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.TOKEN_EXPIRY || '7d',
      refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d'
    };
  }

  /**
   * Get CORS allowed origins
   */
  getCORSOrigins(): string[] {
    const origins = process.env.ALLOWED_ORIGINS || '';
    return origins.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  /**
   * Get bcrypt rounds
   */
  getBcryptRounds(): number {
    return parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Get rate limit configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    };
  }

  /**
   * Check if running in production
   */
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get admin credentials (with validation)
   */
  getAdminCredentials() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error('Admin credentials not properly configured');
    }

    return { email, password };
  }
}

export default SecurityConfig.getInstance();