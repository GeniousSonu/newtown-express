# Local Agent Guidelines

When working on this codebase, always refer to the system architecture and database schema in:
`src/lib/config/internal/architecture.md`

Key rules:
- Strictly adhere to Firebase Spark (100% Free Plan) constraints:
  - Do NOT introduce Cloud Functions or Firebase Storage.
  - Payment proofs use canvas client-side compression to base64 in Firestore.
- Maintain tactile neo-brutal styling (#FFF8F2 background, #FF3B30 action, #111111 borders with 4px offset shadow).
- Ensure suppressHydrationWarning is retained on <html> and <body>.
