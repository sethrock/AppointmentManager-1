#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"

# Test scenarios from spreadsheet
test_scenarios = [
    {
        "name": "John Schedule-Complete",
        "workflow": ["Schedule", "Complete"],
        "client_data": {
            "clientName": "John Schedule-Complete",
            "phoneNumber": "555-0001",
            "clientEmail": "john.test@example.com",
            "startDate": "2025-06-08",
            "startTime": "14:00",
            "endTime": "15:00",
            "callType": "out-call",
            "streetAddress": "123 Test St",
            "city": "Los Angeles",
            "state": "CA",
            "zipCode": "90210",
            "grossRevenue": 500,
            "depositAmount": 200,
            "paymentProcessUsed": "CashApp",
            "marketingChannel": "Website",
            "setBy": "Test User",
            "provider": "Service Provider"
        }
    },
    {
        "name": "Peter Schedule-Reschedule-Complete", 
        "workflow": ["Schedule", "Reschedule", "Complete"],
        "client_data": {
            "clientName": "Peter Schedule-Reschedule-Complete",
            "phoneNumber": "555-0002",
            "clientEmail": "peter.test@example.com",
            "startDate": "2025-06-09",
            "startTime": "16:00",
            "endTime": "17:00",
            "callType": "in-call",
            "grossRevenue": 400,
            "depositAmount": 150,
            "paymentProcessUsed": "Zelle",
            "marketingChannel": "Referral",
            "setBy": "Test User",
            "provider": "Service Provider"
        }
    },
    {
        "name": "Paul Schedule-Reschedule-Cancel",
        "workflow": ["Schedule", "Reschedule", "Cancel"],
        "client_data": {
            "clientName": "Paul Schedule-Reschedule-Cancel",
            "phoneNumber": "555-0003", 
            "clientEmail": "paul.test@example.com",
            "startDate": "2025-06-10",
            "startTime": "18:00",
            "endTime": "19:00",
            "callType": "out-call",
            "streetAddress": "456 Demo Ave",
            "city": "Beverly Hills",
            "state": "CA",
            "zipCode": "90211",
            "grossRevenue": 600,
            "depositAmount": 250,
            "paymentProcessUsed": "Venmo",
            "marketingChannel": "Social Media",
            "setBy": "Test User",
            "provider": "Service Provider"
        }
    },
    {
        "name": "Mary Schedule-Cancel",
        "workflow": ["Schedule", "Cancel"],
        "client_data": {
            "clientName": "Mary Schedule-Cancel",
            "phoneNumber": "555-0004",
            "clientEmail": "mary.test@example.com", 
            "startDate": "2025-06-11",
            "startTime": "12:00",
            "endTime": "13:00",
            "callType": "in-call",
            "grossRevenue": 350,
            "depositAmount": 100,
            "paymentProcessUsed": "Cash",
            "marketingChannel": "Walk-in",
            "setBy": "Test User",
            "provider": "Service Provider"
        }
    }
]

def make_request(method, endpoint, data=None):
    """Make HTTP request and return response"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method == "POST":
            response = requests.post(url, json=data)
        elif method == "PATCH":
            response = requests.patch(url, json=data)
        elif method == "GET":
            response = requests.get(url)
        else:
            return None
            
        return {
            "status_code": response.status_code,
            "data": response.json() if response.content else None,
            "success": response.status_code < 400
        }
    except Exception as e:
        return {
            "status_code": 0,
            "error": str(e),
            "success": False
        }

def test_calendar_connection():
    """Test Google Calendar API connection"""
    print("=== Testing Google Calendar Connection ===")
    result = make_request("POST", "/api/test/calendar")
    print(f"Calendar Test Result: {result}")
    return result.get("success", False) if result else False

def create_appointment(client_data):
    """Create a new appointment"""
    print(f"\n--- Creating appointment for {client_data['clientName']} ---")
    result = make_request("POST", "/api/appointments", client_data)
    if result and result["success"]:
        appointment_id = result["data"]["id"]
        print(f"✅ Created appointment ID: {appointment_id}")
        return appointment_id
    else:
        print(f"❌ Failed to create appointment: {result}")
        return None

def update_appointment_status(appointment_id, status, additional_data=None):
    """Update appointment status"""
    update_data = {"dispositionStatus": status}
    if additional_data:
        update_data.update(additional_data)
    
    print(f"\n--- Updating appointment {appointment_id} to {status} ---")
    result = make_request("PATCH", f"/api/appointments/{appointment_id}", update_data)
    if result and result["success"]:
        print(f"✅ Updated appointment to {status}")
        return True
    else:
        print(f"❌ Failed to update appointment: {result}")
        return False

def get_appointment(appointment_id):
    """Get appointment details"""
    result = make_request("GET", f"/api/appointments/{appointment_id}")
    return result["data"] if result and result["success"] else None

def run_workflow_test(scenario):
    """Run complete workflow test for a scenario"""
    print(f"\n{'='*60}")
    print(f"TESTING WORKFLOW: {scenario['name']}")
    print(f"Expected workflow: {' → '.join(scenario['workflow'])}")
    print(f"{'='*60}")
    
    # Step 1: Create appointment (Schedule)
    appointment_id = create_appointment(scenario["client_data"])
    if not appointment_id:
        print(f"❌ WORKFLOW FAILED: Could not create appointment")
        return False
    
    # Wait a moment for calendar processing
    time.sleep(2)
    
    # Check appointment details
    appointment = get_appointment(appointment_id)
    if appointment:
        print(f"📅 Calendar Event ID: {appointment.get('calendarEventId', 'None')}")
    
    # Execute remaining workflow steps
    for step in scenario["workflow"][1:]:  # Skip first "Schedule" step
        success = False
        if step == "Reschedule":
            # Update with new date/time for reschedule
            reschedule_data = {
                "updatedStartDate": "2025-06-15",  # Move to different date
                "updatedStartTime": "15:00",
                "updatedEndTime": "16:00"
            }
            success = update_appointment_status(appointment_id, "Reschedule", reschedule_data)
        elif step == "Complete":
            # Update with completion data
            complete_data = {
                "totalCollected": scenario["client_data"]["grossRevenue"],
                "totalCollectedCash": 100,
                "totalCollectedDigital": scenario["client_data"]["grossRevenue"] - 100,
                "appointmentNotes": "Appointment completed successfully",
                "seeClientAgain": True
            }
            success = update_appointment_status(appointment_id, "Complete", complete_data)
        elif step == "Cancel":
            # Update with cancellation data
            cancel_data = {
                "whoCanceled": "client",
                "cancellationDetails": "Client requested cancellation - apply deposit to future booking"
            }
            success = update_appointment_status(appointment_id, "Cancel", cancel_data)
        
        if not success:
            print(f"❌ WORKFLOW FAILED at step: {step}")
            return False
            
        # Wait for processing
        time.sleep(2)
        
        # Check updated appointment
        appointment = get_appointment(appointment_id)
        if appointment:
            print(f"📅 Updated Calendar Event ID: {appointment.get('calendarEventId', 'None')}")
    
    print(f"✅ WORKFLOW COMPLETED: {scenario['name']}")
    return True

def main():
    """Run complete Google Calendar integration test"""
    print("🔍 GOOGLE CALENDAR INTEGRATION AUDIT")
    print("=" * 50)
    
    # Test calendar connection first
    calendar_connected = test_calendar_connection()
    
    # Track test results
    results = {
        "calendar_connection": calendar_connected,
        "workflows": {}
    }
    
    # Run workflow tests
    for scenario in test_scenarios:
        success = run_workflow_test(scenario)
        results["workflows"][scenario["name"]] = success
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Calendar Connection: {'✅ PASS' if results['calendar_connection'] else '❌ FAIL'}")
    
    for name, success in results["workflows"].items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"Workflow {name}: {status}")
    
    # Save results
    with open("calendar_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📊 Detailed results saved to calendar_test_results.json")

if __name__ == "__main__":
    main()