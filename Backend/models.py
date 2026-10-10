from datetime import datetime,timezone
from typing import Optional,List
from uuid import uuid4

from sqlmodel import Field,SQLModel,Relationship


def _uuid():
    return str(uuid4())

def _now():
    return datetime.now(timezone.utc)

class thumbnail(SQLModel, table = True):
    id: str = Field(default_factory=_uuid,primary_key=True)
    job_id: str = Field(foreign_key= "job.id")
    style_name: str = Field(default="")
    imagekit_url: Optional[str] = Field(default=None)
    status: str = Field(default= "pending")
    error_message: Optional[str] = Field(default= None)
    created_at: datetime = Field(default_factory=_now)

    job: Optional["Job"] = Relationship(back_populates="thumbnails")

class Job(SQLModel,table = True):
    id: str = Field(default_factory=_uuid,primary_key=True)
    prompt: str = Field(default="")
    num_thumbnails: int = Field(default=1)
    headshot_url: str = Field(default="")
    status: str = Field(default="pending")

    thumbnails: List[thumbnail] = Relationship(back_populates="job")