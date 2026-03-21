"""
Backend API Tests for 6 New Features:
1. Medication Management
2. Goal Tracking
3. Communication Hub (Messages)
4. Payment Processing (Invoices)
5. Compliance Calendar (Deadlines)
6. Feedback & Surveys
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://http-studio.preview.emergentagent.com')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def user_data(self, auth_token):
        """Get user data from login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        return response.json().get("user", {})
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data


class TestClients:
    """Client tests - needed for Medication and Goals"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_clients(self, auth_headers):
        """Test getting clients list"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.fixture(scope="class")
    def test_client(self, auth_headers):
        """Create or get a test client"""
        # First check if clients exist
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = response.json()
        if clients:
            return clients[0]
        
        # Create a new client if none exist
        client_data = {
            "full_name": "TEST_MedGoal Client",
            "ndis_number": f"NDIS{uuid.uuid4().hex[:8].upper()}",
            "email": f"test_client_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "0400000000",
            "address": "123 Test St",
            "plan_start_date": "2024-01-01",
            "plan_end_date": "2025-12-31",
            "total_budget": 50000.0,
            "status": "active",
            "support_needs": "Testing"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()


class TestMedicationManagement:
    """Medication Management API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Get a client ID for testing"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = response.json()
        if clients:
            return clients[0]["id"]
        # Create client if none exist
        client_data = {
            "full_name": "TEST_Medication Client",
            "ndis_number": f"NDIS{uuid.uuid4().hex[:8].upper()}",
            "email": f"test_med_{uuid.uuid4().hex[:6]}@test.com",
            "phone": "0400000001",
            "address": "123 Med St",
            "plan_start_date": "2024-01-01",
            "plan_end_date": "2025-12-31",
            "total_budget": 50000.0,
            "status": "active",
            "support_needs": "Medication testing"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers)
        return response.json()["id"]
    
    def test_get_client_medications_empty(self, auth_headers, test_client_id):
        """Test getting medications for a client (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/medications/client/{test_client_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_medication(self, auth_headers, test_client_id):
        """Test creating a new medication"""
        med_data = {
            "client_id": test_client_id,
            "medication_name": "TEST_Paracetamol",
            "dosage": "500mg",
            "frequency": "daily",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "prescribing_doctor": "Dr. Test",
            "notes": "Test medication"
        }
        response = requests.post(f"{BASE_URL}/api/medications", json=med_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["medication_name"] == "TEST_Paracetamol"
        assert data["dosage"] == "500mg"
        assert "id" in data
        return data
    
    def test_get_medications_after_create(self, auth_headers, test_client_id):
        """Test getting medications after creating one"""
        # First create a medication
        med_data = {
            "client_id": test_client_id,
            "medication_name": "TEST_Ibuprofen",
            "dosage": "200mg",
            "frequency": "twice_daily",
            "start_date": "2024-01-01",
            "prescribing_doctor": "Dr. Test2",
            "notes": "Test medication 2"
        }
        create_response = requests.post(f"{BASE_URL}/api/medications", json=med_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_med = create_response.json()
        
        # Now get medications
        response = requests.get(f"{BASE_URL}/api/medications/client/{test_client_id}", headers=auth_headers)
        assert response.status_code == 200
        meds = response.json()
        assert len(meds) >= 1
        
        # Verify the created medication is in the list
        med_ids = [m["id"] for m in meds]
        assert created_med["id"] in med_ids
    
    def test_log_medication_administration(self, auth_headers, test_client_id):
        """Test logging medication administration"""
        # First create a medication
        med_data = {
            "client_id": test_client_id,
            "medication_name": "TEST_LogMed",
            "dosage": "100mg",
            "frequency": "daily",
            "start_date": "2024-01-01"
        }
        create_response = requests.post(f"{BASE_URL}/api/medications", json=med_data, headers=auth_headers)
        assert create_response.status_code == 200
        med_id = create_response.json()["id"]
        
        # Log administration
        response = requests.post(f"{BASE_URL}/api/medications/{med_id}/log", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestGoalTracking:
    """Goal Tracking API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Get a client ID for testing"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        clients = response.json()
        if clients:
            return clients[0]["id"]
        return None
    
    def test_get_client_goals_empty(self, auth_headers, test_client_id):
        """Test getting goals for a client (may be empty)"""
        if not test_client_id:
            pytest.skip("No client available")
        response = requests.get(f"{BASE_URL}/api/goals/client/{test_client_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_goal(self, auth_headers, test_client_id):
        """Test creating a new goal"""
        if not test_client_id:
            pytest.skip("No client available")
        goal_data = {
            "client_id": test_client_id,
            "goal_type": "short_term",
            "title": "TEST_Improve mobility",
            "description": "Walk 30 minutes daily",
            "target_date": "2025-06-30"
        }
        response = requests.post(f"{BASE_URL}/api/goals", json=goal_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Improve mobility"
        assert data["goal_type"] == "short_term"
        assert "id" in data
        assert data["progress_percentage"] == 0
        return data
    
    def test_update_goal_progress(self, auth_headers, test_client_id):
        """Test updating goal progress"""
        if not test_client_id:
            pytest.skip("No client available")
        
        # Create a goal first
        goal_data = {
            "client_id": test_client_id,
            "goal_type": "long_term",
            "title": "TEST_Progress Goal",
            "description": "Test progress updates",
            "target_date": "2025-12-31"
        }
        create_response = requests.post(f"{BASE_URL}/api/goals", json=goal_data, headers=auth_headers)
        assert create_response.status_code == 200
        goal_id = create_response.json()["id"]
        
        # Update progress to 50%
        response = requests.put(f"{BASE_URL}/api/goals/{goal_id}/progress?progress=50", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify progress was updated
        goals_response = requests.get(f"{BASE_URL}/api/goals/client/{test_client_id}", headers=auth_headers)
        goals = goals_response.json()
        updated_goal = next((g for g in goals if g["id"] == goal_id), None)
        assert updated_goal is not None
        assert updated_goal["progress_percentage"] == 50
    
    def test_goal_achieved_on_100_percent(self, auth_headers, test_client_id):
        """Test that goal status changes to achieved at 100%"""
        if not test_client_id:
            pytest.skip("No client available")
        
        # Create a goal
        goal_data = {
            "client_id": test_client_id,
            "goal_type": "daily",
            "title": "TEST_Achieve Goal",
            "description": "Test achievement",
            "target_date": "2025-01-31"
        }
        create_response = requests.post(f"{BASE_URL}/api/goals", json=goal_data, headers=auth_headers)
        goal_id = create_response.json()["id"]
        
        # Update to 100%
        response = requests.put(f"{BASE_URL}/api/goals/{goal_id}/progress?progress=100", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify status changed to achieved
        goals_response = requests.get(f"{BASE_URL}/api/goals/client/{test_client_id}", headers=auth_headers)
        goals = goals_response.json()
        achieved_goal = next((g for g in goals if g["id"] == goal_id), None)
        assert achieved_goal is not None
        assert achieved_goal["status"] == "achieved"


class TestCommunicationHub:
    """Communication Hub (Messages) API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_users_list(self, auth_headers):
        """Test getting users list for messaging"""
        response = requests.get(f"{BASE_URL}/api/users/list", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each user should have id, full_name, role
        if data:
            assert "id" in data[0]
            assert "full_name" in data[0]
            assert "role" in data[0]
    
    def test_get_inbox_empty(self, auth_headers):
        """Test getting inbox (may be empty)"""
        response = requests.get(f"{BASE_URL}/api/messages/inbox", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_send_message(self, auth_headers):
        """Test sending a message"""
        # Get a recipient
        users_response = requests.get(f"{BASE_URL}/api/users/list", headers=auth_headers)
        users = users_response.json()
        if not users:
            pytest.skip("No other users available to send message to")
        
        recipient_id = users[0]["id"]
        message_data = {
            "recipient_id": recipient_id,
            "subject": "TEST_Message Subject",
            "message_text": "This is a test message"
        }
        response = requests.post(f"{BASE_URL}/api/messages", json=message_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["subject"] == "TEST_Message Subject"
        assert data["message_text"] == "This is a test message"
        assert "id" in data
        return data
    
    def test_inbox_contains_sent_message(self, auth_headers):
        """Test that sent message appears in inbox"""
        # Get users
        users_response = requests.get(f"{BASE_URL}/api/users/list", headers=auth_headers)
        users = users_response.json()
        if not users:
            pytest.skip("No other users available")
        
        # Send a message
        recipient_id = users[0]["id"]
        message_data = {
            "recipient_id": recipient_id,
            "subject": "TEST_Inbox Check",
            "message_text": "Checking inbox"
        }
        send_response = requests.post(f"{BASE_URL}/api/messages", json=message_data, headers=auth_headers)
        sent_msg_id = send_response.json()["id"]
        
        # Check inbox
        inbox_response = requests.get(f"{BASE_URL}/api/messages/inbox", headers=auth_headers)
        inbox = inbox_response.json()
        msg_ids = [m["id"] for m in inbox]
        assert sent_msg_id in msg_ids
    
    def test_mark_message_read(self, auth_headers):
        """Test marking a message as read"""
        # Get inbox
        inbox_response = requests.get(f"{BASE_URL}/api/messages/inbox", headers=auth_headers)
        inbox = inbox_response.json()
        if not inbox:
            pytest.skip("No messages in inbox")
        
        msg_id = inbox[0]["id"]
        response = requests.put(f"{BASE_URL}/api/messages/{msg_id}/read", headers=auth_headers)
        assert response.status_code == 200


class TestPaymentProcessing:
    """Payment Processing (Invoices) API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_invoices(self, auth_headers):
        """Test getting invoices list"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_invoice_has_required_fields(self, auth_headers):
        """Test that invoices have required fields"""
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        if not invoices:
            pytest.skip("No invoices available")
        
        invoice = invoices[0]
        required_fields = ["id", "invoice_number", "client_id", "client_name", "total_amount", "status"]
        for field in required_fields:
            assert field in invoice, f"Missing field: {field}"
    
    def test_update_invoice_status_to_paid(self, auth_headers):
        """Test updating invoice status to paid"""
        # Get invoices
        response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        invoices = response.json()
        
        # Find a non-paid invoice
        pending_invoice = next((i for i in invoices if i["status"] != "paid"), None)
        if not pending_invoice:
            pytest.skip("No pending invoices to test payment")
        
        invoice_id = pending_invoice["id"]
        response = requests.put(f"{BASE_URL}/api/invoices/{invoice_id}/status?status=paid", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/invoices", headers=auth_headers)
        updated_invoices = get_response.json()
        updated_invoice = next((i for i in updated_invoices if i["id"] == invoice_id), None)
        assert updated_invoice is not None
        assert updated_invoice["status"] == "paid"


class TestComplianceCalendar:
    """Compliance Calendar (Deadlines) API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_compliance_deadlines(self, auth_headers):
        """Test getting compliance deadlines"""
        response = requests.get(f"{BASE_URL}/api/compliance/deadlines", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_compliance_deadline(self, auth_headers):
        """Test creating a compliance deadline"""
        deadline_data = {
            "deadline_type": "worker_screening",
            "title": "TEST_Annual Worker Screening",
            "description": "Annual screening renewal",
            "due_date": "2025-06-30",
            "entity_type": "staff",
            "priority": "high"
        }
        response = requests.post(f"{BASE_URL}/api/compliance/deadlines", json=deadline_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Annual Worker Screening"
        assert data["deadline_type"] == "worker_screening"
        assert data["priority"] == "high"
        assert "id" in data
        return data
    
    def test_complete_deadline(self, auth_headers):
        """Test marking a deadline as complete"""
        # Create a deadline first
        deadline_data = {
            "deadline_type": "insurance",
            "title": "TEST_Insurance Renewal",
            "description": "Complete insurance renewal",
            "due_date": "2025-03-31",
            "priority": "critical"
        }
        create_response = requests.post(f"{BASE_URL}/api/compliance/deadlines", json=deadline_data, headers=auth_headers)
        deadline_id = create_response.json()["id"]
        
        # Mark as complete
        response = requests.put(f"{BASE_URL}/api/compliance/deadlines/{deadline_id}/complete", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/compliance/deadlines", headers=auth_headers)
        deadlines = get_response.json()
        completed_deadline = next((d for d in deadlines if d["id"] == deadline_id), None)
        assert completed_deadline is not None
        assert completed_deadline["status"] == "completed"


class TestFeedbackSurveys:
    """Feedback & Surveys API tests"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testadmin@procare.com",
            "password": "test123"
        })
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_surveys(self, auth_headers):
        """Test getting surveys list"""
        response = requests.get(f"{BASE_URL}/api/surveys", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_survey(self, auth_headers):
        """Test creating a survey"""
        survey_data = {
            "title": "TEST_Service Satisfaction Survey",
            "description": "Please rate our services",
            "target_audience": "all",
            "questions": [
                {"question": "How satisfied are you with our services?", "type": "rating"},
                {"question": "Would you recommend us?", "type": "yes_no"},
                {"question": "Any additional feedback?", "type": "text"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/surveys", json=survey_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Service Satisfaction Survey"
        assert data["target_audience"] == "all"
        assert len(data["questions"]) == 3
        assert "id" in data
        return data
    
    def test_submit_survey_response(self, auth_headers):
        """Test submitting a survey response"""
        # Create a survey first
        survey_data = {
            "title": "TEST_Response Survey",
            "description": "Test survey for responses",
            "target_audience": "staff",
            "questions": [
                {"question": "Rate your experience", "type": "rating"},
                {"question": "Comments", "type": "text"}
            ]
        }
        create_response = requests.post(f"{BASE_URL}/api/surveys", json=survey_data, headers=auth_headers)
        survey_id = create_response.json()["id"]
        
        # Submit response
        answers = [
            {"question": "Rate your experience", "answer": "5"},
            {"question": "Comments", "answer": "Great service!"}
        ]
        response = requests.post(f"{BASE_URL}/api/surveys/{survey_id}/respond", json=answers, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["survey_id"] == survey_id
        assert len(data["answers"]) == 2
    
    def test_get_survey_responses(self, auth_headers):
        """Test getting survey responses"""
        # Create survey and submit response
        survey_data = {
            "title": "TEST_View Responses Survey",
            "description": "Test viewing responses",
            "target_audience": "all",
            "questions": [{"question": "Test question", "type": "text"}]
        }
        create_response = requests.post(f"{BASE_URL}/api/surveys", json=survey_data, headers=auth_headers)
        survey_id = create_response.json()["id"]
        
        # Submit a response
        answers = [{"question": "Test question", "answer": "Test answer"}]
        requests.post(f"{BASE_URL}/api/surveys/{survey_id}/respond", json=answers, headers=auth_headers)
        
        # Get responses
        response = requests.get(f"{BASE_URL}/api/surveys/{survey_id}/responses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
