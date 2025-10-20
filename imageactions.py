"""
Image Actions Module
Handles upscale and variation operations for generated images.
"""

import requests


def process_button_action(message_id, button, api_key, base_url):
    """
    Process upscale or variation button action.
    
    Args:
        message_id (str): The original message ID
        button (str): Button identifier (U1-U4 for upscale, V1-V4 for variation)
        api_key (str): API key for authentication
        base_url (str): Base URL for the API
        
    Returns:
        dict: Response containing new message_id and other data
        
    Raises:
        ValueError: If API key is not configured
        requests.exceptions.RequestException: If API request fails
    """
    if not api_key:
        raise ValueError("API key not configured")
    
    url = f"{base_url}/nova/button"
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }
    payload = {
        "messageId": message_id,
        "button": button
    }
    
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        
        # Extract new message ID from various possible response structures
        new_message_id = (
            data.get("messageId") or 
            data.get("id") or 
            data.get("data", {}).get("messageId")
        )
        
        if not new_message_id:
            raise ValueError('Failed to get new message ID from API response')
        
        return {
            'message_id': new_message_id,
            'button': button,
            'raw_response': data
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Error calling button API: {e}")
        raise


def get_action_type(button):
    """
    Determine the action type from button identifier.
    
    Args:
        button (str): Button identifier (e.g., 'U1', 'V3')
        
    Returns:
        str: Action type ('Upscale' or 'Variation')
    """
    return "Upscale" if button.startswith('U') else "Variation"


def create_action_prompt(button, original_prompt):
    """
    Create a descriptive prompt for the action.
    
    Args:
        button (str): Button identifier (e.g., 'U1', 'V3')
        original_prompt (str): The original prompt text
        
    Returns:
        str: Formatted prompt describing the action
    """
    action_type = get_action_type(button)
    return f"{action_type} ({button}) of: {original_prompt}"
