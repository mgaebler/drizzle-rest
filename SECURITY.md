# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security issues seriously. Please follow these guidelines when reporting security vulnerabilities:

### How to Report

1. **Email**: Send a detailed report to [marian.gaebler@gmail.com](mailto:marian.gaebler@gmail.com)
2. **Subject**: Use the prefix `[SECURITY]` in your email subject
3. **Details**: Include as much information as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Development**: Within 30 days (depending on severity)
- **Public Disclosure**: After fix is released

### Security Best Practices

When using the Drizzle REST Adapter:

1. **Authentication**: Always implement proper authentication before the adapter
2. **Authorization**: Use hooks for fine-grained access control
3. **Input Validation**: Enable input sanitization
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Updates**: Keep dependencies updated regularly

### Security Features

- **SQL Injection Protection**: Uses Drizzle ORM with parameterized queries
- **Input Validation**: Zod schema validation for request bodies
- **Hook-Based Authorization**: Fine-grained access control via hooks
- **Error Sanitization**: Stack traces hidden in production

For detailed security guidance, see [docs/security.md](docs/security.md).

## Disclosure Policy

We follow responsible disclosure principles:

1. Security issues are first reported privately
2. We work with reporters to understand and fix issues
3. Public disclosure happens after fixes are available
4. We credit security researchers (unless they prefer anonymity)

## Contact

For security-related questions or concerns, contact:
- Email: [marian.gaebler@gmail.com](mailto:marian.gaebler@gmail.com)
- GitHub: [@mgaebler](https://github.com/mgaebler)
