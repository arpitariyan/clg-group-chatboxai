# Support Chat Integration Memory

This file documents the architecture and integration details of the "Contact Us" Support Chat system added to both `chatboxai-renewal` and `chatboxai-admin`.

## Overview
A dedicated Appwrite database project is utilized specifically for the chat support system to separate user help inquiries from primary application data. 

- **Primary Project (`chatboxai-renewal`)**: Contains the user-facing chat UI at `/support` accessed via the `Settings > Help` tab.
- **Admin Project (`chatboxai-admin`)**: Contains the ticket dashboard at `/admin/support` where admins can view grouped tickets and respond.

## Database Details
- **Endpoint**: `https://sgp.cloud.appwrite.io/v1`
- **Project ID**: `6a689f34003d4e359f9e`
- **Database ID**: `6a68a0020011ab75da6c`
- **Collection ID**: `support_messages`
- **Credentials**: Handled purely server-side via `node-appwrite` in Next.js API routes (`/api/support` and `/api/admin/support`) using the provided Server API Key to maintain strict security.

## Collection Schema (`support_messages`)
1. `userEmail` (String, size: 255, required): The authenticated user's email address, used to group threads.
2. `message` (String, size: 5000, required): The content of the support query or reply.
3. `sender` (String, size: 50, required): Enum-like string, either `'user'` or `'admin'`.
4. `createdAt` (Datetime, required): Timestamp of when the message was sent.
5. `read` (Boolean, default: false): Used in the admin panel to show a badge for unread user messages.

## API Architecture
To maintain the security of the Appwrite API Key while allowing seamless chat:
1. **User Client** -> `GET/POST /api/support?email=...` -> **Server Appwrite Client** -> **Appwrite Database**
2. **Admin Client** -> `GET/POST/PUT /api/admin/support` -> **Server Appwrite Client** -> **Appwrite Database**

Both applications have a `services/appwrite-support.js` file exposing an initialized server-side `node-appwrite` Database instance. 

## Real-time vs Polling
For the MVP, both the user client (`app/(routes)/support/page.jsx`) and the admin client (`app/admin/support/page.jsx`) use a 5-second polling interval via `setInterval`. This is simpler than setting up Appwrite's Realtime subscriptions which might require creating user sessions on the secondary Appwrite database. 

## Next Steps / Future Enhancements
- If the chat frequency increases, switch from HTTP polling to WebSockets (Appwrite Realtime) for lower latency and reduced server load.
- Add file attachments to support tickets (using Appwrite Storage on the secondary instance).
