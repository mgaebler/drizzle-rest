# Security Guide for Drizzle REST Adapter

## Overview

This document outlines security considerations and best practices when using the Drizzle REST Adapter in production environments.

## Security Features

### ✅ Built-in Protections

1. **SQL Injection Protection**: Uses Drizzle ORM with parameterized queries
2. **Input Validation**: Zod schema validation for request bodies
3. **Type Safety**: TypeScript provides compile-time safety
4. **Error Sanitization**: Stack traces hidden in production mode

### ⚠️ Required Security Configurations

## Authentication & Authorization

The adapter does **NOT** include built-in authentication. You must implement your own:

```typescript
import express from 'express';
import { createDrizzleRestAdapter } from 'drizzle-rest-adapter';

const app = express();

// Add your authentication middleware BEFORE the adapter
app.use('/api', (req, res, next) => {
    // Verify JWT token, session, etc.
    const token = req.headers.authorization;
    if (!isValidToken(token)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// Then add the REST adapter
const apiRouter = createDrizzleRestAdapter({
    db,
    schema,
    security: {
        maxBodySize: 1024 * 1024, // 1MB limit
        sanitizeInput: true,
    }
});

app.use('/api/v1', apiRouter);
```

## Production Security Checklist

### 🔒 Required for Production

- [ ] **Authentication**: Implement JWT, session-based, or API key authentication
- [ ] **HTTPS**: Always use HTTPS in production
- [ ] **Rate Limiting**: Implement rate limiting (recommended: express-rate-limit)
- [ ] **CORS**: Configure CORS properly for your domain
- [ ] **Helmet**: Use helmet.js for security headers
- [ ] **Input Validation**: Enable input sanitization
- [ ] **Environment Variables**: Store sensitive config in environment variables
- [ ] **Dependency Updates**: Keep dependencies updated (run `npm audit` regularly)

### 🛡️ Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));
```

### 📝 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);
```

### 🔍 Request Validation

```typescript
import { body, query, validationResult } from 'express-validator';

// Example validation middleware
app.use('/api/v1/users', [
    body('fullName').isLength({ min: 1, max: 100 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
]);
```

## Security Configuration Options

```typescript
const apiRouter = createDrizzleRestAdapter({
    db,
    schema,
    security: {
        maxBodySize: 1024 * 1024, // 1MB
        sanitizeInput: true,
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: 100
        }
    },
    tableOptions: {
        users: {
            // Disable dangerous endpoints if needed
            disabledEndpoints: ['DELETE']
        }
    },
    logging: {
        requestLogging: {
            enabled: true,
            logBody: false, // Avoid logging sensitive data
            logHeaders: false,
            logQuery: true
        }
    }
});
```

## Common Security Vulnerabilities to Avoid

### 1. Information Disclosure
- ❌ Don't log sensitive data (passwords, tokens, PII)
- ❌ Don't expose stack traces in production
- ❌ Don't return internal database errors to clients

### 2. Access Control
- ❌ Don't rely on frontend validation only
- ❌ Don't expose admin-only endpoints without proper authorization
- ❌ Don't allow unrestricted access to all tables

### 3. Data Validation
- ❌ Don't trust client-side data
- ❌ Don't skip input validation
- ❌ Don't allow unlimited request sizes

## Monitoring & Alerting

### Security Logging
Monitor these events:
- Failed authentication attempts
- Unusual query patterns
- High request volumes from single IPs
- Error rate spikes
- Large request payloads

### Example Security Logging
```typescript
import { createLogger } from 'drizzle-rest-adapter';

const securityLogger = createLogger({
    level: 'info',
    name: 'security'
});

app.use((req, res, next) => {
    // Log suspicious activity
    if (req.body && JSON.stringify(req.body).length > 10000) {
        securityLogger.warn({
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            bodySize: JSON.stringify(req.body).length,
            url: req.url
        }, 'Large request body detected');
    }
    next();
});
```

## Incident Response

1. **Preparation**: Have monitoring and alerting in place
2. **Detection**: Monitor logs for suspicious activity
3. **Response**: Have a plan for disabling endpoints if needed
4. **Recovery**: Keep backups and have rollback procedures
5. **Lessons Learned**: Review and improve security measures

## Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)

## Security Updates

Stay informed about security updates:
- Follow [@drizzle_orm](https://twitter.com/drizzle_orm) for Drizzle updates
- Subscribe to Node.js security announcements
- Run `npm audit` regularly
- Use tools like Snyk or GitHub Dependabot for dependency monitoring
