# Backend

Express API scaffolded from the synopsis.

## Modules included

- Authentication placeholder for Appwrite session validation
- Question module
- Answer module
- Voting module
- Comment module
- AI code explainer module

## Run

```bash
npm install
npm run dev
```

## Environment

Create `.env` from `.env.example` and add:

- MongoDB URI
- Appwrite endpoint, project, API key
- `PUBLIC_BACKEND_URL` set to your deployed backend origin for OAuth redirects, for example `https://nexusbackdev.vercel.app`
- Enable the `GitHub` and `Google` OAuth providers in Appwrite if you want social login
- Gemini API key
- Optional `GEMINI_MODEL` override for the explainer

## Notes

- `requireAuth` currently expects `x-user-id` while Appwrite JWT/session validation is being wired.
- Replace that middleware with full Appwrite verification once your auth flow is connected.
