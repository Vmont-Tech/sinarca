from pydantic import BaseModel

class LoginRequest(BaseModel):
    dadoLogin: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    
class RegisterAdminRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str

class ChangePasswordRequest(BaseModel):
    new_password: str