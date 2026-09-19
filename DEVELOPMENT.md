# ありか — Human Time Hackathon mock

## Product boundary
One shared space. Creator-only capture, initial analysis, editing and deletion. Bearer invitation allows read/search and bounded AI reinspection without a ChatGPT account. Identity and authorization are centralized in lib/server.ts so account-backed identities can replace invitation capabilities later.

## Operations
The private management link supplies an ADMIN_TOKEN through a URL fragment, exchanged for a Secure/HttpOnly/SameSite=Lax cookie. Do not share the management link. Visitors use a separate random invitation. Rotation invalidates existing visitor cookies. No tokens appear in source code, links in API responses to visitors, or server-side URLs. The page disables indexing and referrer forwarding.

Enter an OpenAI API key in the creator's Shared tab. The key is encrypted with AES-GCM under a key derived from the runtime ADMIN_TOKEN. Rotating ADMIN_TOKEN requires reentering the API key. Optional runtime OPENAI_API_KEY takes precedence. Actual keys must never be committed.

## Capture and search
Safari uploads a selected video (<=90 seconds, <=150 MB) or up to12 photos. Local canvas extraction produces at most12 JPEG frames, longest edge1536px. The user reviews frames and confirms capture time before saving. Only those frames are uploaded. Original video is not retained. Up to three candidates per time interval are ranked for sharpness; excluded frames are replenished from unused candidates. Sampling can miss fleeting or obscured objects and does not constitute analysis of every frame or physical 3D location.

Initial gpt-4.1-mini analysis produces visible-object labels, descriptions, relative location and approximate image boxes. Saved-record search is deterministic keyword matching plus a small synonym list, with no per-search API charge. Optional question-conditioned reinspection sends all extracted images of one selected capture to the API. Responses are grounded in source images; malformed object/frame/box data is filtered. Unknown results remain unknown.

## Budget and evaluation
Public standard pricing reference: https://developers.openai.com/api/docs/models/gpt-4.1-mini
Input $0.40/M, output $1.60/M. Full input rate used conservatively even if cached. Cost is an estimate, not an invoice. Each three-image batch reserves $0.05 in D1 against the installation's cumulative budget (default $4.50, preserving $0.50 from the original $5 budget). Administrators can set a lower operational limit; the deployment AI_BUDGET_CAP bounds it. Changing settings never resets usage. Failed/unknown calls retain their reservation. Recorded provider usage replaces the reservation. This applies to this app only; other uses of the user's key are outside its control.

The feedback screen records reported real-object finding, elapsed time from search to feedback, and intended next activity. It does not infer causal time savings or measured Human Time gains.

## Verification
node --test tests/arika-security.test.mjs checks unauthenticated denial, owner-only mutations, protected images, encrypted key persistence, invitation revocation and usage-based billing/budget blocking using local SQLite and fake API responses (no paid calls).
npx tsc --noEmit checks runtime contracts and app code.
The Sites build compiles the production Worker. Real iPhone Safari capture, real AI output quality and multi-device public access require a user smoke test after publishing; they have not been represented as verified.

## Presentation smoke test
1. Open management link; Shared tab; configure key.
2. Capture a short slow sweep or select photos of objects in the shared space.
3. Review extracted images, set place/time and save/analyze.
4. Copy invitation link from Shared; open on another device without ChatGPT sign-in.
5. Search for a visible object; inspect image and approximate highlight.
6. If no candidate, select a capture for AI reinspection; show real response time/cost.
7. Locate the real object and record what meaningful work to return to.
8. Try an absent object; explain blind spots and last-seen boundary.

## Installation settings
See DEPLOYMENT.md for isolated company installation, secure administrator provisioning and initially empty API configuration. Existing installations retain the same Site ID, tokens, storage and default budget.

## Delivery discipline
Freeze a demo-stable Git tag for the published revision. Continue subsequent changes on a development branch; do not overwrite deployed migrations. Time-critical changes should be bounded and rechecked before publication.
