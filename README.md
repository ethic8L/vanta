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

### Mobile app

- React Native
- Expo
- Expo Router
- TypeScript

### Backend

- Node.js
- Express
- MongoDB
- JWT authentication

### Other tools / libraries

- AsyncStorage
- Expo Haptics / Vibration
- ESLint

# Project structure

```bash
root
├── vanta/       # Expo mobile application
└── backend/     # Node.js + Express + MongoDB API
```

## Frontend structure

```bash
vanta/
├── app/         # screens and routes
├── services/    # API calls, auth storage, onboarding storage
├── app.json
├── package.json
└── tsconfig.json
```

## Backend structure

```bash
backend/
├── src/
│   ├── models/
│   ├── routes/
│   └── server.js
├── .env
└── package.json
```

# Main screens

- Splash screen - initial loading and redirect logic
- Onboarding - first-time user experience
- Auth screen - login / register
- Home screen - focus session setup, streak, daily summary, session history
- Menu  - signed-in user details and logout

# How authentication works

The app uses a custom backend with MongoDB.
- Users can register and log in
- Backend returns an auth token
- The mobile app stores auth state locally
- Logged-in users are redirected to the home screen
- Users can sign out from the menu

# Setup

## 1. Clone repository

```bash
git clone <https://github.com/ethic8L/vanta.git>
cd vanta
```

## 1. Set up MongoDB

You can use either MongoDB Atlas or local MongoDB.

Option A: MongoDB Atlas

1. Create a free cluster on MongoDB Atlas
2. Create a database user
3. Allow your IP in Network Access
4. Copy your connection string, for example:

```bash
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/vanta?retryWrites=true&w=majority
```
Option B: Local MongoDB
```bash
mongodb://127.0.0.1:27017/vanta
```

## 3. Configure backend

Go to backend folder:

```bash
cd backend
npm install
```

Create .env file based on .env.example:

```bash
PORT=4000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_URL=[localhost](http://localhost:8081)
```

Start backend:

```bash
npm run dev
```

### Backend endpoints

- POST /api/auth/register
- POST /api/auth/login
- GET /api/health

## 4. Configure mobile app

Open a new terminal and go to mobile app folder:

```bash
cd vanta
npm install
```

create env file:

```bash
EXPO_PUBLIC_API_URL=[localhost](http://localhost:4000)
```

start expo: 

```bash
npm start
```

# Important for testing on a real device

If your phone is on the same Wi-Fi network as your laptop, replace localhost with your computer's LAN IP:

```bash
EXPO_PUBLIC_API_URL=[192.168.x.x](http://192.168.x.x:4000)
```

Example:

```bash
EXPO_PUBLIC_API_URL=[192.168.0.15](http://192.168.0.15:4000)
```

# Quick test scenario

1. Start backend
2. Start Expo app
4. Open auth screen
5. Register a new account
6. Sign in
7. Create and complete a focus session
8. Check streak and session history
9. Sign out
10. Sign in again

# Implemented app logic

## Focus session
- The user enters a task name
- Starts a focus session
- If the session is completed, it is saved as successful
- If the user leaves early, it is saved as failed
  
## Streak system
- Successful sessions contribute to user progress
- The home screen shows completed sessions and streak information

## Productivity stats
- Daily focused time is displayed on the main screen
- Session history remains available after app restart
  
## Native/mobile features used
- Haptic feedback / vibration for important user actions
- Local storage for onboarding / auth-related persistence
  
## Security

- Sensitive backend configuration is stored in .env
- Secrets should never be committed to Git
- JWT is used for authentication
- MongoDB connection string is stored outside source code
  
## Known limitations
- Backend must be running for authentication to work
- Real device testing requires proper LAN IP configuration
- Internet connection is required for backend-based auth features
  
## Future improvements
- More detailed statistics
- Push notifications for reminders
- Offline session sync
- Better analytics and charts
- More advanced focus timer customization
  
# Screenshots

<img src="https://github.com/user-attachments/assets/d1eaa9d1-eb3b-439f-b5a4-0a72d0610282" alt="IMG_4274" width="350" />

<img src="https://github.com/user-attachments/assets/7681edf7-fc45-421e-95fa-217c3e0e1b61" alt="IMG_4276" width="350" />

<img src="https://github.com/user-attachments/assets/07cdb4d3-7585-411f-b0db-0afedaf01e3c" alt="IMG_4279" width="350" />

<img src="https://github.com/user-attachments/assets/8310198b-7e29-4934-abc7-1b5edea53ee0" alt="IMG_4280" width="350" />



# License
MIT
