import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    uvicorn.run(
        "app.main:app", 
        host=host, 
        port=port, 
        reload=False,  # Set to False for production
        log_level="info"
    )