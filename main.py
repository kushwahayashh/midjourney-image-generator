import requests
import json

url = "https://api.imaginepro.ai/api/v1/nova/button"

payload = json.dumps({
    "messageId": "d5d2951a-407f-459b-81e0-a6a69a3dd95b",
    "button": "U2",
    "ref": "string",
    "webhookOverride": "string"
})

headers = {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzU3NjIsImVtYWlsIjoic3Rhcmx1bmEwMDAzQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoic3Rhcmx1bmEwMDAzQGdtYWlsLmNvbSIsImlhdCI6MTc2MDEyMjYyNH0.K3mIcgkMrNcghV5fLgAy7T_6Tz0dCLAYhCa5wx1SH80',
    'Content-Type': 'application/json'
}

response = requests.post(url, headers=headers, data=payload)

print("Status code:", response.status_code)
print("Response:", response.text)
