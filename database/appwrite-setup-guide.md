# Appwrite Database Setup Guide

This file documents every collection you need to create in Appwrite, the exact **Name** and **Collection ID** to use for each, all attributes (columns), and the full process for migrating your existing Supabase data.

---

## Step 1 — Create a Database

In the Appwrite Console:

1. Go to **Databases** → **Create database**
2. Set **Name**: `ChatboxAI`
3. Set **Database ID**: `chatboxai` _(or any ID you prefer — just copy it into your `.env` as `APPWRITE_DATABASE_ID`)_

---

## Step 2 — Create All Collections

For each collection below:

1. Open your database → **Create collection**
2. Enter the **Name** and **Collection ID** exactly as shown
3. Add all the attributes listed — pay attention to type, size, required, and default values
4. After creating attributes, go to **Settings → Permissions** and set:
   - **Any** → Read, Create, Update, Delete _(tighten these later with API-key-only access if needed)_

> **`created_at` strategy:** Appwrite automatically manages `$createdAt` and `$updatedAt` as internal system fields. However, because your Supabase CSV exports contain a `created_at` column, you must **add `created_at` as a plain String attribute on every collection listed below**. This allows the migration script to import the original Supabase timestamps without errors. Do **not** add `updated_at` — it has no equivalent custom attribute and will be stripped during import.

---

### Collection 1 — Users

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| **Name**           | `Users`                              |
| **Collection ID**  | `users`                              |
| **Env var to set** | `APPWRITE_USERS_COLLECTION_ID=users` |

**Attributes:**

| Attribute Key             | Type    | Size | Required | Default  | Notes                                                         |
| ------------------------- | ------- | ---- | -------- | -------- | ------------------------------------------------------------- |
| `created_at`              | String  | 50   | No       | —        | ⬅ **Add this.** Stores original Supabase timestamp (ISO 8601) |
| `email`                   | String  | 320  | ✅ Yes   | —        | Unique; user's email address                                  |
| `name`                    | String  | 100  | No       | —        | Display name                                                  |
| `plan`                    | String  | 20   | No       | `free`   | `free` or `pro`                                               |
| `credits`                 | Integer | —    | No       | `5000`   |                                                               |
| `last_monthly_reset`      | String  | 30   | No       | —        | Date string `YYYY-MM-DD`                                      |
| `mfa_enabled`             | Boolean | —    | No       | `false`  |                                                               |
| `mfa_email`               | String  | 320  | No       | —        | Secondary email for MFA OTP                                   |
| `accent_color`            | String  | 50   | No       | `violet` | UI accent preference                                          |
| `language`                | String  | 10   | No       | `en`     |                                                               |
| `subscription_id`         | String  | 200  | No       | —        | Supabase subscription reference ID                            |
| `subscription_start_date` | String  | 50   | No       | —        | ISO datetime                                                  |
| `subscription_end_date`   | String  | 50   | No       | —        | ISO datetime                                                  |
| `subscription_status`     | String  | 30   | No       | —        | `active`, `expired`, `cancelled`                              |
| `is_blocked`              | Boolean | —    | No       | `false`  | Admin block flag                                              |
| `last_login`              | String  | 50   | No       | —        | ISO datetime                                                  |
| `is_manual_assignment`    | Boolean | —    | No       | `false`  | Admin manual plan override flag                               |
| `team_id`                 | String  | 100  | No       | —        | UUID of team (stored as string)                               |
| `is_team_member`          | Boolean | —    | No       | `false`  | Whether user belongs to a team                                |

**Indexes to create:** Unique index on `email`; additional indexes on `plan`, `is_blocked`, `is_team_member`, `subscription_end_date`, `last_login`, `is_manual_assignment`, `team_id`.

---

### Collection 2 — Library

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| **Name**           | `Library`                                |
| **Collection ID**  | `library`                                |
| **Env var to set** | `APPWRITE_LIBRARY_COLLECTION_ID=library` |

**Attributes:**

| Attribute Key        | Type    | Size    | Required | Default  | Notes                                                                         |
| -------------------- | ------- | ------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `created_at`         | String  | 50      | No       | —        | ⬅ **Add this.** Original Supabase timestamp                                   |
| `libId`              | String  | 100     | No       | —        | Unique per search session. ⬅ **Set Required = No** to avoid CSV import errors |
| `searchInput`        | String  | 1000000 | No       | —        | Original user query (can be long from Supabase text)                          |
| `userEmail`          | String  | 320     | No       | —        | Owner's email                                                                 |
| `type`               | String  | 30      | No       | `search` | `search` or `research`                                                        |
| `selectedModel`      | String  | 200     | No       | —        | Model identifier (stored as string for compatibility)                         |
| `modelName`          | String  | 200     | No       | —        | Model display name                                                            |
| `hasFiles`           | Boolean | —       | No       | `false`  | True when files were attached                                                 |
| `uploadedFiles`      | String  | 1000000 | No       | —        | JSON string of uploaded file metadata                                         |
| `analyzedFilesCount` | Integer | —       | No       | `0`      | Number of files analyzed                                                      |
| `processedAt`        | String  | 50      | No       | —        | ISO datetime when file payload processed                                      |

**Indexes:** Add unique index on `libId`; add index on `userEmail`; add index on `analyzedFilesCount`.

---

### Collection 3 — Chats

| Field              | Value                                |
| ------------------ | ------------------------------------ |
| **Name**           | `Chats`                              |
| **Collection ID**  | `chats`                              |
| **Env var to set** | `APPWRITE_CHATS_COLLECTION_ID=chats` |

**Attributes:**

| Attribute Key        | Type    | Size    | Required | Default     | Notes                                                      |
| -------------------- | ------- | ------- | -------- | ----------- | ---------------------------------------------------------- |
| `created_at`         | String  | 50      | No       | —           | ⬅ **Add this.** Original Supabase timestamp                |
| `libId`              | String  | 100     | No       | —           | Links to Library. ⬅ **Set Required = No** — see note below |
| `userSearchInput`    | String  | 5000    | No       | —           | Follow-up query text                                       |
| `searchResult`       | String  | 1000000 | No       | —           | JSON array of web results (large)                          |
| `aiResp`             | String  | 1000000 | No       | —           | AI response markdown (large)                               |
| `liked`              | String  | 20      | No       | —           | Stores Supabase-style reaction state (`true`/`false`)      |
| `disliked`           | String  | 20      | No       | —           | Stores Supabase-style reaction state (`true`/`false`)      |
| `usedModel`          | String  | 200     | No       | —           | Model name used                                            |
| `modelApi`           | String  | 50      | No       | —           | API provider                                               |
| `analysisType`       | String  | 50      | No       | `text_only` | `text_only`, `file_analysis`, etc.                         |
| `analyzedFilesCount` | Integer | —       | No       | `0`         | Number of files analyzed                                   |
| `processedFiles`     | String  | 1000000 | No       | —           | JSON string of processed file metadata                     |

**Indexes:** Add index on `libId`; add index on `analyzedFilesCount`.

> ⚠️ **`libId` must be Required = No (not required)**
>
> Appwrite's CSV import validates every required attribute against the CSV header row. If `libId` is marked **Required = Yes** in the Console and a CSV row is missing that column — or if the column name has a different case or a trailing space — the entire import fails with:
> `CSV header validation failed: Missing required column: 'libId'`
>
> **Fix in Appwrite Console:**
>
> 1. Open **Database → Chats collection → Attributes → libId**
> 2. Set **Required = No** (uncheck the required toggle)
> 3. Leave **Default** empty (the migration script and app code always supply this value at runtime)
>
> The application code always provides `libId` when creating documents, so making the attribute non-required has no impact on normal app behaviour. It only affects import validation.

> **Note on size:** `searchResult` and `aiResp` can be very large (thousands of tokens). Set their **Size** to `1000000` (1 MB). Appwrite's String attribute max is 1 GB but you must set a practical limit.

> ⚠️ **"CSV row does not match the number of header columns" — cause and fix**
>
> This error means at least one data row has a different number of columns than the header row. In the Chats collection it is almost always caused by:
>
> 1. **Embedded commas in JSON fields** — `searchResult`, `aiResp`, and `processedFiles` contain JSON (e.g. `{"title":"foo","url":"bar"}`). The commas inside the JSON are treated as column separators unless the entire value is wrapped in double-quotes.
> 2. **Embedded newlines in large text fields** — `aiResp` often contains Markdown with newlines (`\n`). Appwrite Console's CSV parser does **not** support RFC-4180 multiline quoted fields, so each `\n` splits the row in two, giving the wrong column count.
>
> **Fix rules for any CSV you import into Appwrite Console:**
>
> - Every field containing a comma **must** be wrapped in double-quotes: `"value,with,commas"`
> - Every field containing a newline **must** have the newline removed or replaced with a space — Appwrite Console cannot handle newlines inside quoted fields
> - Every row must have **exactly** the same number of comma-separated values as the header row
> - No trailing comma at the end of any row
>
> **The files in `database/csv-exports/console-ready/` are already fixed** — the `prepare-console-csvs.mjs` script strips all embedded `\r\n`/`\n`/`\r` from field values and properly quotes any value containing a comma. Always import from that folder, never directly from the raw Supabase export files.
>
> **To regenerate the console-ready files** (e.g. after adding new CSV exports):
>
> ```bash
> node database/prepare-console-csvs.mjs
> ```

> **Note on CSV header formatting:** When importing via Appwrite Console, the header row of your CSV must match attribute names **exactly** — same casing, no extra spaces, no BOM character. Use the pre-processed files in `database/csv-exports/console-ready/` which are already cleaned for Console import.

---

### Collection 4 — ImageGeneration

| Field              | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| **Name**           | `ImageGeneration`                                          |
| **Collection ID**  | `image_generation`                                         |
| **Env var to set** | `APPWRITE_IMAGE_GENERATION_COLLECTION_ID=image_generation` |

**Attributes:**

| Attribute Key        | Type    | Size  | Required | Default      | Notes                                       |
| -------------------- | ------- | ----- | -------- | ------------ | ------------------------------------------- |
| `created_at`         | String  | 50    | No       | —            | ⬅ **Add this.** Original Supabase timestamp |
| `libId`              | String  | 100   | No       | —            | Session identifier                          |
| `userEmail`          | String  | 320   | No       | —            |                                             |
| `prompt`             | String  | 10000 | No       | —            | Full image prompt                           |
| `generatedImagePath` | String  | 500   | No       | —            | Appwrite Storage `fileId`                   |
| `publicUrl`          | String  | 2000  | No       | —            | Full public URL                             |
| `status`             | String  | 30    | No       | `generating` | `generating`, `completed`, `failed`         |
| `model`              | String  | 200   | No       | —            | Model used                                  |
| `width`              | Integer | —     | No       | `1024`       |                                             |
| `height`             | Integer | —     | No       | `1024`       |                                             |

**Indexes:** Add index on `userEmail`; add index on `libId`.

---

### Collection 5 — bug_reports

| Field              | Value                                            |
| ------------------ | ------------------------------------------------ |
| **Name**           | `bug_reports`                                    |
| **Collection ID**  | `bug_reports`                                    |
| **Env var to set** | `APPWRITE_BUG_REPORTS_COLLECTION_ID=bug_reports` |

**Attributes:**

| Attribute Key | Type   | Size  | Required | Default | Notes                                       |
| ------------- | ------ | ----- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String | 50    | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`  | String | 320   | No       | —       |                                             |
| `title`       | String | 500   | No       | —       |                                             |
| `description` | String | 10000 | No       | —       |                                             |
| `status`      | String | 30    | No       | `open`  | `open`, `in_progress`, `resolved`           |

---

### Collection 6 — subscriptions

| Field              | Value                                                |
| ------------------ | ---------------------------------------------------- |
| **Name**           | `subscriptions`                                      |
| **Collection ID**  | `subscriptions`                                      |
| **Env var to set** | `APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=subscriptions` |

**Attributes:**

| Attribute Key | Type   | Size | Required | Default  | Notes                                       |
| ------------- | ------ | ---- | -------- | -------- | ------------------------------------------- |
| `created_at`  | String | 50   | No       | —        | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`  | String | 320  | No       | —        |                                             |
| `plan`        | String | 20   | No       | —        | `free` or `pro`                             |
| `status`      | String | 30   | No       | `active` | `active`, `expired`, `cancelled`            |
| `amount`      | Float  | —    | No       | —        | Payment amount                              |
| `payment_id`  | String | 200  | No       | —        | Razorpay payment ID                         |
| `order_id`    | String | 200  | No       | —        | Razorpay order ID                           |
| `start_date`  | String | 50   | No       | —        | ISO datetime                                |
| `end_date`    | String | 50   | No       | —        | ISO datetime                                |

**Indexes:** Add index on `user_email`; add index on `status`.

---

### Collection 7 — usage_logs

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| **Name**           | `usage_logs`                                   |
| **Collection ID**  | `usage_logs`                                   |
| **Env var to set** | `APPWRITE_USAGE_LOGS_COLLECTION_ID=usage_logs` |

**Attributes:**

| Attribute Key       | Type    | Size | Required | Default | Notes                                       |
| ------------------- | ------- | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`        | String  | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_id`           | String  | 200  | No       | —       | Appwrite document `$id` of user             |
| `model`             | String  | 200  | No       | —       |                                             |
| `operation_type`    | String  | 100  | No       | —       | e.g. `generation`, `search`                 |
| `credits_consumed`  | Integer | —    | No       | —       |                                             |
| `credits_remaining` | Integer | —    | No       | —       |                                             |

---

### Collection 8 — mfa_otps

| Field              | Value                                      |
| ------------------ | ------------------------------------------ |
| **Name**           | `mfa_otps`                                 |
| **Collection ID**  | `mfa_otps`                                 |
| **Env var to set** | `APPWRITE_MFA_OTPS_COLLECTION_ID=mfa_otps` |

**Attributes:**

| Attribute Key | Type    | Size | Required | Default | Notes                                       |
| ------------- | ------- | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String  | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`  | String  | 320  | No       | —       | Primary account email                       |
| `mfa_email`   | String  | 320  | No       | —       | Email OTP is sent to                        |
| `otp`         | String  | 10   | No       | —       | 6-digit code                                |
| `used`        | Boolean | —    | No       | `false` |                                             |
| `expires_at`  | String  | 50   | No       | —       | ISO datetime                                |

---

### Collection 9 — user_seen_updates

| Field              | Value                                                        |
| ------------------ | ------------------------------------------------------------ |
| **Name**           | `user_seen_updates`                                          |
| **Collection ID**  | `user_seen_updates`                                          |
| **Env var to set** | `APPWRITE_USER_SEEN_UPDATES_COLLECTION_ID=user_seen_updates` |

**Attributes:**

| Attribute Key | Type   | Size | Required | Default | Notes                                       |
| ------------- | ------ | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`  | String | 320  | No       | —       |                                             |
| `update_id`   | String | 200  | No       | —       | Identifier of the update/changelog item     |
| `seen_at`     | String | 50   | No       | —       | ISO datetime                                |

---

### Collection 10 — user_subscription_status

| Field              | Value                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| **Name**           | `user_subscription_status`                                                 |
| **Collection ID**  | `user_subscription_status`                                                 |
| **Env var to set** | `APPWRITE_USER_SUBSCRIPTION_STATUS_COLLECTION_ID=user_subscription_status` |

**Attributes:**

| Attribute Key | Type   | Size | Required | Default | Notes                                       |
| ------------- | ------ | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`  | String | 320  | No       | —       |                                             |
| `status`      | String | 30   | No       | —       | `active`, `expired`, `cancelled`            |
| `plan`        | String | 20   | No       | —       | `free` or `pro`                             |

---

### Collection 11 — website_conversations

| Field              | Value                                                                |
| ------------------ | -------------------------------------------------------------------- |
| **Name**           | `website_conversations`                                              |
| **Collection ID**  | `website_conversations`                                              |
| **Env var to set** | `APPWRITE_WEBSITE_CONVERSATIONS_COLLECTION_ID=website_conversations` |

**Attributes:**

| Attribute Key | Type   | Size    | Required | Default | Notes                                       |
| ------------- | ------ | ------- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String | 50      | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `project_id`  | String | 200     | ✅ Yes   | —       | Links to website_projects                   |
| `role`        | String | 20      | No       | —       | `system`, `user`, or `assistant`            |
| `content`     | String | 1000000 | No       | —       | Full message content (large)                |

**Indexes:** Add index on `project_id`.

---

### Collection 12 — website_credit_packages

| Field              | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| **Name**           | `website_credit_packages`                                                |
| **Collection ID**  | `website_credit_packages`                                                |
| **Env var to set** | `APPWRITE_WEBSITE_CREDIT_PACKAGES_COLLECTION_ID=website_credit_packages` |

**Attributes:**

| Attribute Key | Type    | Size | Required | Default | Notes                                       |
| ------------- | ------- | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String  | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `name`        | String  | 200  | No       | —       | Package display name                        |
| `credits`     | Integer | —    | No       | —       | Number of credits included                  |
| `price`       | Integer | —    | No       | —       | Price in smallest currency unit (paise)     |
| `currency`    | String  | 10   | No       | `INR`   |                                             |
| `description` | String  | 1000 | No       | —       |                                             |
| `is_active`   | Boolean | —    | No       | `true`  |                                             |
| `sort_order`  | Integer | —    | No       | `0`     | For display ordering                        |

---

### Collection 13 — website_credit_transactions

| Field              | Value                                                                            |
| ------------------ | -------------------------------------------------------------------------------- |
| **Name**           | `website_credit_transactions`                                                    |
| **Collection ID**  | `website_credit_transactions`                                                    |
| **Env var to set** | `APPWRITE_WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID=website_credit_transactions` |

**Attributes:**

| Attribute Key      | Type    | Size | Required | Default | Notes                                       |
| ------------------ | ------- | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`       | String  | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`       | String  | 320  | No       | —       |                                             |
| `amount`           | Integer | —    | No       | —       | Credits amount                              |
| `transaction_type` | String  | 50   | No       | —       | `purchase`, `deduct`                        |
| `order_id`         | String  | 200  | No       | —       | Razorpay order ID                           |
| `package_id`       | String  | 200  | No       | —       | Links to website_credit_packages `$id`      |

---

### Collection 14 — website_images

| Field              | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| **Name**           | `website_images`                                       |
| **Collection ID**  | `website_images`                                       |
| **Env var to set** | `APPWRITE_WEBSITE_IMAGES_COLLECTION_ID=website_images` |

**Attributes:**

| Attribute Key | Type   | Size | Required | Default | Notes                                       |
| ------------- | ------ | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`  | String | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `project_id`  | String | 200  | No       | —       |                                             |
| `user_email`  | String | 320  | No       | —       |                                             |
| `prompt`      | String | 5000 | No       | —       | Image generation prompt                     |
| `image_url`   | String | 2000 | No       | —       | Full public URL                             |
| `file_id`     | String | 500  | No       | —       | Appwrite Storage `fileId`                   |

---

### Collection 15 — website_projects

| Field              | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| **Name**           | `website_projects`                                         |
| **Collection ID**  | `website_projects`                                         |
| **Env var to set** | `APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID=website_projects` |

**Attributes:**

| Attribute Key        | Type    | Size    | Required | Default | Notes                                       |
| -------------------- | ------- | ------- | -------- | ------- | ------------------------------------------- |
| `created_at`         | String  | 50      | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`         | String  | 320     | ✅ Yes   | —       |                                             |
| `name`               | String  | 500     | No       | —       | Project name                                |
| `description`        | String  | 2000    | No       | —       |                                             |
| `html_content`       | String  | 1000000 | No       | —       | Full HTML (large)                           |
| `is_published`       | Boolean | —       | No       | `false` |                                             |
| `published_url`      | String  | 2000    | No       | —       |                                             |
| `current_version_id` | String  | 200     | No       | —       | `$id` of latest website_version             |

**Indexes:** Add index on `user_email`; add index on `is_published`.

---

### Collection 16 — website_user_credits

| Field              | Value                                                              |
| ------------------ | ------------------------------------------------------------------ |
| **Name**           | `website_user_credits`                                             |
| **Collection ID**  | `website_user_credits`                                             |
| **Env var to set** | `APPWRITE_WEBSITE_USER_CREDITS_COLLECTION_ID=website_user_credits` |

**Attributes:**

| Attribute Key       | Type    | Size | Required | Default | Notes                                       |
| ------------------- | ------- | ---- | -------- | ------- | ------------------------------------------- |
| `created_at`        | String  | 50   | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `user_email`        | String  | 320  | ✅ Yes   | —       | Unique per user                             |
| `weekly_credits`    | Integer | —    | No       | `10`    | Resets every 7 days                         |
| `purchased_credits` | Integer | —    | No       | `0`     |                                             |
| `week_start_date`   | String  | 30   | No       | —       | `YYYY-MM-DD`                                |
| `is_pro`            | Boolean | —    | No       | `false` |                                             |

**Index:** Add a unique index on `user_email`.

---

### Collection 17 — website_versions

| Field              | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| **Name**           | `website_versions`                                         |
| **Collection ID**  | `website_versions`                                         |
| **Env var to set** | `APPWRITE_WEBSITE_VERSIONS_COLLECTION_ID=website_versions` |

**Attributes:**

| Attribute Key    | Type    | Size    | Required | Default | Notes                                       |
| ---------------- | ------- | ------- | -------- | ------- | ------------------------------------------- |
| `created_at`     | String  | 50      | No       | —       | ⬅ **Add this.** Original Supabase timestamp |
| `project_id`     | String  | 200     | ✅ Yes   | —       | Links to website_projects                   |
| `html_content`   | String  | 1000000 | No       | —       | Full HTML snapshot (large)                  |
| `version_number` | Integer | —       | No       | `1`     |                                             |
| `description`    | String  | 1000    | No       | —       | Version label/notes                         |

**Indexes:** Add index on `project_id`.

---

## Step 3 — Update Your `.env`

After creating all collections, copy the Collection IDs into your `.env`:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1

APPWRITE_PROJECT_ID=<your_project_id>
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<your_project_id>

APPWRITE_API_KEY=<your_api_key>

APPWRITE_DATABASE_ID=chatboxai
NEXT_PUBLIC_APPWRITE_DATABASE_ID=chatboxai

APPWRITE_STORAGE_BUCKET_ID=mainStorage
NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID=mainStorage

# Collection IDs (use exactly the IDs you set in the console)
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_LIBRARY_COLLECTION_ID=library
APPWRITE_CHATS_COLLECTION_ID=chats
APPWRITE_IMAGE_GENERATION_COLLECTION_ID=image_generation
APPWRITE_BUG_REPORTS_COLLECTION_ID=bug_reports
APPWRITE_SUBSCRIPTIONS_COLLECTION_ID=subscriptions
APPWRITE_USAGE_LOGS_COLLECTION_ID=usage_logs
APPWRITE_MFA_OTPS_COLLECTION_ID=mfa_otps
APPWRITE_USER_SEEN_UPDATES_COLLECTION_ID=user_seen_updates
APPWRITE_USER_SUBSCRIPTION_STATUS_COLLECTION_ID=user_subscription_status
APPWRITE_WEBSITE_CONVERSATIONS_COLLECTION_ID=website_conversations
APPWRITE_WEBSITE_CREDIT_PACKAGES_COLLECTION_ID=website_credit_packages
APPWRITE_WEBSITE_CREDIT_TRANSACTIONS_COLLECTION_ID=website_credit_transactions
APPWRITE_WEBSITE_IMAGES_COLLECTION_ID=website_images
APPWRITE_WEBSITE_PROJECTS_COLLECTION_ID=website_projects
APPWRITE_WEBSITE_USER_CREDITS_COLLECTION_ID=website_user_credits
APPWRITE_WEBSITE_VERSIONS_COLLECTION_ID=website_versions
```

---

## Step 4 — Export Data from Supabase

For each table you want to migrate:

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Table Editor** → select the table
3. Click the **Download CSV** button in the top-right
4. Save the file as `<table_name>.csv` (e.g., `Users.csv`, `Library.csv`, etc.)

Tables you should export (if they have data):

- `Users`
- `Library`
- `Chats`
- `ImageGeneration`
- `bug_reports`
- `subscriptions`
- `usage_logs`
- `website_projects`
- `website_conversations`
- `website_versions`
- `website_user_credits`
- `website_credit_packages`
- `website_credit_transactions`
- `website_images`
- `user_seen_updates`
- `user_subscription_status`
- `mfa_otps`

> **Note:** Tables like `mfa_otps`, `user_seen_updates`, `user_subscription_status` are likely empty or have transient data — you can skip them.

Place all exported CSVs into a folder, e.g., `database/csv-exports/`.

---

## Step 5 — Import Data into Appwrite

Appwrite has no native CSV import UI. You need to run a migration script.

### 5a — Install dependencies

In your project root:

```bash
npm install csv-parse dotenv
```

### 5b — Create the migration script

Use the maintained script already present in this repository at `database/migrate-from-supabase.mjs`.

> This script already handles real-world Supabase export variations (for example: `*_rows.csv` filenames, header aliases like `lib_id`/`libId`, and per-table column mapping to your Appwrite schema).

### 5c — Run the migration

1. Make sure your `.env` has **real** Appwrite credentials (not placeholders)
2. Place all exported CSVs in `database/csv-exports/`
3. Run:

```bash
node database/migrate-from-supabase.mjs
```

The script will:

- Skip any CSV file it cannot find (so you can safely run partial migrations)
- Log progress every 50 rows
- Print a failure message per row that errors, without aborting the rest

---

## Step 6 — Create the `mainStorage` Bucket

1. In Appwrite Console → **Storage** → **Create bucket**
2. Set **Name**: `mainStorage`
3. Set **Bucket ID**: `mainStorage`
4. **Maximum file size**: `10 MB` (10485760 bytes)
5. **Allowed file extensions**: `pdf, docx, txt, csv, jpg, jpeg, png`
6. **Permissions**: Set **Any** → Create, Read, Delete _(or restrict to API key only)_

---

## Summary Table (quick reference)

| Original Table              | Appwrite Name               | Collection ID                 |
| --------------------------- | --------------------------- | ----------------------------- |
| Users                       | Users                       | `users`                       |
| Library                     | Library                     | `library`                     |
| Chats                       | Chats                       | `chats`                       |
| ImageGeneration             | ImageGeneration             | `image_generation`            |
| bug_reports                 | bug_reports                 | `bug_reports`                 |
| subscriptions               | subscriptions               | `subscriptions`               |
| usage_logs                  | usage_logs                  | `usage_logs`                  |
| mfa_otps                    | mfa_otps                    | `mfa_otps`                    |
| user_seen_updates           | user_seen_updates           | `user_seen_updates`           |
| user_subscription_status    | user_subscription_status    | `user_subscription_status`    |
| website_conversations       | website_conversations       | `website_conversations`       |
| website_credit_packages     | website_credit_packages     | `website_credit_packages`     |
| website_credit_transactions | website_credit_transactions | `website_credit_transactions` |
| website_images              | website_images              | `website_images`              |
| website_projects            | website_projects            | `website_projects`            |
| website_user_credits        | website_user_credits        | `website_user_credits`        |
| website_versions            | website_versions            | `website_versions`            |
| login_activity              | login_activity              | `login_activity`              |
