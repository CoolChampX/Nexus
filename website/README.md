# Website

Expo web workspace for the project.

This folder reuses the mobile app's routes, theme, and components so the
website stays visually and behaviorally aligned with the Expo application.

## Run

```bash
npm install
npm run web
```

## Environment

Create `website/.env` and add:

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000
```

## Notes

- The website renders the same Expo Router screens from `mobile/app`.
- Imports like `@/components/...` resolve to the `mobile` folder.
- Run the backend in a separate terminal before opening the web app.
