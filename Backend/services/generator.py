import asyncio
import logging

from sqlmodel import Session, select
from database import engine
from models import Job, thumbnail

from services.openai_services import generate_thumbnail
from services.imagekit_service import upload_file

logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (

        "Create a bold, dramatic Youtube thumbnail with high contrast,"
        "cinematic lighting, dark moody background, and powerful composition."

        "The person's face should be prominent with a dramatic expression."
    ),

    "clean_minimal": (

        "Create a clean, minimal YouTube thumbnail with bright lightining,"
        "white/light background, modern professional aesthetic, plenty of"
        "whitespace, and sharp clean composition. The person should look"
        "approachable and professional."
    ),

    "vibrant_energetic": (
        "Create a vibrant, energetic Youtube thumbnail with colorful gradients,"
        "dynamic angles, eye-catching pop-art style colors, and energetic"
        "composition. The person should have an excited or engaging expression."
    ),
}

STYLE_ORDER = ["bold_dramatic","clean_minimal", "vibrant_energetic"]


async def generate_single_thumbnail(thumbnail_id:str, prompt:str, headshot_url:str):

    #DB MARK - generating
    with Session(engine) as session:
        thumb = session.get(thumbnail,thumbnail_id)
        if thumb is None:
            logger.error(f"thumbnail{thumbnail_id} not found.")
            return
        thumb.status = "generating"
        style_name = thumb.style_name
        job_id = thumb.job_id
        session.add(thumb)
        session.commit()

    #AI call
    try:
        style_prompt = STYLES[style_name]

        image_byte = await generate_thumbnail(prompt,style_prompt,headshot_url)

        #upload this image

        url = upload_file(
                file_bytes= image_byte,
                file_name= f"{thumbnail_id}.png",
                folder = f"thumbnails/{job_id}",
            )
        
    #DB call save the url + mark uploaded
        with Session(engine) as session:
            thumb = session.get(thumbnail,thumbnail_id)
            if thumb is None:
                raise RuntimeError(f"thumbnail{thumbnail_id} not found")
            thumb.imagekit_url = url
            thumb.status = "uploaded"
            session.add(thumb)
            session.commit()

        logger.info(f"thumbnail{thumbnail_id} generated and uploaded successfully.")

    except Exception as e:
        logger.error(f"Error generating thumbnail{thumbnail_id}: {e}")

        with Session(engine) as session:
            thumb = session.get(thumbnail, thumbnail_id)
            if thumb is not None:
                thumb.status = "error"
                thumb.error_message = str(e)[:500]
                session.add(thumb)
                session.commit()


async def process_job(job_id:str):

    # make job as processing
    # find all thumbnails for this job
    # start one worker for each thumbnail
    # wait for all workers to finish
    # mark job as completed/failed

    with Session(engine) as session:
        job = session.get(Job, job_id)
        if job is None:
            logger.error(f"job{job_id} not found.")
            return
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

        thumbs = session.exec(
            select(thumbnail).where(thumbnail.job_id == job_id)
        )

        thumbnail_ids = [t.id for t in thumbs]

    tasks = [
        generate_single_thumbnail(tid,prompt,headshot_url)
        for tid in thumbnail_ids
    ]

    await asyncio.gather(*tasks, return_exceptions=True)

    # completed if at least one thumbnail uploaded, otherwise failed
    with Session(engine) as session:
        thumbs = session.exec(
            select(thumbnail).where(thumbnail.job_id == job_id)
        )
        any_uploaded = any(t.status == "uploaded" for t in thumbs)

        job_status = "completed" if any_uploaded else "failed"
        job = session.get(Job, job_id)
        if job is not None:
            job.status = job_status
            session.add(job)
            session.commit()

    logger.info(f"job{job_id} finished with status {job_status}.")

    
