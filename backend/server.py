from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Response, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import requests
import resend

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

# Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "procare-hub"
storage_key = None

# Email
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "notifications@procare.com")

app = FastAPI()
api_router = APIRouter(prefix="/api")

logger = logging.getLogger(__name__)

# Storage Functions
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Email Function
async def send_email(recipient: str, subject: str, html_content: str):
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [recipient],
            "subject": subject,
            "html": html_content
        }
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {recipient}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "support_worker"
    phone: Optional[str] = None

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
    photo_url: Optional[str] = None
    plan_start_date: Optional[str] = None
    plan_end_date: Optional[str] = None
    total_budget: float = 0.0
    spent_budget: float = 0.0
    status: str = "active"
    support_needs: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
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
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None

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
    photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    position: str
    certifications: List[str] = []
    hourly_rate: float = 0.0

class StaffAttendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    attendance_date: str
    clock_in_time: str
    clock_out_time: Optional[str] = None
    total_hours: Optional[float] = None
    is_clocked_in: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

class HourLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shift_id: Optional[str] = None
    staff_id: str
    staff_name: str
    client_id: str
    client_name: str
    log_date: str
    start_time: str
    end_time: Optional[str] = None
    total_hours: Optional[float] = None
    service_type: str
    notes: Optional[str] = None
    is_clocked_in: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HourLogCreate(BaseModel):
    shift_id: Optional[str] = None
    client_id: str
    log_date: str
    start_time: str
    end_time: Optional[str] = None
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
    client_id: Optional[str] = None
    staff_id: Optional[str] = None
    attachment_urls: List[str] = []
    reported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

class ComplianceRecordCreate(BaseModel):
    record_type: str
    title: str
    description: str
    severity: str = "low"
    reported_by: str
    client_id: Optional[str] = None
    staff_id: Optional[str] = None

class FileRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    storage_path: str
    original_filename: str
    content_type: str
    size: int
    uploaded_by: str
    entity_type: str
    entity_id: str
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    notification_type: str
    is_read: bool = False
    action_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardStats(BaseModel):
    total_clients: int
    active_clients: int
    total_staff: int
    active_staff: int
    upcoming_shifts: int
    pending_invoices: int
    open_compliance_issues: int
    total_revenue: float

class Vehicle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    make: str
    model: str
    year: int
    registration: str
    vin: Optional[str] = None
    owner_type: str  # "client", "organization"
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    status: str = "active"
    registration_expiry: Optional[str] = None
    insurance_expiry: Optional[str] = None
    last_service_date: Optional[str] = None
    next_service_due: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VehicleCreate(BaseModel):
    make: str
    model: str
    year: int
    registration: str
    vin: Optional[str] = None
    owner_type: str
    owner_id: Optional[str] = None
    registration_expiry: Optional[str] = None
    insurance_expiry: Optional[str] = None

class VehicleLogEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vehicle_id: str
    vehicle_registration: str
    driver_id: str
    driver_name: str
    log_date: str
    start_time: str
    end_time: Optional[str] = None
    odometer_start: int
    odometer_end: Optional[int] = None
    destination: str
    purpose: str
    fuel_added: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VehicleLogCreate(BaseModel):
    vehicle_id: str
    log_date: str
    start_time: str
    end_time: Optional[str] = None
    odometer_start: int
    odometer_end: Optional[int] = None
    destination: str
    purpose: str
    fuel_added: Optional[float] = None
    notes: Optional[str] = None

class SILHouse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_name: str
    address: str
    property_type: str  # "house", "apartment", "unit"
    bedrooms: int
    capacity: int
    current_occupancy: int = 0
    status: str = "active"
    features: List[str] = []
    photo_url: Optional[str] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    residents: List[str] = []  # client IDs
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SILHouseCreate(BaseModel):
    property_name: str
    address: str
    property_type: str
    bedrooms: int
    capacity: int
    features: List[str] = []
    manager_id: Optional[str] = None

class Facility(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    facility_name: str
    facility_type: str  # "gym", "therapy room", "kitchen", "recreation", "other"
    location: str
    capacity: int
    equipment: List[str] = []
    status: str = "available"
    booking_required: bool = False
    photo_url: Optional[str] = None
    last_inspection_date: Optional[str] = None
    next_inspection_due: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FacilityCreate(BaseModel):
    facility_name: str
    facility_type: str
    location: str
    capacity: int
    equipment: List[str] = []
    booking_required: bool = False

class Organization(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_name: str
    abn: Optional[str] = None
    ndis_provider_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrganizationUpdate(BaseModel):
    organization_name: Optional[str] = None
    abn: Optional[str] = None
    ndis_provider_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class NotificationPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email_notifications: bool = True
    shift_reminders: bool = True
    incident_alerts: bool = True
    invoice_notifications: bool = True
    compliance_alerts: bool = True
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None

class LeaveRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    leave_type: str  # annual, sick, personal, unpaid, carer
    start_date: str
    end_date: str
    days_count: float
    reason: str
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: str
    end_date: str
    reason: str

# Medication Management Models
class Medication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    medication_name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    notes: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MedicationCreate(BaseModel):
    client_id: str
    medication_name: str
    dosage: str
    frequency: str
    start_date: str
    end_date: Optional[str] = None
    prescribing_doctor: Optional[str] = None
    notes: Optional[str] = None

class MedicationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    medication_id: str
    medication_name: str
    administered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    administered_by: str
    notes: Optional[str] = None

# Goal Tracking Models
class Goal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    goal_type: str  # short_term, long_term, daily
    title: str
    description: str
    target_date: str
    status: str = "active"  # active, achieved, cancelled
    progress_percentage: int = 0
    milestones: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoalCreate(BaseModel):
    client_id: str
    goal_type: str
    title: str
    description: str
    target_date: str

# Communication Hub Models
class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    sender_name: str
    recipient_id: str
    recipient_name: str
    subject: str
    message_text: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    recipient_id: str
    subject: str
    message_text: str

# Compliance Calendar Models
class ComplianceDeadline(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deadline_type: str  # worker_screening, vehicle_rego, insurance, audit, plan_review
    title: str
    description: str
    due_date: str
    entity_type: Optional[str] = None  # client, staff, vehicle, organization
    entity_id: Optional[str] = None
    status: str = "pending"  # pending, completed, overdue
    priority: str = "medium"  # low, medium, high, critical
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ComplianceDeadlineCreate(BaseModel):
    deadline_type: str
    title: str
    description: str
    due_date: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    priority: str = "medium"

# Feedback & Surveys Models
class Survey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    questions: List[dict] = []  # [{"question": "...", "type": "text/rating/choice"}]
    target_audience: str  # clients, staff, all
    status: str = "active"  # active, closed
    created_by: str
    response_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SurveyCreate(BaseModel):
    title: str
    description: str
    questions: List[dict]
    target_audience: str

class SurveyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    survey_id: str
    respondent_id: str
    respondent_name: str
    answers: List[dict] = []
    completed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

def check_permission(user: User, required_roles: List[str]):
    if user.role not in required_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

async def create_notification(user_id: str, title: str, message: str, notification_type: str, action_url: Optional[str] = None, should_send_email: bool = False):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url
    )
    doc = notification.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)
    
    if should_send_email:
        user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user_doc and user_doc.get('email'):
            html = f"""
            <h2>{title}</h2>
            <p>{message}</p>
            {f'<p><a href="{action_url}">View Details</a></p>' if action_url else ''}
            """
            await send_email(user_doc['email'], title, html)

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

# File Upload Routes
@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    entity_type: str = Query(...),
    entity_id: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{entity_type}/{entity_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    
    file_record = FileRecord(
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
        size=result["size"],
        uploaded_by=current_user.id,
        entity_type=entity_type,
        entity_id=entity_id
    )
    doc = file_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.files.insert_one(doc)
    
    return {"file_id": file_record.id, "path": result["path"], "filename": file.filename}

@api_router.get("/files/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    record = await db.files.find_one({"id": file_id, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.get("/files")
async def list_files(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    query = {"is_deleted": False}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    
    files = await db.files.find(query, {"_id": 0}).to_list(1000)
    for f in files:
        if isinstance(f['created_at'], str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
    return files

# Client Routes (Admin & Coordinators only)
@api_router.post("/clients", response_model=Client)
async def create_client(client_data: ClientCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    client = Client(**client_data.model_dump())
    doc = client.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.clients.insert_one(doc)
    
    # Notify relevant staff
    await create_notification(
        current_user.id,
        "New Client Added",
        f"Client {client.full_name} has been added to the system.",
        "client",
        f"/clients/{client.id}",
        should_send_email=True
    )
    
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
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.clients.update_one({"id": client_id}, {"$set": client_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Client(**updated)

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin"])
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}

@api_router.post("/clients/{client_id}/photo")
async def upload_client_photo(
    client_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    check_permission(current_user, ["admin", "coordinator"])
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/uploads/clients/{client_id}/photo.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    photo_url = f"/api/files/client-photo/{client_id}"
    await db.clients.update_one({"id": client_id}, {"$set": {"photo_url": photo_url}})
    
    file_record = FileRecord(
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=file.content_type or "image/jpeg",
        size=result["size"],
        uploaded_by=current_user.id,
        entity_type="client_photo",
        entity_id=client_id
    )
    doc = file_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.files.insert_one(doc)
    
    return {"photo_url": photo_url}

@api_router.get("/files/client-photo/{client_id}")
async def get_client_photo(
    client_id: str,
    auth: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    record = await db.files.find_one({
        "entity_type": "client_photo",
        "entity_id": client_id,
        "is_deleted": False
    }, {"_id": 0}, sort=[("created_at", -1)])
    
    if not record:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))

# Staff Routes
@api_router.post("/staff", response_model=Staff)
async def create_staff(staff_data: StaffCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
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
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.staff.update_one({"id": staff_id}, {"$set": staff_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    updated = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Staff(**updated)

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin"])
    result = await db.staff.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted successfully"}

# Shift Routes
@api_router.post("/shifts", response_model=Shift)
async def create_shift(shift_data: ShiftCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
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
    
    # Notify staff member
    staff_user = await db.users.find_one({"email": staff['email']}, {"_id": 0})
    if staff_user:
        await create_notification(
            staff_user['id'],
            "New Shift Assigned",
            f"You have been assigned to {client['full_name']} on {shift.shift_date} at {shift.start_time}.",
            "shift",
            f"/rostering",
            should_send_email=True
        )
    
    return shift

@api_router.get("/shifts", response_model=List[Shift])
async def get_shifts(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "support_worker":
        # Support workers see only their shifts
        query = {"staff_id": current_user.id}
    
    shifts = await db.shifts.find(query, {"_id": 0}).to_list(1000)
    for shift in shifts:
        if isinstance(shift['created_at'], str):
            shift['created_at'] = datetime.fromisoformat(shift['created_at'])
    return shifts

@api_router.get("/shifts/{shift_id}", response_model=Shift)
async def get_shift(shift_id: str, current_user: User = Depends(get_current_user)):
    shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    if current_user.role == "support_worker" and shift['staff_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if isinstance(shift['created_at'], str):
        shift['created_at'] = datetime.fromisoformat(shift['created_at'])
    return Shift(**shift)

@api_router.put("/shifts/{shift_id}", response_model=Shift)
async def update_shift(shift_id: str, shift_data: dict, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.shifts.update_one({"id": shift_id}, {"$set": shift_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    updated = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Shift(**updated)

@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.shifts.delete_one({"id": shift_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift not found")
    return {"message": "Shift deleted successfully"}

# Hour Logging Routes
@api_router.post("/hours", response_model=HourLog)
async def log_hours(hour_data: HourLogCreate, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": hour_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    total_hours = None
    if hour_data.end_time:
        # Calculate total hours
        from datetime import datetime as dt
        start = dt.strptime(hour_data.start_time, "%H:%M")
        end = dt.strptime(hour_data.end_time, "%H:%M")
        total_hours = (end - start).seconds / 3600
    
    hour_log = HourLog(
        shift_id=hour_data.shift_id,
        staff_id=current_user.id,
        staff_name=current_user.full_name,
        client_id=hour_data.client_id,
        client_name=client['full_name'],
        log_date=hour_data.log_date,
        start_time=hour_data.start_time,
        end_time=hour_data.end_time,
        total_hours=total_hours,
        service_type=hour_data.service_type,
        notes=hour_data.notes,
        is_clocked_in=hour_data.end_time is None
    )
    
    doc = hour_log.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.hour_logs.insert_one(doc)
    
    return hour_log

@api_router.get("/hours", response_model=List[HourLog])
async def get_hour_logs(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "support_worker":
        query = {"staff_id": current_user.id}
    
    logs = await db.hour_logs.find(query, {"_id": 0}).to_list(1000)
    for log in logs:
        if isinstance(log['created_at'], str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

@api_router.put("/hours/{log_id}/clock-out")
async def clock_out(log_id: str, end_time: str, current_user: User = Depends(get_current_user)):
    log = await db.hour_logs.find_one({"id": log_id, "staff_id": current_user.id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Hour log not found")
    
    if not log['is_clocked_in']:
        raise HTTPException(status_code=400, detail="Already clocked out")
    
    from datetime import datetime as dt
    start = dt.strptime(log['start_time'], "%H:%M")
    end = dt.strptime(end_time, "%H:%M")
    total_hours = (end - start).seconds / 3600
    
    await db.hour_logs.update_one(
        {"id": log_id},
        {"$set": {"end_time": end_time, "total_hours": total_hours, "is_clocked_in": False}}
    )
    
    return {"message": "Clocked out successfully", "total_hours": total_hours}

# Staff Photo and Attendance Routes
@api_router.post("/staff/{staff_id}/photo")
async def upload_staff_photo(
    staff_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    check_permission(current_user, ["admin", "coordinator"])
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/uploads/staff/{staff_id}/photo.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    photo_url = f"/api/files/staff-photo/{staff_id}"
    await db.staff.update_one({"id": staff_id}, {"$set": {"photo_url": photo_url}})
    
    file_record = FileRecord(
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=file.content_type or "image/jpeg",
        size=result["size"],
        uploaded_by=current_user.id,
        entity_type="staff_photo",
        entity_id=staff_id
    )
    doc = file_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.files.insert_one(doc)
    
    return {"photo_url": photo_url}

@api_router.get("/files/staff-photo/{staff_id}")
async def get_staff_photo(
    staff_id: str,
    auth: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    record = await db.files.find_one({
        "entity_type": "staff_photo",
        "entity_id": staff_id,
        "is_deleted": False
    }, {"_id": 0}, sort=[("created_at", -1)])
    
    if not record:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.post("/staff/{staff_id}/clock-in")
async def staff_clock_in(staff_id: str, current_user: User = Depends(get_current_user)):
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Check if already clocked in today
    today = datetime.now(timezone.utc).date().isoformat()
    existing = await db.staff_attendance.find_one({
        "staff_id": staff_id,
        "attendance_date": today,
        "is_clocked_in": True
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in today")
    
    now = datetime.now(timezone.utc)
    clock_in_time = now.strftime("%H:%M")
    
    attendance = StaffAttendance(
        staff_id=staff_id,
        staff_name=staff['full_name'],
        attendance_date=today,
        clock_in_time=clock_in_time,
        is_clocked_in=True
    )
    
    doc = attendance.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.staff_attendance.insert_one(doc)
    
    return attendance

@api_router.post("/staff/{staff_id}/clock-out")
async def staff_clock_out(staff_id: str, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    attendance = await db.staff_attendance.find_one({
        "staff_id": staff_id,
        "attendance_date": today,
        "is_clocked_in": True
    }, {"_id": 0})
    
    if not attendance:
        raise HTTPException(status_code=404, detail="No active clock-in found")
    
    now = datetime.now(timezone.utc)
    clock_out_time = now.strftime("%H:%M")
    
    from datetime import datetime as dt
    start = dt.strptime(attendance['clock_in_time'], "%H:%M")
    end = dt.strptime(clock_out_time, "%H:%M")
    total_hours = (end - start).seconds / 3600
    
    await db.staff_attendance.update_one(
        {"id": attendance['id']},
        {"$set": {
            "clock_out_time": clock_out_time,
            "total_hours": total_hours,
            "is_clocked_in": False
        }}
    )
    
    return {"message": "Clocked out successfully", "total_hours": round(total_hours, 2)}

@api_router.get("/staff/{staff_id}/attendance-status")
async def get_staff_attendance_status(staff_id: str, current_user: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()
    
    attendance = await db.staff_attendance.find_one({
        "staff_id": staff_id,
        "attendance_date": today
    }, {"_id": 0}, sort=[("created_at", -1)])
    
    if not attendance:
        return {"is_clocked_in": False, "attendance": None}
    
    if isinstance(attendance.get('created_at'), str):
        attendance['created_at'] = datetime.fromisoformat(attendance['created_at'])
    
    return {
        "is_clocked_in": attendance.get('is_clocked_in', False),
        "attendance": StaffAttendance(**attendance)
    }

@api_router.get("/staff/attendance/today")
async def get_todays_attendance(current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    today = datetime.now(timezone.utc).date().isoformat()
    
    attendances = await db.staff_attendance.find({
        "attendance_date": today
    }, {"_id": 0}).to_list(1000)
    
    for att in attendances:
        if isinstance(att.get('created_at'), str):
            att['created_at'] = datetime.fromisoformat(att['created_at'])
    
    return attendances

# Invoice Routes
@api_router.post("/invoices", response_model=Invoice)
async def create_invoice(invoice_data: InvoiceCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
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
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Invoice(**updated)

@api_router.put("/invoices/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, status: str, current_user: User = Depends(get_current_user)):
    """Update invoice status (for payment processing)"""
    check_permission(current_user, ["admin", "coordinator"])
    valid_statuses = ["draft", "sent", "paid", "overdue", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": f"Invoice status updated to {status}"}

# Compliance Routes
@api_router.post("/compliance", response_model=ComplianceRecord)
async def create_compliance_record(record_data: ComplianceRecordCreate, current_user: User = Depends(get_current_user)):
    record = ComplianceRecord(**record_data.model_dump())
    doc = record.model_dump()
    doc['reported_at'] = doc['reported_at'].isoformat()
    await db.compliance.insert_one(doc)
    
    # Notify admin users
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(100)
    for admin in admins:
        await create_notification(
            admin['id'],
            f"New {record.record_type.capitalize()}: {record.title}",
            f"Severity: {record.severity}. {record.description[:100]}...",
            "compliance",
            f"/compliance",
            send_email=record.severity in ["high", "critical"]
        )
    
    return record

@api_router.get("/compliance", response_model=List[ComplianceRecord])
async def get_compliance_records(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == "support_worker":
        query = {"reported_by": current_user.full_name}
    
    records = await db.compliance.find(query, {"_id": 0}).to_list(1000)
    for record in records:
        if isinstance(record['reported_at'], str):
            record['reported_at'] = datetime.fromisoformat(record['reported_at'])
        if record.get('resolved_at') and isinstance(record['resolved_at'], str):
            record['resolved_at'] = datetime.fromisoformat(record['resolved_at'])
    return records

@api_router.put("/compliance/{record_id}", response_model=ComplianceRecord)
async def update_compliance_record(record_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
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

# Notifications Routes
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for notif in notifications:
        if isinstance(notif['created_at'], str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user.id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# Dashboard Routes
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_clients = await db.clients.count_documents({})
    active_clients = await db.clients.count_documents({"status": "active"})
    total_staff = await db.staff.count_documents({})
    active_staff = await db.staff.count_documents({"status": "active"})
    
    if current_user.role == "support_worker":
        upcoming_shifts = await db.shifts.count_documents({"staff_id": current_user.id, "status": "scheduled"})
    else:
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

# Reports Routes
@api_router.get("/reports/service-delivery")
async def get_service_delivery_report(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user: User = Depends(get_current_user)
):
    check_permission(current_user, ["admin", "coordinator"])
    
    shifts = await db.shifts.find({
        "shift_date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    hour_logs = await db.hour_logs.find({
        "log_date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(1000)
    
    total_hours = sum(log.get('total_hours', 0) for log in hour_logs if log.get('total_hours'))
    
    return {
        "period": {"start": start_date, "end": end_date},
        "total_shifts": len(shifts),
        "completed_shifts": len([s for s in shifts if s['status'] == 'completed']),
        "total_hours_logged": round(total_hours, 2),
        "shifts": shifts[:50],
        "hour_logs": hour_logs[:50]
    }

@api_router.get("/reports/budget-utilization")
async def get_budget_utilization_report(current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    
    report = []
    for client in clients:
        utilization = 0
        if client.get('total_budget', 0) > 0:
            utilization = (client.get('spent_budget', 0) / client['total_budget']) * 100
        
        report.append({
            "client_id": client['id'],
            "client_name": client['full_name'],
            "ndis_number": client['ndis_number'],
            "total_budget": client.get('total_budget', 0),
            "spent_budget": client.get('spent_budget', 0),
            "remaining_budget": client.get('total_budget', 0) - client.get('spent_budget', 0),
            "utilization_percentage": round(utilization, 2)
        })
    
    return {"clients": report}

# Vehicle Routes
@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    owner_name = None
    if vehicle_data.owner_id:
        if vehicle_data.owner_type == "client":
            owner = await db.clients.find_one({"id": vehicle_data.owner_id}, {"_id": 0})
            owner_name = owner['full_name'] if owner else None
        elif vehicle_data.owner_type == "organization":
            owner_name = "ProCare Hub"
    
    vehicle_dict = vehicle_data.model_dump()
    vehicle_dict['owner_name'] = owner_name
    vehicle = Vehicle(**vehicle_dict)
    doc = vehicle.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.vehicles.insert_one(doc)
    return vehicle

@api_router.get("/vehicles", response_model=List[Vehicle])
async def get_vehicles(current_user: User = Depends(get_current_user)):
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    for vehicle in vehicles:
        if isinstance(vehicle['created_at'], str):
            vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at'])
    return vehicles

@api_router.get("/vehicles/{vehicle_id}", response_model=Vehicle)
async def get_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if isinstance(vehicle['created_at'], str):
        vehicle['created_at'] = datetime.fromisoformat(vehicle['created_at'])
    return Vehicle(**vehicle)

@api_router.put("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, vehicle_data: VehicleCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": vehicle_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    updated = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Vehicle(**updated)

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin"])
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle deleted successfully"}

# Vehicle Log Routes
@api_router.post("/vehicles/{vehicle_id}/logs", response_model=VehicleLogEntry)
async def create_vehicle_log(vehicle_id: str, log_data: VehicleLogCreate, current_user: User = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    log = VehicleLogEntry(
        vehicle_id=vehicle_id,
        vehicle_registration=vehicle['registration'],
        driver_id=current_user.id,
        driver_name=current_user.full_name,
        **log_data.model_dump()
    )
    doc = log.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.vehicle_logs.insert_one(doc)
    return log

@api_router.get("/vehicles/{vehicle_id}/logs", response_model=List[VehicleLogEntry])
async def get_vehicle_logs(vehicle_id: str, current_user: User = Depends(get_current_user)):
    logs = await db.vehicle_logs.find({"vehicle_id": vehicle_id}, {"_id": 0}).to_list(1000)
    for log in logs:
        if isinstance(log['created_at'], str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

@api_router.get("/vehicle-logs", response_model=List[VehicleLogEntry])
async def get_all_vehicle_logs(current_user: User = Depends(get_current_user)):
    logs = await db.vehicle_logs.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for log in logs:
        if isinstance(log['created_at'], str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    return logs

# SIL House Routes
@api_router.post("/houses", response_model=SILHouse)
async def create_house(house_data: SILHouseCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    manager_name = None
    if house_data.manager_id:
        manager = await db.staff.find_one({"id": house_data.manager_id}, {"_id": 0})
        manager_name = manager['full_name'] if manager else None
    
    house_dict = house_data.model_dump()
    house_dict['manager_name'] = manager_name
    house = SILHouse(**house_dict)
    doc = house.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.houses.insert_one(doc)
    return house

@api_router.get("/houses", response_model=List[SILHouse])
async def get_houses(current_user: User = Depends(get_current_user)):
    houses = await db.houses.find({}, {"_id": 0}).to_list(1000)
    for house in houses:
        if isinstance(house['created_at'], str):
            house['created_at'] = datetime.fromisoformat(house['created_at'])
    return houses

@api_router.get("/houses/{house_id}", response_model=SILHouse)
async def get_house(house_id: str, current_user: User = Depends(get_current_user)):
    house = await db.houses.find_one({"id": house_id}, {"_id": 0})
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    if isinstance(house['created_at'], str):
        house['created_at'] = datetime.fromisoformat(house['created_at'])
    return SILHouse(**house)

@api_router.put("/houses/{house_id}", response_model=SILHouse)
async def update_house(house_id: str, house_data: SILHouseCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.houses.update_one({"id": house_id}, {"$set": house_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="House not found")
    updated = await db.houses.find_one({"id": house_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return SILHouse(**updated)

@api_router.delete("/houses/{house_id}")
async def delete_house(house_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin"])
    result = await db.houses.delete_one({"id": house_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="House not found")
    return {"message": "House deleted successfully"}

@api_router.post("/houses/{house_id}/residents/{client_id}")
async def add_resident(house_id: str, client_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    house = await db.houses.find_one({"id": house_id}, {"_id": 0})
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    if client_id in house.get('residents', []):
        raise HTTPException(status_code=400, detail="Client already a resident")
    
    if house.get('current_occupancy', 0) >= house['capacity']:
        raise HTTPException(status_code=400, detail="House at full capacity")
    
    await db.houses.update_one(
        {"id": house_id},
        {
            "$push": {"residents": client_id},
            "$inc": {"current_occupancy": 1}
        }
    )
    return {"message": "Resident added successfully"}

@api_router.delete("/houses/{house_id}/residents/{client_id}")
async def remove_resident(house_id: str, client_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    await db.houses.update_one(
        {"id": house_id},
        {
            "$pull": {"residents": client_id},
            "$inc": {"current_occupancy": -1}
        }
    )
    return {"message": "Resident removed successfully"}

# Facility Routes
@api_router.post("/facilities", response_model=Facility)
async def create_facility(facility_data: FacilityCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    facility = Facility(**facility_data.model_dump())
    doc = facility.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.facilities.insert_one(doc)
    return facility

@api_router.get("/facilities", response_model=List[Facility])
async def get_facilities(current_user: User = Depends(get_current_user)):
    facilities = await db.facilities.find({}, {"_id": 0}).to_list(1000)
    for facility in facilities:
        if isinstance(facility['created_at'], str):
            facility['created_at'] = datetime.fromisoformat(facility['created_at'])
    return facilities

@api_router.get("/facilities/{facility_id}", response_model=Facility)
async def get_facility(facility_id: str, current_user: User = Depends(get_current_user)):
    facility = await db.facilities.find_one({"id": facility_id}, {"_id": 0})
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    if isinstance(facility['created_at'], str):
        facility['created_at'] = datetime.fromisoformat(facility['created_at'])
    return Facility(**facility)

@api_router.put("/facilities/{facility_id}", response_model=Facility)
async def update_facility(facility_id: str, facility_data: FacilityCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.facilities.update_one({"id": facility_id}, {"$set": facility_data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Facility not found")
    updated = await db.facilities.find_one({"id": facility_id}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Facility(**updated)

@api_router.delete("/facilities/{facility_id}")
async def delete_facility(facility_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin"])
    result = await db.facilities.delete_one({"id": facility_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Facility not found")
    return {"message": "Facility deleted successfully"}

# Settings Routes
@api_router.put("/settings/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in profile_data.model_dump().items() if v is not None}
    
    if 'email' in update_dict:
        existing = await db.users.find_one({"email": update_dict['email'], "id": {"$ne": current_user.id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    if update_dict:
        await db.users.update_one({"id": current_user.id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": current_user.id}, {"_id": 0, "password": 0})
    if isinstance(updated_user['created_at'], str):
        updated_user['created_at'] = datetime.fromisoformat(updated_user['created_at'])
    
    return User(**updated_user)

@api_router.post("/settings/change-password")
async def change_password(password_data: PasswordChange, current_user: User = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    
    if not verify_password(password_data.current_password, user_doc['password']):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hashed = hash_password(password_data.new_password)
    await db.users.update_one({"id": current_user.id}, {"$set": {"password": new_hashed}})
    
    return {"message": "Password changed successfully"}

@api_router.post("/settings/profile-photo")
async def upload_profile_photo(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    path = f"{APP_NAME}/uploads/users/{current_user.id}/photo.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "image/jpeg")
    
    photo_url = f"/api/files/user-photo/{current_user.id}"
    await db.users.update_one({"id": current_user.id}, {"$set": {"photo_url": photo_url}})
    
    file_record = FileRecord(
        storage_path=result["path"],
        original_filename=file.filename,
        content_type=file.content_type or "image/jpeg",
        size=result["size"],
        uploaded_by=current_user.id,
        entity_type="user_photo",
        entity_id=current_user.id
    )
    doc = file_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.files.insert_one(doc)
    
    return {"photo_url": photo_url}

@api_router.get("/files/user-photo/{user_id}")
async def get_user_photo(user_id: str):
    record = await db.files.find_one({
        "entity_type": "user_photo",
        "entity_id": user_id,
        "is_deleted": False
    }, {"_id": 0}, sort=[("created_at", -1)])
    
    if not record:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    data, content_type = get_object(record["storage_path"])
    return Response(content=data, media_type=record.get("content_type", content_type))

@api_router.get("/settings/organization")
async def get_organization(current_user: User = Depends(get_current_user)):
    org = await db.organization.find_one({}, {"_id": 0})
    if not org:
        # Create default organization
        default_org = Organization(organization_name="ProCare Hub")
        doc = default_org.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.organization.insert_one(doc)
        return default_org
    if isinstance(org['created_at'], str):
        org['created_at'] = datetime.fromisoformat(org['created_at'])
    return Organization(**org)

@api_router.put("/settings/organization")
async def update_organization(org_data: OrganizationUpdate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin"])
    
    update_dict = {k: v for k, v in org_data.model_dump().items() if v is not None}
    
    if update_dict:
        result = await db.organization.update_one({}, {"$set": update_dict}, upsert=False)
        if result.matched_count == 0:
            # Create new organization
            org = Organization(**org_data.model_dump())
            doc = org.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.organization.insert_one(doc)
            return org
    
    updated = await db.organization.find_one({}, {"_id": 0})
    if isinstance(updated['created_at'], str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return Organization(**updated)

@api_router.get("/settings/notifications")
async def get_notification_preferences(current_user: User = Depends(get_current_user)):
    prefs = await db.notification_preferences.find_one({"user_id": current_user.id}, {"_id": 0})
    if not prefs:
        # Return defaults
        return NotificationPreferences(user_id=current_user.id)
    return NotificationPreferences(**prefs)

@api_router.put("/settings/notifications")
async def update_notification_preferences(prefs_data: NotificationPreferences, current_user: User = Depends(get_current_user)):
    prefs_dict = prefs_data.model_dump()
    prefs_dict['user_id'] = current_user.id
    
    await db.notification_preferences.update_one(
        {"user_id": current_user.id},
        {"$set": prefs_dict},
        upsert=True
    )
    
    return {"message": "Notification preferences updated successfully"}

# Leave Request Routes
@api_router.post("/leave/request", response_model=LeaveRequest)
async def submit_leave_request(leave_data: LeaveRequestCreate, current_user: User = Depends(get_current_user)):
    from datetime import datetime as dt
    
    # Calculate days count
    start = dt.strptime(leave_data.start_date, "%Y-%m-%d")
    end = dt.strptime(leave_data.end_date, "%Y-%m-%d")
    days_count = (end - start).days + 1
    
    leave_request = LeaveRequest(
        staff_id=current_user.id,
        staff_name=current_user.full_name,
        leave_type=leave_data.leave_type,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        days_count=days_count,
        reason=leave_data.reason
    )
    
    doc = leave_request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.leave_requests.insert_one(doc)
    
    # Notify admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(100)
    for admin in admins:
        await create_notification(
            admin['id'],
            f"New Leave Request from {current_user.full_name}",
            f"{leave_data.leave_type.capitalize()} leave for {days_count} days starting {leave_data.start_date}",
            "leave",
            None,
            should_send_email=True
        )
    
    return leave_request

@api_router.get("/leave/requests", response_model=List[LeaveRequest])
async def get_all_leave_requests(current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    requests = await db.leave_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for req in requests:
        if isinstance(req['created_at'], str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if req.get('reviewed_at') and isinstance(req['reviewed_at'], str):
            req['reviewed_at'] = datetime.fromisoformat(req['reviewed_at'])
    return requests

@api_router.get("/leave/my-requests", response_model=List[LeaveRequest])
async def get_my_leave_requests(current_user: User = Depends(get_current_user)):
    requests = await db.leave_requests.find(
        {"staff_id": current_user.id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for req in requests:
        if isinstance(req['created_at'], str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if req.get('reviewed_at') and isinstance(req['reviewed_at'], str):
            req['reviewed_at'] = datetime.fromisoformat(req['reviewed_at'])
    return requests

@api_router.put("/leave/{request_id}/approve")
async def approve_leave_request(request_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    result = await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "approved",
            "reviewed_by": current_user.full_name,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    # Notify staff member
    leave_req = await db.leave_requests.find_one({"id": request_id}, {"_id": 0})
    if leave_req:
        await create_notification(
            leave_req['staff_id'],
            "Leave Request Approved",
            f"Your {leave_req['leave_type']} leave request has been approved.",
            "leave",
            None,
            should_send_email=True
        )
    
    return {"message": "Leave request approved"}

@api_router.put("/leave/{request_id}/reject")
async def reject_leave_request(request_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    result = await db.leave_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected",
            "reviewed_by": current_user.full_name,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    # Notify staff member
    leave_req = await db.leave_requests.find_one({"id": request_id}, {"_id": 0})
    if leave_req:
        await create_notification(
            leave_req['staff_id'],
            "Leave Request Rejected",
            f"Your {leave_req['leave_type']} leave request has been rejected.",
            "leave",
            None,
            should_send_email=True
        )
    
    return {"message": "Leave request rejected"}

# Medication Management Routes
@api_router.post("/medications", response_model=Medication)
async def create_medication(med_data: MedicationCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    client = await db.clients.find_one({"id": med_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    medication = Medication(**med_data.model_dump(), client_name=client['full_name'])
    doc = medication.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.medications.insert_one(doc)
    return medication

@api_router.get("/medications/client/{client_id}", response_model=List[Medication])
async def get_client_medications(client_id: str, current_user: User = Depends(get_current_user)):
    meds = await db.medications.find({"client_id": client_id, "active": True}, {"_id": 0}).to_list(1000)
    for med in meds:
        if isinstance(med['created_at'], str):
            med['created_at'] = datetime.fromisoformat(med['created_at'])
    return meds

@api_router.post("/medications/{medication_id}/log")
async def log_medication(medication_id: str, notes: Optional[str] = None, current_user: User = Depends(get_current_user)):
    med = await db.medications.find_one({"id": medication_id}, {"_id": 0})
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    log = MedicationLog(
        medication_id=medication_id,
        medication_name=med['medication_name'],
        administered_by=current_user.full_name,
        notes=notes
    )
    doc = log.model_dump()
    doc['administered_at'] = doc['administered_at'].isoformat()
    await db.medication_logs.insert_one(doc)
    return {"message": "Medication administered"}

# Goal Tracking Routes
@api_router.post("/goals", response_model=Goal)
async def create_goal(goal_data: GoalCreate, current_user: User = Depends(get_current_user)):
    client = await db.clients.find_one({"id": goal_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    goal = Goal(**goal_data.model_dump(), client_name=client['full_name'])
    doc = goal.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.goals.insert_one(doc)
    return goal

@api_router.get("/goals/client/{client_id}", response_model=List[Goal])
async def get_client_goals(client_id: str, current_user: User = Depends(get_current_user)):
    goals = await db.goals.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    for goal in goals:
        if isinstance(goal['created_at'], str):
            goal['created_at'] = datetime.fromisoformat(goal['created_at'])
    return goals

@api_router.put("/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, progress: int, current_user: User = Depends(get_current_user)):
    await db.goals.update_one({"id": goal_id}, {"$set": {"progress_percentage": progress}})
    if progress >= 100:
        await db.goals.update_one({"id": goal_id}, {"$set": {"status": "achieved"}})
    return {"message": "Progress updated"}

# Communication Hub Routes
@api_router.post("/messages", response_model=Message)
async def send_message(message_data: MessageCreate, current_user: User = Depends(get_current_user)):
    recipient = await db.users.find_one({"id": message_data.recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    message = Message(
        sender_id=current_user.id,
        sender_name=current_user.full_name,
        recipient_id=message_data.recipient_id,
        recipient_name=recipient['full_name'],
        subject=message_data.subject,
        message_text=message_data.message_text
    )
    doc = message.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.messages.insert_one(doc)
    
    await create_notification(
        message_data.recipient_id,
        f"New message from {current_user.full_name}",
        message_data.subject,
        "message",
        None,
        should_send_email=True
    )
    return message

@api_router.get("/messages/inbox", response_model=List[Message])
async def get_inbox(current_user: User = Depends(get_current_user)):
    # Get both sent and received messages for full conversation view
    messages = await db.messages.find(
        {"$or": [{"recipient_id": current_user.id}, {"sender_id": current_user.id}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    for msg in messages:
        if isinstance(msg['created_at'], str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    return messages

@api_router.get("/users/list")
async def list_users(current_user: User = Depends(get_current_user)):
    """Get list of all users for messaging dropdown"""
    users = await db.users.find(
        {"id": {"$ne": current_user.id}},
        {"_id": 0, "id": 1, "full_name": 1, "email": 1, "role": 1}
    ).to_list(1000)
    return users

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: User = Depends(get_current_user)):
    await db.messages.update_one(
        {"id": message_id, "recipient_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

# Compliance Calendar Routes
@api_router.post("/compliance/deadlines", response_model=ComplianceDeadline)
async def create_compliance_deadline(deadline_data: ComplianceDeadlineCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    deadline = ComplianceDeadline(**deadline_data.model_dump())
    doc = deadline.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.compliance_deadlines.insert_one(doc)
    return deadline

@api_router.get("/compliance/deadlines", response_model=List[ComplianceDeadline])
async def get_compliance_deadlines(current_user: User = Depends(get_current_user)):
    deadlines = await db.compliance_deadlines.find({}, {"_id": 0}).sort("due_date", 1).to_list(1000)
    for deadline in deadlines:
        if isinstance(deadline['created_at'], str):
            deadline['created_at'] = datetime.fromisoformat(deadline['created_at'])
        if deadline.get('completed_at') and isinstance(deadline['completed_at'], str):
            deadline['completed_at'] = datetime.fromisoformat(deadline['completed_at'])
    return deadlines

@api_router.put("/compliance/deadlines/{deadline_id}/complete")
async def complete_deadline(deadline_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    await db.compliance_deadlines.update_one(
        {"id": deadline_id},
        {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Deadline marked as complete"}

# Feedback & Surveys Routes
@api_router.post("/surveys", response_model=Survey)
async def create_survey(survey_data: SurveyCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    survey = Survey(**survey_data.model_dump(), created_by=current_user.full_name)
    doc = survey.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.surveys.insert_one(doc)
    return survey

@api_router.get("/surveys", response_model=List[Survey])
async def get_surveys(current_user: User = Depends(get_current_user)):
    surveys = await db.surveys.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for survey in surveys:
        if isinstance(survey['created_at'], str):
            survey['created_at'] = datetime.fromisoformat(survey['created_at'])
    return surveys

@api_router.post("/surveys/{survey_id}/respond", response_model=SurveyResponse)
async def submit_survey_response(survey_id: str, answers: List[dict], current_user: User = Depends(get_current_user)):
    survey = await db.surveys.find_one({"id": survey_id}, {"_id": 0})
    if not survey or survey['status'] != 'active':
        raise HTTPException(status_code=404, detail="Survey not found or closed")
    
    response = SurveyResponse(
        survey_id=survey_id,
        respondent_id=current_user.id,
        respondent_name=current_user.full_name,
        answers=answers
    )
    doc = response.model_dump()
    doc['completed_at'] = doc['completed_at'].isoformat()
    await db.survey_responses.insert_one(doc)
    
    await db.surveys.update_one({"id": survey_id}, {"$inc": {"response_count": 1}})
    return response

@api_router.get("/surveys/{survey_id}/responses")
async def get_survey_responses(survey_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    responses = await db.survey_responses.find({"survey_id": survey_id}, {"_id": 0}).to_list(1000)
    for resp in responses:
        if isinstance(resp['completed_at'], str):
            resp['completed_at'] = datetime.fromisoformat(resp['completed_at'])
    return responses

@api_router.get("/reports/incidents-summary")
async def get_incidents_summary_report(current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    records = await db.compliance.find({}, {"_id": 0}).to_list(1000)
    
    by_type = {}
    by_severity = {}
    by_status = {}
    
    for record in records:
        record_type = record.get('record_type', 'other')
        severity = record.get('severity', 'low')
        status = record.get('status', 'open')
        
        by_type[record_type] = by_type.get(record_type, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "total_incidents": len(records),
        "by_type": by_type,
        "by_severity": by_severity,
        "by_status": by_status,
        "recent_incidents": records[:20]
    }

# Startup event
@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

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
