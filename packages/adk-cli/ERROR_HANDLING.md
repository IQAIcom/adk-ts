# Error Handling in ADK CLI

This document describes the comprehensive error handling system implemented in the ADK CLI.

## Overview

The ADK CLI now features **intelligent, user-friendly error formatting** with:

- **Automatic categorization** of errors (Module Not Found, Agent Loading, Environment Config, etc.)
- **Actionable suggestions** for fixing issues
- **Clean, readable console output** with emoji indicators
- **Smart HTTP status codes** for API responses
- **Debug mode** for stack traces (enabled with `ADK_DEBUG_NEST=1`)

## Components

### 1. Global Exception Filter (`src/http/filters/pretty-error.filter.ts`)

A NestJS global exception filter that automatically catches and formats all HTTP errors:

- **Categorizes errors** into types (Module Not Found, Validation Error, etc.)
- **Generates context-aware suggestions** based on error content
- **Returns JSON responses** with structured error information
- **Strips stack traces** in production (shown only in debug mode)

#### Error Categories

| Category | HTTP Status | Icon | Description |
|----------|-------------|------|-------------|
| File Not Found | 404 | 📄 | Missing files (ENOENT errors) |
| Permission Error | 403 | 🔒 | File permission denied (EACCES/EPERM) |
| Network Error | 503 | 🌐 | Connection issues (ECONNREFUSED, timeout) |
| Module Not Found | 404 | 📦 | Missing npm dependencies |
| Environment Configuration Error | 500 | 🌱 | Missing or invalid environment variables |
| Agent Loading Error | 422 | 🧠 | Import or compilation issues |
| Agent Not Found | 404 | 🤖 | Invalid or missing agent path |
| Validation Error | 400 | 🧩 | Request validation failures |
| Syntax Error | 422 | 🧾 | JavaScript/TypeScript syntax issues |
| Type Error | 500 | 🔢 | Runtime type mismatches |
| Runtime Error | 500 | ⚙️ | Generic execution failures |

#### Example API Response

```json
{
  "errorType": "Module Not Found",
  "message": "Cannot find module '@iqai/adk'",
  "suggestions": [
    "Install the missing package: pnpm add @iqai/adk",
    "Check if @iqai/adk is in your package.json dependencies",
    "Run 'pnpm install' to ensure all dependencies are installed"
  ],
  "statusCode": 404,
  "timestamp": "2025-10-28T10:37:58.123Z",
  "path": "/api/agents/my-agent/start"
}
```

### 2. Console Error Formatting (`src/common/error-formatting.ts`)

Utilities for formatting errors in console output with:

- **Box-style formatting** with dividers
- **Color-coded sections** (header, message, suggestions)
- **Emoji icons** matching error types
- **Bulleted suggestion lists**
- **Optional stack traces** (controlled by `showStack` option)

#### Example Console Output

```
❌ Module Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cannot find module '@iqai/adk'

💡 Suggestions
  • Install the missing package: pnpm add @iqai/adk
  • Check if @iqai/adk is in your package.json dependencies
  • Run 'pnpm install' to ensure all dependencies are installed

Path: /api/agents/my-agent
Time: 2025-10-28T10:37:58.123Z
```

### 3. RunCommand Integration (`src/cli/run.command.ts`)

The `adk run` command now uses the error formatting system:

- **Parses JSON error responses** from the API
- **Formats errors consistently** with categorization and suggestions
- **Respects debug mode** for stack traces
- **Maintains backward compatibility** with non-JSON errors

## Usage

### In HTTP Controllers

Errors are automatically caught and formatted by the global filter. Just throw standard exceptions:

```typescript
throw new NotFoundException('Agent not found');
throw new BadRequestException('Invalid agent configuration');
throw new Error('Failed to load agent');
```

### In Console/CLI Code

Use `ErrorFormattingUtils` for consistent formatting:

```typescript
import { ErrorFormattingUtils } from '../common/error-formatting';

try {
  // Your code
} catch (error) {
  const formatted = ErrorFormattingUtils.formatUserError(error, {
    showStack: process.env.ADK_DEBUG_NEST === '1',
    colorize: true
  });
  console.error(formatted);
}
```

### Debug Mode

Enable detailed error information with stack traces:

```bash
ADK_DEBUG_NEST=1 adk run
```

## Customization

### Adding New Error Categories

1. Add the category to `categorizeError()` in `pretty-error.filter.ts`
2. Add suggestions in `generateSuggestions()`
3. Add icon mapping in `error-formatting.ts`

### Customizing Suggestions

Suggestions are context-aware and can be enhanced by:

- Detecting specific error patterns (e.g., API key names)
- Extracting module names from error messages
- Providing direct links to documentation

## Best Practices

1. **Throw descriptive errors**: Include context in error messages
2. **Use standard error types**: `HttpException`, `Error`, etc.
3. **Enable debug mode during development**: `ADK_DEBUG_NEST=1`
4. **Test error scenarios**: Verify suggestions are helpful
5. **Keep suggestions actionable**: Users should know exactly what to do

## Examples

### Module Not Found

**Before:**
```
Error: Cannot find module '@iqai/adk'
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:...)
    ...50 more lines of stack trace...
```

**After:**
```
📦 Module Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cannot find module '@iqai/adk'

💡 Suggestions
  • Install the missing package: pnpm add @iqai/adk
  • Check if @iqai/adk is in your package.json dependencies
  • Run 'pnpm install' to ensure all dependencies are installed
```

### Environment Variable Missing

**Before:**
```
Error: Missing required environment variable GOOGLE_API_KEY
```

**After:**
```
🌱 Environment Configuration Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Missing required environment variable: GOOGLE_API_KEY

💡 Suggestions
  • Add GOOGLE_API_KEY to your .env file
  • Get an API key from https://console.cloud.google.com/apis/credentials
  • Create a .env file in your project root if it doesn't exist
```

### File Not Found

**Before:**
```
Error: ENOENT: no such file or directory, open '/path/to/file.ts'
```

**After:**
```
📄 File Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No such file or directory: '/path/to/file.ts'

💡 Suggestions
  • Check that the file path is correct
  • Verify the file exists in your project directory
  • Ensure you're running the command from the correct directory
  • Create the missing file: /path/to/file.ts
```

### Network Error

**Before:**
```
Error: connect ECONNREFUSED 127.0.0.1:8042
```

**After:**
```
🌐 Network Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Connect ECONNREFUSED 127.0.0.1:8042

💡 Suggestions
  • Ensure the server is running
  • Check if the correct port is being used (default: 8042)
  • Verify firewall settings are not blocking the connection
```

### Permission Error

**Before:**
```
Error: EACCES: permission denied, open '/etc/config.json'
```

**After:**
```
🔒 Permission Error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Permission denied: '/etc/config.json'

💡 Suggestions
  • Check file permissions with 'ls -la'
  • You may need to run with appropriate permissions
  • Ensure the file or directory is not locked by another process
```

## Testing

Test the error handling with:

```bash
# Test with invalid agent path
adk run nonexistent-agent

# Test with missing dependencies
# (temporarily remove a dependency from package.json)

# Test with debug mode
ADK_DEBUG_NEST=1 adk run

# Test API errors
curl http://localhost:8042/api/agents/invalid-path
```
