# Contributing to Code City

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. **Fork** this repository
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/code-city.git
   cd code-city
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Start** the development server:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```
2. Make your changes
3. Test locally
4. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add building color customization"
   ```
5. Push and open a PR

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New features
- `fix:` — Bug fixes
- `docs:` — Documentation changes
- `style:` — Code style (formatting, no logic changes)
- `refactor:` — Code restructuring
- `test:` — Adding or updating tests
- `ci:` — CI/CD changes

## Project Structure

```
code-city/
├── app/           # Three.js application code
├── package.json   # Dependencies and scripts
├── vercel.json    # Deployment config
└── README.md      # Project documentation
```

## Need Help?

- Open an [issue](https://github.com/Manavarya09/code-city/issues) for bugs or questions
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
