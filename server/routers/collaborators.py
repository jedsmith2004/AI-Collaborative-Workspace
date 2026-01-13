from typing import Optional
from datetime import datetime
import uuid as uuid_lib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from services.db import get_db
from services.auth import get_current_user, check_workspace_permission
from models.user import User
from models.workspace import Workspace
from models.workspace_collaborator import (
    WorkspaceCollaborator, 
    PERMISSION_VIEWER, 
    PERMISSION_EDITOR, 
    PERMISSION_OWNER
)

router = APIRouter(tags=["collaborators"])


# --- Pydantic Models ---

class InviteRequest(BaseModel):
    email: EmailStr
    permission_level: int = PERMISSION_EDITOR


class UpdatePermissionRequest(BaseModel):
    permission_level: int


class CollaboratorResponse(BaseModel):
    id: int
    user_id: str
    user_name: str
    user_email: str
    profile_picture_url: Optional[str]
    permission_level: int
    is_owner: bool
    invited_at: Optional[str]
    accepted_at: Optional[str]


# --- Collaborator Endpoints ---

@router.get("/workspaces/{workspace_id}/collaborators")
async def list_collaborators(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all collaborators for a workspace"""
    # Convert string to UUID
    try:
        ws_uuid = uuid_lib.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    
    # Check user has access to this workspace
    check_workspace_permission(db, current_user, ws_uuid, PERMISSION_VIEWER)
    
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    result = []
    
    # Add owner first
    if workspace.owner:
        result.append({
            "id": 0,  # Virtual ID for owner
            "user_id": str(workspace.owner.id),
            "user_name": workspace.owner.name,
            "user_email": workspace.owner.email,
            "profile_picture_url": workspace.owner.profile_picture_url,
            "permission_level": PERMISSION_OWNER,
            "is_owner": True,
            "invited_at": None,
            "accepted_at": workspace.created_at.isoformat() if workspace.created_at else None
        })
    
    # Add other collaborators
    collaborators = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.workspace_id == ws_uuid
    ).all()
    
    for collab in collaborators:
        user = db.query(User).filter(User.id == collab.user_id).first()
        if user and user.id != workspace.owner_id:
            result.append({
                "id": collab.id,
                "user_id": str(user.id),
                "user_name": user.name,
                "user_email": user.email,
                "profile_picture_url": user.profile_picture_url,
                "permission_level": collab.permission_level,
                "is_owner": False,
                "invited_at": collab.invited_at.isoformat() if collab.invited_at else None,
                "accepted_at": collab.accepted_at.isoformat() if collab.accepted_at else None
            })
    
    return result


@router.post("/workspaces/{workspace_id}/collaborators/invite")
async def invite_collaborator(
    workspace_id: str,
    request: InviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Invite a user to collaborate on a workspace"""
    # Convert string to UUID
    try:
        ws_uuid = uuid_lib.UUID(workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace ID")
    
    # Check user is owner
    check_workspace_permission(db, current_user, ws_uuid, PERMISSION_OWNER)
    
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Find user by email
    invitee = db.query(User).filter(User.email == request.email).first()
    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. They must sign up first."
        )
    
    # Can't invite yourself
    if invitee.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot invite yourself"
        )
    
    # Can't invite owner
    if invitee.id == workspace.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already the owner"
        )
    
    # Check if already invited/collaborating
    existing = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.workspace_id == workspace_id,
        WorkspaceCollaborator.user_id == invitee.id
    ).first()
    
    if existing:
        if existing.accepted_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a collaborator"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has a pending invitation"
            )
    
    # Validate permission level
    if request.permission_level not in [PERMISSION_VIEWER, PERMISSION_EDITOR]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid permission level"
        )
    
    # Create invitation
    invitation = WorkspaceCollaborator(
        workspace_id=ws_uuid,
        user_id=invitee.id,
        permission_level=request.permission_level,
        invited_at=datetime.now()
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    return {
        "message": f"Invitation sent to {invitee.email}",
        "invitation_id": invitation.id
    }


@router.put("/workspaces/{workspace_id}/collaborators/{user_id}")
async def update_collaborator_permission(
    workspace_id: str,
    user_id: str,
    request: UpdatePermissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a collaborator's permission level"""
    # Convert strings to UUIDs
    try:
        ws_uuid = uuid_lib.UUID(workspace_id)
        usr_uuid = uuid_lib.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Check user is owner
    check_workspace_permission(db, current_user, ws_uuid, PERMISSION_OWNER)
    
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Can't change owner's permission
    if usr_uuid == workspace.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change owner's permissions"
        )
    
    collaborator = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.workspace_id == ws_uuid,
        WorkspaceCollaborator.user_id == usr_uuid
    ).first()
    
    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )
    
    # Validate permission level (can't make someone owner through this)
    if request.permission_level not in [PERMISSION_VIEWER, PERMISSION_EDITOR]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid permission level"
        )
    
    collaborator.permission_level = request.permission_level
    db.commit()
    
    return {"message": "Permission updated"}


@router.delete("/workspaces/{workspace_id}/collaborators/{user_id}")
async def remove_collaborator(
    workspace_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a collaborator from a workspace"""
    # Convert strings to UUIDs
    try:
        ws_uuid = uuid_lib.UUID(workspace_id)
        usr_uuid = uuid_lib.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    workspace = db.query(Workspace).filter(Workspace.id == ws_uuid).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Check permissions - owner can remove anyone, collaborators can remove themselves
    is_owner = workspace.owner_id == current_user.id
    is_self = usr_uuid == current_user.id
    
    if not is_owner and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only remove yourself from this workspace"
        )
    
    # Can't remove owner
    if usr_uuid == workspace.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove workspace owner"
        )
    
    collaborator = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.workspace_id == ws_uuid,
        WorkspaceCollaborator.user_id == usr_uuid
    ).first()
    
    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collaborator not found"
        )
    
    db.delete(collaborator)
    db.commit()
    
    return {"message": "Collaborator removed"}
