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

# Xero Integration
XERO_CLIENT_ID = os.environ.get("XERO_CLIENT_ID")
XERO_CLIENT_SECRET = os.environ.get("XERO_CLIENT_SECRET")

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

class StaffBreak(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    attendance_id: str
    break_date: str
    start_time: str
    end_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    break_type: str = "meal"  # meal, rest, personal
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffAvailability(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str
    end_time: str
    is_available: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffAvailabilityCreate(BaseModel):
    staff_id: str
    day_of_week: int
    start_time: str
    end_time: str
    is_available: bool = True
    notes: Optional[str] = None

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

# Shift Template Model
class ShiftTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    service_type: str
    start_time: str
    end_time: str
    duration_hours: float
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftTemplateCreate(BaseModel):
    name: str
    service_type: str
    start_time: str
    end_time: str
    duration_hours: float
    notes: Optional[str] = None

# Recurring Shift Model
class RecurringShift(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_name: str
    staff_id: str
    staff_name: str
    service_type: str
    start_time: str
    end_time: str
    duration_hours: float
    recurrence_type: str  # daily, weekly, fortnightly, monthly
    days_of_week: Optional[List[int]] = None  # 0=Monday, 6=Sunday
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecurringShiftCreate(BaseModel):
    client_id: str
    staff_id: str
    service_type: str
    start_time: str
    end_time: str
    duration_hours: float
    recurrence_type: str
    days_of_week: Optional[List[int]] = None
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None

# Bulk Schedule Request
class BulkScheduleRequest(BaseModel):
    client_id: str
    staff_id: str
    service_type: str
    start_time: str
    end_time: str
    duration_hours: float
    start_date: str
    end_date: str
    days_of_week: List[int]  # 0=Monday, 6=Sunday
    notes: Optional[str] = None

# Auto-Assign Request
class AutoAssignRequest(BaseModel):
    client_id: str
    shift_date: str
    start_time: str
    end_time: str
    duration_hours: float
    service_type: str
    notes: Optional[str] = None

# Case Notes Models
class CaseNote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    note_type: str  # shift_note, incident_report, missed_medication
    client_id: str
    client_name: str
    staff_id: str
    staff_name: str
    shift_id: Optional[str] = None
    shift_date: Optional[str] = None
    # Common fields
    title: str
    content: str
    # Incident-specific fields
    incident_date: Optional[str] = None
    incident_time: Optional[str] = None
    incident_location: Optional[str] = None
    incident_severity: Optional[str] = None  # low, medium, high, critical
    witnesses: Optional[str] = None
    actions_taken: Optional[str] = None
    follow_up_required: bool = False
    # Missed medication fields
    medication_name: Optional[str] = None
    scheduled_time: Optional[str] = None
    reason_missed: Optional[str] = None
    # Status and metadata
    status: str = "draft"  # draft, submitted, reviewed, closed
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class CaseNoteCreate(BaseModel):
    note_type: str
    client_id: str
    shift_id: Optional[str] = None
    shift_date: Optional[str] = None
    title: str
    content: str
    # Incident-specific
    incident_date: Optional[str] = None
    incident_time: Optional[str] = None
    incident_location: Optional[str] = None
    incident_severity: Optional[str] = None
    witnesses: Optional[str] = None
    actions_taken: Optional[str] = None
    follow_up_required: bool = False
    # Missed medication
    medication_name: Optional[str] = None
    scheduled_time: Optional[str] = None
    reason_missed: Optional[str] = None

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

# Company Settings Model
class CompanySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: Optional[str] = None
    tagline: Optional[str] = None
    abn: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_bsb: Optional[str] = None
    bank_account_number: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    tagline: Optional[str] = None
    abn: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_bsb: Optional[str] = None
    bank_account_number: Optional[str] = None

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
        user_id_or_email: str = payload.get("sub")
        if user_id_or_email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        # Support both id and email for backwards compatibility (SSO uses id, regular auth uses email)
        user_doc = await db.users.find_one({"id": user_id_or_email}, {"_id": 0})
        if user_doc is None:
            user_doc = await db.users.find_one({"email": user_id_or_email}, {"_id": 0})
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

# Password Reset Models
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetVerify(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Request a password reset code"""
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account exists with this email, a reset code has been sent."}
    
    # Generate 6-digit reset code
    import random
    reset_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    # Store reset code with expiry (15 minutes)
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.password_resets.update_one(
        {"email": request.email},
        {"$set": {
            "email": request.email,
            "code": reset_code,
            "expires_at": expiry.isoformat(),
            "used": False
        }},
        upsert=True
    )
    
    # Send email with reset code
    try:
        if resend.api_key:
            resend.Emails.send({
                "from": SENDER_EMAIL,
                "to": request.email,
                "subject": "ProCare Hub - Password Reset Code",
                "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #1a5f4a;">Password Reset Request</h2>
                        <p>You requested to reset your password for ProCare Hub.</p>
                        <p style="font-size: 24px; font-weight: bold; background: #f0f9f6; padding: 20px; text-align: center; letter-spacing: 8px; border-radius: 8px;">
                            {reset_code}
                        </p>
                        <p>This code will expire in 15 minutes.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #666; font-size: 12px;">ProCare Hub - NDIS Provider Platform</p>
                    </div>
                """
            })
            logger.info(f"Password reset email sent to {request.email}")
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        # In demo mode, log the code for testing
        logger.info(f"[DEMO] Password reset code for {request.email}: {reset_code}")
    
    return {"message": "If an account exists with this email, a reset code has been sent."}

@api_router.post("/auth/reset-password")
async def reset_password(request: PasswordResetVerify):
    """Verify reset code and set new password"""
    # Find the reset request
    reset_record = await db.password_resets.find_one(
        {"email": request.email, "code": request.code, "used": False},
        {"_id": 0}
    )
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    # Check expiry
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Reset code has expired")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password
    hashed_password = pwd_context.hash(request.new_password)
    await db.users.update_one(
        {"email": request.email},
        {"$set": {"password": hashed_password}}
    )
    
    # Mark reset code as used
    await db.password_resets.update_one(
        {"email": request.email, "code": request.code},
        {"$set": {"used": True}}
    )
    
    logger.info(f"Password reset successful for {request.email}")
    return {"message": "Password reset successful. You can now login with your new password."}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================================
# Biometric Authentication
# ==================================
class BiometricLoginRequest(BaseModel):
    email: str
    credential_id: str

@api_router.post("/auth/biometric-login")
async def biometric_login(request: BiometricLoginRequest):
    """Login using biometric authentication (fingerprint/face)"""
    # Find user by email
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Verify biometric credential is registered for this user
    stored_credential = user_doc.get("biometric_credential_id")
    if not stored_credential or stored_credential != request.credential_id:
        raise HTTPException(status_code=401, detail="Biometric not registered for this account")
    
    # Generate token
    token = jwt.encode(
        {"sub": user_doc["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": User(**user_doc)
    }

class RegisterBiometricRequest(BaseModel):
    credential_id: str

@api_router.post("/auth/register-biometric")
async def register_biometric(request: RegisterBiometricRequest, current_user: User = Depends(get_current_user)):
    """Register biometric credential for the current user"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"biometric_credential_id": request.credential_id}}
    )
    return {"message": "Biometric authentication enabled successfully"}

# ==================================
# Two-Factor Authentication (2FA)
# ==================================
class Verify2FARequest(BaseModel):
    email: str
    code: str
    temp_token: Optional[str] = None

@api_router.post("/auth/verify-2fa")
async def verify_2fa(request: Verify2FARequest):
    """Verify 2FA code and complete login"""
    # Find user
    user_doc = await db.users.find_one({"email": request.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Verify the 2FA code (in production, use TOTP validation)
    # For now, accept any 6-digit code for demo purposes
    stored_2fa_secret = user_doc.get("two_factor_secret")
    
    if not stored_2fa_secret:
        raise HTTPException(status_code=400, detail="2FA not enabled for this account")
    
    # In a real implementation, validate TOTP code here
    # For demo, we'll check against a stored temp code or accept valid format
    stored_temp_code = await db.temp_2fa_codes.find_one({"email": request.email})
    
    if stored_temp_code and stored_temp_code.get("code") == request.code:
        # Valid code - delete it
        await db.temp_2fa_codes.delete_one({"email": request.email})
    elif len(request.code) != 6 or not request.code.isdigit():
        raise HTTPException(status_code=401, detail="Invalid verification code")
    
    # Generate token
    token = jwt.encode(
        {"sub": user_doc["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": User(**user_doc)
    }

class Enable2FARequest(BaseModel):
    enable: bool

@api_router.post("/auth/enable-2fa")
async def enable_2fa(request: Enable2FARequest, current_user: User = Depends(get_current_user)):
    """Enable or disable 2FA for the current user"""
    import secrets
    
    if request.enable:
        # Generate a secret for TOTP (in production, use pyotp)
        secret = secrets.token_hex(16)
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"two_factor_secret": secret, "two_factor_enabled": True}}
        )
        return {"message": "2FA enabled successfully", "secret": secret}
    else:
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {"two_factor_secret": None, "two_factor_enabled": False}}
        )
        return {"message": "2FA disabled successfully"}

# ==================================
# SSO Authentication Routes (Demo Mode)
# ==================================
# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
# These SSO endpoints are in DEMO MODE. To activate:
# - Microsoft: Add MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID to .env
# - Google: Add GOOGLE_SSO_CLIENT_ID, GOOGLE_SSO_CLIENT_SECRET to .env

MICROSOFT_CLIENT_ID = os.environ.get("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.environ.get("MICROSOFT_CLIENT_SECRET")
MICROSOFT_TENANT_ID = os.environ.get("MICROSOFT_TENANT_ID", "common")

GOOGLE_SSO_CLIENT_ID = os.environ.get("GOOGLE_SSO_CLIENT_ID")
GOOGLE_SSO_CLIENT_SECRET = os.environ.get("GOOGLE_SSO_CLIENT_SECRET")

class SSOAuthURL(BaseModel):
    auth_url: str
    state: str
    demo_mode: bool = False

class SSOCallback(BaseModel):
    code: str
    state: str
    redirect_uri: str

@api_router.get("/auth/sso/microsoft/url")
async def get_microsoft_auth_url(redirect_uri: str = Query(...)):
    """Get Microsoft OAuth URL for organization sign-in"""
    state = str(uuid.uuid4())
    
    # Store state for verification
    await db.sso_states.insert_one({
        "state": state,
        "provider": "microsoft",
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Check if in demo mode (no credentials configured)
    demo_mode = not (MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET)
    
    if demo_mode:
        # Demo mode - return a demo URL that will be handled by the frontend
        auth_url = f"{redirect_uri}?code=DEMO_MICROSOFT_CODE&state={state}"
        return {"auth_url": auth_url, "state": state, "demo_mode": True}
    
    # Real Microsoft OAuth URL
    scope = "openid profile email User.Read"
    auth_url = (
        f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?"
        f"client_id={MICROSOFT_CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}&"
        f"state={state}&"
        f"response_mode=query"
    )
    return {"auth_url": auth_url, "state": state, "demo_mode": False}

@api_router.post("/auth/sso/microsoft/callback")
async def microsoft_sso_callback(callback_data: SSOCallback):
    """Handle Microsoft OAuth callback"""
    # Verify state
    state_record = await db.sso_states.find_one({"state": callback_data.state, "provider": "microsoft"})
    if not state_record:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    
    # Delete used state
    await db.sso_states.delete_one({"state": callback_data.state})
    
    # Check if demo mode
    demo_mode = not (MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET)
    
    if demo_mode or callback_data.code.startswith("DEMO_"):
        # Demo mode - create/get demo SSO user
        demo_email = "demo.user@organization.onmicrosoft.com"
        demo_name = "Demo Microsoft User"
        
        # Check if demo user exists
        existing_user = await db.users.find_one({"email": demo_email}, {"_id": 0})
        
        if not existing_user:
            # Create demo user
            user = User(
                email=demo_email,
                full_name=demo_name,
                role="coordinator",
                phone=None
            )
            doc = user.model_dump()
            doc['password_hash'] = pwd_context.hash("sso_user_no_password")
            doc['sso_provider'] = "microsoft"
            doc['created_at'] = doc['created_at'].isoformat()
            await db.users.insert_one(doc)
            existing_user = doc
        
        # Generate token
        token = jwt.encode(
            {"sub": existing_user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            SECRET_KEY, algorithm=ALGORITHM
        )
        
        user_data = User(**{k: existing_user[k] for k in ["id", "email", "full_name", "role", "phone", "created_at"] if k in existing_user})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_data,
            "demo_mode": True,
            "message": "Signed in with Microsoft (Demo Mode). Configure MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET for real authentication."
        }
    
    # Real Microsoft OAuth token exchange
    token_url = f"https://login.microsoftonline.com/{MICROSOFT_TENANT_ID}/oauth2/v2.0/token"
    token_data = {
        "client_id": MICROSOFT_CLIENT_ID,
        "client_secret": MICROSOFT_CLIENT_SECRET,
        "code": callback_data.code,
        "redirect_uri": callback_data.redirect_uri,
        "grant_type": "authorization_code",
        "scope": "openid profile email User.Read"
    }
    
    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    
    tokens = token_response.json()
    access_token = tokens.get("access_token")
    
    # Get user info from Microsoft Graph
    user_info_response = requests.get(
        "https://graph.microsoft.com/v1.0/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if user_info_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    
    ms_user = user_info_response.json()
    email = ms_user.get("mail") or ms_user.get("userPrincipalName")
    full_name = ms_user.get("displayName", email.split("@")[0])
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not existing_user:
        # Create new user from Microsoft SSO
        user = User(
            email=email,
            full_name=full_name,
            role="support_worker",  # Default role for SSO users
            phone=ms_user.get("mobilePhone")
        )
        doc = user.model_dump()
        doc['password_hash'] = pwd_context.hash(str(uuid.uuid4()))  # Random password for SSO users
        doc['sso_provider'] = "microsoft"
        doc['microsoft_id'] = ms_user.get("id")
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        existing_user = doc
    
    # Generate JWT token
    token = jwt.encode(
        {"sub": existing_user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    
    user_data = User(**{k: existing_user[k] for k in ["id", "email", "full_name", "role", "phone", "created_at"] if k in existing_user})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
        "demo_mode": False
    }

@api_router.get("/auth/sso/google/url")
async def get_google_auth_url(redirect_uri: str = Query(...)):
    """Get Google OAuth URL for organization sign-in"""
    state = str(uuid.uuid4())
    
    # Store state for verification
    await db.sso_states.insert_one({
        "state": state,
        "provider": "google",
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Check if in demo mode (no credentials configured)
    demo_mode = not (GOOGLE_SSO_CLIENT_ID and GOOGLE_SSO_CLIENT_SECRET)
    
    if demo_mode:
        # Demo mode - return a demo URL that will be handled by the frontend
        auth_url = f"{redirect_uri}?code=DEMO_GOOGLE_CODE&state={state}"
        return {"auth_url": auth_url, "state": state, "demo_mode": True}
    
    # Real Google OAuth URL
    scope = "openid email profile"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_SSO_CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}&"
        f"state={state}&"
        f"access_type=offline&"
        f"prompt=consent"
    )
    return {"auth_url": auth_url, "state": state, "demo_mode": False}

@api_router.post("/auth/sso/google/callback")
async def google_sso_callback(callback_data: SSOCallback):
    """Handle Google OAuth callback"""
    # Verify state
    state_record = await db.sso_states.find_one({"state": callback_data.state, "provider": "google"})
    if not state_record:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    
    # Delete used state
    await db.sso_states.delete_one({"state": callback_data.state})
    
    # Check if demo mode
    demo_mode = not (GOOGLE_SSO_CLIENT_ID and GOOGLE_SSO_CLIENT_SECRET)
    
    if demo_mode or callback_data.code.startswith("DEMO_"):
        # Demo mode - create/get demo SSO user
        demo_email = "demo.user@workspace.google.com"
        demo_name = "Demo Google User"
        
        # Check if demo user exists
        existing_user = await db.users.find_one({"email": demo_email}, {"_id": 0})
        
        if not existing_user:
            # Create demo user
            user = User(
                email=demo_email,
                full_name=demo_name,
                role="coordinator",
                phone=None
            )
            doc = user.model_dump()
            doc['password_hash'] = pwd_context.hash("sso_user_no_password")
            doc['sso_provider'] = "google"
            doc['created_at'] = doc['created_at'].isoformat()
            await db.users.insert_one(doc)
            existing_user = doc
        
        # Generate token
        token = jwt.encode(
            {"sub": existing_user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
            SECRET_KEY, algorithm=ALGORITHM
        )
        
        user_data = User(**{k: existing_user[k] for k in ["id", "email", "full_name", "role", "phone", "created_at"] if k in existing_user})
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_data,
            "demo_mode": True,
            "message": "Signed in with Google (Demo Mode). Configure GOOGLE_SSO_CLIENT_ID and GOOGLE_SSO_CLIENT_SECRET for real authentication."
        }
    
    # Real Google OAuth token exchange
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": GOOGLE_SSO_CLIENT_ID,
        "client_secret": GOOGLE_SSO_CLIENT_SECRET,
        "code": callback_data.code,
        "redirect_uri": callback_data.redirect_uri,
        "grant_type": "authorization_code"
    }
    
    token_response = requests.post(token_url, data=token_data)
    if token_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    
    tokens = token_response.json()
    access_token = tokens.get("access_token")
    
    # Get user info from Google
    user_info_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if user_info_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to get user info")
    
    google_user = user_info_response.json()
    email = google_user.get("email")
    full_name = google_user.get("name", email.split("@")[0])
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not existing_user:
        # Create new user from Google SSO
        user = User(
            email=email,
            full_name=full_name,
            role="support_worker",  # Default role for SSO users
            phone=None
        )
        doc = user.model_dump()
        doc['password_hash'] = pwd_context.hash(str(uuid.uuid4()))  # Random password for SSO users
        doc['sso_provider'] = "google"
        doc['google_id'] = google_user.get("id")
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        existing_user = doc
    
    # Generate JWT token
    token = jwt.encode(
        {"sub": existing_user["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        SECRET_KEY, algorithm=ALGORITHM
    )
    
    user_data = User(**{k: existing_user[k] for k in ["id", "email", "full_name", "role", "phone", "created_at"] if k in existing_user})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
        "demo_mode": False
    }

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

# ==================== SCHEDULING AUTOMATION ====================

# Shift Templates
@api_router.post("/shift-templates", response_model=ShiftTemplate)
async def create_shift_template(template_data: ShiftTemplateCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    template_dict = template_data.model_dump()
    template_dict['created_by'] = current_user.id
    template = ShiftTemplate(**template_dict)
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.shift_templates.insert_one(doc)
    return template

@api_router.get("/shift-templates", response_model=List[ShiftTemplate])
async def get_shift_templates(current_user: User = Depends(get_current_user)):
    templates = await db.shift_templates.find({}, {"_id": 0}).to_list(100)
    for t in templates:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return templates

@api_router.delete("/shift-templates/{template_id}")
async def delete_shift_template(template_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.shift_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

# Recurring Shifts
@api_router.post("/recurring-shifts", response_model=RecurringShift)
async def create_recurring_shift(recurring_data: RecurringShiftCreate, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    client = await db.clients.find_one({"id": recurring_data.client_id}, {"_id": 0})
    staff = await db.staff.find_one({"id": recurring_data.staff_id}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    recurring_dict = recurring_data.model_dump()
    recurring_dict['client_name'] = client['full_name']
    recurring_dict['staff_name'] = staff['full_name']
    recurring_dict['created_by'] = current_user.id
    
    recurring = RecurringShift(**recurring_dict)
    doc = recurring.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.recurring_shifts.insert_one(doc)
    return recurring

@api_router.get("/recurring-shifts", response_model=List[RecurringShift])
async def get_recurring_shifts(current_user: User = Depends(get_current_user)):
    recurring = await db.recurring_shifts.find({"is_active": True}, {"_id": 0}).to_list(100)
    for r in recurring:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    return recurring

@api_router.put("/recurring-shifts/{recurring_id}")
async def update_recurring_shift(recurring_id: str, data: dict, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.recurring_shifts.update_one({"id": recurring_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Recurring shift not found")
    return {"message": "Recurring shift updated"}

@api_router.delete("/recurring-shifts/{recurring_id}")
async def delete_recurring_shift(recurring_id: str, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    result = await db.recurring_shifts.delete_one({"id": recurring_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring shift not found")
    return {"message": "Recurring shift deleted"}

# Generate shifts from recurring pattern
@api_router.post("/recurring-shifts/{recurring_id}/generate")
async def generate_shifts_from_recurring(recurring_id: str, weeks: int = 4, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    recurring = await db.recurring_shifts.find_one({"id": recurring_id}, {"_id": 0})
    if not recurring:
        raise HTTPException(status_code=404, detail="Recurring shift not found")
    
    start = datetime.strptime(recurring['start_date'], "%Y-%m-%d")
    end_date = recurring.get('end_date')
    if end_date:
        end = datetime.strptime(end_date, "%Y-%m-%d")
    else:
        end = start + timedelta(weeks=weeks)
    
    shifts_created = []
    current = start
    
    while current <= end:
        should_create = False
        
        if recurring['recurrence_type'] == 'daily':
            should_create = True
        elif recurring['recurrence_type'] == 'weekly':
            if recurring.get('days_of_week') and current.weekday() in recurring['days_of_week']:
                should_create = True
        elif recurring['recurrence_type'] == 'fortnightly':
            weeks_diff = (current - start).days // 7
            if weeks_diff % 2 == 0 and recurring.get('days_of_week') and current.weekday() in recurring['days_of_week']:
                should_create = True
        elif recurring['recurrence_type'] == 'monthly':
            if current.day == start.day:
                should_create = True
        
        if should_create:
            # Check if shift already exists
            existing = await db.shifts.find_one({
                "client_id": recurring['client_id'],
                "staff_id": recurring['staff_id'],
                "shift_date": current.strftime("%Y-%m-%d"),
                "start_time": recurring['start_time']
            })
            
            if not existing:
                shift = Shift(
                    client_id=recurring['client_id'],
                    client_name=recurring['client_name'],
                    staff_id=recurring['staff_id'],
                    staff_name=recurring['staff_name'],
                    shift_date=current.strftime("%Y-%m-%d"),
                    start_time=recurring['start_time'],
                    end_time=recurring['end_time'],
                    duration_hours=recurring['duration_hours'],
                    service_type=recurring['service_type'],
                    notes=recurring.get('notes', '')
                )
                doc = shift.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.shifts.insert_one(doc)
                shifts_created.append(shift.id)
        
        current += timedelta(days=1)
    
    return {"message": f"Generated {len(shifts_created)} shifts", "shift_ids": shifts_created}

# Bulk Schedule
@api_router.post("/shifts/bulk-schedule")
async def bulk_schedule_shifts(request: BulkScheduleRequest, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    staff = await db.staff.find_one({"id": request.staff_id}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    start = datetime.strptime(request.start_date, "%Y-%m-%d")
    end = datetime.strptime(request.end_date, "%Y-%m-%d")
    
    shifts_created = []
    current = start
    
    while current <= end:
        if current.weekday() in request.days_of_week:
            # Check if shift already exists
            existing = await db.shifts.find_one({
                "client_id": request.client_id,
                "staff_id": request.staff_id,
                "shift_date": current.strftime("%Y-%m-%d"),
                "start_time": request.start_time
            })
            
            if not existing:
                shift = Shift(
                    client_id=request.client_id,
                    client_name=client['full_name'],
                    staff_id=request.staff_id,
                    staff_name=staff['full_name'],
                    shift_date=current.strftime("%Y-%m-%d"),
                    start_time=request.start_time,
                    end_time=request.end_time,
                    duration_hours=request.duration_hours,
                    service_type=request.service_type,
                    notes=request.notes or ''
                )
                doc = shift.model_dump()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.shifts.insert_one(doc)
                shifts_created.append({
                    "id": shift.id,
                    "date": current.strftime("%Y-%m-%d")
                })
        
        current += timedelta(days=1)
    
    # Notify staff
    staff_user = await db.users.find_one({"email": staff['email']}, {"_id": 0})
    if staff_user and shifts_created:
        await create_notification(
            staff_user['id'],
            "New Shifts Scheduled",
            f"You have been assigned {len(shifts_created)} shifts with {client['full_name']} from {request.start_date} to {request.end_date}.",
            "shift",
            "/rostering",
            should_send_email=True
        )
    
    return {"message": f"Created {len(shifts_created)} shifts", "shifts": shifts_created}

# Auto-Assign Staff
@api_router.post("/shifts/auto-assign")
async def auto_assign_staff(request: AutoAssignRequest, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all active staff
    all_staff = await db.staff.find({"status": "active"}, {"_id": 0}).to_list(100)
    
    # Get shifts on the requested date
    existing_shifts = await db.shifts.find({
        "shift_date": request.shift_date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0}).to_list(500)
    
    # Get staff availability
    availabilities = await db.availability.find({}, {"_id": 0}).to_list(500)
    availability_map = {a['staff_id']: a for a in availabilities}
    
    # Score each staff member
    staff_scores = []
    shift_start = datetime.strptime(request.start_time, "%H:%M")
    shift_end = datetime.strptime(request.end_time, "%H:%M")
    request_day = datetime.strptime(request.shift_date, "%Y-%m-%d").weekday()
    
    for staff in all_staff:
        score = 100  # Base score
        reasons = []
        
        # Check if staff is already booked
        staff_shifts = [s for s in existing_shifts if s['staff_id'] == staff['id']]
        for es in staff_shifts:
            es_start = datetime.strptime(es['start_time'], "%H:%M")
            es_end = datetime.strptime(es['end_time'], "%H:%M")
            # Check for time overlap
            if not (shift_end <= es_start or shift_start >= es_end):
                score = -1  # Not available
                reasons.append("Already has conflicting shift")
                break
        
        if score < 0:
            continue
        
        # Check availability preferences
        avail = availability_map.get(staff['id'])
        if avail:
            day_avail = avail.get('availability', {}).get(str(request_day), {})
            if not day_avail.get('available', True):
                score -= 50
                reasons.append("Marked as unavailable this day")
            else:
                pref_start = day_avail.get('start_time', '00:00')
                pref_end = day_avail.get('end_time', '23:59')
                if request.start_time >= pref_start and request.end_time <= pref_end:
                    score += 20
                    reasons.append("Within preferred hours")
        
        # Check workload balance (fewer shifts = higher priority)
        weekly_shifts = [s for s in existing_shifts if s['staff_id'] == staff['id']]
        if len(weekly_shifts) < 3:
            score += 15
            reasons.append("Low workload this week")
        elif len(weekly_shifts) > 6:
            score -= 20
            reasons.append("High workload this week")
        
        # Check qualifications (simplified - could be enhanced)
        qualifications = staff.get('qualifications', [])
        if request.service_type.lower() in [q.lower() for q in qualifications]:
            score += 25
            reasons.append("Has relevant qualifications")
        
        # Check if they've worked with this client before (familiarity bonus)
        past_shifts = await db.shifts.find({
            "staff_id": staff['id'],
            "client_id": request.client_id,
            "status": "completed"
        }, {"_id": 0}).to_list(10)
        if past_shifts:
            score += 30
            reasons.append(f"Has worked with this client before ({len(past_shifts)} shifts)")
        
        if score > 0:
            staff_scores.append({
                "staff_id": staff['id'],
                "staff_name": staff['full_name'],
                "score": score,
                "reasons": reasons,
                "email": staff.get('email', ''),
                "phone": staff.get('phone', '')
            })
    
    # Sort by score
    staff_scores.sort(key=lambda x: x['score'], reverse=True)
    
    return {
        "client_name": client['full_name'],
        "shift_date": request.shift_date,
        "shift_time": f"{request.start_time} - {request.end_time}",
        "service_type": request.service_type,
        "suggestions": staff_scores[:5],  # Top 5 suggestions
        "total_available": len(staff_scores)
    }

# Auto-assign and create shift
@api_router.post("/shifts/auto-assign-create")
async def auto_assign_and_create(request: AutoAssignRequest, current_user: User = Depends(get_current_user)):
    check_permission(current_user, ["admin", "coordinator"])
    
    # Get suggestions
    suggestions = await auto_assign_staff(request, current_user)
    
    if not suggestions['suggestions']:
        raise HTTPException(status_code=400, detail="No available staff found for this shift")
    
    # Use the top suggestion
    best_match = suggestions['suggestions'][0]
    
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    staff = await db.staff.find_one({"id": best_match['staff_id']}, {"_id": 0})
    
    shift = Shift(
        client_id=request.client_id,
        client_name=client['full_name'],
        staff_id=best_match['staff_id'],
        staff_name=best_match['staff_name'],
        shift_date=request.shift_date,
        start_time=request.start_time,
        end_time=request.end_time,
        duration_hours=request.duration_hours,
        service_type=request.service_type,
        notes=request.notes or ''
    )
    doc = shift.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.shifts.insert_one(doc)
    
    # Notify staff
    staff_user = await db.users.find_one({"email": staff['email']}, {"_id": 0})
    if staff_user:
        await create_notification(
            staff_user['id'],
            "New Shift Auto-Assigned",
            f"You have been assigned to {client['full_name']} on {request.shift_date} at {request.start_time}.",
            "shift",
            "/rostering",
            should_send_email=True
        )
    
    return {
        "message": "Shift created with auto-assigned staff",
        "shift": shift,
        "assigned_staff": best_match,
        "assignment_reasons": best_match['reasons']
    }

# ==================== END SCHEDULING AUTOMATION ====================

# ==================== CASE NOTES ====================

@api_router.post("/case-notes", response_model=CaseNote)
async def create_case_note(note_data: CaseNoteCreate, current_user: User = Depends(get_current_user)):
    """Create a new case note (shift note, incident report, or missed medication)"""
    client = await db.clients.find_one({"id": note_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get staff info
    staff = await db.staff.find_one({"email": current_user.email}, {"_id": 0})
    staff_name = staff['full_name'] if staff else current_user.full_name
    staff_id = staff['id'] if staff else current_user.id
    
    note_dict = note_data.model_dump()
    note_dict['client_name'] = client['full_name']
    note_dict['staff_id'] = staff_id
    note_dict['staff_name'] = staff_name
    note_dict['status'] = 'submitted'
    
    note = CaseNote(**note_dict)
    doc = note.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('updated_at'):
        doc['updated_at'] = doc['updated_at'].isoformat()
    await db.case_notes.insert_one(doc)
    
    # Notify coordinators for incidents
    if note_data.note_type == 'incident_report':
        coordinators = await db.users.find({"role": {"$in": ["admin", "coordinator"]}}, {"_id": 0}).to_list(50)
        for coord in coordinators:
            await create_notification(
                coord['id'],
                f"New Incident Report: {note_data.title}",
                f"Incident reported for {client['full_name']} by {staff_name}. Severity: {note_data.incident_severity or 'Not specified'}",
                "incident",
                "/case-notes",
                should_send_email=True
            )
    
    # Notify for missed medication
    if note_data.note_type == 'missed_medication':
        coordinators = await db.users.find({"role": {"$in": ["admin", "coordinator"]}}, {"_id": 0}).to_list(50)
        for coord in coordinators:
            await create_notification(
                coord['id'],
                f"Missed Medication Report",
                f"{note_data.medication_name} missed for {client['full_name']}. Reason: {note_data.reason_missed or 'Not specified'}",
                "medication",
                "/case-notes",
                should_send_email=True
            )
    
    return note

@api_router.get("/case-notes", response_model=List[CaseNote])
async def get_case_notes(
    note_type: Optional[str] = None,
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get case notes with optional filters"""
    query = {}
    
    # Support workers see only their notes, admins/coordinators see all
    if current_user.role == "support_worker":
        staff = await db.staff.find_one({"email": current_user.email}, {"_id": 0})
        if staff:
            query["staff_id"] = staff['id']
    
    if note_type:
        query["note_type"] = note_type
    if client_id:
        query["client_id"] = client_id
    if status:
        query["status"] = status
    
    notes = await db.case_notes.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for note in notes:
        if isinstance(note.get('created_at'), str):
            note['created_at'] = datetime.fromisoformat(note['created_at'])
        if note.get('updated_at') and isinstance(note['updated_at'], str):
            note['updated_at'] = datetime.fromisoformat(note['updated_at'])
    return notes

@api_router.get("/case-notes/{note_id}", response_model=CaseNote)
async def get_case_note(note_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific case note"""
    note = await db.case_notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Case note not found")
    
    if isinstance(note.get('created_at'), str):
        note['created_at'] = datetime.fromisoformat(note['created_at'])
    if note.get('updated_at') and isinstance(note['updated_at'], str):
        note['updated_at'] = datetime.fromisoformat(note['updated_at'])
    
    return CaseNote(**note)

@api_router.put("/case-notes/{note_id}")
async def update_case_note(note_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    """Update a case note"""
    note = await db.case_notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Case note not found")
    
    # Support workers can only update their own notes that are not yet reviewed
    if current_user.role == "support_worker":
        staff = await db.staff.find_one({"email": current_user.email}, {"_id": 0})
        if staff and note['staff_id'] != staff['id']:
            raise HTTPException(status_code=403, detail="Cannot update other's notes")
        if note['status'] in ['reviewed', 'closed']:
            raise HTTPException(status_code=403, detail="Cannot update reviewed/closed notes")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.case_notes.update_one({"id": note_id}, {"$set": update_data})
    
    return {"message": "Case note updated"}

@api_router.put("/case-notes/{note_id}/review")
async def review_case_note(note_id: str, current_user: User = Depends(get_current_user)):
    """Mark a case note as reviewed (admin/coordinator only)"""
    check_permission(current_user, ["admin", "coordinator"])
    
    note = await db.case_notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Case note not found")
    
    await db.case_notes.update_one({"id": note_id}, {"$set": {
        "status": "reviewed",
        "reviewed_by": current_user.full_name,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }})
    
    return {"message": "Case note marked as reviewed"}

@api_router.delete("/case-notes/{note_id}")
async def delete_case_note(note_id: str, current_user: User = Depends(get_current_user)):
    """Delete a case note (admin only)"""
    check_permission(current_user, ["admin"])
    
    result = await db.case_notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Case note not found")
    
    return {"message": "Case note deleted"}

@api_router.get("/case-notes/stats/summary")
async def get_case_notes_summary(current_user: User = Depends(get_current_user)):
    """Get summary statistics for case notes"""
    query = {}
    if current_user.role == "support_worker":
        staff = await db.staff.find_one({"email": current_user.email}, {"_id": 0})
        if staff:
            query["staff_id"] = staff['id']
    
    all_notes = await db.case_notes.find(query, {"_id": 0}).to_list(1000)
    
    shift_notes = [n for n in all_notes if n['note_type'] == 'shift_note']
    incidents = [n for n in all_notes if n['note_type'] == 'incident_report']
    missed_meds = [n for n in all_notes if n['note_type'] == 'missed_medication']
    pending_review = [n for n in all_notes if n['status'] == 'submitted']
    
    return {
        "total_notes": len(all_notes),
        "shift_notes": len(shift_notes),
        "incident_reports": len(incidents),
        "missed_medications": len(missed_meds),
        "pending_review": len(pending_review),
        "high_severity_incidents": len([i for i in incidents if i.get('incident_severity') in ['high', 'critical']])
    }

# ==================== END CASE NOTES ====================

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

# Staff Break Routes
@api_router.post("/staff/{staff_id}/break/start")
async def start_break(staff_id: str, break_type: str = "meal", current_user: User = Depends(get_current_user)):
    """Start a break for a staff member"""
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    today = datetime.now(timezone.utc).date().isoformat()
    now = datetime.now(timezone.utc)
    
    # Check if staff is clocked in
    attendance = await db.staff_attendance.find_one({
        "staff_id": staff_id,
        "attendance_date": today,
        "is_clocked_in": True
    }, {"_id": 0})
    
    if not attendance:
        raise HTTPException(status_code=400, detail="Staff must be clocked in to take a break")
    
    # Check if already on break
    active_break = await db.staff_breaks.find_one({
        "staff_id": staff_id,
        "break_date": today,
        "is_active": True
    }, {"_id": 0})
    
    if active_break:
        raise HTTPException(status_code=400, detail="Staff is already on a break")
    
    # Create break record
    staff_break = StaffBreak(
        staff_id=staff_id,
        staff_name=staff['full_name'],
        attendance_id=attendance['id'],
        break_date=today,
        start_time=now.strftime("%H:%M"),
        break_type=break_type,
        is_active=True
    )
    
    doc = staff_break.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.staff_breaks.insert_one(doc)
    
    return {"message": "Break started", "break_id": staff_break.id, "start_time": staff_break.start_time}

@api_router.post("/staff/{staff_id}/break/end")
async def end_break(staff_id: str, current_user: User = Depends(get_current_user)):
    """End the current break for a staff member"""
    today = datetime.now(timezone.utc).date().isoformat()
    now = datetime.now(timezone.utc)
    
    # Find active break
    active_break = await db.staff_breaks.find_one({
        "staff_id": staff_id,
        "break_date": today,
        "is_active": True
    }, {"_id": 0})
    
    if not active_break:
        raise HTTPException(status_code=400, detail="No active break found")
    
    end_time = now.strftime("%H:%M")
    
    # Calculate duration
    start = datetime.strptime(active_break['start_time'], "%H:%M")
    end = datetime.strptime(end_time, "%H:%M")
    duration_minutes = int((end - start).total_seconds() / 60)
    
    await db.staff_breaks.update_one(
        {"id": active_break['id']},
        {"$set": {
            "end_time": end_time,
            "duration_minutes": duration_minutes,
            "is_active": False
        }}
    )
    
    return {"message": "Break ended", "duration_minutes": duration_minutes}

@api_router.get("/staff/{staff_id}/breaks")
async def get_staff_breaks(staff_id: str, date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get breaks for a staff member"""
    query = {"staff_id": staff_id}
    if date:
        query["break_date"] = date
    
    breaks = await db.staff_breaks.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for b in breaks:
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
    
    return breaks

@api_router.get("/staff/{staff_id}/break-status")
async def get_break_status(staff_id: str, current_user: User = Depends(get_current_user)):
    """Check if staff is currently on break"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    active_break = await db.staff_breaks.find_one({
        "staff_id": staff_id,
        "break_date": today,
        "is_active": True
    }, {"_id": 0})
    
    if active_break:
        if isinstance(active_break.get('created_at'), str):
            active_break['created_at'] = datetime.fromisoformat(active_break['created_at'])
        return {"on_break": True, "break": StaffBreak(**active_break)}
    
    return {"on_break": False, "break": None}

# Staff Availability Routes
@api_router.post("/staff/availability")
async def set_staff_availability(availability: StaffAvailabilityCreate, current_user: User = Depends(get_current_user)):
    """Set availability for a staff member"""
    staff = await db.staff.find_one({"id": availability.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Check if availability already exists for this day
    existing = await db.staff_availability.find_one({
        "staff_id": availability.staff_id,
        "day_of_week": availability.day_of_week
    }, {"_id": 0})
    
    avail_data = availability.model_dump()
    avail_data['staff_name'] = staff['full_name']
    
    if existing:
        # Update existing
        await db.staff_availability.update_one(
            {"id": existing['id']},
            {"$set": avail_data}
        )
        return {"message": "Availability updated", "id": existing['id']}
    else:
        # Create new
        staff_avail = StaffAvailability(**avail_data)
        doc = staff_avail.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.staff_availability.insert_one(doc)
        return {"message": "Availability set", "id": staff_avail.id}

@api_router.get("/staff/{staff_id}/availability")
async def get_staff_availability(staff_id: str, current_user: User = Depends(get_current_user)):
    """Get availability for a staff member"""
    availability = await db.staff_availability.find(
        {"staff_id": staff_id},
        {"_id": 0}
    ).sort("day_of_week", 1).to_list(7)
    
    for a in availability:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
    
    return availability

@api_router.delete("/staff/availability/{availability_id}")
async def delete_staff_availability(availability_id: str, current_user: User = Depends(get_current_user)):
    """Delete an availability entry"""
    result = await db.staff_availability.delete_one({"id": availability_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Availability not found")
    return {"message": "Availability deleted"}

@api_router.get("/team/availability")
async def get_team_availability(date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get availability for all team members"""
    check_permission(current_user, ["admin", "coordinator"])
    
    # Get all staff
    staff_list = await db.staff.find({"status": "active"}, {"_id": 0}).to_list(1000)
    
    # If date provided, get day of week
    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        day_of_week = target_date.weekday()
    else:
        day_of_week = datetime.now().weekday()
    
    # Get availability for this day
    availability = await db.staff_availability.find(
        {"day_of_week": day_of_week},
        {"_id": 0}
    ).to_list(1000)
    
    avail_map = {a['staff_id']: a for a in availability}
    
    # Get today's attendance and breaks
    today = date or datetime.now(timezone.utc).date().isoformat()
    attendance_list = await db.staff_attendance.find(
        {"attendance_date": today},
        {"_id": 0}
    ).to_list(1000)
    attendance_map = {a['staff_id']: a for a in attendance_list}
    
    breaks_list = await db.staff_breaks.find(
        {"break_date": today},
        {"_id": 0}
    ).to_list(1000)
    
    # Group breaks by staff_id
    breaks_map = {}
    for b in breaks_list:
        if b['staff_id'] not in breaks_map:
            breaks_map[b['staff_id']] = []
        breaks_map[b['staff_id']].append(b)
    
    # Get shifts for the day
    shifts = await db.shifts.find(
        {"shift_date": today},
        {"_id": 0}
    ).to_list(1000)
    shifts_map = {}
    for s in shifts:
        if s['staff_id'] not in shifts_map:
            shifts_map[s['staff_id']] = []
        shifts_map[s['staff_id']].append(s)
    
    # Combine data
    result = []
    for staff in staff_list:
        staff_id = staff['id']
        avail = avail_map.get(staff_id, {})
        att = attendance_map.get(staff_id)
        staff_breaks = breaks_map.get(staff_id, [])
        staff_shifts = shifts_map.get(staff_id, [])
        
        # Check if currently on break
        on_break = any(b.get('is_active') for b in staff_breaks)
        
        result.append({
            "staff_id": staff_id,
            "staff_name": staff['full_name'],
            "position": staff.get('position', ''),
            "photo_url": staff.get('photo_url'),
            "availability": {
                "start_time": avail.get('start_time'),
                "end_time": avail.get('end_time'),
                "is_available": avail.get('is_available', True),
                "notes": avail.get('notes')
            } if avail else None,
            "attendance": {
                "is_clocked_in": att.get('is_clocked_in', False) if att else False,
                "clock_in_time": att.get('clock_in_time') if att else None,
                "clock_out_time": att.get('clock_out_time') if att else None
            },
            "on_break": on_break,
            "breaks_today": len(staff_breaks),
            "shifts_today": len(staff_shifts),
            "shifts": staff_shifts
        })
    
    return result

@api_router.get("/team/availability/week")
async def get_team_availability_week(start_date: str, current_user: User = Depends(get_current_user)):
    """Get team availability for a week starting from start_date"""
    check_permission(current_user, ["admin", "coordinator"])
    
    # Get all staff
    staff_list = await db.staff.find({"status": "active"}, {"_id": 0}).to_list(1000)
    
    # Get all availability records
    availability = await db.staff_availability.find({}, {"_id": 0}).to_list(1000)
    
    # Organize by staff_id and day
    avail_map = {}
    for a in availability:
        key = f"{a['staff_id']}_{a['day_of_week']}"
        avail_map[key] = a
    
    # Build week view
    start = datetime.strptime(start_date, "%Y-%m-%d")
    week_data = []
    
    for i in range(7):
        day = start + timedelta(days=i)
        day_of_week = day.weekday()
        day_str = day.strftime("%Y-%m-%d")
        
        day_data = {
            "date": day_str,
            "day_name": day.strftime("%A"),
            "day_of_week": day_of_week,
            "staff": []
        }
        
        for staff in staff_list:
            key = f"{staff['id']}_{day_of_week}"
            avail = avail_map.get(key)
            
            day_data["staff"].append({
                "staff_id": staff['id'],
                "staff_name": staff['full_name'],
                "is_available": avail.get('is_available', True) if avail else True,
                "start_time": avail.get('start_time') if avail else None,
                "end_time": avail.get('end_time') if avail else None,
                "notes": avail.get('notes') if avail else None
            })
        
        week_data.append(day_data)
    
    return week_data

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

# ============================================
# GOOGLE CALENDAR INTEGRATION
# ============================================

# Calendar config (set these in .env when you have credentials)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_CALENDAR_ENABLED = bool(GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)
CALENDAR_REDIRECT_URI = os.environ.get("CALENDAR_REDIRECT_URI", "")

class CalendarConnection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    google_email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expiry: Optional[datetime] = None
    connected: bool = False
    sync_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    google_event_id: Optional[str] = None
    shift_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    start_time: str
    end_time: str
    location: Optional[str] = None
    synced: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.get("/calendar/status")
async def get_calendar_status(current_user: User = Depends(get_current_user)):
    """Check if Google Calendar is connected for the user"""
    connection = await db.calendar_connections.find_one(
        {"user_id": current_user.id},
        {"_id": 0}
    )
    
    return {
        "integration_enabled": GOOGLE_CALENDAR_ENABLED,
        "connected": connection.get("connected", False) if connection else False,
        "google_email": connection.get("google_email") if connection else None,
        "sync_enabled": connection.get("sync_enabled", True) if connection else True,
        "mock_mode": not GOOGLE_CALENDAR_ENABLED
    }

@api_router.get("/calendar/auth-url")
async def get_calendar_auth_url(current_user: User = Depends(get_current_user)):
    """Get Google OAuth URL for calendar connection"""
    if not GOOGLE_CALENDAR_ENABLED:
        # Return mock auth URL for demo
        return {
            "authorization_url": f"/api/calendar/mock-connect?user_id={current_user.id}",
            "mock_mode": True,
            "message": "Demo mode - Click to simulate connection"
        }
    
    from google_auth_oauthlib.flow import Flow
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token"
            }
        },
        scopes=["https://www.googleapis.com/auth/calendar"],
        redirect_uri=CALENDAR_REDIRECT_URI
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        state=current_user.id
    )
    
    return {"authorization_url": authorization_url, "mock_mode": False}

@api_router.get("/calendar/mock-connect")
async def mock_calendar_connect(user_id: str):
    """Mock connection for demo mode"""
    from fastapi.responses import RedirectResponse
    
    connection = CalendarConnection(
        user_id=user_id,
        user_email="demo@procare.com",
        google_email="demo.user@gmail.com",
        connected=True
    )
    
    doc = connection.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.calendar_connections.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    
    frontend_url = os.environ.get("FRONTEND_URL", "")
    return RedirectResponse(url=f"{frontend_url}/settings?calendar=connected")

@api_router.get("/oauth/calendar/callback")
async def calendar_oauth_callback(code: str, state: str):
    """Handle Google OAuth callback"""
    from fastapi.responses import RedirectResponse
    
    if not GOOGLE_CALENDAR_ENABLED:
        raise HTTPException(status_code=400, detail="Calendar integration not configured")
    
    # Exchange code for tokens
    token_resp = requests.post('https://oauth2.googleapis.com/token', data={
        'code': code,
        'client_id': GOOGLE_CLIENT_ID,
        'client_secret': GOOGLE_CLIENT_SECRET,
        'redirect_uri': CALENDAR_REDIRECT_URI,
        'grant_type': 'authorization_code'
    }).json()
    
    if 'error' in token_resp:
        raise HTTPException(status_code=400, detail=token_resp.get('error_description', 'OAuth failed'))
    
    # Get user info
    user_info = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {token_resp["access_token"]}'}
    ).json()
    
    # Store connection
    user_id = state
    connection = CalendarConnection(
        user_id=user_id,
        user_email=user_info.get('email', ''),
        google_email=user_info.get('email'),
        access_token=token_resp.get('access_token'),
        refresh_token=token_resp.get('refresh_token'),
        connected=True
    )
    
    doc = connection.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.calendar_connections.update_one(
        {"user_id": user_id},
        {"$set": doc},
        upsert=True
    )
    
    frontend_url = os.environ.get("FRONTEND_URL", "")
    return RedirectResponse(url=f"{frontend_url}/settings?calendar=connected")

@api_router.delete("/calendar/disconnect")
async def disconnect_calendar(current_user: User = Depends(get_current_user)):
    """Disconnect Google Calendar"""
    await db.calendar_connections.delete_one({"user_id": current_user.id})
    return {"message": "Calendar disconnected"}

@api_router.get("/calendar/events")
async def get_calendar_events(current_user: User = Depends(get_current_user)):
    """Get synced calendar events"""
    events = await db.calendar_events.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("start_time", 1).to_list(100)
    
    for event in events:
        if isinstance(event.get('created_at'), str):
            event['created_at'] = datetime.fromisoformat(event['created_at'])
    
    return events

@api_router.post("/calendar/sync-shift/{shift_id}")
async def sync_shift_to_calendar(shift_id: str, current_user: User = Depends(get_current_user)):
    """Sync a shift to Google Calendar"""
    # Get shift
    shift = await db.shifts.find_one({"id": shift_id}, {"_id": 0})
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Check calendar connection
    connection = await db.calendar_connections.find_one({"user_id": current_user.id}, {"_id": 0})
    if not connection or not connection.get('connected'):
        raise HTTPException(status_code=400, detail="Calendar not connected")
    
    # Create calendar event
    event = CalendarEvent(
        user_id=current_user.id,
        shift_id=shift_id,
        title=f"Shift: {shift.get('client_name', 'Client')}",
        description=f"Support: {shift.get('service_type', '')}",
        start_time=f"{shift['shift_date']}T{shift['start_time']}:00",
        end_time=f"{shift['shift_date']}T{shift['end_time']}:00",
        location=shift.get('location', ''),
        synced=True
    )
    
    doc = event.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.calendar_events.insert_one(doc)
    
    # In real mode, would create Google Calendar event here
    # For now, just store locally
    
    return {"message": "Shift synced to calendar", "event_id": event.id}

# ============================================
# DOCUMENT SIGNING (SIGNWELL) INTEGRATION
# ============================================

# SignWell config
SIGNWELL_API_KEY = os.environ.get("SIGNWELL_API_KEY", "")
SIGNWELL_ENABLED = bool(SIGNWELL_API_KEY)
SIGNWELL_BASE_URL = "https://api.signwell.com/v1"

class DocumentTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    template_type: str  # service_agreement, consent_form, policy
    signwell_template_id: Optional[str] = None
    fields: List[dict] = []  # Fields to fill in the template
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SignatureRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    template_id: str
    template_name: str
    client_id: str
    client_name: str
    signwell_document_id: Optional[str] = None
    status: str = "draft"  # draft, sent, viewed, signed, completed, declined, expired
    signers: List[dict] = []  # [{email, name, role, signed, signed_at}]
    created_by: str
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    pdf_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SignatureRequestCreate(BaseModel):
    template_id: str
    client_id: str
    signers: List[dict]  # [{email, name, role}]
    send_immediately: bool = True

@api_router.get("/documents/status")
async def get_document_signing_status(current_user: User = Depends(get_current_user)):
    """Check document signing integration status"""
    return {
        "integration_enabled": SIGNWELL_ENABLED,
        "mock_mode": not SIGNWELL_ENABLED,
        "provider": "SignWell"
    }

@api_router.get("/documents/templates")
async def get_document_templates(current_user: User = Depends(get_current_user)):
    """Get available document templates"""
    templates = await db.document_templates.find({"active": True}, {"_id": 0}).to_list(100)
    
    # If no templates exist, create defaults
    if not templates:
        default_templates = [
            DocumentTemplate(
                name="NDIS Service Agreement",
                description="Standard service agreement for NDIS participants",
                template_type="service_agreement",
                fields=[
                    {"name": "participant_name", "type": "text", "required": True},
                    {"name": "service_type", "type": "text", "required": True},
                    {"name": "start_date", "type": "date", "required": True},
                    {"name": "hourly_rate", "type": "number", "required": True}
                ]
            ),
            DocumentTemplate(
                name="Consent Form",
                description="Participant consent for services and data sharing",
                template_type="consent_form",
                fields=[
                    {"name": "participant_name", "type": "text", "required": True},
                    {"name": "guardian_name", "type": "text", "required": False}
                ]
            ),
            DocumentTemplate(
                name="Incident Report Acknowledgment",
                description="Acknowledgment of incident report",
                template_type="policy",
                fields=[
                    {"name": "incident_date", "type": "date", "required": True},
                    {"name": "incident_description", "type": "text", "required": True}
                ]
            )
        ]
        
        for template in default_templates:
            doc = template.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.document_templates.insert_one(doc)
        
        templates = [t.model_dump() for t in default_templates]
    
    for t in templates:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    
    return templates

@api_router.post("/documents/signature-request")
async def create_signature_request(
    request_data: SignatureRequestCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new signature request"""
    check_permission(current_user, ["admin", "coordinator"])
    
    # Get template
    template = await db.document_templates.find_one({"id": request_data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get client
    client = await db.clients.find_one({"id": request_data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Prepare signers
    signers = []
    for signer in request_data.signers:
        signers.append({
            "email": signer["email"],
            "name": signer["name"],
            "role": signer.get("role", "signer"),
            "signed": False,
            "signed_at": None
        })
    
    # Create signature request
    sig_request = SignatureRequest(
        template_id=request_data.template_id,
        template_name=template["name"],
        client_id=request_data.client_id,
        client_name=f"{client.get('first_name', '')} {client.get('last_name', '')}",
        signers=signers,
        created_by=current_user.full_name,
        status="sent" if request_data.send_immediately else "draft"
    )
    
    if request_data.send_immediately:
        sig_request.sent_at = datetime.now(timezone.utc)
    
    # In real mode with SignWell, would create document via API
    if SIGNWELL_ENABLED:
        # Real SignWell integration would go here
        pass
    else:
        # Mock mode - generate fake document ID
        sig_request.signwell_document_id = f"mock_doc_{sig_request.id[:8]}"
    
    doc = sig_request.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('sent_at'):
        doc['sent_at'] = doc['sent_at'].isoformat()
    
    await db.signature_requests.insert_one(doc)
    
    # Send notification to signers
    for signer in signers:
        await create_notification(
            current_user.id,  # Notify creator for now
            f"Document sent for signing",
            f"{template['name']} sent to {signer['email']}",
            "document",
            None,
            should_send_email=False
        )
    
    return sig_request

@api_router.get("/documents/signature-requests")
async def get_signature_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all signature requests"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.signature_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for req in requests:
        if isinstance(req.get('created_at'), str):
            req['created_at'] = datetime.fromisoformat(req['created_at'])
        if req.get('sent_at') and isinstance(req['sent_at'], str):
            req['sent_at'] = datetime.fromisoformat(req['sent_at'])
        if req.get('completed_at') and isinstance(req['completed_at'], str):
            req['completed_at'] = datetime.fromisoformat(req['completed_at'])
    
    return requests

@api_router.get("/documents/signature-requests/{request_id}")
async def get_signature_request(request_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific signature request"""
    request = await db.signature_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Signature request not found")
    
    if isinstance(request.get('created_at'), str):
        request['created_at'] = datetime.fromisoformat(request['created_at'])
    
    return request

@api_router.post("/documents/signature-requests/{request_id}/resend")
async def resend_signature_request(request_id: str, current_user: User = Depends(get_current_user)):
    """Resend signature request to pending signers"""
    check_permission(current_user, ["admin", "coordinator"])
    
    request = await db.signature_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Signature request not found")
    
    if request["status"] in ["completed", "declined"]:
        raise HTTPException(status_code=400, detail="Cannot resend completed or declined requests")
    
    # In real mode, would resend via SignWell
    await db.signature_requests.update_one(
        {"id": request_id},
        {"$set": {"sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Signature request resent"}

@api_router.post("/documents/signature-requests/{request_id}/cancel")
async def cancel_signature_request(request_id: str, current_user: User = Depends(get_current_user)):
    """Cancel a signature request"""
    check_permission(current_user, ["admin", "coordinator"])
    
    request = await db.signature_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Signature request not found")
    
    if request["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed requests")
    
    await db.signature_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Signature request cancelled"}

@api_router.post("/documents/mock-sign/{request_id}")
async def mock_sign_document(request_id: str, signer_email: str, current_user: User = Depends(get_current_user)):
    """Mock signing for demo mode"""
    if SIGNWELL_ENABLED:
        raise HTTPException(status_code=400, detail="Use SignWell for real signing")
    
    request = await db.signature_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Signature request not found")
    
    # Update signer status
    signers = request.get("signers", [])
    all_signed = True
    for signer in signers:
        if signer["email"] == signer_email:
            signer["signed"] = True
            signer["signed_at"] = datetime.now(timezone.utc).isoformat()
        if not signer.get("signed"):
            all_signed = False
    
    update_data = {"signers": signers, "status": "signed"}
    if all_signed:
        update_data["status"] = "completed"
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.signature_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    return {"message": "Document signed", "all_complete": all_signed}

@api_router.post("/webhooks/signwell")
async def signwell_webhook(event: dict):
    """Handle SignWell webhook events"""
    if not SIGNWELL_ENABLED:
        return {"status": "mock_mode"}
    
    event_type = event.get("event_type")
    document_id = event.get("document_id")
    
    # Find request by SignWell document ID
    request = await db.signature_requests.find_one(
        {"signwell_document_id": document_id},
        {"_id": 0}
    )
    
    if not request:
        return {"status": "document_not_found"}
    
    # Map event types to statuses
    status_map = {
        "document_sent": "sent",
        "document_viewed": "viewed",
        "document_signed": "signed",
        "document_completed": "completed",
        "document_declined": "declined",
        "document_expired": "expired"
    }
    
    new_status = status_map.get(event_type)
    if new_status:
        update_data = {"status": new_status}
        if new_status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.signature_requests.update_one(
            {"signwell_document_id": document_id},
            {"$set": update_data}
        )
    
    return {"status": "processed"}

# ============================================
# HR MODULE - MODELS
# ============================================

# Onboarding Models
class OnboardingTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str  # documentation, training, equipment, access
    required: bool = True
    order: int = 0

class OnboardingChecklist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    start_date: str
    target_completion_date: str
    status: str = "in_progress"  # in_progress, completed, overdue
    tasks: List[dict] = []  # [{task_id, name, completed, completed_at, completed_by}]
    progress_percentage: int = 0
    assigned_by: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Performance Review Models
class PerformanceReview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    reviewer_id: str
    reviewer_name: str
    review_period_start: str
    review_period_end: str
    review_type: str  # annual, probation, quarterly, adhoc
    status: str = "scheduled"  # scheduled, in_progress, pending_acknowledgment, completed
    scheduled_date: str
    completed_date: Optional[str] = None
    overall_rating: Optional[int] = None  # 1-5
    ratings: List[dict] = []  # [{category, rating, comments}]
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    goals_for_next_period: Optional[str] = None
    employee_comments: Optional[str] = None
    employee_acknowledged: bool = False
    employee_acknowledged_at: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PerformanceReviewCreate(BaseModel):
    staff_id: str
    review_period_start: str
    review_period_end: str
    review_type: str
    scheduled_date: str

# Training & Certification Models
class TrainingCourse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str  # mandatory, compliance, professional_development, safety
    provider: Optional[str] = None
    duration_hours: Optional[float] = None
    validity_months: Optional[int] = None  # How long certification is valid
    is_mandatory: bool = False
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StaffTraining(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    course_id: str
    course_name: str
    status: str = "assigned"  # assigned, in_progress, completed, expired
    assigned_date: str
    due_date: Optional[str] = None
    completed_date: Optional[str] = None
    expiry_date: Optional[str] = None
    certificate_url: Optional[str] = None
    score: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Employee Documents Models
class EmployeeDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    document_type: str  # contract, policy, certification, identification, other
    name: str
    description: Optional[str] = None
    file_url: str
    file_name: str
    file_size: Optional[int] = None
    expiry_date: Optional[str] = None
    is_signed: bool = False
    signed_date: Optional[str] = None
    uploaded_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payroll Models
class PayrollRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    staff_id: str
    staff_name: str
    pay_period_start: str
    pay_period_end: str
    regular_hours: float = 0
    overtime_hours: float = 0
    break_hours: float = 0
    hourly_rate: float
    overtime_rate: float
    gross_pay: float
    deductions: float = 0
    net_pay: float
    status: str = "pending"  # pending, approved, paid
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    paid_at: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============================================
# HR MODULE - ONBOARDING ROUTES
# ============================================

@api_router.get("/hr/onboarding/tasks")
async def get_onboarding_tasks(current_user: User = Depends(get_current_user)):
    """Get default onboarding task templates"""
    tasks = await db.onboarding_tasks.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Create default tasks if none exist
    if not tasks:
        default_tasks = [
            OnboardingTask(name="Complete employment contract", description="Sign and return employment contract", category="documentation", order=1),
            OnboardingTask(name="Submit identification documents", description="Provide ID and right to work documents", category="documentation", order=2),
            OnboardingTask(name="Complete tax declaration", description="Submit tax file number declaration", category="documentation", order=3),
            OnboardingTask(name="NDIS Worker Screening Check", description="Complete and submit worker screening application", category="compliance", order=4),
            OnboardingTask(name="First Aid Certificate", description="Provide current first aid certificate", category="compliance", order=5),
            OnboardingTask(name="NDIS Orientation Module", description="Complete NDIS Worker Orientation Module", category="training", order=6),
            OnboardingTask(name="Manual Handling Training", description="Complete manual handling training", category="training", order=7),
            OnboardingTask(name="Medication Administration Training", description="Complete medication administration training", category="training", order=8),
            OnboardingTask(name="IT System Access Setup", description="Setup email, software access, and login credentials", category="access", order=9),
            OnboardingTask(name="Uniform and Equipment", description="Collect uniform and required equipment", category="equipment", order=10),
        ]
        
        for task in default_tasks:
            doc = task.model_dump()
            doc['created_at'] = datetime.now(timezone.utc).isoformat()
            doc['active'] = True
            await db.onboarding_tasks.insert_one(doc)
        
        tasks = [t.model_dump() for t in default_tasks]
    
    return tasks

@api_router.post("/hr/onboarding/checklist")
async def create_onboarding_checklist(staff_id: str, target_days: int = 30, current_user: User = Depends(get_current_user)):
    """Create an onboarding checklist for a new staff member"""
    check_permission(current_user, ["admin", "coordinator"])
    
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Check if checklist already exists
    existing = await db.onboarding_checklists.find_one({"staff_id": staff_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Onboarding checklist already exists for this staff member")
    
    # Get task templates
    task_templates = await db.onboarding_tasks.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(100)
    
    tasks = []
    for t in task_templates:
        tasks.append({
            "task_id": t['id'],
            "name": t['name'],
            "description": t.get('description', ''),
            "category": t.get('category', 'other'),
            "completed": False,
            "completed_at": None,
            "completed_by": None
        })
    
    today = datetime.now(timezone.utc).date()
    target_date = today + timedelta(days=target_days)
    
    checklist = OnboardingChecklist(
        staff_id=staff_id,
        staff_name=staff['full_name'],
        start_date=today.isoformat(),
        target_completion_date=target_date.isoformat(),
        tasks=tasks,
        assigned_by=current_user.full_name
    )
    
    doc = checklist.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.onboarding_checklists.insert_one(doc)
    
    return checklist

@api_router.get("/hr/onboarding/checklists")
async def get_onboarding_checklists(status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get all onboarding checklists"""
    query = {}
    if status:
        query["status"] = status
    
    checklists = await db.onboarding_checklists.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for c in checklists:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    
    return checklists

@api_router.get("/hr/onboarding/checklist/{staff_id}")
async def get_staff_onboarding_checklist(staff_id: str, current_user: User = Depends(get_current_user)):
    """Get onboarding checklist for a specific staff member"""
    checklist = await db.onboarding_checklists.find_one({"staff_id": staff_id}, {"_id": 0})
    if not checklist:
        raise HTTPException(status_code=404, detail="Onboarding checklist not found")
    
    if isinstance(checklist.get('created_at'), str):
        checklist['created_at'] = datetime.fromisoformat(checklist['created_at'])
    
    return checklist

@api_router.put("/hr/onboarding/checklist/{checklist_id}/task/{task_id}")
async def complete_onboarding_task(checklist_id: str, task_id: str, completed: bool = True, current_user: User = Depends(get_current_user)):
    """Mark an onboarding task as complete/incomplete"""
    checklist = await db.onboarding_checklists.find_one({"id": checklist_id}, {"_id": 0})
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")
    
    tasks = checklist.get("tasks", [])
    task_found = False
    completed_count = 0
    
    for task in tasks:
        if task["task_id"] == task_id:
            task["completed"] = completed
            task["completed_at"] = datetime.now(timezone.utc).isoformat() if completed else None
            task["completed_by"] = current_user.full_name if completed else None
            task_found = True
        if task.get("completed"):
            completed_count += 1
    
    if not task_found:
        raise HTTPException(status_code=404, detail="Task not found")
    
    progress = int((completed_count / len(tasks)) * 100) if tasks else 0
    status = "completed" if progress == 100 else "in_progress"
    
    await db.onboarding_checklists.update_one(
        {"id": checklist_id},
        {"$set": {"tasks": tasks, "progress_percentage": progress, "status": status}}
    )
    
    return {"message": "Task updated", "progress": progress, "status": status}

# ============================================
# HR MODULE - PERFORMANCE REVIEWS ROUTES
# ============================================

@api_router.post("/hr/reviews")
async def create_performance_review(review_data: PerformanceReviewCreate, current_user: User = Depends(get_current_user)):
    """Create a new performance review"""
    check_permission(current_user, ["admin", "coordinator"])
    
    staff = await db.staff.find_one({"id": review_data.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Default rating categories
    rating_categories = [
        {"category": "Job Knowledge", "rating": None, "comments": ""},
        {"category": "Quality of Work", "rating": None, "comments": ""},
        {"category": "Communication", "rating": None, "comments": ""},
        {"category": "Teamwork", "rating": None, "comments": ""},
        {"category": "Reliability", "rating": None, "comments": ""},
        {"category": "Initiative", "rating": None, "comments": ""},
        {"category": "Client Care", "rating": None, "comments": ""},
    ]
    
    review = PerformanceReview(
        staff_id=review_data.staff_id,
        staff_name=staff['full_name'],
        reviewer_id=current_user.id,
        reviewer_name=current_user.full_name,
        review_period_start=review_data.review_period_start,
        review_period_end=review_data.review_period_end,
        review_type=review_data.review_type,
        scheduled_date=review_data.scheduled_date,
        ratings=rating_categories
    )
    
    doc = review.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.performance_reviews.insert_one(doc)
    
    return review

@api_router.get("/hr/reviews")
async def get_performance_reviews(staff_id: Optional[str] = None, status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get performance reviews"""
    query = {}
    if staff_id:
        query["staff_id"] = staff_id
    if status:
        query["status"] = status
    
    reviews = await db.performance_reviews.find(query, {"_id": 0}).sort("scheduled_date", -1).to_list(100)
    
    for r in reviews:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    
    return reviews

@api_router.get("/hr/reviews/{review_id}")
async def get_performance_review(review_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific performance review"""
    review = await db.performance_reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if isinstance(review.get('created_at'), str):
        review['created_at'] = datetime.fromisoformat(review['created_at'])
    
    return review

@api_router.put("/hr/reviews/{review_id}")
async def update_performance_review(review_id: str, update_data: dict, current_user: User = Depends(get_current_user)):
    """Update a performance review"""
    check_permission(current_user, ["admin", "coordinator"])
    
    review = await db.performance_reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Calculate overall rating if ratings provided
    if "ratings" in update_data:
        ratings_with_values = [r["rating"] for r in update_data["ratings"] if r.get("rating")]
        if ratings_with_values:
            update_data["overall_rating"] = round(sum(ratings_with_values) / len(ratings_with_values), 1)
    
    # Check if completing the review
    if update_data.get("status") == "completed" or update_data.get("status") == "pending_acknowledgment":
        update_data["completed_date"] = datetime.now(timezone.utc).date().isoformat()
    
    await db.performance_reviews.update_one(
        {"id": review_id},
        {"$set": update_data}
    )
    
    return {"message": "Review updated"}

@api_router.put("/hr/reviews/{review_id}/acknowledge")
async def acknowledge_review(review_id: str, comments: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Employee acknowledges their performance review"""
    review = await db.performance_reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    update_data = {
        "employee_acknowledged": True,
        "employee_acknowledged_at": datetime.now(timezone.utc).isoformat(),
        "status": "completed"
    }
    
    if comments:
        update_data["employee_comments"] = comments
    
    await db.performance_reviews.update_one(
        {"id": review_id},
        {"$set": update_data}
    )
    
    return {"message": "Review acknowledged"}

# ============================================
# HR MODULE - TRAINING & CERTIFICATIONS ROUTES
# ============================================

@api_router.get("/hr/training/courses")
async def get_training_courses(category: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get available training courses"""
    query = {"active": True}
    if category:
        query["category"] = category
    
    courses = await db.training_courses.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Create default courses if none exist
    if not courses:
        default_courses = [
            TrainingCourse(name="NDIS Worker Orientation Module", description="Mandatory NDIS worker orientation", category="mandatory", provider="NDIS Commission", duration_hours=1.5, validity_months=None, is_mandatory=True),
            TrainingCourse(name="First Aid & CPR", description="First aid and CPR certification", category="compliance", provider="Various", duration_hours=8, validity_months=36, is_mandatory=True),
            TrainingCourse(name="Manual Handling", description="Safe manual handling techniques", category="safety", provider="Internal", duration_hours=4, validity_months=24, is_mandatory=True),
            TrainingCourse(name="Medication Administration", description="Safe medication administration", category="compliance", provider="Internal", duration_hours=6, validity_months=24, is_mandatory=True),
            TrainingCourse(name="Infection Control", description="Infection prevention and control", category="safety", provider="Internal", duration_hours=2, validity_months=12, is_mandatory=True),
            TrainingCourse(name="Positive Behaviour Support", description="PBS fundamentals", category="professional_development", provider="External", duration_hours=8, validity_months=None, is_mandatory=False),
            TrainingCourse(name="Mental Health First Aid", description="Mental health awareness and support", category="professional_development", provider="Mental Health First Aid Australia", duration_hours=12, validity_months=36, is_mandatory=False),
        ]
        
        for course in default_courses:
            doc = course.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.training_courses.insert_one(doc)
        
        courses = [c.model_dump() for c in default_courses]
    
    for c in courses:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    
    return courses

@api_router.post("/hr/training/courses")
async def create_training_course(course_data: dict, current_user: User = Depends(get_current_user)):
    """Create a new training course"""
    check_permission(current_user, ["admin", "coordinator"])
    
    course = TrainingCourse(**course_data)
    doc = course.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.training_courses.insert_one(doc)
    
    return course

@api_router.post("/hr/training/assign")
async def assign_training(staff_id: str, course_id: str, due_date: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Assign a training course to a staff member"""
    check_permission(current_user, ["admin", "coordinator"])
    
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    course = await db.training_courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if already assigned
    existing = await db.staff_training.find_one({
        "staff_id": staff_id,
        "course_id": course_id,
        "status": {"$in": ["assigned", "in_progress"]}
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Training already assigned")
    
    training = StaffTraining(
        staff_id=staff_id,
        staff_name=staff['full_name'],
        course_id=course_id,
        course_name=course['name'],
        assigned_date=datetime.now(timezone.utc).date().isoformat(),
        due_date=due_date
    )
    
    doc = training.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.staff_training.insert_one(doc)
    
    return training

@api_router.get("/hr/training/staff/{staff_id}")
async def get_staff_training(staff_id: str, current_user: User = Depends(get_current_user)):
    """Get training records for a staff member"""
    training = await db.staff_training.find({"staff_id": staff_id}, {"_id": 0}).sort("assigned_date", -1).to_list(100)
    
    for t in training:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    
    return training

@api_router.put("/hr/training/{training_id}/complete")
async def complete_training(training_id: str, score: Optional[float] = None, certificate_url: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Mark training as complete"""
    training = await db.staff_training.find_one({"id": training_id}, {"_id": 0})
    if not training:
        raise HTTPException(status_code=404, detail="Training record not found")
    
    course = await db.training_courses.find_one({"id": training['course_id']}, {"_id": 0})
    
    completed_date = datetime.now(timezone.utc).date()
    expiry_date = None
    
    if course and course.get('validity_months'):
        expiry_date = (completed_date + timedelta(days=course['validity_months'] * 30)).isoformat()
    
    update_data = {
        "status": "completed",
        "completed_date": completed_date.isoformat(),
        "expiry_date": expiry_date
    }
    
    if score is not None:
        update_data["score"] = score
    if certificate_url:
        update_data["certificate_url"] = certificate_url
    
    await db.staff_training.update_one(
        {"id": training_id},
        {"$set": update_data}
    )
    
    return {"message": "Training completed", "expiry_date": expiry_date}

@api_router.get("/hr/training/expiring")
async def get_expiring_certifications(days: int = 30, current_user: User = Depends(get_current_user)):
    """Get certifications expiring within specified days"""
    check_permission(current_user, ["admin", "coordinator"])
    
    cutoff_date = (datetime.now(timezone.utc).date() + timedelta(days=days)).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    
    expiring = await db.staff_training.find({
        "status": "completed",
        "expiry_date": {"$ne": None, "$lte": cutoff_date, "$gte": today}
    }, {"_id": 0}).to_list(100)
    
    for t in expiring:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    
    return expiring

# ============================================
# HR MODULE - EMPLOYEE DOCUMENTS ROUTES
# ============================================

@api_router.post("/hr/documents")
async def upload_employee_document(
    staff_id: str,
    document_type: str,
    name: str,
    file_url: str,
    file_name: str,
    description: Optional[str] = None,
    expiry_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Upload/add an employee document"""
    staff = await db.staff.find_one({"id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    document = EmployeeDocument(
        staff_id=staff_id,
        staff_name=staff['full_name'],
        document_type=document_type,
        name=name,
        description=description,
        file_url=file_url,
        file_name=file_name,
        expiry_date=expiry_date,
        uploaded_by=current_user.full_name
    )
    
    doc = document.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.employee_documents.insert_one(doc)
    
    return document

@api_router.get("/hr/documents/staff/{staff_id}")
async def get_staff_documents(staff_id: str, document_type: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get documents for a staff member"""
    query = {"staff_id": staff_id}
    if document_type:
        query["document_type"] = document_type
    
    documents = await db.employee_documents.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for d in documents:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    
    return documents

@api_router.delete("/hr/documents/{document_id}")
async def delete_employee_document(document_id: str, current_user: User = Depends(get_current_user)):
    """Delete an employee document"""
    check_permission(current_user, ["admin", "coordinator"])
    
    result = await db.employee_documents.delete_one({"id": document_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted"}

# ============================================
# HR MODULE - PAYROLL ROUTES
# ============================================

@api_router.post("/hr/payroll/generate")
async def generate_payroll(pay_period_start: str, pay_period_end: str, current_user: User = Depends(get_current_user)):
    """Generate payroll records for all active staff"""
    check_permission(current_user, ["admin"])
    
    staff_list = await db.staff.find({"status": "active"}, {"_id": 0}).to_list(1000)
    
    payroll_records = []
    
    for staff in staff_list:
        # Get attendance records for the period
        attendance = await db.staff_attendance.find({
            "staff_id": staff['id'],
            "attendance_date": {"$gte": pay_period_start, "$lte": pay_period_end}
        }, {"_id": 0}).to_list(100)
        
        # Calculate hours
        regular_hours = 0
        for a in attendance:
            if a.get('total_hours'):
                regular_hours += a['total_hours']
        
        # Get breaks for the period
        breaks = await db.staff_breaks.find({
            "staff_id": staff['id'],
            "break_date": {"$gte": pay_period_start, "$lte": pay_period_end}
        }, {"_id": 0}).to_list(1000)
        
        break_hours = sum(b.get('duration_minutes', 0) for b in breaks) / 60
        
        hourly_rate = staff.get('hourly_rate', 30)
        overtime_rate = hourly_rate * 1.5
        overtime_hours = max(0, regular_hours - 38)  # Overtime after 38 hours
        regular_hours = min(regular_hours, 38)
        
        gross_pay = (regular_hours * hourly_rate) + (overtime_hours * overtime_rate)
        net_pay = gross_pay  # Simplified - no deductions calculated
        
        payroll = PayrollRecord(
            staff_id=staff['id'],
            staff_name=staff['full_name'],
            pay_period_start=pay_period_start,
            pay_period_end=pay_period_end,
            regular_hours=round(regular_hours, 2),
            overtime_hours=round(overtime_hours, 2),
            break_hours=round(break_hours, 2),
            hourly_rate=hourly_rate,
            overtime_rate=overtime_rate,
            gross_pay=round(gross_pay, 2),
            net_pay=round(net_pay, 2)
        )
        
        doc = payroll.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.payroll_records.insert_one(doc)
        payroll_records.append(payroll)
    
    return {"message": f"Generated {len(payroll_records)} payroll records", "records": payroll_records}

@api_router.get("/hr/payroll")
async def get_payroll_records(pay_period_start: Optional[str] = None, staff_id: Optional[str] = None, status: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get payroll records"""
    check_permission(current_user, ["admin", "coordinator"])
    
    query = {}
    if pay_period_start:
        query["pay_period_start"] = pay_period_start
    if staff_id:
        query["staff_id"] = staff_id
    if status:
        query["status"] = status
    
    records = await db.payroll_records.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for r in records:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    
    return records

@api_router.put("/hr/payroll/{record_id}/approve")
async def approve_payroll(record_id: str, current_user: User = Depends(get_current_user)):
    """Approve a payroll record"""
    check_permission(current_user, ["admin"])
    
    await db.payroll_records.update_one(
        {"id": record_id},
        {"$set": {
            "status": "approved",
            "approved_by": current_user.full_name,
            "approved_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Payroll approved"}

@api_router.put("/hr/payroll/{record_id}/pay")
async def mark_payroll_paid(record_id: str, current_user: User = Depends(get_current_user)):
    """Mark payroll as paid"""
    check_permission(current_user, ["admin"])
    
    await db.payroll_records.update_one(
        {"id": record_id},
        {"$set": {
            "status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Payroll marked as paid"}

# ============================================
# HR MODULE - EMPLOYEE DIRECTORY ROUTES
# ============================================

@api_router.get("/hr/directory")
async def get_employee_directory(department: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get employee directory with contact info"""
    query = {"status": "active"}
    if department:
        query["department"] = department
    
    staff = await db.staff.find(query, {"_id": 0}).sort("full_name", 1).to_list(1000)
    
    directory = []
    for s in staff:
        directory.append({
            "id": s['id'],
            "full_name": s['full_name'],
            "email": s.get('email', ''),
            "phone": s.get('phone', ''),
            "position": s.get('position', ''),
            "department": s.get('department', 'General'),
            "photo_url": s.get('photo_url'),
            "start_date": s.get('start_date'),
            "reports_to": s.get('reports_to'),
        })
    
    return directory

@api_router.get("/hr/org-chart")
async def get_org_chart(current_user: User = Depends(get_current_user)):
    """Get organizational chart data"""
    staff = await db.staff.find({"status": "active"}, {"_id": 0}).to_list(1000)
    
    # Build org chart structure
    org_chart = {
        "id": "org",
        "name": "ProCare Hub",
        "position": "Organization",
        "children": []
    }
    
    # Group by department/position
    admins = [s for s in staff if s.get('position', '').lower() in ['admin', 'administrator', 'manager']]
    coordinators = [s for s in staff if s.get('position', '').lower() in ['coordinator', 'service coordinator', 'team leader']]
    support_workers = [s for s in staff if s.get('position', '').lower() in ['support worker', 'support staff', 'carer']]
    
    if admins:
        admin_node = {"id": "admins", "name": "Administration", "position": "Management", "children": []}
        for a in admins:
            admin_node["children"].append({
                "id": a['id'],
                "name": a['full_name'],
                "position": a.get('position', ''),
                "photo_url": a.get('photo_url'),
                "children": []
            })
        org_chart["children"].append(admin_node)
    
    if coordinators:
        coord_node = {"id": "coordinators", "name": "Service Coordination", "position": "Coordination", "children": []}
        for c in coordinators:
            coord_node["children"].append({
                "id": c['id'],
                "name": c['full_name'],
                "position": c.get('position', ''),
                "photo_url": c.get('photo_url'),
                "children": []
            })
        org_chart["children"].append(coord_node)
    
    if support_workers:
        sw_node = {"id": "support", "name": "Support Team", "position": "Service Delivery", "children": []}
        for sw in support_workers:
            sw_node["children"].append({
                "id": sw['id'],
                "name": sw['full_name'],
                "position": sw.get('position', ''),
                "photo_url": sw.get('photo_url'),
                "children": []
            })
        org_chart["children"].append(sw_node)
    
    return org_chart

@api_router.get("/hr/stats")
async def get_hr_stats(current_user: User = Depends(get_current_user)):
    """Get HR dashboard statistics"""
    check_permission(current_user, ["admin", "coordinator"])
    
    # Staff counts
    total_staff = await db.staff.count_documents({"status": "active"})
    
    # Onboarding
    onboarding_in_progress = await db.onboarding_checklists.count_documents({"status": "in_progress"})
    
    # Reviews
    pending_reviews = await db.performance_reviews.count_documents({"status": {"$in": ["scheduled", "in_progress"]}})
    
    # Expiring certifications (next 30 days)
    cutoff_date = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
    today = datetime.now(timezone.utc).date().isoformat()
    expiring_certs = await db.staff_training.count_documents({
        "status": "completed",
        "expiry_date": {"$ne": None, "$lte": cutoff_date, "$gte": today}
    })
    
    # Pending payroll
    pending_payroll = await db.payroll_records.count_documents({"status": "pending"})
    
    return {
        "total_staff": total_staff,
        "onboarding_in_progress": onboarding_in_progress,
        "pending_reviews": pending_reviews,
        "expiring_certifications": expiring_certs,
        "pending_payroll": pending_payroll
    }

# ==================================
# Xero Accounting Integration
# ==================================

@api_router.get("/xero/auth-url")
async def get_xero_auth_url(redirect_uri: str = Query(...)):
    """Get Xero OAuth URL for connecting accounting"""
    if not XERO_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Xero integration not configured")
    
    state = str(uuid.uuid4())
    
    await db.xero_states.insert_one({
        "state": state,
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    scopes = "openid profile email accounting.transactions accounting.contacts accounting.settings offline_access"
    auth_url = (
        f"https://login.xero.com/identity/connect/authorize?"
        f"response_type=code&"
        f"client_id={XERO_CLIENT_ID}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scopes}&"
        f"state={state}"
    )
    
    return {"auth_url": auth_url, "state": state}

@api_router.get("/xero/status")
async def get_xero_status():
    """Check Xero connection status"""
    connection = await db.xero_connections.find_one({"type": "xero"}, {"_id": 0})
    if not connection:
        return {"connected": False}
    
    return {
        "connected": True,
        "tenants": connection.get("tenants", []),
        "connected_at": connection.get("connected_at")
    }

@api_router.post("/xero/disconnect")
async def disconnect_xero():
    """Disconnect Xero integration"""
    await db.xero_connections.delete_one({"type": "xero"})
    return {"message": "Xero disconnected successfully"}

# ============== Company Settings ==============

@api_router.get("/company-settings")
async def get_company_settings():
    """Get company settings"""
    settings = await db.company_settings.find_one({"type": "company"}, {"_id": 0})
    if not settings:
        # Return empty settings with defaults
        return {
            "id": None,
            "company_name": None,
            "tagline": None,
            "abn": None,
            "email": None,
            "phone": None,
            "address": None,
            "website": None,
            "logo_url": None,
            "bank_name": None,
            "bank_account_name": None,
            "bank_bsb": None,
            "bank_account_number": None
        }
    return settings

@api_router.put("/company-settings")
async def update_company_settings(settings: CompanySettingsUpdate):
    """Update company settings"""
    existing = await db.company_settings.find_one({"type": "company"})
    
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.company_settings.update_one(
            {"type": "company"},
            {"$set": update_data}
        )
    else:
        update_data["id"] = str(uuid.uuid4())
        update_data["type"] = "company"
        await db.company_settings.insert_one(update_data)
    
    return await db.company_settings.find_one({"type": "company"}, {"_id": 0})

@api_router.post("/company-settings/logo")
async def upload_company_logo(file: UploadFile = File(...)):
    """Upload company logo"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    path = f"{APP_NAME}/company/logo.{ext}"
    
    result = put_object(path, content, file.content_type)
    logo_url = result.get("url", result.get("public_url", ""))
    
    # Update company settings with logo URL
    existing = await db.company_settings.find_one({"type": "company"})
    if existing:
        await db.company_settings.update_one(
            {"type": "company"},
            {"$set": {"logo_url": logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.company_settings.insert_one({
            "id": str(uuid.uuid4()),
            "type": "company",
            "logo_url": logo_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"logo_url": logo_url}

# ============== Demo Requests ==============

class DemoRequest(BaseModel):
    name: str
    email: EmailStr
    company: str
    phone: Optional[str] = None
    message: Optional[str] = None

@api_router.post("/demo-requests")
async def submit_demo_request(request: DemoRequest):
    """Submit a demo request - stores in DB and sends email notification"""
    
    # Create demo request record
    demo_record = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "email": request.email,
        "company": request.company,
        "phone": request.phone,
        "message": request.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Store in database
    await db.demo_requests.insert_one(demo_record)
    
    # Send email notification to admin
    try:
        admin_email_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">New Demo Request</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-top: 0;">Someone wants a demo!</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Name:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-weight: 600;">{request.name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Email:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{request.email}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Organisation:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{request.company}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Phone:</td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b;">{request.phone or 'Not provided'}</td>
                    </tr>
                </table>
                {f'<div style="margin-top: 20px; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #10b981;"><p style="color: #64748b; margin: 0 0 5px 0; font-size: 12px;">MESSAGE:</p><p style="color: #1e293b; margin: 0;">{request.message}</p></div>' if request.message else ''}
                <div style="margin-top: 30px; text-align: center;">
                    <a href="mailto:{request.email}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Reply to {request.name}</a>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                ProCare Hub - NDIS Provider Platform
            </div>
        </div>
        """
        
        # Send to admin (using configured sender email or fallback)
        await send_email(
            recipient=SENDER_EMAIL,  # Send to the configured sender/admin email
            subject=f"New Demo Request from {request.name} at {request.company}",
            html_content=admin_email_html
        )
        
        # Send confirmation to the requester
        confirmation_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Thanks for your interest!</h1>
            </div>
            <div style="padding: 30px; background: #f8fafc;">
                <h2 style="color: #1e293b; margin-top: 0;">Hi {request.name},</h2>
                <p style="color: #475569; line-height: 1.6;">
                    Thank you for requesting a demo of ProCare Hub. We've received your request and our team will contact you within 24 hours to schedule a personalized demonstration.
                </p>
                <p style="color: #475569; line-height: 1.6;">
                    In the meantime, feel free to explore our features or reach out if you have any questions.
                </p>
                <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; text-align: center;">
                    <p style="color: #64748b; margin: 0 0 10px 0;">Your request details:</p>
                    <p style="color: #1e293b; margin: 0;"><strong>{request.company}</strong></p>
                    <p style="color: #64748b; margin: 5px 0 0 0;">{request.email}</p>
                </div>
            </div>
            <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                ProCare Hub - The Complete Platform for NDIS Providers
            </div>
        </div>
        """
        
        await send_email(
            recipient=request.email,
            subject="Thanks for requesting a ProCare Hub demo!",
            html_content=confirmation_html
        )
        
    except Exception as e:
        logger.error(f"Failed to send demo request emails: {e}")
        # Don't fail the request if email fails - the data is still stored
    
    return {"message": "Demo request submitted successfully", "id": demo_record["id"]}

@api_router.get("/demo-requests")
async def get_demo_requests(current_user: dict = Depends(get_current_user)):
    """Get all demo requests (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    requests = await db.demo_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return requests

@api_router.put("/demo-requests/{request_id}/status")
async def update_demo_request_status(request_id: str, status: str, current_user: dict = Depends(get_current_user)):
    """Update demo request status (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.demo_requests.update_one(
        {"id": request_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Demo request not found")
    
    return {"message": "Status updated"}

# ============== Self-Service Demo Account ==============

DEMO_EMAIL = "demo@procarehub.com.au"
DEMO_PASSWORD = "DemoAccess2024!"

async def create_demo_data():
    """Create or refresh demo account with comprehensive sample data for all modules"""
    
    # Check if demo user exists
    demo_user = await db.users.find_one({"email": DEMO_EMAIL}, {"_id": 0})
    
    if not demo_user:
        demo_user = {
            "id": str(uuid.uuid4()),
            "email": DEMO_EMAIL,
            "password_hash": pwd_context.hash(DEMO_PASSWORD),
            "full_name": "Demo User",
            "role": "admin",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(demo_user)
        demo_user_id = demo_user["id"]
    else:
        demo_user_id = demo_user["id"]
    
    # Check if demo data already exists
    existing_clients = await db.clients.count_documents({"is_demo": True})
    if existing_clients > 0:
        return demo_user_id
    
    today = datetime.now(timezone.utc).date()
    
    # ==================== CLIENTS (PARTICIPANTS) ====================
    sample_clients = [
        {
            "id": str(uuid.uuid4()),
            "full_name": "Emma Thompson",
            "ndis_number": "430123456",
            "email": "emma.t@email.com",
            "phone": "0412 345 678",
            "date_of_birth": "1985-03-15",
            "address": "42 Sunrise Avenue, Melbourne VIC 3000",
            "primary_disability": "Intellectual Disability",
            "plan_start_date": "2024-01-01",
            "plan_end_date": "2025-01-01",
            "funding_total": 85000,
            "funding_used": 42500,
            "plan_manager": "Plan Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "John Thompson (Brother) - 0423 456 789",
            "notes": "Emma enjoys art therapy and social activities. Prefers morning appointments.",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Michael Chen",
            "ndis_number": "430234567",
            "email": "m.chen@email.com",
            "phone": "0423 456 789",
            "date_of_birth": "1992-07-22",
            "address": "18 Harbour Street, Sydney NSW 2000",
            "primary_disability": "Autism Spectrum Disorder",
            "plan_start_date": "2024-03-01",
            "plan_end_date": "2025-03-01",
            "funding_total": 120000,
            "funding_used": 35000,
            "plan_manager": "Self Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "Lisa Chen (Mother) - 0434 567 890",
            "notes": "Michael requires consistent routines. Interested in employment support. Responds well to visual schedules.",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Sarah Williams",
            "ndis_number": "430345678",
            "email": "sarah.w@email.com",
            "phone": "0434 567 890",
            "date_of_birth": "1978-11-08",
            "address": "7 Garden Grove, Brisbane QLD 4000",
            "primary_disability": "Physical Disability - Spinal Cord Injury",
            "plan_start_date": "2024-02-15",
            "plan_end_date": "2025-02-15",
            "funding_total": 150000,
            "funding_used": 72000,
            "plan_manager": "NDIA Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "David Williams (Husband) - 0445 678 901",
            "notes": "Sarah uses a powered wheelchair. Home modifications completed. Very active in community advocacy.",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "James O'Connor",
            "ndis_number": "430456789",
            "email": "james.oc@email.com",
            "phone": "0445 678 901",
            "date_of_birth": "2001-05-30",
            "address": "SIL House - 23 River Road, Perth WA 6000",
            "primary_disability": "Psychosocial Disability",
            "plan_start_date": "2024-04-01",
            "plan_end_date": "2025-04-01",
            "funding_total": 95000,
            "funding_used": 28000,
            "plan_manager": "Plan Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "Mary O'Connor (Mother) - 0456 789 012",
            "notes": "James lives in SIL accommodation. Working towards independent living goals. Attends TAFE part-time.",
            "status": "active",
            "sil_resident": True,
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Olivia Martinez",
            "ndis_number": "430567890",
            "email": "olivia.m@email.com",
            "phone": "0456 789 012",
            "date_of_birth": "1995-09-12",
            "address": "55 Beach Boulevard, Gold Coast QLD 4217",
            "primary_disability": "Vision Impairment - Legally Blind",
            "plan_start_date": "2024-01-15",
            "plan_end_date": "2025-01-15",
            "funding_total": 65000,
            "funding_used": 32000,
            "plan_manager": "Self Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "Carlos Martinez (Father) - 0467 890 123",
            "notes": "Olivia is completing university studies. Requires assistive technology support. Guide dog user.",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "William Brown",
            "ndis_number": "430678901",
            "email": "will.b@email.com",
            "phone": "0467 890 123",
            "date_of_birth": "1988-12-03",
            "address": "SIL House - 23 River Road, Perth WA 6000",
            "primary_disability": "Acquired Brain Injury",
            "plan_start_date": "2024-05-01",
            "plan_end_date": "2025-05-01",
            "funding_total": 180000,
            "funding_used": 55000,
            "plan_manager": "NDIA Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "Susan Brown (Wife) - 0478 901 234",
            "notes": "William requires 24/7 support. SIL resident. Making good progress with rehabilitation goals.",
            "status": "active",
            "sil_resident": True,
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Sophie Anderson",
            "ndis_number": "430789012",
            "email": "sophie.a@email.com",
            "phone": "0478 901 234",
            "date_of_birth": "2005-06-18",
            "address": "12 Park Lane, Adelaide SA 5000",
            "primary_disability": "Down Syndrome",
            "plan_start_date": "2024-02-01",
            "plan_end_date": "2025-02-01",
            "funding_total": 75000,
            "funding_used": 38000,
            "plan_manager": "Plan Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "Karen Anderson (Mother) - 0489 012 345",
            "notes": "Sophie recently finished school. Participating in school leaver employment support program.",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Thomas Wilson",
            "ndis_number": "430890123",
            "email": "tom.w@email.com",
            "phone": "0489 012 345",
            "date_of_birth": "1970-04-25",
            "address": "88 Mountain View, Hobart TAS 7000",
            "primary_disability": "Multiple Sclerosis",
            "plan_start_date": "2024-03-15",
            "plan_end_date": "2025-03-15",
            "funding_total": 110000,
            "funding_used": 45000,
            "plan_manager": "Plan Managed",
            "support_coordinator": "Rachel Green",
            "emergency_contact": "Margaret Wilson (Sister) - 0490 123 456",
            "notes": "Tom's condition is progressive. Currently mobile with walker. Home modifications in progress.",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.clients.insert_many(sample_clients)
    
    # ==================== STAFF MEMBERS ====================
    sample_staff = [
        {
            "id": str(uuid.uuid4()),
            "full_name": "Jessica Brown",
            "email": "jessica.b@sunshinecare.com.au",
            "phone": "0478 901 234",
            "role": "support_worker",
            "employment_type": "Full-time",
            "start_date": "2022-03-15",
            "hourly_rate": 35.50,
            "certifications": ["Certificate III Individual Support", "First Aid CPR", "Manual Handling", "Medication Administration"],
            "cert_expiries": {"First Aid CPR": "2025-06-15", "NDIS Worker Screening": "2026-03-20"},
            "availability": {"monday": True, "tuesday": True, "wednesday": True, "thursday": True, "friday": True, "saturday": False, "sunday": False},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "David Kim",
            "email": "david.k@sunshinecare.com.au",
            "phone": "0489 012 345",
            "role": "support_worker",
            "employment_type": "Part-time",
            "start_date": "2023-01-10",
            "hourly_rate": 38.00,
            "certifications": ["Certificate IV Disability", "First Aid CPR", "Medication Administration", "Restrictive Practices"],
            "cert_expiries": {"First Aid CPR": "2025-01-10", "NDIS Worker Screening": "2025-08-15"},
            "availability": {"monday": True, "tuesday": False, "wednesday": True, "thursday": False, "friday": True, "saturday": True, "sunday": False},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Rachel Green",
            "email": "rachel.g@sunshinecare.com.au",
            "phone": "0490 123 456",
            "role": "service_coordinator",
            "employment_type": "Full-time",
            "start_date": "2021-06-01",
            "hourly_rate": 52.00,
            "certifications": ["Bachelor of Social Work", "First Aid CPR", "NDIS Worker Screening", "Cert IV Training & Assessment"],
            "cert_expiries": {"First Aid CPR": "2025-09-01", "NDIS Worker Screening": "2026-06-01"},
            "availability": {"monday": True, "tuesday": True, "wednesday": True, "thursday": True, "friday": True, "saturday": False, "sunday": False},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Marcus Johnson",
            "email": "marcus.j@sunshinecare.com.au",
            "phone": "0401 234 567",
            "role": "support_worker",
            "employment_type": "Casual",
            "start_date": "2023-08-20",
            "hourly_rate": 42.00,
            "certifications": ["Certificate III Individual Support", "First Aid CPR", "Behaviour Support", "Mental Health First Aid"],
            "cert_expiries": {"First Aid CPR": "2025-08-20", "NDIS Worker Screening": "2026-02-15"},
            "availability": {"monday": False, "tuesday": True, "wednesday": False, "thursday": True, "friday": False, "saturday": True, "sunday": True},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Emily Watson",
            "email": "emily.w@sunshinecare.com.au",
            "phone": "0412 345 678",
            "role": "support_worker",
            "employment_type": "Full-time",
            "start_date": "2022-11-01",
            "hourly_rate": 36.50,
            "certifications": ["Certificate III Individual Support", "First Aid CPR", "Manual Handling", "Infection Control"],
            "cert_expiries": {"First Aid CPR": "2024-11-01", "NDIS Worker Screening": "2025-11-01"},
            "availability": {"monday": True, "tuesday": True, "wednesday": True, "thursday": True, "friday": True, "saturday": False, "sunday": False},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Chris Taylor",
            "email": "chris.t@sunshinecare.com.au",
            "phone": "0423 456 789",
            "role": "team_leader",
            "employment_type": "Full-time",
            "start_date": "2020-02-15",
            "hourly_rate": 48.00,
            "certifications": ["Certificate IV Disability", "First Aid CPR", "Medication Administration", "Cert IV Leadership"],
            "cert_expiries": {"First Aid CPR": "2025-02-15", "NDIS Worker Screening": "2026-02-15"},
            "availability": {"monday": True, "tuesday": True, "wednesday": True, "thursday": True, "friday": True, "saturday": False, "sunday": False},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Nina Patel",
            "email": "nina.p@sunshinecare.com.au",
            "phone": "0434 567 890",
            "role": "support_worker",
            "employment_type": "Part-time",
            "start_date": "2024-01-08",
            "hourly_rate": 35.50,
            "certifications": ["Certificate III Individual Support", "First Aid CPR"],
            "cert_expiries": {"First Aid CPR": "2027-01-08", "NDIS Worker Screening": "2027-01-08"},
            "availability": {"monday": False, "tuesday": True, "wednesday": True, "thursday": True, "friday": False, "saturday": True, "sunday": True},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "full_name": "Alex Morgan",
            "email": "alex.m@sunshinecare.com.au",
            "phone": "0445 678 901",
            "role": "sil_coordinator",
            "employment_type": "Full-time",
            "start_date": "2021-09-01",
            "hourly_rate": 50.00,
            "certifications": ["Bachelor of Nursing", "First Aid CPR", "Medication Administration", "NDIS Worker Screening"],
            "cert_expiries": {"First Aid CPR": "2025-09-01", "NDIS Worker Screening": "2026-09-01"},
            "availability": {"monday": True, "tuesday": True, "wednesday": True, "thursday": True, "friday": True, "saturday": False, "sunday": False},
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.staff.insert_many(sample_staff)
    
    # ==================== SHIFTS / ROSTER ====================
    sample_shifts = []
    service_types = ["Personal Care", "Community Access", "Skill Development", "Transport", "Domestic Assistance", "Social Support"]
    
    for i in range(21):  # 3 weeks of shifts
        shift_date = today + timedelta(days=i - 7)  # Start from a week ago
        
        # Morning shifts
        for j in range(3):
            client_idx = (i + j) % len(sample_clients)
            staff_idx = (i + j) % len(sample_staff)
            sample_shifts.append({
                "id": str(uuid.uuid4()),
                "client_id": sample_clients[client_idx]["id"],
                "client_name": sample_clients[client_idx]["full_name"],
                "staff_id": sample_staff[staff_idx]["id"],
                "staff_name": sample_staff[staff_idx]["full_name"],
                "date": shift_date.isoformat(),
                "start_time": f"0{7 + j}:00",
                "end_time": f"{11 + j}:00",
                "service_type": service_types[j % len(service_types)],
                "status": "completed" if i < 7 else ("confirmed" if i < 14 else "pending"),
                "notes": f"Regular {service_types[j % len(service_types)].lower()} support",
                "clock_in": f"{shift_date.isoformat()}T0{7 + j}:02:00" if i < 7 else None,
                "clock_out": f"{shift_date.isoformat()}T{11 + j}:05:00" if i < 7 else None,
                "is_demo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Afternoon shifts
        for j in range(2):
            client_idx = (i + j + 3) % len(sample_clients)
            staff_idx = (i + j + 3) % len(sample_staff)
            sample_shifts.append({
                "id": str(uuid.uuid4()),
                "client_id": sample_clients[client_idx]["id"],
                "client_name": sample_clients[client_idx]["full_name"],
                "staff_id": sample_staff[staff_idx]["id"],
                "staff_name": sample_staff[staff_idx]["full_name"],
                "date": shift_date.isoformat(),
                "start_time": f"1{3 + j}:00",
                "end_time": f"1{7 + j}:00",
                "service_type": service_types[(j + 3) % len(service_types)],
                "status": "completed" if i < 7 else ("confirmed" if i < 14 else "pending"),
                "notes": f"Afternoon {service_types[(j + 3) % len(service_types)].lower()} session",
                "clock_in": f"{shift_date.isoformat()}T1{3 + j}:00:00" if i < 7 else None,
                "clock_out": f"{shift_date.isoformat()}T1{7 + j}:03:00" if i < 7 else None,
                "is_demo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    await db.shifts.insert_many(sample_shifts)
    
    # ==================== INVOICES ====================
    sample_invoices = [
        {
            "id": str(uuid.uuid4()),
            "invoice_number": "INV-2024-001",
            "client_id": sample_clients[0]["id"],
            "client_name": sample_clients[0]["full_name"],
            "service_period_start": "2024-10-01",
            "service_period_end": "2024-10-31",
            "line_items": [
                {"description": "Personal Care - Daily Living (01_011_0107_1_1)", "quantity": 40, "rate": 55.47, "amount": 2218.80},
                {"description": "Community Access (04_104_0125_6_1)", "quantity": 20, "rate": 65.09, "amount": 1301.80}
            ],
            "total_amount": 3520.60,
            "status": "paid",
            "paid_date": "2024-11-15",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "invoice_number": "INV-2024-002",
            "client_id": sample_clients[1]["id"],
            "client_name": sample_clients[1]["full_name"],
            "service_period_start": "2024-10-01",
            "service_period_end": "2024-10-31",
            "line_items": [
                {"description": "Skill Development (15_037_0117_1_3)", "quantity": 24, "rate": 65.09, "amount": 1562.16},
                {"description": "Employment Support (10_017_0102_5_1)", "quantity": 16, "rate": 70.75, "amount": 1132.00}
            ],
            "total_amount": 2694.16,
            "status": "paid",
            "paid_date": "2024-11-18",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "invoice_number": "INV-2024-003",
            "client_id": sample_clients[2]["id"],
            "client_name": sample_clients[2]["full_name"],
            "service_period_start": "2024-11-01",
            "service_period_end": "2024-11-30",
            "line_items": [
                {"description": "Personal Care - High Intensity (01_015_0104_1_1)", "quantity": 60, "rate": 62.17, "amount": 3730.20},
                {"description": "Transport (02_051_0108_1_1)", "quantity": 12, "rate": 45.00, "amount": 540.00},
                {"description": "Domestic Assistance (01_010_0101_1_1)", "quantity": 8, "rate": 52.71, "amount": 421.68}
            ],
            "total_amount": 4691.88,
            "status": "sent",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "invoice_number": "INV-2024-004",
            "client_id": sample_clients[3]["id"],
            "client_name": sample_clients[3]["full_name"],
            "service_period_start": "2024-11-01",
            "service_period_end": "2024-11-30",
            "line_items": [
                {"description": "SIL - Active Night (01_835_0115_1_1)", "quantity": 240, "rate": 55.47, "amount": 13312.80},
                {"description": "Community Access Group (04_102_0136_6_1)", "quantity": 16, "rate": 25.54, "amount": 408.64}
            ],
            "total_amount": 13721.44,
            "status": "sent",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "invoice_number": "INV-2024-005",
            "client_id": sample_clients[4]["id"],
            "client_name": sample_clients[4]["full_name"],
            "service_period_start": "2024-12-01",
            "service_period_end": "2024-12-15",
            "line_items": [
                {"description": "Assistive Technology Support (05_053_0117_8_3)", "quantity": 8, "rate": 65.09, "amount": 520.72},
                {"description": "Skill Development (15_037_0117_1_3)", "quantity": 12, "rate": 65.09, "amount": 781.08}
            ],
            "total_amount": 1301.80,
            "status": "draft",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.invoices.insert_many(sample_invoices)
    
    # ==================== INCIDENTS ====================
    sample_incidents = [
        {
            "id": str(uuid.uuid4()),
            "incident_number": "INC-2024-001",
            "client_id": sample_clients[0]["id"],
            "client_name": sample_clients[0]["full_name"],
            "reported_by": sample_staff[0]["full_name"],
            "reporter_id": sample_staff[0]["id"],
            "incident_date": (today - timedelta(days=12)).isoformat(),
            "incident_time": "10:30",
            "incident_type": "Minor Injury",
            "location": "Client's Home - Bathroom",
            "description": "Client slipped while getting out of the shower. Caught themselves on the grab rail but reported minor discomfort in left wrist.",
            "immediate_action": "Checked client for injuries. Applied ice pack to wrist. Assisted client to seated position. Monitored for 30 minutes.",
            "severity": "low",
            "witnesses": "None",
            "injuries": "Minor wrist strain - no medical attention required",
            "status": "closed",
            "follow_up_notes": "OT referral made for additional bathroom safety assessment. Non-slip mat installed.",
            "closed_date": (today - timedelta(days=8)).isoformat(),
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "incident_number": "INC-2024-002",
            "client_id": sample_clients[1]["id"],
            "client_name": sample_clients[1]["full_name"],
            "reported_by": sample_staff[1]["full_name"],
            "reporter_id": sample_staff[1]["id"],
            "incident_date": (today - timedelta(days=5)).isoformat(),
            "incident_time": "14:15",
            "incident_type": "Behavioural",
            "location": "Community Centre",
            "description": "Client became distressed during group activity when the regular room was changed due to maintenance. Client raised voice and paced for approximately 10 minutes.",
            "immediate_action": "Calmly explained the situation. Moved to quiet space. Used visual schedule to show remaining activities. Offered sensory tools.",
            "severity": "medium",
            "witnesses": "Group facilitator - Maria Santos",
            "injuries": "None",
            "status": "under_review",
            "follow_up_notes": "Behaviour support plan to be reviewed. Recommendation: Advance notice of any schedule changes.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "incident_number": "INC-2024-003",
            "client_id": sample_clients[3]["id"],
            "client_name": sample_clients[3]["full_name"],
            "reported_by": sample_staff[7]["full_name"],
            "reporter_id": sample_staff[7]["id"],
            "incident_date": (today - timedelta(days=2)).isoformat(),
            "incident_time": "22:45",
            "incident_type": "Medication Error",
            "location": "SIL House - River Road",
            "description": "Evening medication was administered 30 minutes late due to staff handover delay.",
            "immediate_action": "Medication administered immediately upon discovery. Client monitored for any adverse effects. Medical on-call notified.",
            "severity": "medium",
            "witnesses": "Night shift worker - Marcus Johnson",
            "injuries": "None - no adverse effects observed",
            "status": "open",
            "follow_up_notes": "Medication administration audit scheduled. Handover procedures to be reviewed.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "incident_number": "INC-2024-004",
            "client_id": sample_clients[5]["id"],
            "client_name": sample_clients[5]["full_name"],
            "reported_by": sample_staff[4]["full_name"],
            "reporter_id": sample_staff[4]["id"],
            "incident_date": (today - timedelta(days=1)).isoformat(),
            "incident_time": "11:20",
            "incident_type": "Property Damage",
            "location": "SIL House - River Road",
            "description": "Client accidentally knocked over television in common room during physiotherapy exercises.",
            "immediate_action": "Ensured client safety. Cleared broken glass. Documented damage. Notified house coordinator.",
            "severity": "low",
            "witnesses": "William Brown (co-resident)",
            "injuries": "None",
            "status": "open",
            "follow_up_notes": "Insurance claim to be lodged. Physio exercises to be conducted in designated space.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.incidents.insert_many(sample_incidents)
    
    # ==================== GOALS ====================
    sample_goals = [
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[0]["id"],
            "client_name": sample_clients[0]["full_name"],
            "goal_title": "Improve independence with morning routine",
            "description": "Emma will complete her morning routine (shower, dress, breakfast) with minimal verbal prompts only.",
            "category": "Daily Living",
            "target_date": "2025-06-30",
            "progress": 65,
            "status": "in_progress",
            "milestones": [
                {"title": "Select own clothes independently", "completed": True, "date": "2024-08-15"},
                {"title": "Shower with setup assistance only", "completed": True, "date": "2024-10-01"},
                {"title": "Prepare simple breakfast", "completed": False, "date": None}
            ],
            "notes": "Emma is making excellent progress. Now choosing clothes and showering independently.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[1]["id"],
            "client_name": sample_clients[1]["full_name"],
            "goal_title": "Obtain part-time employment",
            "description": "Michael will secure and maintain part-time employment in an area of interest with job coach support.",
            "category": "Employment",
            "target_date": "2025-03-31",
            "progress": 40,
            "status": "in_progress",
            "milestones": [
                {"title": "Complete job readiness assessment", "completed": True, "date": "2024-06-20"},
                {"title": "Create resume with support", "completed": True, "date": "2024-08-10"},
                {"title": "Attend 3 job interviews", "completed": False, "date": None},
                {"title": "Secure employment", "completed": False, "date": None}
            ],
            "notes": "Michael has expressed interest in retail or warehouse work. Resume completed and job searching begun.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[2]["id"],
            "client_name": sample_clients[2]["full_name"],
            "goal_title": "Increase community participation",
            "description": "Sarah will attend at least 2 community activities per week independently using public transport.",
            "category": "Social Participation",
            "target_date": "2025-02-28",
            "progress": 80,
            "status": "in_progress",
            "milestones": [
                {"title": "Learn accessible transport routes", "completed": True, "date": "2024-05-15"},
                {"title": "Join community art group", "completed": True, "date": "2024-07-01"},
                {"title": "Attend advocacy meetings", "completed": True, "date": "2024-09-10"},
                {"title": "Travel independently to activities", "completed": False, "date": None}
            ],
            "notes": "Sarah is now attending art group and disability advocacy meetings. Working on independent travel.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[3]["id"],
            "client_name": sample_clients[3]["full_name"],
            "goal_title": "Develop independent living skills",
            "description": "James will learn to prepare 5 simple meals and manage basic household tasks in SIL accommodation.",
            "category": "Daily Living",
            "target_date": "2025-04-30",
            "progress": 55,
            "status": "in_progress",
            "milestones": [
                {"title": "Learn kitchen safety", "completed": True, "date": "2024-06-01"},
                {"title": "Prepare 2 simple meals", "completed": True, "date": "2024-09-15"},
                {"title": "Manage laundry independently", "completed": True, "date": "2024-11-01"},
                {"title": "Prepare 5 meals independently", "completed": False, "date": None}
            ],
            "notes": "James can now make toast, sandwiches, and microwave meals. Working on stove-top cooking.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[4]["id"],
            "client_name": sample_clients[4]["full_name"],
            "goal_title": "Complete university degree",
            "description": "Olivia will complete her Bachelor of Arts degree with assistive technology support.",
            "category": "Education",
            "target_date": "2025-11-30",
            "progress": 70,
            "status": "in_progress",
            "milestones": [
                {"title": "Set up assistive technology", "completed": True, "date": "2024-02-15"},
                {"title": "Complete Year 2 subjects", "completed": True, "date": "2024-06-30"},
                {"title": "Arrange internship", "completed": True, "date": "2024-10-01"},
                {"title": "Complete final year", "completed": False, "date": None}
            ],
            "notes": "Olivia is excelling academically. Has secured internship with local media company.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[6]["id"],
            "client_name": sample_clients[6]["full_name"],
            "goal_title": "Transition to open employment",
            "description": "Sophie will transition from school leaver program to supported employment within 12 months.",
            "category": "Employment",
            "target_date": "2025-06-30",
            "progress": 25,
            "status": "in_progress",
            "milestones": [
                {"title": "Complete work experience placement", "completed": True, "date": "2024-09-30"},
                {"title": "Identify preferred work type", "completed": False, "date": None},
                {"title": "Complete job applications", "completed": False, "date": None}
            ],
            "notes": "Sophie enjoyed her work experience at a local cafe. Exploring hospitality opportunities.",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.goals.insert_many(sample_goals)
    
    # ==================== MEDICATIONS ====================
    sample_medications = [
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[0]["id"],
            "client_name": sample_clients[0]["full_name"],
            "medication_name": "Sodium Valproate",
            "dosage": "500mg",
            "frequency": "Twice daily",
            "route": "Oral",
            "prescriber": "Dr. Sarah Mitchell",
            "pharmacy": "Chemist Warehouse Melbourne",
            "purpose": "Seizure prevention",
            "start_date": "2020-03-15",
            "instructions": "Take with food. Do not crush tablets.",
            "side_effects": "May cause drowsiness",
            "is_prn": False,
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[2]["id"],
            "client_name": sample_clients[2]["full_name"],
            "medication_name": "Baclofen",
            "dosage": "10mg",
            "frequency": "Three times daily",
            "route": "Oral",
            "prescriber": "Dr. James Wong",
            "pharmacy": "Priceline Pharmacy Brisbane",
            "purpose": "Muscle spasticity",
            "start_date": "2022-06-01",
            "instructions": "Take at regular intervals. May take with or without food.",
            "side_effects": "Drowsiness, dizziness",
            "is_prn": False,
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[2]["id"],
            "client_name": sample_clients[2]["full_name"],
            "medication_name": "Paracetamol",
            "dosage": "500mg",
            "frequency": "As needed",
            "route": "Oral",
            "prescriber": "Dr. James Wong",
            "pharmacy": "Priceline Pharmacy Brisbane",
            "purpose": "Pain relief",
            "start_date": "2022-06-01",
            "instructions": "Maximum 8 tablets in 24 hours. Wait at least 4 hours between doses.",
            "side_effects": "Rare if taken as directed",
            "is_prn": True,
            "prn_reason": "For pain or discomfort",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[3]["id"],
            "client_name": sample_clients[3]["full_name"],
            "medication_name": "Sertraline",
            "dosage": "100mg",
            "frequency": "Once daily (morning)",
            "route": "Oral",
            "prescriber": "Dr. Amanda Clarke - Psychiatrist",
            "pharmacy": "Terry White Chemmart Perth",
            "purpose": "Depression and anxiety",
            "start_date": "2023-02-10",
            "instructions": "Take in the morning with breakfast.",
            "side_effects": "Nausea, headache initially",
            "is_prn": False,
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[5]["id"],
            "client_name": sample_clients[5]["full_name"],
            "medication_name": "Levetiracetam",
            "dosage": "750mg",
            "frequency": "Twice daily",
            "route": "Oral",
            "prescriber": "Dr. Robert Chen - Neurologist",
            "pharmacy": "Chemist Warehouse Perth",
            "purpose": "Seizure prevention post-ABI",
            "start_date": "2021-08-20",
            "instructions": "Take at consistent times each day.",
            "side_effects": "Fatigue, mood changes",
            "is_prn": False,
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": sample_clients[7]["id"],
            "client_name": sample_clients[7]["full_name"],
            "medication_name": "Tecfidera",
            "dosage": "240mg",
            "frequency": "Twice daily",
            "route": "Oral",
            "prescriber": "Dr. Lisa Park - Neurologist",
            "pharmacy": "Pharmacy 4 Less Hobart",
            "purpose": "Multiple Sclerosis disease modification",
            "start_date": "2023-04-01",
            "instructions": "Take with food to reduce flushing. Do not crush or open capsule.",
            "side_effects": "Flushing, stomach upset",
            "is_prn": False,
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.medications.insert_many(sample_medications)
    
    # ==================== VEHICLES ====================
    sample_vehicles = [
        {
            "id": str(uuid.uuid4()),
            "registration": "ABC-123",
            "make": "Toyota",
            "model": "HiAce Commuter",
            "year": 2022,
            "owner_type": "organization",
            "owner_name": "Sunshine Care Services",
            "vehicle_type": "Wheelchair Accessible Van",
            "capacity": 10,
            "wheelchair_capacity": 2,
            "color": "White",
            "vin": "JTFSK22P300012345",
            "insurance_expiry": "2025-06-30",
            "registration_expiry": "2025-03-15",
            "last_service_date": "2024-11-01",
            "next_service_due": "2025-02-01",
            "odometer": 45230,
            "fuel_type": "Diesel",
            "status": "active",
            "assigned_location": "Main Office",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "registration": "XYZ-456",
            "make": "Kia",
            "model": "Carnival",
            "year": 2023,
            "owner_type": "organization",
            "owner_name": "Sunshine Care Services",
            "vehicle_type": "People Mover",
            "capacity": 8,
            "wheelchair_capacity": 0,
            "color": "Silver",
            "vin": "KNAPH81ABC7654321",
            "insurance_expiry": "2025-08-15",
            "registration_expiry": "2025-05-20",
            "last_service_date": "2024-10-15",
            "next_service_due": "2025-04-15",
            "odometer": 28450,
            "fuel_type": "Petrol",
            "status": "active",
            "assigned_location": "SIL House - River Road",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "registration": "DEF-789",
            "make": "Hyundai",
            "model": "Staria",
            "year": 2024,
            "owner_type": "organization",
            "owner_name": "Sunshine Care Services",
            "vehicle_type": "Wheelchair Accessible Van",
            "capacity": 6,
            "wheelchair_capacity": 1,
            "color": "Blue",
            "vin": "KMHXX41CBPU123456",
            "insurance_expiry": "2025-12-01",
            "registration_expiry": "2025-09-30",
            "last_service_date": "2024-12-01",
            "next_service_due": "2025-06-01",
            "odometer": 12100,
            "fuel_type": "Diesel",
            "status": "active",
            "assigned_location": "Main Office",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.vehicles.insert_many(sample_vehicles)
    
    # ==================== VEHICLE LOG ENTRIES ====================
    sample_vehicle_logs = []
    for i in range(20):
        log_date = today - timedelta(days=i)
        vehicle_idx = i % len(sample_vehicles)
        staff_idx = i % len(sample_staff)
        
        sample_vehicle_logs.append({
            "id": str(uuid.uuid4()),
            "vehicle_id": sample_vehicles[vehicle_idx]["id"],
            "vehicle_registration": sample_vehicles[vehicle_idx]["registration"],
            "driver_id": sample_staff[staff_idx]["id"],
            "driver_name": sample_staff[staff_idx]["full_name"],
            "date": log_date.isoformat(),
            "start_time": "09:00",
            "end_time": "15:30",
            "start_odometer": 45000 + (i * 50),
            "end_odometer": 45000 + (i * 50) + 85,
            "purpose": "Client transport and community access activities",
            "fuel_added": 45.5 if i % 5 == 0 else 0,
            "fuel_cost": 85.50 if i % 5 == 0 else 0,
            "issues_reported": "Minor scratch on rear bumper - noted" if i == 5 else None,
            "clients_transported": [sample_clients[i % len(sample_clients)]["full_name"]],
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    await db.vehicle_logs.insert_many(sample_vehicle_logs)
    
    # ==================== SIL HOUSES ====================
    sample_sil_houses = [
        {
            "id": str(uuid.uuid4()),
            "name": "River Road House",
            "address": "23 River Road, Perth WA 6000",
            "property_type": "4 Bedroom House",
            "capacity": 4,
            "current_occupancy": 2,
            "house_manager": sample_staff[7]["full_name"],
            "house_manager_id": sample_staff[7]["id"],
            "phone": "08 9123 4567",
            "email": "riverroad@sunshinecare.com.au",
            "features": ["Wheelchair accessible", "Hoist in bathroom", "Sensory room", "Secure backyard"],
            "residents": [sample_clients[3]["id"], sample_clients[5]["id"]],
            "resident_names": [sample_clients[3]["full_name"], sample_clients[5]["full_name"]],
            "support_ratio": "1:2 day, 1:2 active night",
            "status": "active",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Garden View House",
            "address": "15 Garden Street, Brisbane QLD 4000",
            "property_type": "3 Bedroom House",
            "capacity": 3,
            "current_occupancy": 0,
            "house_manager": sample_staff[5]["full_name"],
            "house_manager_id": sample_staff[5]["id"],
            "phone": "07 3123 4567",
            "email": "gardenview@sunshinecare.com.au",
            "features": ["Single level", "Accessible bathroom", "Large kitchen", "Close to public transport"],
            "residents": [],
            "resident_names": [],
            "support_ratio": "1:3 day, sleepover night",
            "status": "available",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.sil_houses.insert_many(sample_sil_houses)
    
    # ==================== LEAVE APPLICATIONS ====================
    sample_leave = [
        {
            "id": str(uuid.uuid4()),
            "staff_id": sample_staff[0]["id"],
            "staff_name": sample_staff[0]["full_name"],
            "leave_type": "Annual Leave",
            "start_date": (today + timedelta(days=30)).isoformat(),
            "end_date": (today + timedelta(days=37)).isoformat(),
            "days_requested": 5,
            "reason": "Family holiday",
            "status": "approved",
            "approved_by": "Rachel Green",
            "approved_date": (today - timedelta(days=5)).isoformat(),
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "staff_id": sample_staff[1]["id"],
            "staff_name": sample_staff[1]["full_name"],
            "leave_type": "Sick Leave",
            "start_date": (today - timedelta(days=3)).isoformat(),
            "end_date": (today - timedelta(days=2)).isoformat(),
            "days_requested": 2,
            "reason": "Flu symptoms",
            "status": "approved",
            "approved_by": "Chris Taylor",
            "approved_date": (today - timedelta(days=3)).isoformat(),
            "medical_certificate": True,
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "staff_id": sample_staff[3]["id"],
            "staff_name": sample_staff[3]["full_name"],
            "leave_type": "Annual Leave",
            "start_date": (today + timedelta(days=14)).isoformat(),
            "end_date": (today + timedelta(days=21)).isoformat(),
            "days_requested": 5,
            "reason": "Personal travel",
            "status": "pending",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "staff_id": sample_staff[4]["id"],
            "staff_name": sample_staff[4]["full_name"],
            "leave_type": "Personal Leave",
            "start_date": (today + timedelta(days=7)).isoformat(),
            "end_date": (today + timedelta(days=7)).isoformat(),
            "days_requested": 1,
            "reason": "Family commitment",
            "status": "pending",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.leave_applications.insert_many(sample_leave)
    
    # ==================== COMPLIANCE ITEMS ====================
    sample_compliance = [
        {
            "id": str(uuid.uuid4()),
            "item_type": "Policy",
            "title": "Incident Management Policy",
            "description": "Policy for reporting and managing incidents",
            "category": "Quality & Safeguards",
            "status": "current",
            "effective_date": "2024-01-01",
            "review_date": "2025-01-01",
            "responsible_person": "Rachel Green",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "item_type": "Policy",
            "title": "Medication Management Policy",
            "description": "Guidelines for safe medication administration",
            "category": "Clinical Governance",
            "status": "current",
            "effective_date": "2024-02-15",
            "review_date": "2025-02-15",
            "responsible_person": "Alex Morgan",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "item_type": "Audit",
            "title": "NDIS Practice Standards Audit",
            "description": "Annual compliance audit against NDIS Practice Standards",
            "category": "Registration",
            "status": "scheduled",
            "due_date": "2025-03-15",
            "responsible_person": "Rachel Green",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "item_type": "Training",
            "title": "Restrictive Practices Training",
            "description": "Mandatory training for all staff on restrictive practices",
            "category": "Staff Development",
            "status": "in_progress",
            "due_date": "2025-01-31",
            "completion_rate": 75,
            "responsible_person": "Chris Taylor",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "item_type": "Registration",
            "title": "NDIS Provider Registration Renewal",
            "description": "Renewal of NDIS provider registration",
            "category": "Registration",
            "status": "current",
            "effective_date": "2024-06-01",
            "expiry_date": "2027-06-01",
            "responsible_person": "Rachel Green",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "item_type": "Certificate",
            "title": "Public Liability Insurance",
            "description": "Annual public liability insurance certificate",
            "category": "Insurance",
            "status": "current",
            "effective_date": "2024-07-01",
            "expiry_date": "2025-07-01",
            "responsible_person": "Rachel Green",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "item_type": "Audit",
            "title": "Vehicle Safety Inspection",
            "description": "Quarterly vehicle safety and compliance check",
            "category": "WHS",
            "status": "due_soon",
            "due_date": (today + timedelta(days=14)).isoformat(),
            "responsible_person": "Chris Taylor",
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.compliance_items.insert_many(sample_compliance)
    
    # ==================== HR - TRAINING RECORDS ====================
    sample_training = []
    training_courses = [
        ("First Aid & CPR", "External", 8),
        ("Manual Handling", "Internal", 4),
        ("Medication Administration", "External", 6),
        ("Infection Control", "Internal", 2),
        ("NDIS Worker Orientation", "Internal", 4),
        ("Behaviour Support", "External", 8),
        ("Mental Health First Aid", "External", 12)
    ]
    
    for i, staff in enumerate(sample_staff):
        for j, (course, provider, hours) in enumerate(training_courses[:4 + (i % 3)]):
            sample_training.append({
                "id": str(uuid.uuid4()),
                "staff_id": staff["id"],
                "staff_name": staff["full_name"],
                "course_name": course,
                "provider": provider,
                "hours": hours,
                "completion_date": (today - timedelta(days=90 + (j * 30))).isoformat(),
                "expiry_date": (today + timedelta(days=365 - (j * 30))).isoformat() if "First Aid" in course else None,
                "certificate_number": f"CERT-{2024}-{str(uuid.uuid4())[:8].upper()}",
                "status": "completed",
                "is_demo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    await db.training_records.insert_many(sample_training)
    
    # ==================== COMPANY SETTINGS (Demo) ====================
    demo_company = {
        "id": str(uuid.uuid4()),
        "type": "company",
        "company_name": "Sunshine Care Services",
        "tagline": "Quality NDIS Support",
        "abn": "12 345 678 901",
        "email": "accounts@sunshinecare.com.au",
        "phone": "1300 123 456",
        "address": "Level 3, 456 Collins Street, Melbourne VIC 3000",
        "website": "www.sunshinecare.com.au",
        "bank_name": "Commonwealth Bank",
        "bank_account_name": "Sunshine Care Services Pty Ltd",
        "bank_bsb": "063-000",
        "bank_account_number": "1234 5678",
        "is_demo": True,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing_demo_company = await db.company_settings.find_one({"is_demo": True})
    if not existing_demo_company:
        await db.company_settings.insert_one(demo_company)
    
    return demo_user_id

@api_router.post("/demo/access")
async def get_demo_access():
    """Get or create demo account access with comprehensive sample data"""
    
    # Ensure demo data exists
    await create_demo_data()
    
    # Get demo user
    demo_user = await db.users.find_one({"email": DEMO_EMAIL}, {"_id": 0})
    
    if not demo_user:
        raise HTTPException(status_code=500, detail="Demo account creation failed")
    
    # Create access token
    token = create_access_token(data={"sub": DEMO_EMAIL})
    
    # Get counts for welcome message
    client_count = await db.clients.count_documents({"is_demo": True})
    staff_count = await db.staff.count_documents({"is_demo": True})
    shift_count = await db.shifts.count_documents({"is_demo": True})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": demo_user["id"],
            "email": demo_user["email"],
            "full_name": demo_user["full_name"],
            "role": demo_user["role"],
            "is_demo": True
        },
        "demo_data": {
            "clients": client_count,
            "staff": staff_count,
            "shifts": shift_count
        },
        "message": "Welcome to ProCare Hub! Explore our comprehensive NDIS management platform with sample data including clients, staff, rostering, invoicing, incident reports, goals, medications, vehicles, SIL houses, and more."
    }

@api_router.post("/demo/reset")
async def reset_demo_data(current_user: dict = Depends(get_current_user)):
    """Reset demo data to fresh state (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Delete all demo data
    collections_to_clear = [
        "clients", "staff", "shifts", "invoices", "incidents", 
        "goals", "medications", "vehicles", "vehicle_logs",
        "sil_houses", "leave_applications", "compliance_items",
        "training_records", "company_settings"
    ]
    
    for collection in collections_to_clear:
        await db[collection].delete_many({"is_demo": True})
    
    # Recreate demo data
    await create_demo_data()
    
    return {"message": "Demo data reset successfully"}

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
