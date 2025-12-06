# Contributing to ThreadKit

Thanks for your interest in contributing to ThreadKit! This document outlines the process for contributing to this project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/threadkit.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b my-feature`

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Rust 1.75+ (for server development)
- Redis (for local testing)

### Running Locally

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Run tests
pnpm test

# Start dev server (for examples)
pnpm dev
```

### Server Development

```bash
cd server

# Run with cargo
cargo run

# Run tests
cargo test
```

## Project Structure

```
threadkit/
├── packages/
│   ├── react/              # React components
│   ├── plugin-auth-ethereum/
│   ├── plugin-auth-solana/
│   ├── plugin-latex/
│   ├── plugin-media-preview/
│   └── plugin-syntax-highlight/
├── server/                 # Rust backend
├── examples/               # Example applications
└── docs/                   # Documentation
```

## Pull Request Process

1. Ensure your code follows the existing style
2. Update documentation if needed
3. Add tests for new functionality
4. Run `pnpm test` and ensure all tests pass
5. Run `pnpm build` and ensure the build succeeds
6. Submit your PR with a clear description of changes

## Commit Messages

We follow conventional commits. Examples:

- `feat: add dark mode support`
- `fix: resolve threading issue on mobile`
- `docs: update authentication guide`
- `chore: update dependencies`

## Code Style

- TypeScript for all frontend code
- Rust for backend code
- Use Prettier for formatting (runs automatically on commit)

## Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include reproduction steps for bugs
- Check existing issues before creating a new one

## Community

- Be respectful and inclusive
- Help others when you can
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
