"""
Credits management module for ImaginePro API.
Handles fetching and displaying account credits information.
"""

import requests
import os


def get_account_credits(api_key):
    """
    Fetch account credits information from ImaginePro API.
    
    Args:
        api_key (str): The API key for authentication
        
    Returns:
        dict: Account information including credits, or error dict
    """
    if not api_key:
        return {'error': 'API key not configured'}
    
    url = "https://api.imaginepro.ai/api/v1/subscription/account-info"
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        # Extract relevant information
        return {
            'success': True,
            'creditsExtra': data.get('creditsExtra', 0),
            'credits': data.get('credits', 0),
            'creditsQuota': data.get('creditsQuota', 0),
            'type': data.get('type', 'UNKNOWN'),
            'email': data.get('email', ''),
            'expiredAt': data.get('expiredAt', '')
        }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching account credits: {e}")
        return {
            'success': False,
            'error': str(e),
            'creditsExtra': 0
        }
    except Exception as e:
        print(f"Unexpected error fetching credits: {e}")
        return {
            'success': False,
            'error': str(e),
            'creditsExtra': 0
        }
