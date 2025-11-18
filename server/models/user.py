from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from services.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspaces = relationship("Workspace", back_populates="owner")
    notes = relationship("Note", back_populates="author")

    workspaces = relationship("Workspace", back_populates="owner")
    notes = relationship("Note", back_populates="author")