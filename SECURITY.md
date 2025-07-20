# Security Documentation for ETOH Tracker

## Security Improvements Implemented

### 🔐 Authentication & Authorization

#### JWT Token Security
- **Short-lived access tokens**: 15 minutes (down from 24 hours)
- **Refresh token mechanism**: 7-day expiration for secure token renewal
- **Token type validation**: Separate access and refresh token types
- **Enhanced error handling**: Specific error messages for expired vs invalid tokens

#### Password Security
- **Strong password requirements**: Minimum 8 characters with uppercase, lowercase, number, and special character
- **Bcrypt hashing**: Secure password hashing with salt rounds
- **Password validation**: Server-side enforcement of password complexity

#### Rate Limiting
- **Authentication endpoints**: Maximum 5 attempts per 15 minutes per IP
- **General API**: Maximum 1000 requests per 15 minutes per IP
- **File uploads**: Maximum 3 uploads per minute per user
- **Progressive delays**: Automatic slowdown after repeated requests

### 🛡️ API Security

#### CORS Configuration
- **Restricted origins**: Production limited to `https://etoh.doctorfranz.com`
- **Development flexibility**: Allows localhost for development
- **Credential support**: Secure cookie and authorization header handling

#### Input Validation & Sanitization
- **Express-validator**: Comprehensive input validation on all endpoints
- **SQL injection prevention**: Parameterized queries throughout
- **XSS protection**: Input sanitization and output encoding
- **Data type validation**: Strict validation of all input parameters

#### Security Headers
- **Helmet.js**: Comprehensive security header implementation
- **Content Security Policy**: Prevents XSS and injection attacks
- **Cross-origin protection**: Configures CORP policies appropriately

### 📁 File Upload Security

#### File Validation
- **Magic number validation**: File signature verification beyond MIME types
- **Extension validation**: Whitelist of allowed file extensions
- **Size limits**: Maximum 5MB per upload
- **Path traversal prevention**: Sanitized filename handling

#### File Management
- **Secure naming**: UUID-like filename generation prevents conflicts
- **Permission control**: Files created with secure 644 permissions
- **Cleanup procedures**: Automatic removal of old profile pictures
- **Directory security**: Upload directory with proper 755 permissions

### 🐳 Infrastructure Security

#### Docker Security
- **Non-root execution**: All containers run as unprivileged users
- **Alpine base images**: Minimal attack surface with security updates
- **npm audit**: Automatic vulnerability scanning and fixes
- **Resource limits**: Memory and CPU constraints
- **Clean builds**: Removal of unnecessary packages and cache

#### Network Security
- **Internal networking**: Database and API communication isolated
- **No external database access**: PostgreSQL only accessible internally
- **Specific port exposure**: Only necessary ports exposed to nginx

#### Database Security
- **Connection pooling**: Configured limits and timeouts
- **SSL/TLS**: Enabled for production connections
- **Query timeouts**: Prevents long-running query attacks
- **Parameter binding**: All queries use parameterized statements

### 🔍 Monitoring & Logging

#### Error Handling
- **Information disclosure prevention**: Generic error messages to clients
- **Detailed server logging**: Comprehensive error tracking for debugging
- **Validation error reporting**: User-friendly validation feedback

#### Security Logging
- **Authentication attempts**: All login/registration attempts logged
- **File upload tracking**: Upload success/failure logging
- **Rate limit violations**: Automatic logging of suspicious activity

## Security Best Practices for Deployment

### Environment Variables
```bash
# Strong JWT secret (minimum 256 bits)
JWT_SECRET="your-super-secure-256-bit-secret-key-here"

# Strong database password
POSTGRES_PASSWORD="your-secure-database-password"

# Production API URL
API_URL="https://etoh.doctorfranz.com"

# Node environment
NODE_ENV="production"
```

### Nginx Security Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name etoh.doctorfranz.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Proxy Configuration
    location / {
        proxy_pass http://etoh-app:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API Proxy (optional optimization)
    location /api/ {
        proxy_pass http://etoh-api:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Upload Proxy
    location /uploads/ {
        proxy_pass http://etoh-api:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name etoh.doctorfranz.com;
    return 301 https://$server_name$request_uri;
}
```

### Database Security
1. **Use strong passwords**: Minimum 16 characters with mixed case, numbers, and symbols
2. **Enable SSL/TLS**: For all database connections in production
3. **Regular backups**: Encrypted backup strategy with secure storage
4. **Network isolation**: Database only accessible from application containers

### Monitoring Recommendations
1. **Log aggregation**: Centralized logging with tools like ELK stack
2. **Security monitoring**: Alert on authentication failures and rate limit violations
3. **Performance monitoring**: Track API response times and database performance
4. **Vulnerability scanning**: Regular dependency and container scanning

## Security Checklist for Production

- [ ] Strong JWT secret configured (256+ bits)
- [ ] Database password is strong and unique
- [ ] SSL/TLS certificates installed and configured
- [ ] Nginx security headers implemented
- [ ] Rate limiting configured
- [ ] Docker containers running as non-root users
- [ ] File upload directory has correct permissions
- [ ] Database connections use SSL in production
- [ ] All environment variables are properly secured
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting configured
- [ ] Backup and disaster recovery plan in place

## Vulnerability Reporting

If you discover a security vulnerability, please:
1. **Do not** open a public issue
2. Email security concerns to the development team
3. Include detailed information about the vulnerability
4. Allow reasonable time for fixes before disclosure

## Regular Security Maintenance

1. **Monthly**: Update all dependencies using `npm audit`
2. **Quarterly**: Review and rotate secrets/passwords
3. **Annually**: Security audit and penetration testing
4. **Continuously**: Monitor for new security advisories

---

**Last Updated**: $(date)
**Security Version**: 1.0