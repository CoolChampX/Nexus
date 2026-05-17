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

## Admins

Users default to the `user` role. Promote an existing account to `admin` with:

```bash
npm run make-admin -- your-email@example.com
```

You can also pass the app `userId` instead of the email.

Admins use the same in-app delete/moderation actions as owners, but they can also delete other users' questions, answers, and comments.

Only the primary admins from `PRIMARY_ADMIN_EMAILS` or `PRIMARY_ADMIN_USER_IDS` can grant or revoke admin access through the API.

## Environment

Create `.env` from `.env.example` and add:

- MongoDB URI
- Appwrite endpoint, project, API key
- `PUBLIC_BACKEND_URL` set to your deployed backend origin for OAuth redirects, for example `https://nexusbackdev.vercel.app`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` if you want avatar/banner uploads stored in Cloudinary and automatic cleanup of replaced images
- `PRIMARY_ADMIN_EMAILS` as a comma-separated list of the main admin emails allowed to manage admin access
- Optional `PRIMARY_ADMIN_USER_IDS` as a comma-separated list of the main admin app userIds allowed to manage admin access
- Enable the `GitHub` and `Google` OAuth providers in Appwrite if you want social login
- Gemini API key
- Optional `GEMINI_MODEL` override for the explainer

## Notes

- `requireAuth` currently expects `x-user-id` while Appwrite JWT/session validation is being wired.
- Replace that middleware with full Appwrite verification once your auth flow is connected.
