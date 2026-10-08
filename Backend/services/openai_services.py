import base64
from openai import AsyncOpenAI

from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key= OPENAI_API_KEY)

async def generate_thumbnail(prompt:str, style_prompt:str, headshot_url:str)-> bytes:

    """ 
        Use the Response API with gpt-image-2.5 as a built-in image_generation tool.

        Pass the headshot URL directly as an input_image.
        Returns raw PNG bytes.
    """

    full_prompt = (
        f"{style_prompt}\n\n"
        f"User request: {prompt}\n\n"

        "IMPORTANT: The generated thumbnail MUST prominently feature the person"

        "show in the provided reference headshot photo. Keep their likeness accurate."
    
    )   

    response = client.responses.create(
    model="gpt-6-astra",
    input= [

        {
            "role": "user",
            "content": [
                {"type": "input_image","url": headshot_url},
                {"type": "text", "text": full_prompt}

            ]
        }
    ],

    tools=[
        {
            "type": "image_generation", 
            "model": "gpt-image-2.5-sunburst", 
            "action": "generate",
            "size": "1536x1024",
            "quality": "high",
            "output_format": "png"

            },
    ],
)

    for item in response.output:
        if item.type == "image_generation_call" and item.result:
            return base64.b64decode(item.result)

    raise RuntimeError("No image generation result found in the response")

    

