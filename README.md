# Speech-to-Text Transcription Service

A full-stack application that transcribes speech in real-time, saves transcripts to PostgreSQL, and streams them to a React frontend with sentiment analysis.

## Features

- Real-time speech-to-text transcription using AssemblyAI
- PostgreSQL database for transcript storage
- Live streaming to a React frontend
- Sentiment analysis for each transcript segment
- Export transcripts to SRT format for video subtitling
- WebSocket communication for real-time updates

## Project Structure

```
speech-service/
├── backend/               # FastAPI backend
│   ├── app/               # Application code
│   │   ├── __init__.py
│   │   ├── config.py      # Configuration settings
│   │   ├── database.py    # Database connection
│   │   └── main.py        # Main application entry point
│   ├── requirements.txt   # Python dependencies
│   └── run.py             # Application runner
├── frontend/              # React frontend
│   └── speech_frontend/   # React application
│       ├── public/        # Static assets
│       ├── src/           # Source code
│       ├── netlify.toml   # Netlify configuration
│       └── package.json   # Node.js dependencies
└── README.md             # This file
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL
- AssemblyAI API key (sign up at [assemblyai.com](https://www.assemblyai.com/))

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/transcript_db
   ASSEMBLYAI_API_KEY=your_api_key_here
   CORS_ORIGINS=*
   ```

4. Start the backend server:
   ```
   python run.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend/speech_frontend
   ```

2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Create a `.env` file with the backend URL:
   ```
   VITE_BACKEND_URL=http://localhost:8000
   ```

4. Start the development server:
   ```
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

## Deployment

### Backend Deployment

The backend can be deployed to any platform that supports Python applications:

1. **Render.com**:
   - Create a Web Service
   - Set the build command: `pip install -r requirements.txt`
   - Set the start command: `python run.py`
   - Add environment variables for `DATABASE_URL` and `ASSEMBLYAI_API_KEY`

2. **Railway.app**:
   - Create a new project
   - Add a Python service
   - Set the start command: `cd backend && python run.py`
   - Add environment variables

### Frontend Deployment

The frontend can be deployed to Netlify:

1. Build the frontend:
   ```
   cd frontend/speech_frontend
   npm run build
   # or
   yarn build
   # or
   pnpm build
   ```

2. Deploy to Netlify:
   - Drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)
   - Or connect your GitHub repository to Netlify for continuous deployment

3. Set environment variables in Netlify:
   - Go to Site settings > Build & deploy > Environment
   - Add `VITE_BACKEND_URL` pointing to your deployed backend URL

## Usage

1. Open the frontend application in your browser
2. Click the "Start" button to begin recording
3. Speak into your microphone
4. Watch as your speech is transcribed in real-time with sentiment analysis
5. Use the "Export as SRT" button to download transcripts

## License

MIT
