from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import assemblyai as aai
import asyncio
import json
import os
from sqlalchemy.ext.asyncio import AsyncSession

from .config import ASSEMBLYAI_API_KEY
from .database import init_db, get_db, Transcript

app = FastAPI(title="Speech-to-Text API", version="1.0.0")

# Configure CORS - Allow all origins for now, restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set AssemblyAI API key
aai.settings.api_key = ASSEMBLYAI_API_KEY

# In-memory store for active WebSocket connections
active_connections: list[WebSocket] = []

@app.on_event("startup")
async def on_startup():
    print("Initializing database...")
    await init_db()
    print("Database initialized.")
    print(f"AssemblyAI API Key configured: {'Yes' if ASSEMBLYAI_API_KEY else 'No'}")

async def save_transcript(db: AsyncSession, session_id: str, text: str, sentiment: str | None = None, sentiment_score: float | None = None):
    transcript_entry = Transcript(
        session_id=session_id,
        text=text,
        sentiment=sentiment,
        sentiment_score=sentiment_score
    )
    db.add(transcript_entry)
    await db.commit()
    await db.refresh(transcript_entry)
    print(f"Saved transcript ID {transcript_entry.id} for session {session_id}")

async def broadcast(message: str):
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except WebSocketDisconnect:
            # Handle disconnection if needed, remove from active_connections
            pass
        except Exception as e:
            print(f"Error broadcasting to a connection: {e}")

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket, session_id: str = "default_session"):
    await websocket.accept()
    active_connections.append(websocket)
    print(f"WebSocket connection established for session: {session_id}")

    # Check if AssemblyAI API key is configured
    if not ASSEMBLYAI_API_KEY or ASSEMBLYAI_API_KEY == "your_api_key_here":
        error_msg = json.dumps({
            "type": "error", 
            "message": "AssemblyAI API key not configured. Please set ASSEMBLYAI_API_KEY environment variable.",
            "session_id": session_id
        })
        await websocket.send_text(error_msg)
        await websocket.close(code=1008, reason="API key not configured")
        return

    db_gen = get_db()
    db = await anext(db_gen)

    transcriber = None

    async def on_open(session_opened: aai.RealtimeSessionOpened):
        print(f"AssemblyAI session opened with ID: {session_opened.session_id}")

    async def on_data(transcript: aai.RealtimeTranscript):
        if not transcript.text:
            return

        if isinstance(transcript, aai.RealtimeFinalTranscript):
            print(f"Final Transcript: {transcript.text}")
            sentiment = transcript.sentiment.value if transcript.sentiment else None
            sentiment_score = transcript.sentiment.confidence if transcript.sentiment else None
            # Save final transcript to DB
            await save_transcript(db, session_id, transcript.text, sentiment, sentiment_score)
            # Broadcast final transcript to client(s)
            await broadcast(json.dumps({
                "type": "final_transcript", 
                "text": transcript.text, 
                "sentiment": sentiment, 
                "sentiment_score": sentiment_score, 
                "session_id": session_id
            }))
        else:
            print(f"Partial Transcript: {transcript.text}")
            # Broadcast partial transcript to client(s)
            await broadcast(json.dumps({
                "type": "partial_transcript", 
                "text": transcript.text, 
                "session_id": session_id
            }))

    async def on_error(error: aai.RealtimeError):
        print(f"AssemblyAI Error: {error}")
        await broadcast(json.dumps({
            "type": "error", 
            "message": str(error), 
            "session_id": session_id
        }))

    async def on_close():
        print(f"AssemblyAI session closed.")

    try:
        transcriber = aai.RealtimeTranscriber(
            sample_rate=16_000,
            on_data=on_data,
            on_error=on_error,
            on_open=on_open,
            on_close=on_close,
            config=aai.RealtimeTranscriptionConfig(sentiment_analysis=True)
        )

        await transcriber.connect()

        while True:
            data = await websocket.receive_bytes()
            if transcriber:
                await transcriber.stream(data)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session: {session_id}")
        if transcriber:
            await transcriber.close()
            print("AssemblyAI connection closed due to WebSocket disconnect.")
    except Exception as e:
        print(f"An error occurred in WebSocket handler for session {session_id}: {e}")
        if transcriber:
            await transcriber.close()
        # Send error to client
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Server error: {str(e)}",
                "session_id": session_id
            }))
        except:
            pass
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        print(f"Cleaned up connection for session: {session_id}")

@app.get("/")
async def read_root():
    return {
        "message": "FastAPI Speech-to-Text Service is running",
        "status": "healthy",
        "assemblyai_configured": bool(ASSEMBLYAI_API_KEY and ASSEMBLYAI_API_KEY != "your_api_key_here")
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "assemblyai_configured": bool(ASSEMBLYAI_API_KEY and ASSEMBLYAI_API_KEY != "your_api_key_here")
    }