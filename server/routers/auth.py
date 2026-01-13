from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from services.db import get_db
from services.auth import (
    get_current_user, 
    get_or_create_user, 
    verify_token,
    check_workspace_permission,
    security
)
from models.user import User
from models.workspace import Workspace
from models.workspace_collaborator import (
    WorkspaceCollaborator, 
    PERMISSION_VIEWER, 
    PERMISSION_EDITOR, 
    PERMISSION_OWNER
)
from fastapi.security import HTTPAuthorizationCredentials

router = APIRouter(prefix="/auth", tags=["auth"])


# --- Pydantic Models ---

class UserResponse(BaseModel):
    id: int
    auth0_id: str
    name: str
    email: str
    email_verified: bool
    profile_picture_url: Optional[str]
    created_at: str
    updated_at: Optional[str]
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None


class Auth0UserInfo(BaseModel):
    sub: str
    email: str
    name: str
    email_verified: bool = False
    picture: Optional[str] = None


class InvitationResponse(BaseModel):
    id: int
    workspace_id: int
    workspace_name: str
    invited_by: str
    permission_level: int
    invited_at: str


# --- Helper Functions ---

def serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "auth0_id": user.auth0_id,
        "name": user.name,
        "email": user.email,
        "email_verified": user.email_verified,
        "profile_picture_url": user.profile_picture_url,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None
    }


# --- Auth Endpoints ---

@router.post("/me")
async def create_or_update_user(
    user_info: Auth0UserInfo,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Create or update user from Auth0 info - called after Auth0 login"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Verify the token
    payload = await verify_token(credentials.credentials)
    
    # Ensure the token's sub matches the provided user info
    if payload.get("sub") != user_info.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Token mismatch"
        )
    
    user = get_or_create_user(
        db=db,
        auth0_id=user_info.sub,
        email=user_info.email,
        name=user_info.name,
        email_verified=user_info.email_verified,
        picture=user_info.picture
    )
    
    return serialize_user(user)


@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user"""
    return serialize_user(current_user)


@router.put("/me")
async def update_me(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    if updates.name:
        current_user.name = updates.name
    
    db.commit()
    db.refresh(current_user)
    return serialize_user(current_user)


# --- User Endpoints ---

@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Return limited info for other users
    return {
        "id": user.id,
        "name": user.name,
        "profile_picture_url": user.profile_picture_url
    }


# --- Invitation Endpoints ---

@router.get("/invitations")
async def list_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List pending workspace invitations for current user"""
    try:
        invitations = db.query(WorkspaceCollaborator).filter(
            WorkspaceCollaborator.user_id == current_user.id,
            WorkspaceCollaborator.accepted_at.is_(None)
        ).all()
    except Exception:
        # Table might not exist yet - rollback to clear failed transaction
        db.rollback()
        return []
    
    result = []
    for inv in invitations:
        workspace = db.query(Workspace).filter(Workspace.id == inv.workspace_id).first()
        if workspace:
            owner = db.query(User).filter(User.id == workspace.owner_id).first()
            result.append({
                "id": inv.id,
                "workspace_id": inv.workspace_id,
                "workspace_name": workspace.name,
                "invited_by": owner.name if owner else "Unknown",
                "permission_level": inv.permission_level,
                "invited_at": inv.invited_at.isoformat() if inv.invited_at else None
            })
    
    return result


@router.post("/invitations/{invitation_id}/accept")
async def accept_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a workspace invitation"""
    invitation = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.id == invitation_id,
        WorkspaceCollaborator.user_id == current_user.id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already accepted"
        )
    
    invitation.accepted_at = datetime.now()
    db.commit()
    
    return {"message": "Invitation accepted"}


@router.post("/invitations/{invitation_id}/decline")
async def decline_invitation(
    invitation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a workspace invitation"""
    invitation = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.id == invitation_id,
        WorkspaceCollaborator.user_id == current_user.id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.accepted_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation already accepted"
        )
    
    db.delete(invitation)
    db.commit()
    
    return {"message": "Invitation declined"}
