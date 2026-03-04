# Pretty Error Filter

A global exception filter that provides user-friendly error formatting for ADK-TS agent errors, internal errors, and validation errors.

## Features

- **Categorized Errors**: Automatically categorizes errors into meaningful types (Agent Loading, Module Not Found, Validation, etc.)
- **Helpful Suggestions**: Provides actionable tips for common error scenarios
- **Clean Messages**: Removes redundant prefixes and noise from error messages
- **Smart Status Codes**: Automatically determines appropriate HTTP status codes
- **Debug Mode**: Shows stack traces only when `ADK_DEBUG_NEST=1` or in development mode

## Error Categories

### Agent Loading Error

Triggered when an agent fails to load or import.

- Checks for syntax errors
- Verifies imports
- Suggests installing dependencies

### Module Not Found

Triggered when a dependency is missing.

- Extracts module name
- Suggests installation command
- Provides package.json guidance

### Validation Error

Triggered when Zod schema validation fails.

- Lists all validation issues
- Shows field paths
- Provides configuration tips

### Environment Configuration Error

Triggered when environment variables are missing.

- Lists missing variables
- Suggests checking .env file
- Recommends running `adk check`

### Runtime Error

Triggered during agent execution.

- Highlights runtime issues
- Suggests code review

### Syntax Error & Type Error

Standard JavaScript/TypeScript errors with helpful context.

## API Response Format

```json
{
  "error": "Agent Loading Error",
  "message": "Failed to load agent: Cannot find module 'openai'",
  "details": [
    "Missing dependency: openai",
    "💡 Try running: npm install openai",
    "Or ensure it's declared in your package.json"
  ],
  "timestamp": "2025-10-21T21:10:12.000Z",
  "path": "/api/agents/my-agent/message"
}
```

## Console Output Format

```
❌ Module Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cannot find module 'openai'

💡 Install the missing module: npm install openai
💡 Or add it to your package.json dependencies
```

## Configuration

The filter is automatically applied globally in the HTTP server bootstrap.

### Enable Stack Traces

```bash
export ADK_DEBUG_NEST=1
# or
export NODE_ENV=development
```

## Usage

The filter is applied automatically to all HTTP requests. No manual configuration needed.

Errors thrown anywhere in the application (controllers, services, agents) will be:

1. Caught by the filter
2. Categorized and formatted
3. Logged with appropriate severity
4. Returned as a pretty JSON response

## Development

To extend the error categorization:

1. Add new error patterns in `categorizeError()` method
2. Create corresponding suggestions in the return object
3. Test with various error scenarios
