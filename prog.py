import requests

url = "https://api.imaginepro.ai/api/v1/message/fetch/7393323e-b455-45e8-ba59-afeb7aa3d364"

payload={}
headers = {
   'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NzU3NjIsImVtYWlsIjoic3Rhcmx1bmEwMDAzQGdtYWlsLmNvbSIsInVzZXJuYW1lIjoic3Rhcmx1bmEwMDAzQGdtYWlsLmNvbSIsImlhdCI6MTc2MDEyMjYyNH0.K3mIcgkMrNcghV5fLgAy7T_6Tz0dCLAYhCa5wx1SH80'
}

response = requests.request("GET", url, headers=headers, data=payload)

print(response.text)