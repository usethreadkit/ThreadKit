import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeBlockRenderer } from './CodeBlockRenderer';

const meta = {
  title: 'Renderers/CodeBlockRenderer',
  component: CodeBlockRenderer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CodeBlockRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const JavaScript: Story = {
  args: {
    code: `function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}

greet('World');`,
    language: 'javascript',
    theme: 'light',
  },
};

export const TypeScript: Story = {
  args: {
    code: `interface User {
  id: string;
  name: string;
  email?: string;
}

function getUserName(user: User): string {
  return user.name;
}`,
    language: 'typescript',
    theme: 'light',
  },
};

export const Python: Story = {
  args: {
    code: `def fibonacci(n):
    """Generate Fibonacci sequence up to n terms"""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

# Print first 10 Fibonacci numbers
for num in fibonacci(10):
    print(num)`,
    language: 'python',
    theme: 'light',
  },
};

export const Rust: Story = {
  args: {
    code: `fn main() {
    let numbers = vec![1, 2, 3, 4, 5];

    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);

    let doubled: Vec<i32> = numbers.iter()
        .map(|x| x * 2)
        .collect();
    println!("Doubled: {:?}", doubled);
}`,
    language: 'rust',
    theme: 'light',
  },
};

export const JSON: Story = {
  args: {
    code: `{
  "name": "threadkit",
  "version": "1.0.0",
  "description": "Privacy-first commenting system",
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  }
}`,
    language: 'json',
    theme: 'light',
  },
};

export const DarkTheme: Story = {
  args: {
    code: `const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
    language: 'javascript',
    theme: 'dark',
  },
};

export const SQL: Story = {
  args: {
    code: `SELECT u.name, COUNT(c.id) as comment_count
FROM users u
LEFT JOIN comments c ON u.id = c.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(c.id) > 5
ORDER BY comment_count DESC
LIMIT 10;`,
    language: 'sql',
    theme: 'light',
  },
};

export const Bash: Story = {
  args: {
    code: `#!/bin/bash

# Deploy script
echo "Starting deployment..."

npm install
npm run build

if [ $? -eq 0 ]; then
  echo "Build successful!"
  rsync -avz dist/ user@server:/var/www/
else
  echo "Build failed!"
  exit 1
fi`,
    language: 'bash',
    theme: 'light',
  },
};

export const HTML: Story = {
  args: {
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ThreadKit Demo</title>
</head>
<body>
  <div id="root"></div>
  <script src="app.js"></script>
</body>
</html>`,
    language: 'html',
    theme: 'light',
  },
};
