# ProCare Hub - Product Requirements Document

## Overview
ProCare Hub is a comprehensive NDIS (National Disability Insurance Scheme) provider management platform built to help disability service providers manage their operations efficiently.

## Core Features

### Implemented (Complete)
- **Authentication**: User registration/login with JWT tokens, role-based access (Admin, Coordinator, Support Worker)
- **Dashboard**: Overview with stats, quick actions, recent activity
- **Client Management**: Add/edit clients with photo uploads, support needs tracking
- **Staff Management**: Staff records with certifications, clock-in/out, photo uploads
- **Rostering & Scheduling**: Shift management and assignment
- **Leave Management**: Leave requests with approval workflow
- **Invoicing**: Create and manage invoices with line items
- **Compliance Tracking**: Incident reporting and compliance records
- **Reports**: Financial and operational reporting

### SIL Provider Modules (Complete)
- **Vehicles**: Fleet management with logbook tracking
- **SIL Houses**: Supported Independent Living house management
- **Facilities**: Facility and equipment management

### Settings (Complete)
- Profile settings
- Organization settings
- Notification preferences
- Security settings
- **Integrations tab** (NEW)

### New Features (March 2026 - Complete)
1. **Medication Management**: Track participant medications, dosages, administration logs
2. **Goal Tracking**: Set and monitor participant goals with progress tracking
3. **Communication Hub**: Real-time messaging between team members (5-second polling)
4. **Payment Processing**: Track invoice payments, record payments
5. **Compliance Calendar**: Visual calendar for compliance deadlines with reminders
6. **Feedback & Surveys**: Create surveys, collect responses, view analytics

### Higher Effort Integrations (March 2026 - Implemented in Demo Mode)
7. **Google Calendar Integration**: 
   - Settings > Integrations tab to connect/disconnect
   - Sync shifts to Google Calendar
   - Mock mode for demo (add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET for real integration)
   
8. **Document Signing (SignWell)**:
   - New Documents page for e-signatures
   - Templates: NDIS Service Agreement, Consent Form, Incident Acknowledgment
   - Create signature requests, track status, mock signing for demo
   - Mock mode for demo (add SIGNWELL_API_KEY for real integration)

## Technical Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **File Storage**: Emergent Object Storage

## API Endpoints Summary
- Authentication: /api/auth/register, /api/auth/login
- Clients: /api/clients (CRUD)
- Staff: /api/staff (CRUD), /api/staff/{id}/clockin, /api/staff/{id}/clockout
- Leave: /api/leave/request, /api/leave/requests, /api/leave/{id}/approve
- Medications: /api/medications, /api/medications/client/{id}, /api/medications/{id}/log
- Goals: /api/goals, /api/goals/client/{id}, /api/goals/{id}/progress
- Messages: /api/messages, /api/messages/inbox, /api/users/list
- Compliance Deadlines: /api/compliance/deadlines, /api/compliance/deadlines/{id}/complete
- Surveys: /api/surveys, /api/surveys/{id}/respond, /api/surveys/{id}/responses
- Invoices: /api/invoices, /api/invoices/{id}/status
- **Calendar**: /api/calendar/status, /api/calendar/auth-url, /api/calendar/events, /api/calendar/sync-shift/{id}
- **Documents**: /api/documents/status, /api/documents/templates, /api/documents/signature-request, /api/documents/signature-requests

## User Roles
1. **Admin**: Full system access
2. **Coordinator**: Client/staff management, rostering, invoicing
3. **Support Worker**: Limited access to clients, own shifts, leave requests

## Test Credentials
- Email: testadmin@procare.com
- Password: test123

---

## Backlog

### P1 - Upcoming (Require API Keys)
- **Google Calendar - Real Integration**: Add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
- **SignWell - Real Integration**: Add SIGNWELL_API_KEY
- **Xero Accounting Integration**: Connect to accounting system

### P2 - Future
- Location Tracking (GPS clock-in/out)
- Customizable Reports with builder
- User Permissions (fine-grained role access)
- Leave Balance Tracking (accrual and remaining days)
- Push Notifications
- Mobile App (React Native)

### Technical Debt
- Refactor server.py (2500+ lines) into modular structure using FastAPI APIRouter
- Create reusable frontend components for tables and modals
- Add comprehensive error handling and logging
