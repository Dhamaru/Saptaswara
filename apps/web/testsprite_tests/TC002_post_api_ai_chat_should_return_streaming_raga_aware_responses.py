import requests

def test_post_api_ai_chat_should_return_streaming_raga_aware_responses():
    base_url = "http://localhost:3000"
    endpoint = "/api/ai/chat"
    url = base_url + endpoint
    token = "eyJhbGciOiJFUzI1NiIsImtpZCI6IjkyYjIyYjdkLWZmM2UtNDVlYS1iYjFhLWJlYTY5NmJlNmViNiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2ZreWNsdmVvdGpqdmJhaXNmdmp0LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMmY5NzM3NC0xNDQ2LTQ5MjYtODgwMi01NWZjNzU5MDQ3NDkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1ODE0MTk4LCJpYXQiOjE3NzU4MTA1OTgsImVtYWlsIjoia2FzaXZhc2kyMDA1QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1ODEwNTk4fV0sInNlc3Npb25faWQiOiJkMDI0OTcyMy00ZWU2LTRlZGEtODZjOC01NGIzY2ZlM2JkNzUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.JRZAqrvfVcM_yB9G6Dg--rqIuL-kDSl6rmc196Z7ytarIqXtZBP8MZPjKrj-hbg8PEKwEOY9bOgBoUPVmIGcgg"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream"
    }
    json_body = {
        "messages": [
            {
                "role": "user",
                "content": "What are the key characteristics of Bhairavi raga?"
            }
        ]
    }
    try:
        with requests.post(url, headers=headers, json=json_body, stream=True, timeout=30) as response:
            # Check HTTP status code
            assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
            # Check Content-Type header for SSE
            content_type = response.headers.get("Content-Type", "")
            assert "text/event-stream" in content_type.lower(), f"Expected 'text/event-stream' in Content-Type, got {content_type}"

            # Read streaming chunks and verify presence of raga content in streamed data
            found_raga_content = False
            for line in response.iter_lines(decode_unicode=True):
                if line:
                    # SSE lines typically start with "data: "
                    if line.startswith("data:"):
                        data_line = line[5:].strip()
                        # Check if data line contains raga-related keywords (like "Bhairavi", "raga", or typical raga related terms)
                        # For a simple check, verify it contains 'Bhairavi' or 'raga' somewhere in the text ignoring case
                        if "bhairavi" in data_line.lower() or "raga" in data_line.lower():
                            found_raga_content = True
                            break
            assert found_raga_content, "No raga-related content found in streaming response"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_ai_chat_should_return_streaming_raga_aware_responses()