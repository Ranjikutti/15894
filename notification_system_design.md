# Stage 1

## Notification Platform REST API Design

This is a simple API contract for the notification experience a logged-in user will see in the app. The idea is to keep it clean for the frontend team, predictable for the backend, and ready for real-time updates without making the design feel heavy.

## Core Actions

At a minimum, the notification system should let us:

1. Create a notification
2. List notifications for the logged-in user
3. Read a single notification
4. Mark one notification as read
5. Mark all notifications as read
6. Delete a notification
7. Manage notification preferences
8. Receive real-time notification updates

## Design Principles

- Keep endpoint names plural and resource-based
- Use the same naming style everywhere
- Match HTTP methods to the action being performed
- Return JSON for requests and responses
- Support pagination when listing notifications
- Require auth for anything tied to a user account

## Authentication Headers

Every protected request should carry:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept: application/json
```

It is also helpful to send:

```http
X-Request-Id: <client_generated_uuid>
```

## Resource Schema

### Notification Object

```json
{
  "id": "notif_12345",
  "userId": "user_987",
  "type": "appointment_reminder",
  "title": "Appointment tomorrow",
  "message": "Your appointment is scheduled for 10:00 AM tomorrow.",
  "data": {
    "appointmentId": "apt_111",
    "actionUrl": "/appointments/apt_111"
  },
  "isRead": false,
  "createdAt": "2026-06-17T10:30:00Z",
  "readAt": null,
  "expiresAt": null
}
```

### Notification Preference Object

```json
{
  "userId": "user_987",
  "inApp": true,
  "email": false,
  "push": true,
  "categories": {
    "system": true,
    "security": true,
    "marketing": false
  }
}
```

## REST API Endpoints

### 1. List Notifications

Get the current user’s notifications.

```http
GET /api/v1/notifications?limit=20&cursor=notif_100&unreadOnly=false
```

#### Query Parameters

- `limit`: how many items to return
- `cursor`: where the next page starts
- `unreadOnly`: return only unread items when `true`

#### Response 200

```json
{
  "data": [
    {
      "id": "notif_12345",
      "userId": "user_987",
      "type": "appointment_reminder",
      "title": "Appointment tomorrow",
      "message": "Your appointment is scheduled for 10:00 AM tomorrow.",
      "data": {
        "appointmentId": "apt_111",
        "actionUrl": "/appointments/apt_111"
      },
      "isRead": false,
      "createdAt": "2026-06-17T10:30:00Z",
      "readAt": null
    }
  ],
  "page": {
    "limit": 20,
    "nextCursor": "notif_12299",
    "hasMore": true,
    "unreadCount": 3
  }
}
```

#### Response Headers

```http
Content-Type: application/json
Cache-Control: no-store
```

### 2. Get Notification by ID

Fetch one notification for the logged-in user.

```http
GET /api/v1/notifications/{notificationId}
```

#### Response 200

```json
{
  "data": {
    "id": "notif_12345",
    "userId": "user_987",
    "type": "appointment_reminder",
    "title": "Appointment tomorrow",
    "message": "Your appointment is scheduled for 10:00 AM tomorrow.",
    "data": {
      "appointmentId": "apt_111",
      "actionUrl": "/appointments/apt_111"
    },
    "isRead": false,
    "createdAt": "2026-06-17T10:30:00Z",
    "readAt": null,
    "expiresAt": null
  }
}
```

#### Response 404

```json
{
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "Notification not found."
  }
}
```

### 3. Create Notification

Create a new notification for a user. This will usually come from backend jobs, admin tools, or another service.

```http
POST /api/v1/notifications
```

#### Request Body

```json
{
  "userId": "user_987",
  "type": "appointment_reminder",
  "title": "Appointment tomorrow",
  "message": "Your appointment is scheduled for 10:00 AM tomorrow.",
  "data": {
    "appointmentId": "apt_111",
    "actionUrl": "/appointments/apt_111"
  },
  "expiresAt": "2026-06-18T10:30:00Z"
}
```

#### Response 201

```json
{
  "data": {
    "id": "notif_12345",
    "userId": "user_987",
    "type": "appointment_reminder",
    "title": "Appointment tomorrow",
    "message": "Your appointment is scheduled for 10:00 AM tomorrow.",
    "data": {
      "appointmentId": "apt_111",
      "actionUrl": "/appointments/apt_111"
    },
    "isRead": false,
    "createdAt": "2026-06-17T10:30:00Z",
    "readAt": null,
    "expiresAt": "2026-06-18T10:30:00Z"
  }
}
```

#### Response Headers

```http
Location: /api/v1/notifications/notif_12345
Content-Type: application/json
```

### 4. Mark Notification as Read

Mark one notification as read once the user has seen it.

```http
PATCH /api/v1/notifications/{notificationId}/read
```

#### Request Body

```json
{
  "readAt": "2026-06-17T10:45:00Z"
}
```

#### Response 200

```json
{
  "data": {
    "id": "notif_12345",
    "isRead": true,
    "readAt": "2026-06-17T10:45:00Z"
  }
}
```

### 5. Mark All Notifications as Read

Mark all unread notifications for the user as read in one shot.

```http
PATCH /api/v1/notifications/read-all
```

#### Request Body

```json
{
  "readAt": "2026-06-17T10:45:00Z"
}
```

#### Response 200

```json
{
  "data": {
    "updatedCount": 12,
    "readAt": "2026-06-17T10:45:00Z"
  }
}
```

### 6. Delete Notification

Remove a notification from the user’s list.

```http
DELETE /api/v1/notifications/{notificationId}
```

#### Response 204

No response body.

### 7. Get Notification Preferences

Get the current user’s notification settings.

```http
GET /api/v1/notification-preferences
```

#### Response 200

```json
{
  "data": {
    "userId": "user_987",
    "inApp": true,
    "email": false,
    "push": true,
    "categories": {
      "system": true,
      "security": true,
      "marketing": false
    }
  }
}
```

### 8. Update Notification Preferences

Update the current user’s notification settings.

```http
PUT /api/v1/notification-preferences
```

#### Request Body

```json
{
  "inApp": true,
  "email": true,
  "push": false,
  "categories": {
    "system": true,
    "security": true,
    "marketing": false
  }
}
```

#### Response 200

```json
{
  "data": {
    "userId": "user_987",
    "inApp": true,
    "email": true,
    "push": false,
    "categories": {
      "system": true,
      "security": true,
      "marketing": false
    }
  }
}
```

## Error Format

When something goes wrong, the API should reply in the same shape every time.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body is invalid.",
    "details": [
      {
        "field": "title",
        "issue": "Title is required."
      }
    ]
  }
}
```

### Common Error Codes

- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOTIFICATION_NOT_FOUND`
- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `INTERNAL_SERVER_ERROR`

## Real-Time Notification Design

To make notifications feel instant, the API should also expose a real-time channel alongside normal REST requests.

### Recommended Approach

Use **WebSocket** for authenticated live updates.

#### WebSocket Endpoint

```http
wss://api.example.com/api/v1/notifications/stream
```

#### Connection Headers

```http
Authorization: Bearer <access_token>
Sec-WebSocket-Protocol: notifications.v1
```

### WebSocket Events

#### Client Subscribes

```json
{
  "event": "subscribe",
  "data": {
    "userId": "user_987"
  }
}
```

#### Server Sends New Notification

```json
{
  "event": "notification.created",
  "data": {
    "id": "notif_12345",
    "userId": "user_987",
    "type": "appointment_reminder",
    "title": "Appointment tomorrow",
    "message": "Your appointment is scheduled for 10:00 AM tomorrow.",
    "data": {
      "appointmentId": "apt_111",
      "actionUrl": "/appointments/apt_111"
    },
    "isRead": false,
    "createdAt": "2026-06-17T10:30:00Z"
  }
}
```

#### Server Confirms Read Update

```json
{
  "event": "notification.read",
  "data": {
    "notificationId": "notif_12345",
    "isRead": true,
    "readAt": "2026-06-17T10:45:00Z"
  }
}
```

### Real-Time Fallback

If WebSocket is not available, the client can fall back to:

1. Long polling on `GET /api/v1/notifications?limit=20`
2. Periodic polling every few seconds for unread count updates

### Real-Time Metadata Headers

For server-to-client event requests or handshake validation:

```http
Authorization: Bearer <access_token>
X-Client-Version: 1.0.0
X-Session-Id: <session_id>
```

## Example Front-End Flow

1. User logs in
2. Front-end calls `GET /api/v1/notifications`
3. Front-end opens WebSocket stream for live updates
4. New notification arrives through `notification.created`
5. UI updates badge count and notification list immediately
6. User opens a notification
7. Front-end calls `PATCH /api/v1/notifications/{notificationId}/read`
8. Server updates list and broadcasts `notification.read`

## Summary

This design gives us:

- clean REST endpoints for notification management
- predictable JSON request and response shapes
- a consistent error format
- a real-time path for instant updates
