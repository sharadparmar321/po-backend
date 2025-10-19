# Procoro PO Backend (PO-only)

- **Install**: `npm install`
- **Env**: copy `.env.example` to `.env` and set DB and Google credentials.
- **Run dev**: `npm run dev`
- **Migrate**: `npx sequelize-cli db:migrate`

Required env keys:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `GOOGLE_CREDENTIALS` (Service Account JSON), `GOOGLE_SHEET_ID`
