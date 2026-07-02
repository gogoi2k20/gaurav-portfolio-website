import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Treat .md files as raw strings
    {
      name: 'markdown-raw',
      transform(code, id) {
        if (id.endsWith('.md')) {
          return `export default ${JSON.stringify(code)}`
        }
      }
    }
  ],
  assetsInclude: ['**/*.md'],
})
