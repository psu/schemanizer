# Schemanizer

A tool for converting between Zod schemas and JSON Schema.

## About

Schemanizer is a lightweight conversion tool with two main features:
- Convert JSON to Zod schema
- Convert Zod schema to JSON Schema

The main application is a standalone HTML page (`client/converter.html`) with a simple React wrapper for routing.

## Development

This project uses Vite for both client and server development.

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Build Process

The build process is handled entirely by Vite:

- `npm run build:client` - Builds the client-side React application
- `npm run build:server` - Builds the server-side Express application
- `npm run build` - Runs both build commands in sequence

## Project Structure

- `/client` - Contains the main converter.html and minimal React application
- `/server` - Express backend application with JSON/Zod conversion logic
- `/shared` - Shared code between client and server
- `/dist` - Build output directory

## Architecture

The application uses a minimal architecture:
- The primary UI is in `converter.html` with vanilla JavaScript
- A minimal React application handles routing
- The Express server provides the API for schema conversion