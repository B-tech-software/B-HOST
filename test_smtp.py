import smtplib
import os
from dotenv import load_dotenv

load_dotenv('backend-flask/.env')

smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
smtp_port = int(os.getenv("SMTP_PORT", 587))
smtp_user = os.getenv("SMTP_USER")
smtp_password = os.getenv("SMTP_PASSWORD")

print(f"SMTP_SERVER: {smtp_server}")
print(f"SMTP_PORT: {smtp_port}")
print(f"SMTP_USER: {smtp_user}")
print(f"Attempting connection...")

try:
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        print("TLS connection successful")
        server.login(smtp_user, smtp_password)
        print("Login successful")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
