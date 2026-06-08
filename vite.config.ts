import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When deployed to GitHub Pages the app lives at:
//   https://<username>.github.io/<repo-name>/
// VITE_BASE_PATH is set to /<repo-name>/ in the GitHub Actions workflow.
// In local dev it's left unset so the app runs at http://localhost:5175/.
const base = process.env.VITE_BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5175 },
})
