import requests
import time
import subprocess
import sys
import os

def test_service():
    # Start the service in the background
    process = subprocess.Popen([sys.executable, "agent.py"], cwd=os.getcwd())
    print(f"Service started with PID: {process.pid}")
    
    # Wait for service to start
    time.sleep(5)
    
    url = "http://localhost:18000/process"
    payload = {
        "promty": "Go to http://localhost:8080/ and click the 'Search patients by name, ID, or phone...' and search 'John' and click the 'View Details' in the first table row and give the all details in JSON fromate",
        "expected_output": "Billing info"
    }
    
    try:
        print(f"Sending request to {url}...")
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Test Passed")
        else:
            print("❌ Test Failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        # Kill the service
        process.terminate()
        process.wait()
        print("Service stopped")

if __name__ == "__main__":
    test_service()
