import uvicorn
import sys
import asyncio

if __name__ == "__main__":
    # Windows-specific fix for subprocess support in asyncio
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["app"],
        log_level="info",
        # Raise the h11 HTTP/1.1 parser limit so large multipart upload headers
        # (Content-Type with boundary, etc.) are not rejected before reaching FastAPI.
        # Default is 16 KB which is too small for big video upload requests.
        h11_max_incomplete_event_size=10 * 1024 * 1024,  # 10 MB
    )
