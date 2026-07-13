import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30

def test_get_api_projects_should_return_401_without_auth():
    url = f"{BASE_URL}/api/projects"
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"
        json_response = response.json()
        assert isinstance(json_response, dict), "Response JSON is not a dictionary"
        assert "error" in json_response or "message" in json_response, "Response JSON does not contain 'error' or 'message'"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_api_projects_should_return_401_without_auth()