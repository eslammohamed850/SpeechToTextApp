import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://transcript_user:transcript_password@localhost:5432/transcript_db")
ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")

if not ASSEMBLYAI_API_KEY or ASSEMBLYAI_API_KEY == "YOUR_ASSEMBLYAI_API_KEY_HERE":
    print("Warning: ASSEMBLYAI_API_KEY is not set in the .env file.")
    # In a real scenario, you might raise an error or use a default/test key if applicable

