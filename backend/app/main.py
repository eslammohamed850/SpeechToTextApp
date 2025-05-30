from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import assemblyai as aai
import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession

from .config import ASSEMBLYAI_API_KEY
from .database import init_db, get_db, Transcript

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for simplicity, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

aai.settings.api_key = ASSEMBLYAI_API_KEY

# In-memory store for active WebSocket connections (simple approach)
# A more robust solution might use Redis or similar for scaling
active_connections: list[WebSocket] = []

@app.on_event("startup")
async def on_startup():
    print("Initializing database...")
    await init_db()
    print("Database initialized.")

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
            pass # Simple handling for now
        except Exception as e:
            print(f"Error broadcasting to a connection: {e}")

@app.websocket("/ws/transcribe")
async def websocket_endpoint(websocket: WebSocket, session_id: str = "default_session"):
    await websocket.accept()
    active_connections.append(websocket)
    print(f"WebSocket connection established for session: {session_id}")

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
            await broadcast(json.dumps({"type": "final_transcript", "text": transcript.text, "sentiment": sentiment, "sentiment_score": sentiment_score, "session_id": session_id}))
        else:
            print(f"Partial Transcript: {transcript.text}")
            # Broadcast partial transcript to client(s)
            await broadcast(json.dumps({"type": "partial_transcript", "text": transcript.text, "session_id": session_id}))

    async def on_error(error: aai.RealtimeError):
        print(f"AssemblyAI Error: {error}")
        await broadcast(json.dumps({"type": "error", "message": str(error), "session_id": session_id}))

    async def on_close():
        print(f"AssemblyAI session closed.")

    try:
        transcriber = aai.RealtimeTranscriber(
            sample_rate=16_000, # Adjust if your audio source has a different sample rate
            on_data=on_data,
            on_error=on_error,
            on_open=on_open,
            on_close=on_close,
            # Enable sentiment analysis (extra feature)
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
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)
        # Clean up database session if necessary (handled by context manager usually)
        # await db.close() # Not needed with async context manager `get_db`
        print(f"Cleaned up connection for session: {session_id}")

# Add a simple root endpoint for testing
@app.get("/")
async def read_root():
    return {"message": "FastAPI Speech-to-Text Service is running"}

