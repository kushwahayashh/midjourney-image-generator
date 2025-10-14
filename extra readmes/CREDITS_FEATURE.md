# Credits Display Feature

## Overview
This feature adds a clickable credits display in the header that shows the `creditsExtra` value from the ImaginePro API and allows users to refresh it by clicking.

## Files Created

### 1. `credits.py` (Backend Module)
- **Purpose**: Handles API communication with ImaginePro subscription endpoint
- **Function**: `get_account_credits(api_key)` - Fetches account information
- **Returns**: Dictionary with credits data including:
  - `creditsExtra`: Extra credits available
  - `credits`: Total credits
  - `creditsQuota`: Credit quota
  - `type`: Subscription type
  - `email`: Account email
  - `expiredAt`: Expiration date

### 2. `static/js/credits.js` (Frontend JavaScript)
- **Purpose**: Handles credits display and refresh functionality
- **Key Functions**:
  - `fetchAndDisplayCredits()`: Fetches and updates credits display
  - `handleCreditsClick()`: Handles click event to refresh credits
  - Auto-loads credits on page load
- **Features**:
  - Prevents multiple simultaneous refresh requests
  - Shows loading animation during refresh
  - Displays tooltip with full account details

### 3. `static/css/credits.css` (Styling)
- **Purpose**: Styles the credits display component
- **Features**:
  - Hover effects for better UX
  - Pulse animation during refresh
  - Responsive design for mobile devices
  - Golden coin icon and number styling

## Backend Changes

### `app.py`
Added new endpoint:
```python
@app.route('/api/credits', methods=['GET'])
def get_credits():
    """Get account credits information."""
```

## Frontend Changes

### `templates/index.html`
- Added credits display in header between title and settings button
- Includes coin icon and clickable number
- Linked CSS and JS files

## How It Works

1. **On Page Load**: Credits are automatically fetched and displayed
2. **Click to Refresh**: User clicks the credits number to refresh
3. **Visual Feedback**: Number pulses during refresh
4. **Tooltip**: Hover shows full account details (credits, quota, plan type)

## API Endpoint

**GET** `/api/credits`

**Response**:
```json
{
    "success": true,
    "creditsExtra": 1000,
    "credits": 1600,
    "creditsQuota": 1600,
    "type": "STARTER",
    "email": "xxx@gmail.com",
    "expiredAt": "2022-10-07T14:30:00.000Z"
}
```

## Usage

The credits display is automatically active. Users can:
- View their extra credits at a glance in the header
- Click the number to refresh and get the latest value
- Hover over the number to see full account details

## Styling

- **Color**: Golden (#fbbf24) to match coin theme
- **Font**: Space Mono (monospace) for numbers
- **Animation**: Smooth pulse effect during refresh
- **Responsive**: Adapts to mobile screens
