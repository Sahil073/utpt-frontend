# UTPT Frontend

Static HTML/CSS/JS frontend for the UTPT Placement Tracker.  
Hosted on **Netlify** — no build step required.

## Deploy to Netlify

1. Push this folder to a GitHub repository.
2. Connect the repo to Netlify (or drag-and-drop this folder in the Netlify dashboard).
3. Set `publish directory` to `.` (the root of this folder).
4. **Important:** Edit `netlify.toml` and replace `YOUR_BACKEND_URL` with your deployed backend URL:

```toml
[[redirects]]
  from = "/api/*"
  to   = "https://your-backend.onrender.com/api/:splat"
```

## Local development

Open any `.html` file directly in a browser, or use a simple static server:

```bash
npx serve .
```

API calls will proxy to the backend via `netlify.toml` in production.  
For local dev, update `BASE` in `js/api.js` to point to your local backend:

```js
const BASE = 'http://localhost:5000/api/v1';
```
