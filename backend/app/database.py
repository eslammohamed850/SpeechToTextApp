from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from .config import DATABASE_URL

# Use async engine
engine = create_async_engine(DATABASE_URL, echo=True)

# Use async session
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()

class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    text = Column(Text, nullable=False)
    audio_url = Column(String, nullable=True) # Optional: if audio is stored/referenced
    session_id = Column(String, index=True) # To group transcripts from the same session/stream
    # Extra feature: Sentiment Analysis
    sentiment = Column(String, nullable=True) # e.g., positive, negative, neutral
    sentiment_score = Column(Float, nullable=True) # Confidence score for sentiment

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(Base.metadata.drop_all) # Use cautiously: drops all tables
        await conn.run_sync(Base.metadata.create_all)

