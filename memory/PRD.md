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

### New Features (March 2026 - Complete)
1. **Medication Management**: Track participant medications, dosages, administration logs
2. **Goal Tracking**: Set and monitor participant goals with progress tracking
3. **Communication Hub**: Real-time messaging between team members (5-second polling)
4. **Payment Processing**: Track invoice payments, record payments
5. **Compliance Calendar**: Visual calendar for compliance deadlines with reminders
6. **Feedback & Surveys**: Create surveys, collect responses, view analytics

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

## User Roles
1. **Admin**: Full system access
2. **Coordinator**: Client/staff management, rostering, invoicing
3. **Support Worker**: Limited access to clients, own shifts, leave requests

## Test Credentials
- Email: testadmin@procare.com
- Password: test123

---

## Backlog

### P1 - Upcoming
- Xero Accounting Integration (user mentioned initially)
- Stripe Payment Gateway Integration

### P2 - Future
- Leave Balance Tracking (accrual and remaining days)
- Geofencing for Clock-in/out location validation
- Push Notifications
- Mobile App (React Native)
- Advanced Reporting with Charts

### Technical Debt
- Refactor server.py (2100+ lines) into modular structure using FastAPI APIRouter
- Create reusable frontend components for tables and modals
- Add comprehensive error handling and logging
