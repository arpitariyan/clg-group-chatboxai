# Appwrite Collection Setup: document_context

Create a new Appwrite collection named `document_context` (ID can also be `document_context`) in database `APPWRITE_DATABASE_ID`.

## Required Attributes

- `libId` (string, 200, required)
- `ownerEmail` (string, 320, required)
- `filePath` (string, 500, required)
- `fileName` (string, 300, required)
- `fileType` (string, 120, required)
- `contextVersion` (string, 64, required)
- `chunkIndex` (integer, required)
- `chunkText` (string, 10000, required)
- `chunkKeywords` (string, 5000, optional)
- `sourceType` (string, 60, required)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)

## Recommended Indexes

- Composite key index: `libId`, `ownerEmail`, `filePath`
- Composite key index: `libId`, `ownerEmail`, `contextVersion`
- Key index: `chunkIndex`

## Notes

- The backend is tolerant: if this collection is missing, analysis still works, but persistent retrieval is skipped.
- To enable owner-only context retrieval, make sure `ownerEmail` is stored and queryable.
