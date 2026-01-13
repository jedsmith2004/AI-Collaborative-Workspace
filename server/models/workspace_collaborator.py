from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from services.db import Base

# Permission levels
PERMISSION_VIEWER = 1
PERMISSION_EDITOR = 2
PERMISSION_OWNER = 3


class WorkspaceCollaborator(Base):
    __tablename__ = "workspace_collaborators"
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_level = Column(Integer, nullable=False, default=PERMISSION_VIEWER)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    
    __table_args__ = (
        UniqueConstraint('workspace_id', 'user_id', name='uq_workspace_user'),
    )
    
    workspace = relationship("Workspace", back_populates="collaborators")
    user = relationship("User", back_populates="workspace_collaborations")
    
    @property
    def is_pending(self):
        return self.accepted_at is None
    
    @property
    def can_edit(self):
        return self.permission_level >= PERMISSION_EDITOR
    
    @property
    def is_owner(self):
        return self.permission_level >= PERMISSION_OWNER
