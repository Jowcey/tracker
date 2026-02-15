# Organization API Keys

## Overview

Organization API keys provide permanent authentication for GPS trackers and mobile apps. Unlike user auth tokens (which expire and are tied to individual users), API keys:

- ✅ Never expire unless manually revoked
- ✅ Belong to organizations (not users)
- ✅ Can be managed by organization admins
- ✅ Track last usage for security monitoring
- ✅ Support multiple keys per organization

## Quick Start

### Generate an API Key

```bash
./generate-api-key.sh
```

This will:
1. Login with admin credentials
2. Generate a new API key for Organization 1
3. Display the key (COPY IT - you won't see it again!)

### Use the API Key

**Mobile App Configuration:**
```
API URL: http://192.168.0.53:8888
API Key: trk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Tracker ID: [Your tracker ID]
```

**Manual API Request:**
```bash
curl -X POST http://192.168.0.53:8888/api/tracker/location \
  -H "Content-Type: application/json" \
  -H "X-API-Key: trk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -d '{"tracker_id":6,"latitude":40.7128,"longitude":-74.0060,"speed":25.5,"heading":180}'
```

## API Key Format

```
trk_live_abc123def456ghi789jkl012mno345pq
├─ prefix (trk_live_ or trk_test_)
└─ random 32 characters (alphanumeric)
```

- **Live keys** (`trk_live_`): For production use
- **Test keys** (`trk_test_`): For development/testing

## API Endpoints

### List API Keys

```http
GET /api/organizations/{org}/api-keys
Authorization: Bearer {user_token}
```

Returns all active API keys for the organization (hashed keys not included).

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Mobile App",
      "prefix": "trk_live_",
      "last_used_at": "2026-02-15T17:45:00.000000Z",
      "created_at": "2026-02-15T17:44:31.000000Z",
      "creator": {
        "id": 1,
        "name": "Admin User"
      }
    }
  ]
}
```

### Generate New API Key

```http
POST /api/organizations/{org}/api-keys
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "name": "Mobile App",
  "prefix": "trk_live_"
}
```

**Response:**
```json
{
  "message": "API key created successfully. Make sure to copy it now - you will not be able to see it again!",
  "api_key": {
    "id": 1,
    "name": "Mobile App",
    "prefix": "trk_live_",
    "organization_id": 1,
    "created_by": 1
  },
  "plain_key": "trk_live_abc123def456ghi789jkl012mno345pq"
}
```

⚠️ **Important:** The `plain_key` is shown ONLY ONCE. Store it securely.

### Revoke API Key

```http
DELETE /api/organizations/{org}/api-keys/{key_id}
Authorization: Bearer {user_token}
```

Soft-deletes the API key (sets `revoked_at` timestamp). Revoked keys can't be used for authentication.

### Post Location (Using API Key)

```http
POST /api/tracker/location
Content-Type: application/json
X-API-Key: trk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

{
  "tracker_id": 6,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "altitude": 150.5,
  "speed": 25.5,
  "heading": 180,
  "accuracy": 10.0,
  "satellites": 12,
  "recorded_at": "2026-02-15T17:45:00Z"
}
```

**Response:**
```json
{
  "message": "Location stored successfully",
  "location_id": 128
}
```

## Permissions

| Role | View API Keys | Generate Keys | Revoke Keys |
|------|---------------|---------------|-------------|
| Owner | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Manager | ✅ | ❌ | ❌ |
| Viewer | ❌ | ❌ | ❌ |

## Security

### Storage
- Plain text keys are NEVER stored in the database
- Keys are hashed using SHA-256 before storage
- Only the hash is stored in `organization_api_keys.key_hash`

### Authentication Flow
1. Client sends API key via `X-API-Key` header or `api_key` query param
2. Middleware hashes the key
3. Looks up hash in database
4. Checks if key is revoked (`revoked_at IS NULL`)
5. Attaches `organization_id` to request
6. Controller verifies tracker belongs to organization

### Rate Limiting
Location endpoint is rate-limited to **60 requests per minute** per IP.

### Best Practices
- ✅ Use test keys (`trk_test_`) for development
- ✅ Use live keys (`trk_live_`) for production only
- ✅ Revoke keys if compromised
- ✅ Generate separate keys for each app/device type
- ✅ Monitor `last_used_at` to detect unused keys
- ❌ Never commit API keys to version control
- ❌ Never share keys publicly

## Database Schema

```sql
CREATE TABLE organization_api_keys (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  organization_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  prefix VARCHAR(20) NOT NULL,
  last_used_at TIMESTAMP NULL,
  created_by BIGINT NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  INDEX idx_org_revoked (organization_id, revoked_at),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);
```

## Implementation Files

**Backend:**
- `app/Models/OrganizationApiKey.php` - Model
- `app/Http/Controllers/Api/OrganizationApiKeyController.php` - Controller
- `app/Http/Middleware/AuthenticateApiKey.php` - Middleware
- `app/Policies/OrganizationPolicy.php` - Authorization policies
- `database/migrations/*_create_organization_api_keys_table.php` - Migration
- `routes/api.php` - API routes

**Scripts:**
- `generate-api-key.sh` - Generate new API key via CLI

## Troubleshooting

### "Invalid or revoked API key"
- Key is incorrect or has been revoked
- Generate a new key with `./generate-api-key.sh`

### "API key is required"
- Missing `X-API-Key` header
- Add header: `-H "X-API-Key: your_key_here"`

### "No query results for model [App\\Models\\Tracker]"
- Tracker ID doesn't exist
- Tracker is soft-deleted
- Tracker belongs to different organization
- Check with: `SELECT id, name, deleted_at FROM trackers WHERE organization_id=1;`

### Location not saving
- Ensure tracker exists and is active (`deleted_at IS NULL`)
- Verify tracker belongs to same organization as API key
- Check API endpoint: `POST /api/tracker/location`

## Example: Mobile App Integration

**React Native (Expo):**
```javascript
const API_URL = 'http://192.168.0.53:8888';
const API_KEY = 'trk_live_xxxxx';
const TRACKER_ID = 6;

async function sendLocation(latitude, longitude) {
  const response = await fetch(`${API_URL}/api/tracker/location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      tracker_id: TRACKER_ID,
      latitude,
      longitude,
      speed: 0,
      heading: 0,
    }),
  });
  
  return response.json();
}
```

## Future Enhancements

- [ ] API key scopes (read-only vs write)
- [ ] Expiration dates for temporary keys
- [ ] Key rotation policies
- [ ] Usage analytics dashboard
- [ ] Webhook support for key events
