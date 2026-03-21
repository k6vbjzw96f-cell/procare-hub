import requests
import sys
import json
from datetime import datetime

class ProCareHubAPITester:
    def __init__(self, base_url="https://http-studio.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_client_id = None
        self.created_staff_id = None
        self.created_shift_id = None
        self.created_invoice_id = None
        self.created_compliance_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                if response.text:
                    try:
                        error_data = response.json()
                        details += f", Error: {error_data.get('detail', response.text[:100])}"
                    except:
                        details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success and response.text:
                try:
                    return response.json()
                except:
                    return {}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return {}

    def test_auth_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "email": f"test_coordinator_{timestamp}@procare.com",
            "password": "TestPass123!",
            "full_name": f"Test Coordinator {timestamp}",
            "role": "coordinator"
        }
        
        response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response['user']
            return True
        return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        if not self.user_data:
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return 'access_token' in response

    def test_auth_me(self):
        """Test get current user"""
        response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return 'email' in response

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        expected_fields = ['total_clients', 'active_clients', 'total_staff', 'active_staff', 
                          'upcoming_shifts', 'pending_invoices', 'open_compliance_issues', 'total_revenue']
        
        if response:
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                self.log_test("Dashboard Stats Fields", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_test("Dashboard Stats Fields", True, "All required fields present")
                return True
        return False

    def test_client_crud(self):
        """Test client CRUD operations"""
        # Create client
        client_data = {
            "full_name": "John Smith",
            "ndis_number": "NDIS123456",
            "email": "john.smith@example.com",
            "phone": "0412345678",
            "address": "123 Main St, Sydney NSW 2000",
            "plan_start_date": "2024-01-01",
            "plan_end_date": "2024-12-31",
            "total_budget": 50000.0,
            "support_needs": "Personal care and community access"
        }
        
        response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        
        if response and 'id' in response:
            self.created_client_id = response['id']
            
            # Read client
            self.run_test(
                "Get Client",
                "GET",
                f"clients/{self.created_client_id}",
                200
            )
            
            # Update client
            update_data = {
                "full_name": "John Smith Updated",
                "ndis_number": "NDIS123456",
                "email": "john.smith.updated@example.com",
                "phone": "0412345679",
                "total_budget": 55000.0
            }
            
            self.run_test(
                "Update Client",
                "PUT",
                f"clients/{self.created_client_id}",
                200,
                data=update_data
            )
            
            # List clients
            self.run_test(
                "List Clients",
                "GET",
                "clients",
                200
            )
            
            return True
        return False

    def test_staff_crud(self):
        """Test staff CRUD operations"""
        # Create staff
        staff_data = {
            "full_name": "Sarah Johnson",
            "email": "sarah.johnson@procare.com",
            "phone": "0423456789",
            "position": "Support Worker",
            "hourly_rate": 35.50,
            "certifications": ["First Aid", "Disability Support"]
        }
        
        response = self.run_test(
            "Create Staff",
            "POST",
            "staff",
            200,
            data=staff_data
        )
        
        if response and 'id' in response:
            self.created_staff_id = response['id']
            
            # Read staff
            self.run_test(
                "Get Staff",
                "GET",
                f"staff/{self.created_staff_id}",
                200
            )
            
            # Update staff
            update_data = {
                "full_name": "Sarah Johnson Updated",
                "email": "sarah.johnson@procare.com",
                "phone": "0423456790",
                "position": "Senior Support Worker",
                "hourly_rate": 40.00
            }
            
            self.run_test(
                "Update Staff",
                "PUT",
                f"staff/{self.created_staff_id}",
                200,
                data=update_data
            )
            
            # List staff
            self.run_test(
                "List Staff",
                "GET",
                "staff",
                200
            )
            
            return True
        return False

    def test_shift_crud(self):
        """Test shift CRUD operations"""
        if not self.created_client_id or not self.created_staff_id:
            self.log_test("Shift CRUD", False, "Missing client or staff for shift creation")
            return False
            
        # Create shift
        shift_data = {
            "client_id": self.created_client_id,
            "staff_id": self.created_staff_id,
            "shift_date": "2024-12-20",
            "start_time": "09:00",
            "end_time": "17:00",
            "duration_hours": 8.0,
            "service_type": "Personal Care",
            "notes": "Regular support shift"
        }
        
        response = self.run_test(
            "Create Shift",
            "POST",
            "shifts",
            200,
            data=shift_data
        )
        
        if response and 'id' in response:
            self.created_shift_id = response['id']
            
            # Read shift
            self.run_test(
                "Get Shift",
                "GET",
                f"shifts/{self.created_shift_id}",
                200
            )
            
            # Update shift status
            self.run_test(
                "Update Shift Status",
                "PUT",
                f"shifts/{self.created_shift_id}",
                200,
                data={"status": "completed"}
            )
            
            # List shifts
            self.run_test(
                "List Shifts",
                "GET",
                "shifts",
                200
            )
            
            return True
        return False

    def test_invoice_crud(self):
        """Test invoice CRUD operations"""
        if not self.created_client_id:
            self.log_test("Invoice CRUD", False, "Missing client for invoice creation")
            return False
            
        # Create invoice
        invoice_data = {
            "client_id": self.created_client_id,
            "service_period_start": "2024-12-01",
            "service_period_end": "2024-12-31",
            "line_items": [
                {
                    "description": "Personal Care Services",
                    "quantity": 20,
                    "rate": 35.50,
                    "amount": 710.00
                },
                {
                    "description": "Community Access",
                    "quantity": 10,
                    "rate": 40.00,
                    "amount": 400.00
                }
            ]
        }
        
        response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        
        if response and 'id' in response:
            self.created_invoice_id = response['id']
            
            # Read invoice
            self.run_test(
                "Get Invoice",
                "GET",
                f"invoices/{self.created_invoice_id}",
                200
            )
            
            # Update invoice status
            self.run_test(
                "Update Invoice Status",
                "PUT",
                f"invoices/{self.created_invoice_id}",
                200,
                data={"status": "sent"}
            )
            
            # List invoices
            self.run_test(
                "List Invoices",
                "GET",
                "invoices",
                200
            )
            
            return True
        return False

    def test_compliance_crud(self):
        """Test compliance CRUD operations"""
        # Create compliance record
        compliance_data = {
            "record_type": "incident",
            "title": "Minor Equipment Malfunction",
            "description": "Wheelchair brake required adjustment during client visit",
            "severity": "low",
            "reported_by": self.user_data['full_name'] if self.user_data else "Test User"
        }
        
        response = self.run_test(
            "Create Compliance Record",
            "POST",
            "compliance",
            200,
            data=compliance_data
        )
        
        if response and 'id' in response:
            self.created_compliance_id = response['id']
            
            # Update compliance status
            self.run_test(
                "Update Compliance Status",
                "PUT",
                f"compliance/{self.created_compliance_id}",
                200,
                data={"status": "investigating"}
            )
            
            # List compliance records
            self.run_test(
                "List Compliance Records",
                "GET",
                "compliance",
                200
            )
            
            return True
        return False

    def test_cleanup(self):
        """Clean up test data"""
        cleanup_success = True
        
        # Delete in reverse order of dependencies
        if self.created_shift_id:
            response = self.run_test(
                "Delete Shift",
                "DELETE",
                f"shifts/{self.created_shift_id}",
                200
            )
            if not response:
                cleanup_success = False
                
        if self.created_invoice_id:
            # Note: No delete endpoint for invoices in the API
            pass
            
        if self.created_compliance_id:
            # Note: No delete endpoint for compliance records in the API
            pass
            
        if self.created_staff_id:
            response = self.run_test(
                "Delete Staff",
                "DELETE",
                f"staff/{self.created_staff_id}",
                200
            )
            if not response:
                cleanup_success = False
                
        if self.created_client_id:
            response = self.run_test(
                "Delete Client",
                "DELETE",
                f"clients/{self.created_client_id}",
                200
            )
            if not response:
                cleanup_success = False
                
        return cleanup_success

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting ProCare Hub API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication tests
        print("\n📝 Authentication Tests")
        if not self.test_auth_register():
            print("❌ Registration failed - stopping tests")
            return False
            
        self.test_auth_login()
        self.test_auth_me()
        
        # Dashboard tests
        print("\n📊 Dashboard Tests")
        self.test_dashboard_stats()
        
        # CRUD tests
        print("\n👥 Client Management Tests")
        self.test_client_crud()
        
        print("\n👨‍💼 Staff Management Tests")
        self.test_staff_crud()
        
        print("\n📅 Shift Management Tests")
        self.test_shift_crud()
        
        print("\n💰 Invoice Management Tests")
        self.test_invoice_crud()
        
        print("\n🛡️ Compliance Management Tests")
        self.test_compliance_crud()
        
        # Cleanup
        print("\n🧹 Cleanup Tests")
        self.test_cleanup()
        
        # Results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = ProCareHubAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())