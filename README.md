# AssureX frontend (React + Vite)
1. `npm install`
2. `cp .env.example .env` (mock mode is on, so the app runs without Flask)
3. `npm run dev`
Demo logins in mock mode: customer@, employee@, reviewer@, admin@ demo.com (any password).
Backend: set `VITE_USE_MOCKS=false`, run Flask with `flask-cors` enabled (also for the card image URL).
Put the exported Teachable Machine files (model.json, metadata.json, weights.bin) in `public/tm-model/`.
Class names in the TM project must be: Valid Claim, Invalid Claim, Manual Review.
Response shapes the API must return are shown by the mock claims at the bottom of `src/api.js`.
