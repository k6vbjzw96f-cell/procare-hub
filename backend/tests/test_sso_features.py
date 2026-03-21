"""
SSO (Single Sign-On) Feature Tests for ProCare Hub
Tests Microsoft and Google SSO endpoints in demo mode
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMicrosoftSSO:
    """Microsoft SSO endpoint tests"""
    
    def test_microsoft_sso_url_returns_auth_url_and_state(self):
        """GET /api/auth/sso/microsoft/url returns auth URL and state in demo mode"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        response = requests.get(
            f"{BASE_URL}/api/auth/sso/microsoft/url",
            params={"redirect_uri": redirect_uri}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "auth_url" in data
        assert "state" in data
        assert "demo_mode" in data
        
        # Verify demo mode is active (no credentials configured)
        assert data["demo_mode"] == True
        
        # Verify state is a valid UUID format
        assert len(data["state"]) == 36  # UUID format
        
        # Verify auth_url contains the redirect_uri and demo code
        assert redirect_uri in data["auth_url"]
        assert "DEMO_MICROSOFT_CODE" in data["auth_url"]
        assert data["state"] in data["auth_url"]
        
        print(f"Microsoft SSO URL test passed - demo_mode: {data['demo_mode']}")
    
    def test_microsoft_sso_callback_creates_demo_user(self):
        """POST /api/auth/sso/microsoft/callback creates demo user and returns valid JWT token"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        
        # First get a valid state
        url_response = requests.get(
            f"{BASE_URL}/api/auth/sso/microsoft/url",
            params={"redirect_uri": redirect_uri}
        )
        assert url_response.status_code == 200
        state = url_response.json()["state"]
        
        # Now test the callback
        callback_response = requests.post(
            f"{BASE_URL}/api/auth/sso/microsoft/callback",
            json={
                "code": "DEMO_MICROSOFT_CODE",
                "state": state,
                "redirect_uri": redirect_uri
            }
        )
        
        assert callback_response.status_code == 200
        data = callback_response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "token_type" in data
        assert "user" in data
        assert "demo_mode" in data
        
        # Verify token type
        assert data["token_type"] == "bearer"
        
        # Verify demo mode
        assert data["demo_mode"] == True
        
        # Verify user data
        user = data["user"]
        assert user["email"] == "demo.user@organization.onmicrosoft.com"
        assert user["full_name"] == "Demo Microsoft User"
        assert user["role"] == "coordinator"
        assert "id" in user
        
        # Verify message about demo mode
        assert "message" in data
        assert "Demo Mode" in data["message"]
        
        print(f"Microsoft SSO callback test passed - user: {user['email']}")
        
        return data["access_token"]
    
    def test_microsoft_sso_token_works_with_auth_me(self):
        """SSO-generated tokens work with /api/auth/me endpoint"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        
        # Get state and token
        url_response = requests.get(
            f"{BASE_URL}/api/auth/sso/microsoft/url",
            params={"redirect_uri": redirect_uri}
        )
        state = url_response.json()["state"]
        
        callback_response = requests.post(
            f"{BASE_URL}/api/auth/sso/microsoft/callback",
            json={
                "code": "DEMO_MICROSOFT_CODE",
                "state": state,
                "redirect_uri": redirect_uri
            }
        )
        token = callback_response.json()["access_token"]
        
        # Test /api/auth/me with the SSO token
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200
        user = me_response.json()
        
        assert user["email"] == "demo.user@organization.onmicrosoft.com"
        assert user["full_name"] == "Demo Microsoft User"
        assert "id" in user
        
        print(f"Microsoft SSO token validation passed - user ID: {user['id']}")
    
    def test_microsoft_sso_callback_invalid_state(self):
        """POST /api/auth/sso/microsoft/callback rejects invalid state"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        
        callback_response = requests.post(
            f"{BASE_URL}/api/auth/sso/microsoft/callback",
            json={
                "code": "DEMO_MICROSOFT_CODE",
                "state": "invalid-state-12345",
                "redirect_uri": redirect_uri
            }
        )
        
        assert callback_response.status_code == 400
        data = callback_response.json()
        assert "detail" in data
        assert "Invalid" in data["detail"] or "expired" in data["detail"]
        
        print("Microsoft SSO invalid state rejection test passed")


class TestGoogleSSO:
    """Google SSO endpoint tests"""
    
    def test_google_sso_url_returns_auth_url_and_state(self):
        """GET /api/auth/sso/google/url returns auth URL and state in demo mode"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        response = requests.get(
            f"{BASE_URL}/api/auth/sso/google/url",
            params={"redirect_uri": redirect_uri}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "auth_url" in data
        assert "state" in data
        assert "demo_mode" in data
        
        # Verify demo mode is active (no credentials configured)
        assert data["demo_mode"] == True
        
        # Verify state is a valid UUID format
        assert len(data["state"]) == 36  # UUID format
        
        # Verify auth_url contains the redirect_uri and demo code
        assert redirect_uri in data["auth_url"]
        assert "DEMO_GOOGLE_CODE" in data["auth_url"]
        assert data["state"] in data["auth_url"]
        
        print(f"Google SSO URL test passed - demo_mode: {data['demo_mode']}")
    
    def test_google_sso_callback_creates_demo_user(self):
        """POST /api/auth/sso/google/callback creates demo user and returns valid JWT token"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        
        # First get a valid state
        url_response = requests.get(
            f"{BASE_URL}/api/auth/sso/google/url",
            params={"redirect_uri": redirect_uri}
        )
        assert url_response.status_code == 200
        state = url_response.json()["state"]
        
        # Now test the callback
        callback_response = requests.post(
            f"{BASE_URL}/api/auth/sso/google/callback",
            json={
                "code": "DEMO_GOOGLE_CODE",
                "state": state,
                "redirect_uri": redirect_uri
            }
        )
        
        assert callback_response.status_code == 200
        data = callback_response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "token_type" in data
        assert "user" in data
        assert "demo_mode" in data
        
        # Verify token type
        assert data["token_type"] == "bearer"
        
        # Verify demo mode
        assert data["demo_mode"] == True
        
        # Verify user data
        user = data["user"]
        assert user["email"] == "demo.user@workspace.google.com"
        assert user["full_name"] == "Demo Google User"
        assert user["role"] == "coordinator"
        assert "id" in user
        
        # Verify message about demo mode
        assert "message" in data
        assert "Demo Mode" in data["message"]
        
        print(f"Google SSO callback test passed - user: {user['email']}")
        
        return data["access_token"]
    
    def test_google_sso_token_works_with_auth_me(self):
        """SSO-generated tokens work with /api/auth/me endpoint"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        
        # Get state and token
        url_response = requests.get(
            f"{BASE_URL}/api/auth/sso/google/url",
            params={"redirect_uri": redirect_uri}
        )
        state = url_response.json()["state"]
        
        callback_response = requests.post(
            f"{BASE_URL}/api/auth/sso/google/callback",
            json={
                "code": "DEMO_GOOGLE_CODE",
                "state": state,
                "redirect_uri": redirect_uri
            }
        )
        token = callback_response.json()["access_token"]
        
        # Test /api/auth/me with the SSO token
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert me_response.status_code == 200
        user = me_response.json()
        
        assert user["email"] == "demo.user@workspace.google.com"
        assert user["full_name"] == "Demo Google User"
        assert "id" in user
        
        print(f"Google SSO token validation passed - user ID: {user['id']}")
    
    def test_google_sso_callback_invalid_state(self):
        """POST /api/auth/sso/google/callback rejects invalid state"""
        redirect_uri = f"{BASE_URL}/auth/callback"
        
        callback_response = requests.post(
            f"{BASE_URL}/api/auth/sso/google/callback",
            json={
                "code": "DEMO_GOOGLE_CODE",
                "state": "invalid-state-12345",
                "redirect_uri": redirect_uri
            }
        )
        
        assert callback_response.status_code == 400
        data = callback_response.json()
        assert "detail" in data
        assert "Invalid" in data["detail"] or "expired" in data["detail"]
        
        print("Google SSO invalid state rejection test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
