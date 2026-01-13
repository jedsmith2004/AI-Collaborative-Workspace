from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, func, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from services.db import Base
import uuid

class Note(Base):
    __tablename__ = "notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    summary = Column(Text)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # File attachment fields (for documents like PDF, DOCX, etc.)
    file_data = Column(LargeBinary, nullable=True)  # Raw file bytes
    file_name = Column(String, nullable=True)  # Original filename
    file_type = Column(String, nullable=True)  # MIME type (e.g., application/pdf)
    file_size = Column(Integer, nullable=True)  # File size in bytes

    workspace = relationship("Workspace", back_populates="notes")
    author = relationship("User", back_populates="notes")
