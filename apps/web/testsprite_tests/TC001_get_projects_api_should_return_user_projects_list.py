import requests

def test_get_projects_api_should_return_user_projects_list():
    base_url = "http://localhost:3000"
    endpoint = "/api/projects"
    url = base_url + endpoint
    token = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjkyYjIyYjdkLWZmM2UtNDVlYS1iYjFhLWJlYTY5NmJlNmViNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2ZreWNsdmVvdGpqdmJhaXNmdmp0LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMmY5NzM3NC0xNDQ2LTQ5MjYtODgwMi01NWZjNzU5MDQ3NDkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1ODE0MTk4LCJpYXQiOjE3NzU4MTA1OTgsImVtYWlsIjoia2FzaXZhc2kyMDA1QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1ODEwNTk4fV0sInNlc3Npb25faWQiOiJkMDI0OTcyMy00ZWU2LTRlZGEtODZjOC01NGIzY2ZlM2JkNzUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.JRZAqrvfVcM_yB9G6Dg--rqIuL-kDSl6rmc196Z7ytarIqXtZBP8MZPjKrj-hbg8PEKwEOY9bOgBoUPVmIGcgg"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not a valid JSON"

    assert isinstance(data, list), f"Expected response to be a JSON array, got {type(data)}"

test_get_projects_api_should_return_user_projects_list()