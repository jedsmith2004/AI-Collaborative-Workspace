import os
import uuid
from typing import Optional, Union
from datetime import datetime

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import httpx

from services.db import get_db
from models.user import User
from models.workspace_collaborator import WorkspaceCollaborator, PERMISSION_VIEWER, PERMISSION_EDITOR, PERMISSION_OWNER

# Auth0 Configuration
AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
AUTH0_API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE", "")
AUTH0_ALGORITHMS = ["RS256"]

security = HTTPBearer(auto_error=False)

# Cache for JWKS
_jwks_cache = None


async def get_jwks():
    """Fetch and cache JWKS from Auth0"""
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")
            _jwks_cache = response.json()
    return _jwks_cache


def get_rsa_key(jwks: dict, token: str) -> Optional[dict]:
    """Extract RSA key from JWKS that matches token's key ID"""
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        return None
    
    for key in jwks.get("keys", []):
        if key.get("kid") == unverified_header.get("kid"):
            return {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"]
            }
    return None


async def verify_token(token: str) -> dict:
    """Verify Auth0 JWT token and return payload"""
    jwks = await get_jwks()
    rsa_key = get_rsa_key(jwks, token)
    
    if not rsa_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to find appropriate key"
        )
    
    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=AUTH0_ALGORITHMS,
            audience=AUTH0_API_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTClaimsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid claims in token"
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, return None otherwise"""
    if credentials is None:
        return None
    
    try:
        payload = await verify_token(credentials.credentials)
        auth0_id = payload.get("sub")
        if not auth0_id:
            return None
        
        user = db.query(User).filter(User.auth0_id == auth0_id).first()
        return user
    except HTTPException:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user or raise 401"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    payload = await verify_token(credentials.credentials)
    auth0_id = payload.get("sub")
    
    if not auth0_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def get_or_create_user(db: Session, auth0_id: str, email: str, name: str, 
                       email_verified: bool = False, picture: Optional[str] = None) -> User:
    """Get existing user or create new one from Auth0 data"""
    user = db.query(User).filter(User.auth0_id == auth0_id).first()
    
    if user:
        # Update user info if changed
        user.name = name
        user.email = email
        user.email_verified = email_verified
        if picture:
            user.profile_picture_url = picture
        db.commit()
        db.refresh(user)
        return user
    
    # Create new user
    user = User(
        auth0_id=auth0_id,
        email=email,
        name=name,
        email_verified=email_verified,
        profile_picture_url=picture
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def check_workspace_permission(
    db: Session, 
    user: User, 
    workspace_id: Union[uuid.UUID, str], 
    required_level: int = PERMISSION_VIEWER
) -> WorkspaceCollaborator:
    """Check if user has required permission level for workspace"""
    from models.workspace import Workspace
    
    # Convert string to UUID if needed
    if isinstance(workspace_id, str):
        workspace_id = uuid.UUID(workspace_id)
    
    # Check if user is owner
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Check if owner
    if workspace.owner_id == user.id:
        # Return a virtual collaborator with owner permissions
        return WorkspaceCollaborator(
            workspace_id=workspace_id,
            user_id=user.id,
            permission_level=PERMISSION_OWNER,
            accepted_at=datetime.now()
        )
    
    # Check collaborator table
    collaborator = db.query(WorkspaceCollaborator).filter(
        WorkspaceCollaborator.workspace_id == workspace_id,
        WorkspaceCollaborator.user_id == user.id,
        WorkspaceCollaborator.accepted_at.isnot(None)
    ).first()
    
    if not collaborator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this workspace"
        )
    
    if collaborator.permission_level < required_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    return collaborator


def get_user_workspaces(db: Session, user: User) -> list:
    """Get all workspaces user has access to"""
    from models.workspace import Workspace
    
    # Get owned workspaces
    owned = db.query(Workspace).filter(Workspace.owner_id == user.id).all()
    owned_ids = {w.id for w in owned}
    
    # Get collaborated workspaces (accepted invitations only)
    # Wrap in try-except in case collaborators table doesn't exist yet
    try:
        collaborations = db.query(WorkspaceCollaborator).filter(
            WorkspaceCollaborator.user_id == user.id,
            WorkspaceCollaborator.accepted_at.isnot(None)
        ).all()
        
        collab_workspace_ids = [c.workspace_id for c in collaborations if c.workspace_id not in owned_ids]
        collaborated = db.query(Workspace).filter(Workspace.id.in_(collab_workspace_ids)).all() if collab_workspace_ids else []
    except Exception:
        # Collaborators table may not exist yet - rollback to clear failed transaction
        db.rollback()
        collaborated = []
    
    return list(owned) + collaborated
