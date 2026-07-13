import requests

def test_post_api_export_midi_should_download_valid_midi_file():
    base_url = "http://localhost:3000"
    endpoint = "/api/export/midi"
    url = base_url + endpoint
    jwt_token = (
        "eyJhbGciOiJFUzI1NiIsImtpZCI6IjkyYjIyYjdkLWZmM2UtNDVlYS1iYjFhLWJlYTY5NmJlNmViNiIsInR5cCI6IkpXVCJ9."
        "eyJpc3MiOiJodHRwczovL2ZreWNsdmVvdGpqdmJhaXNmdmp0LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMmY5NzM3NC0xNDQ2LTQ5MjYtODgwMi01NWZjNzU5MDQ3NDkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzc1ODE0MTk4LCJpYXQiOjE3NzU4MTA1OTgsImVtYWlsIjoia2FzaXZhc2kyMDA1QGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWV9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6InBhc3N3b3JkIiwidGltZXN0YW1wIjoxNzc1ODEwNTk4fV0sInNlc3Npb25faWQiOiJkMDI0OTcyMy00ZWU2LTRlZGEtODZjOC01NGIzY2ZlM2JkNzUiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ."
        "JRZAqrvfVcM_yB9G6Dg--rqIuL-kDSl6rmc196Z7ytarIqXtZBP8MZPjKrj-hbg8PEKwEOY9bOgBoUPVmIGcgg"
    )
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "composition": {
            "layers": [
                {
                    "id": "1",
                    "type": "melody",
                    "name": "Main",
                    "sequence": [
                        {"frequency": 261.63}
                    ]
                }
            ],
            "bpm": 120,
            "name": "Test Export"
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Validate HTTP status code
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    # Validate Content-Type header
    content_type = response.headers.get("Content-Type", "")
    assert content_type == "audio/midi", f"Expected Content-Type 'audio/midi', got '{content_type}'"

    # Validate the response content is binary and non-empty
    content = response.content
    assert isinstance(content, bytes), "Response content is not bytes"
    assert len(content) > 0, "Response content is empty"

    # Basic validation of MIDI file header (MThd)
    # MIDI files start with ASCII chars 'MThd' as first 4 bytes
    assert content.startswith(b'MThd'), "Response content does not start with 'MThd' (not a valid MIDI file)"

test_post_api_export_midi_should_download_valid_midi_file()