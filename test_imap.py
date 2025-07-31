#!/usr/bin/env python3
import imaplib
import ssl
import sys

def test_imap_connection(email, password, host, port=993):
    """Test IMAP connection with given credentials"""
    print(f"Testing IMAP connection for {email}...")
    print(f"Host: {host}:{port}")
    
    try:
        # Create SSL context
        context = ssl.create_default_context()
        
        # Connect to IMAP server
        print("Connecting to server...")
        mail = imaplib.IMAP4_SSL(host, port, ssl_context=context)
        
        # Login
        print("Attempting login...")
        mail.login(email, password)
        
        # List folders
        print("✅ Login successful! Listing folders...")
        status, folders = mail.list()
        
        if status == 'OK':
            print("Available folders:")
            for folder in folders[:5]:  # Show first 5 folders
                print(f"  - {folder.decode()}")
        
        # Select INBOX and get count
        mail.select('INBOX')
        status, messages = mail.search(None, 'ALL')
        
        if status == 'OK':
            count = len(messages[0].split())
            print(f"📧 INBOX contains {count} emails")
        
        # Test recent emails
        status, recent = mail.search(None, 'RECENT')
        if status == 'OK':
            recent_count = len(recent[0].split()) if recent[0] else 0
            print(f"📬 {recent_count} recent emails")
        
        mail.logout()
        print("✅ Connection test SUCCESSFUL!")
        return True
        
    except imaplib.IMAP4.error as e:
        print(f"❌ IMAP Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        return False

def main():
    print("=== IMAP Connection Tester ===\n")
    
    # Test GoDaddy only
    email = input("GoDaddy email: ")
    password = input("GoDaddy password: ")
    
    if not email:
        print("No email provided")
        return
    
    print(f"\n--- Testing GoDaddy ---")
    success = test_imap_connection(email, password, "imap.secureserver.net", 993)
    
    if success:
        print(f"\n.env configuration:")
        print(f"GMAIL_USER_1={email}")
        print(f"GMAIL_PASS_1={password}")
        print(f"GMAIL_IMAP_HOST_1=imap.secureserver.net")
        print(f"GMAIL_IMAP_PORT_1=993")
    else:
        print("❌ Connection failed")

if __name__ == "__main__":
    main()
