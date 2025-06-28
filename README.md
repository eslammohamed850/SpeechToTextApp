# Speech-to-Text Transcription Service

A full-stack application that transcribes speech in real-time, saves transcripts to PostgreSQL, and streams them to a React frontend with sentiment analysis.

## Features

- Real-time speech-to-text transcription using AssemblyAI
- PostgreSQL database for transcript storage
- Live streaming to a React frontend
- Sentiment analysis for each transcript segment
- Export transcripts to SRT format for video subtitling
- WebSocket communication for real-time updates

## Deployment Guide

### Backend Deployment (Render/Railway/Heroku)

1. **Deploy to Render.com** (Recommended):
   - Create a new Web Service
   - Connect your GitHub repository
   - Set the build command: `pip install -r requirements.txt`
   - Set the start command: `python run.py`
   - Add environment variables:
     - `ASSEMBLYAI_API_KEY`: Your AssemblyAI API key
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `CORS_ORIGINS`: Your frontend domain (e.g., `https://your-app.netlify.app`)

2. **Deploy to Railway.app**:
   - Create a new project
   - Connect your GitHub repository
   - Add environment variables (same as above)
   - Railway will auto-detect the Python app

3. **Deploy to Heroku**:
   - Install Heroku CLI
   - Create a new Heroku app
   - Add Heroku Postgres addon
   - Set environment variables using `heroku config:set`

### Frontend Deployment (Netlify)

1. **Deploy to Netlify**:
   - Connect your GitHub repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variable in Netlify dashboard:
     - `VITE_BACKEND_URL`: Your deployed backend URL (e.g., `https://your-backend.onrender.com`)

2. **Environment Variables**:
   - Go to Site settings > Build & deploy > Environment variables
   - Add `VITE_BACKEND_URL` with your backend URL

### Required Environment Variables

#### Backend (.env):
```
DATABASE_URL=postgresql://username:password@host:port/database
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
CORS_ORIGINS=https://your-frontend-domain.netlify.app
```

#### Frontend (.env):
```
VITE_BACKEND_URL=https://your-backend-domain.onrender.com
```

### Getting AssemblyAI API Key

1. Go to [assemblyai.com](https://www.assemblyai.com/)
2. Sign up for a free account
3. Go to your dashboard
4. Copy your API key
5. Add it to your backend environment variables

### Database Setup

For production, you'll need a PostgreSQL database:

1. **Render**: Add a PostgreSQL service
2. **Railway**: Add a PostgreSQL plugin
3. **Heroku**: Add Heroku Postgres addon
4. **Supabase**: Create a free PostgreSQL database

### Testing the Deployment

1. Visit your frontend URL
2. Check the browser console for any errors
3. Test the WebSocket connection by clicking "Start"
4. Verify the backend is running by visiting `https://your-backend-url.com/health`

### Troubleshooting

1. **WebSocket Connection Error**:
   - Check that `VITE_BACKEND_URL` is set correctly
   - Ensure backend is deployed and running
   - Check browser console for detailed error messages

2. **AssemblyAI Errors**:
   - Verify your API key is correct
   - Check you haven't exceeded your free tier limits

3. **Database Errors**:
   - Ensure `DATABASE_URL` is set correctly
   - Check database connection and permissions

## Local Development

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL
- AssemblyAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/transcript_db
   ASSEMBLYAI_API_KEY=your_api_key_here
   CORS_ORIGINS=*
   ```

4. Start the backend server:
   ```bash
   python run.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend/speech_frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   VITE_BACKEND_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open the frontend application in your browser
2. Click the "Start" button to begin recording
3. Speak into your microphone
4. Watch as your speech is transcribed in real-time with sentiment analysis
5. Use the "Export as SRT" button to download transcripts

## License

MIT