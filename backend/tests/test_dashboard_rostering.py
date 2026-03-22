"""
Backend API Tests for Dashboard and Rostering Features
Tests: Dashboard stats, Staff API, Shifts API, Export functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://http-studio.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@procare.com"
TEST_PASSWORD = "Test123!"


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test successful login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Login successful for {TEST_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestDashboardStats:
    """Dashboard statistics endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_stats_returns_200(self):
        """Test dashboard stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        print("✓ Dashboard stats endpoint returns 200")
    
    def test_dashboard_stats_contains_required_fields(self):
        """Test dashboard stats contains all required fields for admin view"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        data = response.json()
        
        # Admin dashboard required fields
        required_fields = [
            "total_clients",
            "active_clients", 
            "total_staff",
            "active_staff",
            "upcoming_shifts",
            "pending_invoices",
            "compliance_issues",
            "total_revenue",
            "pending_amount",
            "recent_activity"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print(f"✓ Dashboard stats contains all required fields")
        print(f"  - Total Clients: {data['total_clients']}")
        print(f"  - Total Staff: {data['total_staff']}")
        print(f"  - Upcoming Shifts: {data['upcoming_shifts']}")
        print(f"  - Pending Invoices: {data['pending_invoices']}")
        print(f"  - Compliance Issues: {data['compliance_issues']}")
        print(f"  - Total Revenue: ${data['total_revenue']}")
    
    def test_dashboard_stats_data_types(self):
        """Test dashboard stats returns correct data types"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=self.headers)
        data = response.json()
        
        # Verify numeric fields
        assert isinstance(data["total_clients"], int), "total_clients should be int"
        assert isinstance(data["total_staff"], int), "total_staff should be int"
        assert isinstance(data["upcoming_shifts"], int), "upcoming_shifts should be int"
        assert isinstance(data["pending_invoices"], int), "pending_invoices should be int"
        assert isinstance(data["total_revenue"], (int, float)), "total_revenue should be numeric"
        assert isinstance(data["recent_activity"], list), "recent_activity should be list"
        
        print("✓ Dashboard stats data types are correct")


class TestStaffAPI:
    """Staff API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_staff_list_returns_200(self):
        """Test staff list endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/staff", headers=self.headers)
        assert response.status_code == 200, f"Staff API failed: {response.text}"
        print("✓ Staff API returns 200")
    
    def test_get_staff_list_returns_array(self):
        """Test staff list returns an array"""
        response = requests.get(f"{BASE_URL}/api/staff", headers=self.headers)
        data = response.json()
        
        assert isinstance(data, list), "Staff response should be a list"
        print(f"✓ Staff API returns array with {len(data)} staff members")
    
    def test_staff_data_structure(self):
        """Test staff data contains required fields"""
        response = requests.get(f"{BASE_URL}/api/staff", headers=self.headers)
        data = response.json()
        
        if len(data) > 0:
            staff = data[0]
            required_fields = ["id", "full_name", "email", "status"]
            
            for field in required_fields:
                assert field in staff, f"Missing required field: {field}"
            
            print(f"✓ Staff data structure is correct")
            print(f"  - Sample staff: {staff['full_name']} ({staff['email']})")
        else:
            print("⚠ No staff data to verify structure")


class TestShiftsAPI:
    """Shifts API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_shifts_returns_200(self):
        """Test shifts endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=self.headers)
        assert response.status_code == 200, f"Shifts API failed: {response.text}"
        print("✓ Shifts API returns 200")
    
    def test_get_shifts_returns_array(self):
        """Test shifts returns an array"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=self.headers)
        data = response.json()
        
        assert isinstance(data, list), "Shifts response should be a list"
        print(f"✓ Shifts API returns array with {len(data)} shifts")
    
    def test_shifts_data_structure(self):
        """Test shifts data contains required fields including shift_date and duration_hours"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=self.headers)
        data = response.json()
        
        if len(data) > 0:
            shift = data[0]
            # Required fields for roster display
            required_fields = [
                "id", 
                "client_id", 
                "client_name",
                "staff_id",
                "staff_name",
                "shift_date",  # Critical field - was 'date' before fix
                "start_time",
                "end_time",
                "duration_hours",  # Critical field
                "service_type",
                "status"
            ]
            
            for field in required_fields:
                assert field in shift, f"Missing required field: {field}"
            
            print(f"✓ Shifts data structure is correct with shift_date and duration_hours")
            print(f"  - Sample shift: {shift['shift_date']} - {shift['client_name']} with {shift['staff_name']}")
            print(f"  - Duration: {shift['duration_hours']} hours")
            print(f"  - Service: {shift['service_type']}")
        else:
            print("⚠ No shifts data to verify structure")
    
    def test_shifts_have_normalized_date_field(self):
        """Verify shifts use 'shift_date' not 'date' (Pydantic fix verification)"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=self.headers)
        data = response.json()
        
        if len(data) > 0:
            shift = data[0]
            assert "shift_date" in shift, "Shift should have 'shift_date' field"
            assert "date" not in shift or shift.get("date") is None, "Shift should not have legacy 'date' field"
            print("✓ Shifts use normalized 'shift_date' field (Pydantic fix verified)")
        else:
            print("⚠ No shifts to verify date field normalization")


class TestClientsAPI:
    """Clients API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_clients_returns_200(self):
        """Test clients endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200, f"Clients API failed: {response.text}"
        print("✓ Clients API returns 200")
    
    def test_get_clients_returns_array(self):
        """Test clients returns an array"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        data = response.json()
        
        assert isinstance(data, list), "Clients response should be a list"
        print(f"✓ Clients API returns array with {len(data)} clients")


class TestRosteringFeatures:
    """Rostering-specific feature tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_shift_templates_endpoint(self):
        """Test shift templates endpoint"""
        response = requests.get(f"{BASE_URL}/api/shift-templates", headers=self.headers)
        assert response.status_code == 200, f"Shift templates failed: {response.text}"
        print("✓ Shift templates endpoint returns 200")
    
    def test_recurring_shifts_endpoint(self):
        """Test recurring shifts endpoint"""
        response = requests.get(f"{BASE_URL}/api/recurring-shifts", headers=self.headers)
        assert response.status_code == 200, f"Recurring shifts failed: {response.text}"
        print("✓ Recurring shifts endpoint returns 200")
    
    def test_company_settings_endpoint(self):
        """Test company settings endpoint (used for roster branding)"""
        response = requests.get(f"{BASE_URL}/api/company-settings", headers=self.headers)
        assert response.status_code == 200, f"Company settings failed: {response.text}"
        print("✓ Company settings endpoint returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
