import base64
import httpx

from config import OPENROUTER_API_KEY

OPENROUTER_IMAGES_URL = "https://openrouter.ai/api/v1/images"
IMAGE_MODEL = "google/gemini-nano-banana-2.1"

async def generate_thumbnail(prompt:str, style_prompt:str, headshot_url:str)-> bytes:

    """ 
        Use the OpenRouter Image API with gemini-nano-banana-2.1.

        Pass the headshot URL directly as an input reference.
        Returns raw image bytes.
    """

    full_prompt = (
        f"{style_prompt}\n\n"
        f"User request: {prompt}\n\n"

        "IMPORTANT: The generated thumbnail MUST prominently feature the person "

        "shown in the provided reference headshot photo. Keep their likeness accurate."
    
    )   

    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(
            OPENROUTER_IMAGES_URL,
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
            json={
                "model": IMAGE_MODEL,
                "prompt": full_prompt,
                "aspect_ratio": "16:9",
                "resolution": "1K",
                "input_references": [
                    {"type": "image_url", "image_url": {"url": headshot_url}}
                ],
            },
        )

    if response.status_code != 200:
        raise RuntimeError(f"OpenRouter error {response.status_code}: {response.text}")

    for image in response.json().get("data", []):
        if image.get("b64_json"):
            return base64.b64decode(image["b64_json"])

    raise RuntimeError("No image generation result found in the response")
