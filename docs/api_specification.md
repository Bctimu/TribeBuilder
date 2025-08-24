1. Authentication Endpoints
POST /api/auth/register
Description: Creates a new user account and an associated artist profile.

Request Body:

email: string (required)

password: string (required)

Response: 201 Created

POST /api/auth/login
Description: Authenticates a user and returns a token for future requests.

Request Body:

email: string (required)

password: string (required)

Response: 200 OK with a JSON object containing an access_token and token_type.

2. Artist Persona Endpoints
GET /api/artists/me
Description: Retrieves the authenticated artist's profile.

Authentication: Requires a valid access_token.

Response: 200 OK with the artist's profile data, including id, name, and persona_data.

POST /api/artists/me/persona
Description: Submits or updates the artist's persona data.

Authentication: Requires a valid access_token.

Request Body:

persona_data: object (required)

Response: 200 OK with a confirmation message.

3. Content Generation Endpoints
POST /api/content/generate
Description: Triggers the AI to generate new content based on the artist's persona.

Authentication: Requires a valid access_token.

Request Body:

content_type: string ('text', 'image', 'video' - Team Alpha focuses on 'text' for now)

Response: 202 Accepted with a confirmation that content generation has started.

GET /api/content
Description: Retrieves a list of previously generated content for the authenticated artist.

Authentication: Requires a valid access_token.

Query Parameters:

status: string (optional, e.g., 'draft', 'published')

Response: 200 OK with an array of generated content objects.