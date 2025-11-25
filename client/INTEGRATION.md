# Frontend-Backend Integration Guide

## Overview

This document describes how the TribeBuilders frontend connects to the backend API.

## API Client

The main API client is located at [src/lib/api.ts](src/lib/api.ts). It provides a comprehensive interface to all backend endpoints.

### Key Features

- **Authentication**: JWT token management with automatic storage in localStorage
- **Type Safety**: Full TypeScript support with interfaces for all API responses
- **Error Handling**: Consistent error handling across all requests
- **Token Injection**: Automatic injection of authentication token in requests

### Usage Example

```typescript
import { apiClient } from '@/lib/api';

// Login
const response = await apiClient.login('user@example.com', 'password');
// Token is automatically saved

// Create artist profile
const artist = await apiClient.createArtistProfile({
  artist_name: 'My Artist Name',
  genre: 'Pop',
  bio: 'My artist bio',
});

// Generate AI content
const content = await apiClient.generateContent({
  content_type: 'social_post',
  context: 'new single release',
  variations: 3,
});
```

## Authentication Context

Location: [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)

Provides global authentication state management using React Context API.

### Available Methods

- `login(email, password)` - Authenticate user
- `register(email, password)` - Create new account
- `logout()` - Clear authentication
- `isAuthenticated` - Boolean flag for auth status
- `user` - Current user object

### Usage

```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>Welcome, {user.email}</div>;
}
```

## Available Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user

### Artist Profile
- `GET /api/artists/profile` - Get artist profile
- `POST /api/artists/profile` - Create artist profile
- `PUT /api/artists/profile` - Update artist profile

### Personas
- `GET /api/personas` - Get all personas
- `POST /api/personas` - Create persona
- `PUT /api/personas/:id` - Update persona
- `PUT /api/personas/:id/activate` - Set active persona

### Content Generation
- `POST /api/content/generate` - Generate AI content
- `POST /api/content/quality-score` - Score content quality
- `GET /api/content/history` - Get content history

### Templates
- `GET /api/content/templates` - Get all templates
- `POST /api/content/templates` - Create template
- `POST /api/content/templates/:id/process` - Process template
- `GET /api/content/templates/suggestions` - Get template suggestions

### File Uploads
- `POST /api/uploads/persona/questionnaire` - Upload questionnaire file
- `POST /api/uploads/persona/transcript` - Upload transcript file
- `GET /api/uploads/persona/files` - Get uploaded files

## Environment Variables

Create a `.env` file in the client directory:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Pages Using Backend API

### Login Page
**Path:** `/login`
**Component:** [src/pages/Login.tsx](src/pages/Login.tsx)
**Backend APIs:**
- User registration
- User login

### Persona Form
**Path:** `/persona`
**Component:** [src/pages/PersonaForm.tsx](src/pages/PersonaForm.tsx)
**Backend APIs:**
- Create/Update artist profile
- Create/Update persona

### Content Generator
**Path:** `/content-generator`
**Component:** [src/pages/ContentGenerator.tsx](src/pages/ContentGenerator.tsx)
**Backend APIs:**
- Generate AI content
- Score content quality

### Media Upload
**Path:** `/media`
**Component:** [src/pages/MediaUpload.tsx](src/pages/MediaUpload.tsx)
**Backend APIs:**
- Upload questionnaire files
- Upload transcript files

## Testing the Integration

### 1. Start the Backend

```bash
cd server
npm run dev
```

Backend should be running on `http://localhost:3000`

### 2. Start the Frontend

```bash
cd client
npm run dev
```

Frontend should be running on `http://localhost:8084`

### 3. Test Flow

1. Navigate to `http://localhost:8084/login`
2. Register a new account
3. Create an artist profile in the Persona Form
4. Generate content using the AI Content Generator

### 4. Check API Connectivity

Open browser console (F12) → Network tab to see API requests.

## Common Issues

### CORS Errors

Make sure backend `.env` has:
```env
CORS_ORIGIN=http://localhost:8084
```

### 401 Unauthorized

- Check if token is stored in localStorage
- Verify backend JWT_SECRET is set
- Try logging in again

### Network Errors

- Ensure backend is running on port 3000
- Check `VITE_API_URL` in frontend `.env`
- Verify proxy configuration in [vite.config.ts](vite.config.ts)

## Next Steps

1. Implement protected routes (redirect to login if not authenticated)
2. Add loading states for API calls
3. Implement error boundary for API errors
4. Add retry logic for failed requests
5. Implement optimistic UI updates

## Additional Resources

- [Backend API Documentation](../server/README.md)
- [API Endpoints](../server/API.md)
- [Database Schema](../server/src/db/001_initial_schema.sql)
