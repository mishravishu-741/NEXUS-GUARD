from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.USER

    @validator("password")
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    failed_login_attempts: int
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False
    mfa_token: Optional[str] = None


class UserRegister(UserCreate):
    pass


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    mfa_required: bool = False


class TokenData(BaseModel):
    sub: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None
    type: str = "access"
    exp: Optional[int] = None


class RefreshToken(BaseModel):
    refresh_token: str


class MFASetup(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]


class MFAVerify(BaseModel):
    token: str = Field(..., min_length=6, max_length=6)


class MFAStatus(BaseModel):
    enabled: bool
    method: Optional[str] = None
    verified_at: Optional[datetime] = None
    backup_codes_remaining: int


class BackupCodeResponse(BaseModel):
    codes: List[str]