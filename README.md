# Vanta

Minimalistic productivity app built with React Native + Expo.
The app helps users stay focused on one task at a time, track completed and failed focus sessions, and build a productivity streak over time.

## Features

- User registration and login
- Persistent authentication with backend
- Focus session creation
- Success / fail session logic
- Daily focus time summary
- Streak tracking
- Session history
- Swipe-to-delete interactions
- Haptic feedback / vibration on important actions
- Logout flow
- Onboarding and splash screen

## Project idea

Vanta is based on a simple rule: one task at a time.
The user starts a focus session for a chosen task. If the session is completed, it is marked as successful and contributes to the user's streak. If the user leaves early or breaks focus, the session is marked as failed. The app keeps a history of sessions and shows daily productivity statistics.

## Tech stack



## 1) Set up MongoDB

You can use either local MongoDB or MongoDB Atlas.

### Option A: MongoDB Atlas (recommended)

1. Create a free cluster on MongoDB Atlas.
2. Create a DB user (username/password).
3. In Network Access, allow your current IP (or temporarily `0.0.0.0/0` for testing).
4. Copy your connection string, for example:

   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/vanta?retryWrites=true&w=majority`

### Option B: local MongoDB

Use:

`mongodb://127.0.0.1:27017/vanta`

## 2) Configure backend

From repo root:

1. Go to [backend](backend)
2. Install dependencies: `npm install`
3. Create `.env` from [.env.example](backend/.env.example)

Example `.env`:

```
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/vanta?retryWrites=true&w=majority
JWT_SECRET=use_a_long_random_secret_here
CLIENT_URL=http://localhost:8081
```

4. Start API in dev mode: `npm run dev`

Backend endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/health`

## 3) Configure mobile app

In [vanta](vanta), create `.env` and set:

```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

Then run app:

`npm start`

### Important for real device testing

If your phone is on the same Wi‑Fi as your laptop, replace `localhost` with your laptop LAN IP:

`EXPO_PUBLIC_API_URL=http://192.168.x.x:4000`

## 4) Quick test

1. Open app, complete onboarding, open auth screen.
2. Register a new account.
3. Confirm you are redirected to home.
4. Sign out and sign in again.

If auth fails, check backend logs and verify `MONGODB_URI` + `EXPO_PUBLIC_API_URL`.
