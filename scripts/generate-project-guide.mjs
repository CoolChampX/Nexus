import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'docs');
const markdownPath = path.join(outputDir, 'project-tech-guide.md');
const pdfPath = path.join(outputDir, 'project-tech-guide.pdf');

const guide = `# Project Tech Guide

## Purpose
This project is a mobile developer Q&A app called Nexus. It lets users sign up, ask coding questions, post answers, comment, vote, manage profiles, receive notifications, and use an AI code explainer.

This guide is meant to help you answer questions like:
- What tech stack is being used?
- How does the app work end to end?
- Which file controls a specific screen or button?
- Where should I look if I need to change a feature?

## High-Level Architecture
The codebase has 2 main parts:

1. mobile
- Expo + React Native app
- Handles UI, navigation, forms, local session storage, notifications state, theme state
- Calls the backend through fetch wrappers in mobile/lib/forum-api.ts

2. backend
- Node.js + Express API
- Uses MongoDB with Mongoose for app data
- Uses Appwrite for auth-related flows like OAuth, magic links, password reset
- Uses AI providers for code explanation
- Stores business logic in controllers, models, services, and middleware

## Tech Stack

### Mobile Stack
- React Native
- Expo
- Expo Router for file-based routing
- TypeScript
- AsyncStorage for persisted auth/theme state
- Expo Image for remote/local images
- Expo Image Picker for profile/banner uploads
- React Navigation under Expo Router

Main config and entry files:
- mobile/package.json
- mobile/app/_layout.tsx
- mobile/app/(tabs)/_layout.tsx
- mobile/lib/auth.tsx
- mobile/lib/forum-api.ts
- mobile/lib/appearance.tsx
- mobile/lib/notifications.tsx

### Backend Stack
- Node.js
- Express
- Mongoose
- MongoDB
- node-appwrite
- OpenAI / Groq / Gemini fallback support
- dotenv
- morgan
- cors

Main backend entry files:
- backend/server.js
- backend/src/routes/index.js
- backend/src/config/db.js
- backend/src/config/env.js
- backend/src/config/appwrite.js

## Data and External Services

### MongoDB
Used for app data such as:
- users
- questions
- answers
- comments
- votes
- notifications
- sessions

Main model files:
- backend/src/models/User.js
- backend/src/models/Question.js
- backend/src/models/Answer.js
- backend/src/models/Comment.js
- backend/src/models/Vote.js
- backend/src/models/Notification.js
- backend/src/models/AuthSession.js

### Appwrite
Used for:
- OAuth login
- magic link login
- password reset / recovery
- remote user account coordination

Main files:
- backend/src/config/appwrite.js
- backend/src/controllers/auth.controller.js
- mobile/app/auth.tsx

### Cloudinary
Used for profile avatar and banner image uploads from the mobile app.

Main file:
- mobile/app/edit-profile.tsx

Backend cleanup of replaced Cloudinary assets happens in:
- backend/src/controllers/auth.controller.js

### AI Providers
Used for the code explainer feature.

Main files:
- mobile/app/(tabs)/explore.tsx
- backend/src/controllers/ai.controller.js
- backend/src/services/ai.service.js

Provider order:
1. Groq if configured
2. OpenAI if configured
3. Gemini if configured
4. Fallback structured response if no provider is available

## Frontend Routing Map
Expo Router uses the file structure inside mobile/app.

### Main app shell
- mobile/app/_layout.tsx
This wraps the app in:
- AppearanceProvider
- AuthProvider
- NotificationsProvider

It also defines the main stack routes like:
- auth
- reset-password
- (tabs)
- profile
- questions/[questionId]
- edit-profile
- ai-history
- admin

### Bottom tab area
- mobile/app/(tabs)/_layout.tsx

Important tab screens:
- mobile/app/(tabs)/index.tsx -> Home feed
- mobile/app/(tabs)/explore.tsx -> Ask question + AI explain
- mobile/app/(tabs)/inbox.tsx -> Notifications
- mobile/app/(tabs)/more.tsx -> Settings / quick links / sign out

### Other screens
- mobile/app/auth.tsx -> Login, register, OAuth, magic link, forgot password
- mobile/app/profile.tsx -> User profile, recent questions, recent answers
- mobile/app/edit-profile.tsx -> Edit profile, upload avatar/banner, change password
- mobile/app/admin.tsx -> User/admin management
- mobile/app/questions/[questionId].tsx -> Question detail thread, answers, comments, voting
- mobile/app/ai-history.tsx -> AI explanation history

## Backend Structure

### Entry point
- backend/server.js
What it does:
- loads Express
- enables CORS
- parses JSON
- adds logging
- mounts /api routes
- starts the server after MongoDB connection

### Route registration
- backend/src/routes/index.js

Mounted modules:
- /api/auth
- /api/questions
- /api/comments
- /api/notifications
- /api/votes
- /api/ai

### Controllers
- backend/src/controllers/auth.controller.js
- backend/src/controllers/questions.controller.js
- backend/src/controllers/answers.controller.js
- backend/src/controllers/comments.controller.js
- backend/src/controllers/votes.controller.js
- backend/src/controllers/notifications.controller.js
- backend/src/controllers/ai.controller.js

### Services
- backend/src/services/ai.service.js
- backend/src/services/notification.service.js

### Middleware
- backend/src/middleware/auth.js
- backend/src/middleware/errorHandler.js
- backend/src/middleware/notFound.js

## How the App Works End to End

### Auth flow
Frontend:
- mobile/app/auth.tsx shows login/register UI
- mobile/lib/auth.tsx stores session in AsyncStorage
- mobile/lib/forum-api.ts sends auth API calls

Backend:
- backend/src/controllers/auth.controller.js handles register, login, OAuth completion, magic link completion, current profile, admin management, logout, password reset, profile update

Important behavior:
- local mobile session is stored in AsyncStorage
- API token is sent in Authorization header
- app refreshes session on app foreground

### Question flow
Create question:
- UI screen: mobile/app/(tabs)/explore.tsx
- API function: forumApi.createQuestion(...)
- backend controller: backend/src/controllers/questions.controller.js -> createQuestion
- data saved in MongoDB Question model

List questions:
- UI screen: mobile/app/(tabs)/index.tsx
- API function: forumApi.listQuestions()
- backend controller: questions.controller.js -> listQuestions

Open one question:
- UI screen: mobile/app/questions/[questionId].tsx
- API function: forumApi.getQuestion(questionId)
- backend controller: questions.controller.js -> getQuestionById

### Answer flow
Post answer:
- UI screen: mobile/app/questions/[questionId].tsx
- API function: forumApi.createAnswer(questionId, payload)
- backend controller: backend/src/controllers/answers.controller.js -> createAnswer

List answers:
- same question thread screen
- backend controller: answers.controller.js -> listAnswers

### Comment flow
Post comment on answer:
- UI screen: mobile/app/questions/[questionId].tsx
- API function: forumApi.createComment('answer', targetId, { body })
- backend controller: backend/src/controllers/comments.controller.js -> createComment

### Vote flow
Vote on question or answer:
- UI screens:
  - mobile/app/(tabs)/index.tsx
  - mobile/app/questions/[questionId].tsx
- API function: forumApi.castVote(targetType, targetId, value)
- backend controller: backend/src/controllers/votes.controller.js -> castVote

### Notification flow
Frontend:
- mobile/lib/notifications.tsx polls every 30 seconds
- mobile/app/(tabs)/inbox.tsx shows notifications

Backend:
- backend/src/controllers/notifications.controller.js
- backend/src/services/notification.service.js

Notifications are created when:
- answers are added
- comments are added

### AI explain flow
Frontend:
- mobile/app/(tabs)/explore.tsx
- user pastes code and taps Explain snippet

API wrapper:
- mobile/lib/forum-api.ts -> explainCode(...)

Backend:
- backend/src/controllers/ai.controller.js
- backend/src/services/ai.service.js

The backend:
- detects language
- chooses explanation mode
- tries Groq or OpenAI or Gemini
- returns structured explanation JSON

## Where Important Buttons Are Coded

### Home feed
File:
- mobile/app/(tabs)/index.tsx

Important buttons there:
- Ask Question button
  - navigates to /(tabs)/explore
- Profile icon button
  - navigates to /profile
- Filter button
  - opens saved technology filters
- Feed tab buttons
  - switch between Newest, Active, Unanswered
- Question card press
  - opens /questions/[questionId]
- Vote buttons on question cards
  - call forumApi.castVote('question', ...)

### Auth screen
File:
- mobile/app/auth.tsx

Important buttons:
- Log in / Create account
- GitHub sign-in
- Google sign-in
- Email me a sign-in link
- Forgot password?

These connect to:
- forumApi.login
- forumApi.register
- forumApi.requestMagicLink
- forumApi.requestPasswordReset
- OAuth redirect helpers and Appwrite callback handling

### Ask question + AI explain screen
File:
- mobile/app/(tabs)/explore.tsx

Important buttons:
- Publish
  - creates a new question
- Explain snippet
  - calls AI explain API
- History button
  - opens AI history
- Clear button
  - clears explanation result

### Question thread screen
File:
- mobile/app/questions/[questionId].tsx

Important buttons:
- Vote up/down on question
- Post answer
- Vote up/down on each answer
- Reply button on answer comment box
- Delete question
- Delete answer
- Delete comment

This is one of the most important files if someone asks:
- where answer posting happens
- where comments happen
- where vote logic is triggered
- where the question detail UI is built

### Profile screen
File:
- mobile/app/profile.tsx

Important buttons:
- Edit profile
- Manage users and admins
- Delete question
- Delete answer
- Logout icon

### Edit profile screen
File:
- mobile/app/edit-profile.tsx

Important buttons:
- Change cover photo
- Change profile picture
- Remove image
- Save
- Cancel

This file handles:
- image picker
- Cloudinary upload
- profile save
- optional password change

### Inbox screen
File:
- mobile/app/(tabs)/inbox.tsx

Important buttons:
- Mark all read
- Open notification

### More screen
File:
- mobile/app/(tabs)/more.tsx

Important buttons:
- Theme toggle area
- Edit profile
- Ask a question
- Manage users
- Sign out

### Admin screen
File:
- mobile/app/admin.tsx

Important buttons:
- Search
- Make admin / Remove admin
- Disable account / Enable account

## Main Shared Frontend Utility Files

### mobile/lib/forum-api.ts
This is one of the most important files in the whole app.

Why:
- almost every screen uses it
- it contains the API base URL detection
- it adds Authorization headers
- it defines all frontend-to-backend API calls

If someone asks:
"Where does the app call the backend?"
Start here.

### mobile/lib/auth.tsx
Controls:
- current user state
- login/register/logout
- session restore
- session refresh

### mobile/lib/notifications.tsx
Controls:
- notification list state
- unread count
- polling
- mark read / mark all read

### mobile/lib/appearance.tsx
Controls:
- light/dark/system mode
- palette selection
- persisted theme mode

## Main Backend Files to Remember

### backend/src/controllers/auth.controller.js
Use this file for:
- login
- register
- magic link
- OAuth
- password reset
- profile update
- admin role update
- disable user

### backend/src/controllers/questions.controller.js
Use this file for:
- list questions
- create question
- get question
- delete question

### backend/src/controllers/answers.controller.js
Use this file for:
- list answers
- create answer
- delete answer

### backend/src/controllers/comments.controller.js
Use this file for:
- list comments
- create comment
- delete comment

### backend/src/controllers/votes.controller.js
Use this file for:
- question votes
- answer votes

### backend/src/controllers/notifications.controller.js
Use this file for:
- get notifications
- unread count
- mark read
- mark all read

### backend/src/services/ai.service.js
Use this file for:
- AI prompt construction
- provider selection
- response parsing
- fallback behavior

## Quick "Where Do I Edit..." Cheatsheet

If you want to change:
- login screen UI -> mobile/app/auth.tsx
- home feed UI -> mobile/app/(tabs)/index.tsx
- ask question form -> mobile/app/(tabs)/explore.tsx
- question detail screen -> mobile/app/questions/[questionId].tsx
- profile UI -> mobile/app/profile.tsx
- edit profile form -> mobile/app/edit-profile.tsx
- inbox UI -> mobile/app/(tabs)/inbox.tsx
- more/settings UI -> mobile/app/(tabs)/more.tsx
- admin panel UI -> mobile/app/admin.tsx
- all API calls from app -> mobile/lib/forum-api.ts
- session/auth state -> mobile/lib/auth.tsx
- notification state -> mobile/lib/notifications.tsx
- theme logic -> mobile/lib/appearance.tsx
- backend server startup -> backend/server.js
- backend route wiring -> backend/src/routes/index.js
- auth backend logic -> backend/src/controllers/auth.controller.js
- question backend logic -> backend/src/controllers/questions.controller.js
- answer backend logic -> backend/src/controllers/answers.controller.js
- comment backend logic -> backend/src/controllers/comments.controller.js
- vote backend logic -> backend/src/controllers/votes.controller.js
- notification backend logic -> backend/src/controllers/notifications.controller.js
- AI backend logic -> backend/src/services/ai.service.js
- database connection -> backend/src/config/db.js
- env parsing -> backend/src/config/env.js

## How to Explain This Project in One Short Answer
You can describe it like this:

"This is a mobile Q&A app built with Expo and React Native on the frontend, and Node.js + Express + MongoDB on the backend. The mobile app uses Expo Router for navigation and a shared API wrapper to call backend routes. The backend handles auth, questions, answers, comments, votes, notifications, and an AI code explainer. Appwrite is used for OAuth, magic links, and password reset, while Cloudinary is used for profile image uploads."

## Best Files to Learn First
If you want to understand the app quickly, read these first in this order:

1. mobile/lib/forum-api.ts
2. mobile/app/_layout.tsx
3. mobile/app/(tabs)/index.tsx
4. mobile/app/(tabs)/explore.tsx
5. mobile/app/questions/[questionId].tsx
6. mobile/app/auth.tsx
7. backend/server.js
8. backend/src/routes/index.js
9. backend/src/controllers/auth.controller.js
10. backend/src/controllers/questions.controller.js
11. backend/src/controllers/answers.controller.js
12. backend/src/services/ai.service.js

## Final Note
If someone asks you "where is this button coded?", usually answer it in 2 steps:

1. Find the screen file inside mobile/app or mobile/components
2. If the button calls the backend, trace it through mobile/lib/forum-api.ts into the matching backend controller

That pattern works for almost the whole project.
`;

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const escapePdfText = (value) =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapLine = (text, maxChars) => {
  const normalized = text.replace(/\t/g, '  ').trimEnd();

  if (!normalized) {
    return [''];
  }

  const words = normalized.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const markdownToPlainLines = (markdown) => {
  const rawLines = markdown.split('\n');
  const lines = [];

  for (const rawLine of rawLines) {
    if (!rawLine.trim()) {
      lines.push('');
      continue;
    }

    if (rawLine.startsWith('### ')) {
      lines.push(rawLine.replace(/^###\s+/, '').toUpperCase());
      lines.push('');
      continue;
    }

    if (rawLine.startsWith('## ')) {
      lines.push(rawLine.replace(/^##\s+/, '').toUpperCase());
      lines.push('');
      continue;
    }

    if (rawLine.startsWith('# ')) {
      lines.push(rawLine.replace(/^#\s+/, '').toUpperCase());
      lines.push('');
      continue;
    }

    if (rawLine.startsWith('- ')) {
      const content = rawLine.slice(2);
      const wrapped = wrapLine(`- ${content}`, 92);
      lines.push(...wrapped);
      continue;
    }

    if (/^\d+\.\s/.test(rawLine)) {
      const wrapped = wrapLine(rawLine, 92);
      lines.push(...wrapped);
      continue;
    }

    lines.push(...wrapLine(rawLine, 92));
  }

  return lines;
};

const buildPdf = (plainLines) => {
  const pageWidth = 612;
  const pageHeight = 792;
  const marginLeft = 50;
  const marginTop = 52;
  const lineHeight = 14;
  const usableHeight = pageHeight - marginTop - 50;
  const linesPerPage = Math.floor(usableHeight / lineHeight);
  const pages = [];

  for (let i = 0; i < plainLines.length; i += linesPerPage) {
    pages.push(plainLines.slice(i, i + linesPerPage));
  }

  const objects = [];

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');

  const pageObjectIds = [];
  const contentObjectIds = [];

  for (let i = 0; i < pages.length; i += 1) {
    pageObjectIds.push(3 + i * 2);
    contentObjectIds.push(4 + i * 2);
  }

  objects.push(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] >>`
  );

  for (let i = 0; i < pages.length; i += 1) {
    const pageId = pageObjectIds[i];
    const contentId = contentObjectIds[i];
    const pageLines = pages[i];

    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentId} 0 R >>`;

    const textCommands = [];
    let y = pageHeight - marginTop;

    textCommands.push('BT');
    textCommands.push('/F1 11 Tf');
    textCommands.push(`1 0 0 1 ${marginLeft} ${y} Tm`);

    for (let lineIndex = 0; lineIndex < pageLines.length; lineIndex += 1) {
      if (lineIndex > 0) {
        textCommands.push(`0 -${lineHeight} Td`);
      }

      textCommands.push(`(${escapePdfText(pageLines[lineIndex])}) Tj`);
    }

    textCommands.push('ET');

    const stream = textCommands.join('\n');
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;
  }

  const fontObjectId = 3 + pages.length * 2;
  objects[fontObjectId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
};

ensureDir(outputDir);
fs.writeFileSync(markdownPath, guide, 'utf8');

const plainLines = markdownToPlainLines(guide);
const pdf = buildPdf(plainLines);
fs.writeFileSync(pdfPath, pdf, 'binary');

console.log(`Guide written to ${markdownPath}`);
console.log(`PDF written to ${pdfPath}`);
