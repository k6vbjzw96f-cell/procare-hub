from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'procarehub-secret-key-change-in-production')
ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "coordinator"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Client(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    ndis_number: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plan_start_date: Optional[str] = None
    plan_end_date: Optional[str] = None
    total_budget: float = 0.0
    spent_budget: float = 0.0
    status: str = "active"
    support_needs: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    full_name: str
    ndis_number: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plan_start_date: Optional[str] = None
    plan_end_date: Optional[str] = None
    total_budget: float = 0.0
    support_needs: Optional[str] = None

class Staff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    position: str
    certifications: List[str] = []
    screening_status: str = "pending"
    screening_expiry: Optional[str] = None
    status: str = "active"
    hourly_rate: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    position: str
    certifications: List[str] = []
    hourly_rate: float = 0.0

class Shift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    staff_id: str
    staff_name: str
    shift_date: str
    start_time: str
    end_time: str
    duration_hours: float
    service_type: str
    status: str = "scheduled"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftCreate(BaseModel):
    client_id: str
    staff_id: str
    shift_date: str
    start_time: str
    end_time: str
    duration_hours: float
    service_type: str
    notes: Optional[str] = None

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str
    client_id: str
    client_name: str
    service_period_start: str
    service_period_end: str
    total_amount: float
    status: str = "draft"
    line_items: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    client_id: str
    service_period_start: str
    service_period_end: str
    line_items: List[dict] = []

class ComplianceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    record_type: str
    title: str
    description: str
    severity: str = "low"
    status: str = "open"
    reported_by: str
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class ComplianceRecordCreate(BaseModel):
    record_type: str
    title: str
    description: str
    severity: str = "low"
    reported_by: str

class DashboardStats(BaseModel):
    total_clients: int
    active_clients: int
    total_staff: int
    active_staff: int
    upcoming_shifts: int
    pending_invoices: int
    open_compliance_issues: int
    total_revenue: float

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        user_doc = await db.users.find_one({"email": email}, {"_id": 0})
        if user_doc is None:
            raise HTTPException(status_code=401, detail="User not found")
        if isinstance(user_doc['created_at'], str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        return User(**user_doc)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.model_dump()
    password = user_dict.pop("password")
    hashed_password = hash_password(password)
    
    user = User(**user_dict)
    doc = user.model_dump()
    doc['password'] = hashed_password
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    access_token = create_access_token({"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_doc.pop('password')
    user = User(**user_doc)
    access_token = create_access_token({"sub": user.email})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Client Routes
@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    client = Client(**client_data.model_dump())
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    return client

@api_router.get("/clients", response_model=List[Client])
async def get_clients(current_user: User = Depends(get_current_user)):
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    for client in clients:
        if isinstance(client['created_at'], str):
            client['created_at'] = datetime.fromisoformat(client['created_at'])
    return clients

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if isinstance(client['created_at'], str):
        client['created_at'] = datetime.fromisoformat(client['created_at'])
    return Client(**client)

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    result = await db.clients.update_one({"id": client_id}, {"$set": client_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Client(**updated)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_user)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

# Staff Routes
@api_router.post("/staff", response_model=Staff)
async def create_staff(staff_data: StaffCreate, current_user: User = Depends(get_current_user)):
    staff = Staff(**staff_data.model_dump())
    doc = staff.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.staff.insert_one(doc)
    return staff

@api_router.get("/staff", response_model=List[Staff])
async def get_staff(current_user: User = Depends(get_current_user)):
    staff_list = await db.staff.find({}, {"_id": 0}).to_list(1000)
    for staff in staff_list:
        if isinstance(staff['created_at'], str):
            staff['created_at'] = datetime.fromisoformat(staff['created_at'])
    return staff_list

@api_router.get("/staff/{staff_id}", response_model=Staff)
async def get_staff_member(staff_id: str, current_user: User = Depends(get_current_user)):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if isinstance(staff['created_at'], str):
        staff['created_at'] = datetime.fromisoformat(staff['created_at'])
    return Staff(**staff)

@api_router.put("/staff/{staff_id}", response_model=Staff)
async def update_staff(staff_id: str, staff_data: StaffCreate, current_user: User = Depends(get_current_user)):
    result = await db.staff.update_one({"id": staff_id}, {"$set": staff_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    updated = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Staff(**updated)

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: User = Depends(get_current_user)):
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted successfully"}

# Shift Routes
@api_router.post("/shifts", response_model=Shift)
async def create_shift(shift_data: ShiftCreate, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": shift_data.client_id}, {"_id": 0})
    staff = await db.staff.find_one({"id": shift_data.staff_id}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    shift_dict = shift_data.model_dump()
    shift_dict['client_name'] = client['full_name']
    shift_dict['staff_name'] = staff['full_name']
    
    shift = Shift(**shift_dict)
    doc = shift.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.shifts.insert_one(doc)
    return shift

@api_router.get("/shifts", response_model=List[Shift])
async def get_shifts(current_user: User = Depends(get_current_user)):
    shifts = await db.shifts.find({}, {"_id": 0}).to_list(1000)
    for shift in shifts:
        if isinstance(shift['created_at'], str):
            shift['created_at'] = datetime.fromisoformat(shift['created_at'])
    return shifts

@api_router.get("/shifts/{shift_id}", response_model=Shift)
async def get_shift(shift_id: str, current_user: User = Depends(get_current_user)):
    shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if isinstance(shift['created_at'], str):
        shift['created_at'] = datetime.fromisoformat(shift['created_at'])
    return Shift(**shift)

@api_router.put("/shifts/{shift_id}", response_model=Shift)
async def update_shift(shift_id: str, shift_data: dict, current_user: User = Depends(get_current_user)):
    result = await db.shifts.update_one({"id": shift_id}, {"$set": shift_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    updated = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Shift(**updated)

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, current_user: User = Depends(get_current_user)):
    result = await db.shifts.delete_one({"id": shift_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Shift deleted successfully"}

# Invoice Routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": invoice_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    invoice_dict = invoice_data.model_dump()
    invoice_dict['client_name'] = client['full_name']
    invoice_dict['invoice_number'] = f"INV-{str(uuid.uuid4())[:8].upper()}"
    
    total = sum(item.get('amount', 0) for item in invoice_dict['line_items'])
    invoice_dict['total_amount'] = total
    
    invoice = Invoice(**invoice_dict)
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.invoices.insert_one(doc)
    return invoice

@api_router.get("/invoices", response_model=List[Invoice])
async def get_invoices(current_user: User = Depends(get_current_user)):
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    for invoice in invoices:
        if isinstance(invoice['created_at'], str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return invoices

@api_router.get("/invoices/{invoice_id}", response_model=Invoice)
async def get_invoice(invoice_id: str, current_user: User = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if isinstance(invoice['created_at'], str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return Invoice(**invoice)

@api_router.put("/invoices/{invoice_id}", response_model=Invoice)
async def update_invoice(invoice_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Invoice(**updated)

# Compliance Routes
@api_router.post("/compliance", response_model=ComplianceRecord)
async def create_compliance_record(record_data: ComplianceRecordCreate, current_user: User = Depends(get_current_user)):
    record = ComplianceRecord(**record_data.model_dump())
    doc = record.model_dump()
    doc['reported_at'] = doc['reported_at'].isoformat()
    await db.compliance.insert_one(doc)
    return record

@api_router.get("/compliance", response_model=List[ComplianceRecord])
async def get_compliance_records(current_user: User = Depends(get_current_user)):
    records = await db.compliance.find({}, {"_id": 0}).to_list(1000)
    for record in records:
        if isinstance(record['reported_at'], str):
            record['reported_at'] = datetime.fromisoformat(record['reported_at'])
        if record.get('resolved_at') and isinstance(record['resolved_at'], str):
            record['resolved_at'] = datetime.fromisoformat(record['resolved_at'])
    return records

@api_router.put("/compliance/{record_id}", response_model=ComplianceRecord)
async def update_compliance_record(record_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    if 'status' in update_data and update_data['status'] == 'resolved' and 'resolved_at' not in update_data:
        update_data['resolved_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.compliance.update_one({"id": record_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    updated = await db.compliance.find_one({"id": record_id}, {"_id": 0})
    if isinstance(updated['reported_at'], str):
        updated['reported_at'] = datetime.fromisoformat(updated['reported_at'])
    if updated.get('resolved_at') and isinstance(updated['resolved_at'], str):
        updated['resolved_at'] = datetime.fromisoformat(updated['resolved_at'])
    return ComplianceRecord(**updated)

# Dashboard Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_clients = await db.clients.count_documents({})
    active_clients = await db.clients.count_documents({"status": "active"})
    total_staff = await db.staff.count_documents({})
    active_staff = await db.staff.count_documents({"status": "active"})
    upcoming_shifts = await db.shifts.count_documents({"status": "scheduled"})
    pending_invoices = await db.invoices.count_documents({"status": "draft"})
    open_compliance = await db.compliance.count_documents({"status": "open"})
    
    invoices = await db.invoices.find({"status": "paid"}, {"_id": 0}).to_list(1000)
    total_revenue = sum(inv.get('total_amount', 0) for inv in invoices)
    
    return DashboardStats(
        total_clients=total_clients,
        active_clients=active_clients,
        total_staff=total_staff,
        active_staff=active_staff,
        upcoming_shifts=upcoming_shifts,
        pending_invoices=pending_invoices,
        open_compliance_issues=open_compliance,
        total_revenue=total_revenue
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()