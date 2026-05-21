from pydantic import BaseModel

class Status(BaseModel):
    status: str
    
class LoginAndRegister(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    
class Refresh(BaseModel):
    access_token: str
    token_type: str