import os
import sys
import requests

BACKEND_URL = os.getenv("BACKEND_URL")
INTERNAL_JOB_SECRET = os.getenv("INTERNAL_JOB_SECRET")

if not BACKEND_URL:
    print("Missing BACKEND_URL")
    sys.exit(1)

if not INTERNAL_JOB_SECRET:
    print("Missing INTERNAL_JOB_SECRET")
    sys.exit(1)

url = f"{BACKEND_URL.rstrip('/')}/internal/jobs/daily-signals"

headers = {
    "X-Internal-Job-Secret": INTERNAL_JOB_SECRET,
}

try:
    response = requests.post(url, headers=headers, timeout=120)
    print("Status:", response.status_code)
    print("Body:", response.text)
    response.raise_for_status()
except Exception as exc:
    print("Cron job failed:", str(exc))
    sys.exit(1)

print("Cron job finished successfully")
