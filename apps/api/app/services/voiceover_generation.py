"""
AI Voiceover Generation Service
--------------------------------
Uses gTTS (Google Text-to-Speech) to generate audio from text
and overlays/replaces the audio in the video file.
"""
import os
import uuid
from typing import Optional, Callable, Awaitable
from gtts import gTTS

from app.services.ffmpeg import run_ffmpeg, probe_video
from app.core.config import settings
from app.core.logging_config import logger

async def generate_voiceover(
    input_path: str,
    text: str,
    language: str = 'en',
    overlay: bool = False, # If True, mix with original audio. If False, replace it.
    progress_cb: Optional[Callable[[int], Awaitable[None]]] = None,
) -> str:
    """
    Generate a voiceover from text and apply it to the video.
    Returns path to the processed output file.
    """
    logger.info(f"Generating AI Voiceover for {input_path}")
    
    if progress_cb:
        await progress_cb(10)

    # 1. Generate TTS Audio
    base_id = uuid.uuid4().hex
    tts_audio_path = os.path.join(settings.UPLOAD_DIR, f"{base_id}_tts.mp3")
    
    try:
        # gTTS is a synchronous library, run in thread
        import asyncio
        def save_tts():
            tts = gTTS(text=text, lang=language)
            tts.save(tts_audio_path)
        
        await asyncio.to_thread(save_tts)
    except Exception as e:
        logger.error(f"TTS Generation failed: {e}")
        raise RuntimeError(f"AI Voiceover generation failed: {str(e)}")

    if progress_cb:
        await progress_cb(40)

    # 2. Merge with Video
    output_filename = f"{base_id}_voiceover.mp4"
    output_path = os.path.join(settings.OUTPUT_DIR, output_filename)
    
    if overlay:
        # Mix original audio with TTS (using amix filter)
        await run_ffmpeg(
            "-i", input_path,
            "-i", tts_audio_path,
            "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first[a]",
            "-map", "0:v",
            "-map", "[a]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            output_path
        )
    else:
        # Replace original audio with TTS
        await run_ffmpeg(
            "-i", input_path,
            "-i", tts_audio_path,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            output_path
        )

    if progress_cb:
        await progress_cb(90)

    # Cleanup temp TTS audio
    try:
        os.remove(tts_audio_path)
    except OSError:
        pass

    return output_path
