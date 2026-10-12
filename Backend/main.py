import logging 
from contextlib import asynccontextmanager
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from services.routes import router
from services.auth import router as auth_router

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app:FastAPI):
    create_tables()
    yield


app  = FastAPI(
    title="Youtube Thumbnail Generator API",
    lifespan= lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["http://localhost:5173"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],

)

app.include_router(auth_router)
app.include_router(router)

