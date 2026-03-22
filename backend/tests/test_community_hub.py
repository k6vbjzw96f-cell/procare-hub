"""
Test suite for Community Hub feature - Forum and Events
Tests forum categories, posts, replies, and community events endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@procare.com"
TEST_PASSWORD = "Test123!"


class TestCommunityHubAuth:
    """Authentication for Community Hub tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestForumCategories(TestCommunityHubAuth):
    """Forum Categories endpoint tests"""
    
    def test_get_forum_categories(self, auth_headers):
        """Test GET /api/forum/categories - should return 5 default categories"""
        response = requests.get(f"{BASE_URL}/api/forum/categories", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        
        categories = response.json()
        assert isinstance(categories, list), "Categories should be a list"
        assert len(categories) >= 5, f"Expected at least 5 default categories, got {len(categories)}"
        
        # Verify default category names
        category_names = [cat["name"] for cat in categories]
        expected_names = ["Announcements", "General Discussion", "NDIS Updates", "Best Practices", "Support & Help"]
        for name in expected_names:
            assert name in category_names, f"Missing expected category: {name}"
        
        # Verify category structure
        for cat in categories:
            assert "id" in cat, "Category missing id"
            assert "name" in cat, "Category missing name"
            assert "description" in cat, "Category missing description"
            assert "icon" in cat, "Category missing icon"
            assert "color" in cat, "Category missing color"
            assert "post_count" in cat, "Category missing post_count"
        
        print(f"SUCCESS: Found {len(categories)} forum categories")
        return categories


class TestForumPosts(TestCommunityHubAuth):
    """Forum Posts endpoint tests"""
    
    @pytest.fixture(scope="class")
    def category_id(self, auth_headers):
        """Get a category ID for testing"""
        response = requests.get(f"{BASE_URL}/api/forum/categories", headers=auth_headers)
        assert response.status_code == 200
        categories = response.json()
        assert len(categories) > 0, "No categories found"
        # Use General Discussion category
        for cat in categories:
            if cat["name"] == "General Discussion":
                return cat["id"]
        return categories[0]["id"]
    
    def test_get_forum_posts_empty(self, auth_headers):
        """Test GET /api/forum/posts - should return list (may be empty initially)"""
        response = requests.get(f"{BASE_URL}/api/forum/posts", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get posts: {response.text}"
        
        posts = response.json()
        assert isinstance(posts, list), "Posts should be a list"
        print(f"SUCCESS: Forum posts endpoint returned {len(posts)} posts")
    
    def test_create_forum_post(self, auth_headers, category_id):
        """Test POST /api/forum/posts - create a new discussion"""
        unique_id = str(uuid.uuid4())[:8]
        post_data = {
            "category_id": category_id,
            "title": f"TEST_Post_{unique_id}",
            "content": f"This is a test post content for testing purposes. ID: {unique_id}",
            "is_pinned": False,
            "is_announcement": False
        }
        
        response = requests.post(f"{BASE_URL}/api/forum/posts", json=post_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create post: {response.text}"
        
        post = response.json()
        assert "id" in post, "Post missing id"
        assert post["title"] == post_data["title"], "Post title mismatch"
        assert post["content"] == post_data["content"], "Post content mismatch"
        assert post["category_id"] == category_id, "Post category_id mismatch"
        assert "author_id" in post, "Post missing author_id"
        assert "author_name" in post, "Post missing author_name"
        assert post["views"] == 0, "New post should have 0 views"
        assert post["reply_count"] == 0, "New post should have 0 replies"
        
        print(f"SUCCESS: Created forum post with ID: {post['id']}")
        return post
    
    def test_get_forum_post_by_id(self, auth_headers, category_id):
        """Test GET /api/forum/posts/{post_id} - get single post with replies"""
        # First create a post
        unique_id = str(uuid.uuid4())[:8]
        post_data = {
            "category_id": category_id,
            "title": f"TEST_GetPost_{unique_id}",
            "content": f"Test content for get post test. ID: {unique_id}",
            "is_pinned": False,
            "is_announcement": False
        }
        
        create_response = requests.post(f"{BASE_URL}/api/forum/posts", json=post_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_post = create_response.json()
        post_id = created_post["id"]
        
        # Now get the post
        response = requests.get(f"{BASE_URL}/api/forum/posts/{post_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get post: {response.text}"
        
        post = response.json()
        assert post["id"] == post_id, "Post ID mismatch"
        assert post["title"] == post_data["title"], "Post title mismatch"
        assert "replies" in post, "Post should include replies array"
        assert post["views"] >= 1, "Post views should be incremented"
        
        print(f"SUCCESS: Retrieved forum post {post_id} with {len(post.get('replies', []))} replies")
        return post
    
    def test_filter_posts_by_category(self, auth_headers, category_id):
        """Test GET /api/forum/posts?category_id=xxx - filter by category"""
        response = requests.get(f"{BASE_URL}/api/forum/posts?category_id={category_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to filter posts: {response.text}"
        
        posts = response.json()
        assert isinstance(posts, list), "Posts should be a list"
        
        # All posts should belong to the specified category
        for post in posts:
            assert post["category_id"] == category_id, f"Post {post['id']} has wrong category"
        
        print(f"SUCCESS: Filtered posts by category, found {len(posts)} posts")
    
    def test_search_posts(self, auth_headers, category_id):
        """Test GET /api/forum/posts?search=xxx - search posts"""
        # Create a post with unique searchable content
        unique_id = str(uuid.uuid4())[:8]
        search_term = f"SEARCHABLE_{unique_id}"
        post_data = {
            "category_id": category_id,
            "title": f"TEST_Search_{search_term}",
            "content": f"This post contains {search_term} for search testing",
            "is_pinned": False,
            "is_announcement": False
        }
        
        create_response = requests.post(f"{BASE_URL}/api/forum/posts", json=post_data, headers=auth_headers)
        assert create_response.status_code == 200
        
        # Search for the post
        response = requests.get(f"{BASE_URL}/api/forum/posts?search={search_term}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to search posts: {response.text}"
        
        posts = response.json()
        assert len(posts) >= 1, f"Search should find at least 1 post with term '{search_term}'"
        
        # Verify search result contains our term
        found = any(search_term in post["title"] or search_term in post["content"] for post in posts)
        assert found, f"Search results should contain posts with '{search_term}'"
        
        print(f"SUCCESS: Search found {len(posts)} posts matching '{search_term}'")


class TestForumReplies(TestCommunityHubAuth):
    """Forum Replies endpoint tests"""
    
    @pytest.fixture(scope="class")
    def test_post(self, auth_headers):
        """Create a test post for reply tests"""
        # Get a category
        cat_response = requests.get(f"{BASE_URL}/api/forum/categories", headers=auth_headers)
        categories = cat_response.json()
        category_id = categories[0]["id"]
        
        unique_id = str(uuid.uuid4())[:8]
        post_data = {
            "category_id": category_id,
            "title": f"TEST_ReplyPost_{unique_id}",
            "content": f"Post for testing replies. ID: {unique_id}",
            "is_pinned": False,
            "is_announcement": False
        }
        
        response = requests.post(f"{BASE_URL}/api/forum/posts", json=post_data, headers=auth_headers)
        assert response.status_code == 200
        return response.json()
    
    def test_create_reply(self, auth_headers, test_post):
        """Test POST /api/forum/posts/{post_id}/replies - create a reply"""
        post_id = test_post["id"]
        unique_id = str(uuid.uuid4())[:8]
        reply_data = {
            "content": f"This is a test reply. ID: {unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/forum/posts/{post_id}/replies", json=reply_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create reply: {response.text}"
        
        reply = response.json()
        assert "id" in reply, "Reply missing id"
        assert reply["post_id"] == post_id, "Reply post_id mismatch"
        assert reply["content"] == reply_data["content"], "Reply content mismatch"
        assert "author_id" in reply, "Reply missing author_id"
        assert "author_name" in reply, "Reply missing author_name"
        
        print(f"SUCCESS: Created reply with ID: {reply['id']}")
        return reply
    
    def test_reply_increments_count(self, auth_headers, test_post):
        """Test that creating a reply increments the post's reply_count"""
        post_id = test_post["id"]
        
        # Get initial reply count
        get_response = requests.get(f"{BASE_URL}/api/forum/posts/{post_id}", headers=auth_headers)
        initial_count = get_response.json().get("reply_count", 0)
        
        # Create a reply
        reply_data = {"content": f"Reply to test count increment {uuid.uuid4()}"}
        requests.post(f"{BASE_URL}/api/forum/posts/{post_id}/replies", json=reply_data, headers=auth_headers)
        
        # Check updated count
        get_response = requests.get(f"{BASE_URL}/api/forum/posts/{post_id}", headers=auth_headers)
        new_count = get_response.json().get("reply_count", 0)
        
        assert new_count > initial_count, f"Reply count should increase. Was {initial_count}, now {new_count}"
        print(f"SUCCESS: Reply count incremented from {initial_count} to {new_count}")


class TestCommunityEvents(TestCommunityHubAuth):
    """Community Events endpoint tests"""
    
    def test_get_community_events(self, auth_headers):
        """Test GET /api/community/events - should return list of events"""
        response = requests.get(f"{BASE_URL}/api/community/events", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get events: {response.text}"
        
        events = response.json()
        assert isinstance(events, list), "Events should be a list"
        print(f"SUCCESS: Community events endpoint returned {len(events)} events")
        return events
    
    def test_create_community_event(self, auth_headers):
        """Test POST /api/community/events - create a new event (admin only)"""
        unique_id = str(uuid.uuid4())[:8]
        event_data = {
            "title": f"TEST_Event_{unique_id}",
            "description": f"Test event description. ID: {unique_id}",
            "event_type": "webinar",
            "date": "2026-02-15",
            "time": "14:00",
            "duration_minutes": 60,
            "location": None,
            "meeting_link": "https://zoom.us/test",
            "max_attendees": 50
        }
        
        response = requests.post(f"{BASE_URL}/api/community/events", json=event_data, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create event: {response.text}"
        
        event = response.json()
        assert "id" in event, "Event missing id"
        assert event["title"] == event_data["title"], "Event title mismatch"
        assert event["description"] == event_data["description"], "Event description mismatch"
        assert event["event_type"] == event_data["event_type"], "Event type mismatch"
        assert event["date"] == event_data["date"], "Event date mismatch"
        assert event["time"] == event_data["time"], "Event time mismatch"
        assert "organizer_id" in event, "Event missing organizer_id"
        assert "organizer_name" in event, "Event missing organizer_name"
        
        print(f"SUCCESS: Created community event with ID: {event['id']}")
        return event
    
    def test_get_event_by_id(self, auth_headers):
        """Test GET /api/community/events/{event_id} - get single event"""
        # First create an event
        unique_id = str(uuid.uuid4())[:8]
        event_data = {
            "title": f"TEST_GetEvent_{unique_id}",
            "description": f"Test event for get test. ID: {unique_id}",
            "event_type": "meetup",
            "date": "2026-03-01",
            "time": "10:00",
            "duration_minutes": 90,
            "location": "Test Location",
            "meeting_link": None,
            "max_attendees": None
        }
        
        create_response = requests.post(f"{BASE_URL}/api/community/events", json=event_data, headers=auth_headers)
        assert create_response.status_code == 200
        created_event = create_response.json()
        event_id = created_event["id"]
        
        # Get the event
        response = requests.get(f"{BASE_URL}/api/community/events/{event_id}", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get event: {response.text}"
        
        event = response.json()
        assert event["id"] == event_id, "Event ID mismatch"
        assert event["title"] == event_data["title"], "Event title mismatch"
        assert "attendee_count" in event, "Event should include attendee_count"
        assert "is_registered" in event, "Event should include is_registered flag"
        
        print(f"SUCCESS: Retrieved community event {event_id}")
        return event
    
    def test_register_for_event(self, auth_headers):
        """Test POST /api/community/events/{event_id}/register - register for event"""
        # Create an event
        unique_id = str(uuid.uuid4())[:8]
        event_data = {
            "title": f"TEST_RegisterEvent_{unique_id}",
            "description": f"Event for registration test. ID: {unique_id}",
            "event_type": "training",
            "date": "2026-04-01",
            "time": "09:00",
            "duration_minutes": 120,
            "location": None,
            "meeting_link": "https://meet.google.com/test",
            "max_attendees": 100
        }
        
        create_response = requests.post(f"{BASE_URL}/api/community/events", json=event_data, headers=auth_headers)
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Register for the event
        response = requests.post(f"{BASE_URL}/api/community/events/{event_id}/register", headers=auth_headers)
        assert response.status_code == 200, f"Failed to register: {response.text}"
        
        result = response.json()
        assert "message" in result, "Response should include message"
        
        # Verify registration
        get_response = requests.get(f"{BASE_URL}/api/community/events/{event_id}", headers=auth_headers)
        event = get_response.json()
        assert event["is_registered"] == True, "User should be registered"
        assert event["attendee_count"] >= 1, "Attendee count should be at least 1"
        
        print(f"SUCCESS: Registered for event {event_id}")
        return event_id
    
    def test_unregister_from_event(self, auth_headers):
        """Test POST /api/community/events/{event_id}/unregister - unregister from event"""
        # Create and register for an event
        unique_id = str(uuid.uuid4())[:8]
        event_data = {
            "title": f"TEST_UnregisterEvent_{unique_id}",
            "description": f"Event for unregistration test. ID: {unique_id}",
            "event_type": "workshop",
            "date": "2026-05-01",
            "time": "13:00",
            "duration_minutes": 180,
            "location": "Workshop Room A",
            "meeting_link": None,
            "max_attendees": 20
        }
        
        create_response = requests.post(f"{BASE_URL}/api/community/events", json=event_data, headers=auth_headers)
        event_id = create_response.json()["id"]
        
        # Register first
        requests.post(f"{BASE_URL}/api/community/events/{event_id}/register", headers=auth_headers)
        
        # Unregister
        response = requests.post(f"{BASE_URL}/api/community/events/{event_id}/unregister", headers=auth_headers)
        assert response.status_code == 200, f"Failed to unregister: {response.text}"
        
        # Verify unregistration
        get_response = requests.get(f"{BASE_URL}/api/community/events/{event_id}", headers=auth_headers)
        event = get_response.json()
        assert event["is_registered"] == False, "User should not be registered"
        
        print(f"SUCCESS: Unregistered from event {event_id}")
    
    def test_event_types(self, auth_headers):
        """Test creating events with different types"""
        event_types = ["webinar", "meetup", "training", "workshop"]
        
        for event_type in event_types:
            unique_id = str(uuid.uuid4())[:8]
            event_data = {
                "title": f"TEST_{event_type}_{unique_id}",
                "description": f"Test {event_type} event",
                "event_type": event_type,
                "date": "2026-06-01",
                "time": "10:00",
                "duration_minutes": 60
            }
            
            response = requests.post(f"{BASE_URL}/api/community/events", json=event_data, headers=auth_headers)
            assert response.status_code == 200, f"Failed to create {event_type} event: {response.text}"
            
            event = response.json()
            assert event["event_type"] == event_type, f"Event type mismatch for {event_type}"
        
        print(f"SUCCESS: Created events with all types: {event_types}")


class TestDashboardAndRostering(TestCommunityHubAuth):
    """Verify Dashboard and Rostering still work (regression tests)"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test GET /api/dashboard/stats - verify dashboard still works"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        
        stats = response.json()
        assert "total_clients" in stats, "Missing total_clients"
        assert "total_staff" in stats, "Missing total_staff"
        assert "upcoming_shifts" in stats, "Missing upcoming_shifts"
        
        print(f"SUCCESS: Dashboard stats working - {stats.get('total_clients', 0)} clients, {stats.get('total_staff', 0)} staff")
    
    def test_shifts_list(self, auth_headers):
        """Test GET /api/shifts - verify rostering still works"""
        response = requests.get(f"{BASE_URL}/api/shifts", headers=auth_headers)
        assert response.status_code == 200, f"Shifts list failed: {response.text}"
        
        shifts = response.json()
        assert isinstance(shifts, list), "Shifts should be a list"
        
        print(f"SUCCESS: Rostering working - {len(shifts)} shifts found")


class TestCleanup(TestCommunityHubAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_posts(self, auth_headers):
        """Clean up TEST_ prefixed posts"""
        response = requests.get(f"{BASE_URL}/api/forum/posts", headers=auth_headers)
        if response.status_code == 200:
            posts = response.json()
            deleted_count = 0
            for post in posts:
                if post.get("title", "").startswith("TEST_"):
                    delete_response = requests.delete(f"{BASE_URL}/api/forum/posts/{post['id']}", headers=auth_headers)
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"Cleaned up {deleted_count} test posts")
    
    def test_cleanup_test_events(self, auth_headers):
        """Clean up TEST_ prefixed events"""
        response = requests.get(f"{BASE_URL}/api/community/events", headers=auth_headers)
        if response.status_code == 200:
            events = response.json()
            deleted_count = 0
            for event in events:
                if event.get("title", "").startswith("TEST_"):
                    delete_response = requests.delete(f"{BASE_URL}/api/community/events/{event['id']}", headers=auth_headers)
                    if delete_response.status_code == 200:
                        deleted_count += 1
            print(f"Cleaned up {deleted_count} test events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
