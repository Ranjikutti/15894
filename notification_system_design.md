# Stage 1

## Notification Platform REST API Design

This is a practical API contract for the notification experience a logged-in user will see in the app. The goal is not to over-engineer it, but to make it feel steady, easy to consume, and ready for real-time updates without making the design bulky.

## Core Actions

At the very least, the notification system should let us:

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
- Stick to one naming style from top to bottom
- Match HTTP methods to the action being performed
- Return JSON for both requests and responses
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

Get the current user’s notifications without making the client do extra work.

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

Fetch one notification for the logged-in user when the UI needs the full detail view.

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

Create a new notification for a user. In real life, this usually comes from backend jobs, admin tools, or another service speaking the same language as the app.

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

Mark one notification as read once the user has opened it.

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

Mark all unread notifications for the user as read in one shot, which keeps the inbox tidy when the user just wants a clean slate.

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

Remove a notification from the user’s list when it is no longer useful.

```http
DELETE /api/v1/notifications/{notificationId}
```

#### Response 204

No response body.

### 7. Get Notification Preferences

Get the current user’s notification settings so the UI can respect what the person actually wants.

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

Update the current user’s notification settings without forcing a full profile save.

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

When something goes wrong, the API should answer in the same shape every time so the frontend never has to guess.

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

To make notifications feel alive instead of delayed, the API should also expose a real-time channel alongside normal REST requests.

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

# Stage 2

## Database Choice

For this notification system, I would suggest using **PostgreSQL** as the primary persistent database.

### Why PostgreSQL fits well

- Notifications have a clear shape, so a relational database fits the problem instead of fighting it
- We need strong consistency when marking notifications as read or updating preferences
- It handles indexing, pagination, filtering, and transactions very well
- JSON support is available for flexible payload data like `data.actionUrl` or `data.appointmentId`
- It is straightforward to query by `userId`, `isRead`, `createdAt`, and notification type

If the system grows later, PostgreSQL can still keep up with partitioning, read replicas, and caching.

## Suggested DB Schema

The database design should keep notifications and preferences separate so each table has one job to do.

### Table 1: `notifications`

Stores each notification sent to a user in a way that is easy to search and easy to age out later.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);
```

### Useful Indexes

```sql
CREATE INDEX idx_notifications_user_created
ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread
ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX idx_notifications_type
ON notifications (type);
```

### Table 2: `notification_preferences`

Stores notification delivery settings for each user without mixing them into the main notification stream.

```sql
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY,
    in_app BOOLEAN NOT NULL DEFAULT TRUE,
    email BOOLEAN NOT NULL DEFAULT FALSE,
    push BOOLEAN NOT NULL DEFAULT TRUE,
    categories JSONB NOT NULL DEFAULT '{
        "system": true,
        "security": true,
        "marketing": false
    }'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## How the Schema Maps to Stage 1 APIs

- `POST /api/v1/notifications` inserts a row into `notifications`
- `GET /api/v1/notifications` reads from `notifications` with filters and pagination
- `GET /api/v1/notifications/{notificationId}` fetches one row by ID
- `PATCH /api/v1/notifications/{notificationId}/read` updates `is_read` and `read_at`
- `PATCH /api/v1/notifications/read-all` updates all unread rows for one user
- `DELETE /api/v1/notifications/{notificationId}` soft-deletes the row using `deleted_at`
- `GET /api/v1/notification-preferences` reads from `notification_preferences`
- `PUT /api/v1/notification-preferences` upserts the preference row

## Example SQL Queries

### 1. Insert a notification

```sql
INSERT INTO notifications (
    id,
    user_id,
    type,
    title,
    message,
    data,
    expires_at
)
VALUES (
    gen_random_uuid(),
    'user_987',
    'appointment_reminder',
    'Appointment tomorrow',
    'Your appointment is scheduled for 10:00 AM tomorrow.',
    '{"appointmentId":"apt_111","actionUrl":"/appointments/apt_111"}'::jsonb,
    '2026-06-18T10:30:00Z'
)
RETURNING *;
```

### 2. List notifications for a user

```sql
SELECT id, user_id, type, title, message, data, is_read, created_at, read_at, expires_at
FROM notifications
WHERE user_id = 'user_987'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

### 3. List only unread notifications

```sql
SELECT id, user_id, type, title, message, data, is_read, created_at
FROM notifications
WHERE user_id = 'user_987'
  AND is_read = FALSE
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

### 4. Get one notification

```sql
SELECT id, user_id, type, title, message, data, is_read, created_at, read_at, expires_at
FROM notifications
WHERE id = 'notif_12345'
  AND user_id = 'user_987'
  AND deleted_at IS NULL;
```

### 5. Mark one notification as read

```sql
UPDATE notifications
SET is_read = TRUE,
    read_at = NOW()
WHERE id = 'notif_12345'
  AND user_id = 'user_987'
  AND deleted_at IS NULL
RETURNING id, is_read, read_at;
```

### 6. Mark all notifications as read

```sql
UPDATE notifications
SET is_read = TRUE,
    read_at = NOW()
WHERE user_id = 'user_987'
  AND is_read = FALSE
  AND deleted_at IS NULL
RETURNING id;
```

### 7. Delete a notification softly

```sql
UPDATE notifications
SET deleted_at = NOW()
WHERE id = 'notif_12345'
  AND user_id = 'user_987';
```

### 8. Upsert notification preferences

```sql
INSERT INTO notification_preferences (
    user_id,
    in_app,
    email,
    push,
    categories,
    updated_at
)
VALUES (
    'user_987',
    TRUE,
    TRUE,
    FALSE,
    '{"system":true,"security":true,"marketing":false}'::jsonb,
    NOW()
)
ON CONFLICT (user_id)
DO UPDATE SET
    in_app = EXCLUDED.in_app,
    email = EXCLUDED.email,
    push = EXCLUDED.push,
    categories = EXCLUDED.categories,
    updated_at = NOW();
```

## Problems That Can Grow With Data Volume

As the notification table gets bigger, a few issues can show up. None of these are surprising, but they are the kind of things that quietly bite later if we do not plan for them.

### 1. Slower list queries

If millions of notifications are stored, `GET /notifications` can become slower, especially when users have large histories.

**Fix:**

- Add indexes on `user_id`, `created_at`, and `is_read`
- Use cursor-based pagination instead of offset pagination
- Keep only recent notifications in the main query path

### 2. Large unread counts and heavy updates

Marking all notifications as read can become expensive for users with many unread records.

**Fix:**

- Update only rows that are still unread
- Keep an unread counter in a summary table or cache
- Use batching if the update set becomes large

### 3. Table growth over time

Notifications can pile up very quickly because they are generated often and rarely changed.

**Fix:**

- Partition the table by month or by tenant/user group
- Archive old notifications
- Soft-delete instead of hard-delete when audit history matters

### 4. Hot partitions for active users

A small number of users may generate or receive a very large number of notifications.

**Fix:**

- Partition or shard by `user_id`
- Cache the latest notifications
- Use background workers for non-critical processing

### 5. Real-time delivery pressure

If many users are connected through WebSocket at once, the delivery layer can become noisy.

**Fix:**

- Use a message broker like Redis Pub/Sub, Kafka, or RabbitMQ behind the WebSocket layer
- Fan out events asynchronously
- Keep the WebSocket payload small

## How I Would Scale It

The system can grow safely with a few practical steps:

1. Use cursor pagination for notification lists
2. Add indexes early, not after the table gets huge
3. Partition old notification data by time
4. Move read-heavy queries to replicas
5. Cache unread counts in Redis if needed
6. Use background jobs for fan-out and preference-based delivery

## NoSQL Alternative

If the project later needs very high write volume and more flexible delivery logs, a NoSQL store like **MongoDB** or **DynamoDB** could also work.

That said, for this stage, PostgreSQL is the better choice because the data is structured, the relationships are simple, and we need dependable updates for read status and preferences.

## Stage 2 Summary

For this notification system, PostgreSQL is a strong default because it is simple, reliable, and easy to query from the Stage 1 API contract. The schema keeps notifications and preferences separated, supports real-time delivery, and leaves room to grow with indexes, pagination, partitioning, caching, and soft deletes.

# Stage 3

## Is the Query Accurate?

The query is basically pointing in the right direction, but I would not call it ideal:

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

It does the main job: it looks for one student, keeps only unread rows, and sorts by creation time. The part that feels rough is `SELECT *`, because that pulls every column whether the API needs them or not. I would also make sure the column names match the schema exactly. If the table uses `student_id`, `is_read`, and `created_at`, the query should stick to that pattern. And unless there is a specific reason to show the oldest unread notification first, ascending order is usually not the friendliest choice for a notification inbox.

## Why It Is Slow

With 5,000,000 notifications, the database starts feeling the weight of the table. If there is no helpful index, it has to look through a lot of rows to find the ones for student `1042`, then sort whatever it found. That gets slower when the student has a big notification history, and `SELECT *` makes it worse because the database has to read and move more data than the UI probably needs.

In simple terms, the database is no longer dealing with a small inbox. It is dealing with a warehouse.

## What I Would Change

I would trim the query down to the fields the frontend actually needs and return the newest unread notifications first.

```sql
SELECT id, student_id, notification_type, title, message, created_at, is_read
FROM notifications
WHERE student_id = 1042
  AND is_read = false
ORDER BY created_at DESC;
```

That version is easier for the app to work with, and it puts the most relevant notification at the top. The real boost comes from a composite index:

```sql
CREATE INDEX idx_notifications_student_unread_created
ON notifications (student_id, is_read, created_at DESC);
```

This gives the database a direct path to the unread notifications for one student, already in the order the inbox wants.

## Likely Computation Cost

The cost depends on whether the database has the right index. Without one, it is close to a full table scan, so the work is roughly `O(N)`, and sorting the matching rows adds something like `O(M log M)` on top. In that case, `N` is the total row count and `M` is the number of rows for that student that are still unread.

With the composite index in place, the engine can jump to the relevant rows much faster, so the practical cost is closer to `O(log N + M)`. That is a much better place to be when the table is this big.

## Should We Add Indexes on Every Column?

No, that is not a good idea. Every index has a maintenance cost, so inserts, updates, and deletes get slower because the database has to keep those indexes in sync. They also take extra storage, and too many of them can make the optimizer work harder than it needs to. More importantly, not every column is actually useful for filtering or sorting.

The better move is to add indexes around real query patterns. For this notification system, the most useful ones are usually:

- `(student_id, is_read, created_at DESC)`
- `(notification_type, created_at)`
- Any foreign key columns used often in joins

That gives us speed where it matters without turning writes into a maintenance headache.

## Query For Placement Notifications In The Last 7 Days

To find all students who received a placement notification in the last 7 days, filter by the `Placement` enum value and the time window.

### SQL Query

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

### If the team wants full notification rows

```sql
SELECT id, student_id, notification_type, title, message, created_at
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Stage 3 Summary

The query works, but it will not age well on a table with millions of rows. The main improvements are simple: do not fetch every column, use a composite index that matches the filter and sort, and return rows in the order the inbox actually needs. Adding indexes everywhere sounds safe, but it usually slows writes down and wastes space. A few well-placed indexes are the better tradeoff. For the placement lookup, a straightforward filter on `notification_type = 'Placement'` and `created_at` is enough.
