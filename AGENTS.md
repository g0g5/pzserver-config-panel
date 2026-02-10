# Agent Configuration

## Environment

### Working Environment
- Windows 11 25H2 (x64)
- Node.js >= 18
- Working directory: D:/Workspace/APP/pzserver-config-panel

### Path Rules
- Use forward slashes (/) as path separators in all file paths
- Relative paths are relative to the workspace root
- Case-insensitive file system

## Build/Lint/Test Commands

### Development
- `npm run dev` - Start development server with tsx
- `npm run build` - Build TypeScript to dist/ using tsc
- `npm start` - Run compiled server from dist/server.js

### Testing
- `npm test` - Run all tests with Vitest
- `npm test -- <test-file>` - Run specific test file (e.g., `npm test -- tests/service.test.ts`)
- `npm test -- -t <pattern>` - Run tests matching name pattern (e.g., `npm test -- -t "should save"`)
- `npm test -- run` - Run tests once without watch mode

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022, Module: CommonJS
- Strict mode enabled (`strict: true`)
- Source maps enabled
- Force consistent casing in file names

### Imports
- Use ES module syntax with `.js` extensions for local imports: `import { foo } from "./bar.js"`
- No file extensions for npm package imports: `import express from "express"`
- Use `node:` prefix for Node.js built-in modules: `import { readFile } from "node:fs/promises"`
- Named imports for specific exports, default imports for default exports

### Formatting
- 2 spaces indentation
- Semicolons at end of lines
- Double quotes for strings
- Trailing commas in arrays/objects
- No automatic formatting tool (no Prettier/eslint)

### Types
- Use `type` aliases for simple types and unions
- Use `interface` for object shapes with methods
- Use `as any` sparingly, only in test code
- Export types from dedicated types/ directory
- Use generic types for utility methods (map, filter, etc.)

### Naming Conventions
- PascalCase: Classes, type definitions, enum values
- camelCase: Variables, functions, methods, parameters
- UPPER_SNAKE_CASE: Constants and enum names
- Prefix unused parameters with underscore: `_req`, `_next`
- Descriptive, meaningful names

### Error Handling
- Use custom `AppError` class from `src/errors/app-error.ts`
- Error codes: BAD_REQUEST, NOT_FOUND, FILE_LOCKED, IO_ERROR, ENCODING_UNSUPPORTED
- Throw `AppError` with code and message: `throw new AppError("BAD_REQUEST", "message")`
- Catch `AppError` in route handlers and return appropriate HTTP status
- Map errors using `toErrorResponse()` helper

### File Organization
- `src/server.ts` - Application entry point and CLI argument parsing
- `src/routes/` - Express route handlers
- `src/middleware/` - Express middleware
- `src/config/` - Configuration management logic
- `src/types/` - TypeScript type definitions
- `src/errors/` - Custom error classes
- `tests/` - Test files co-located with implementation

### Code Style
- Use `const` for immutable values, `let` for mutable
- Arrow functions for callbacks and short functions
- Prefer functional programming over imperative loops
- Early returns and guard clauses
- No code comments unless explicitly requested
- Minimal code, maximum clarity
- Separate concerns: functions should do one thing

### Testing
- Framework: Vitest with node environment
- Use `describe` for test suites, `it` for individual tests
- Setup/teardown with `beforeEach`/`afterEach`
- Test structure: arrange, act, assert
- Use `expect` for assertions
- Test file naming: `<module>.test.ts` in tests/ directory
- Validate both success and error paths
- Test edge cases and boundary conditions

### HTTP Routes
- Use Express Router pattern with factory functions
- Route handlers catch errors and respond appropriately
- Use async/await for asynchronous operations
- Return JSON responses with appropriate HTTP status codes
- Use AppError for expected errors, generic Error for unexpected

### CLI Arguments
- Parse CLI args with manual parsing in `src/server.ts`
- Required: `--config <path>`
- Optional: `--port <number>` (default: 3000)
- Validate all arguments on startup
- Print usage on error and exit with code 1
