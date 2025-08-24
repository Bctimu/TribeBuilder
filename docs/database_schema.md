1. users table
This table will store user authentication and profile data.

id: UUID (Primary Key). A unique identifier for each user.

email: VARCHAR(255) (Unique, Not Null). The user's email address for login.

password_hash: VARCHAR(255) (Not Null). A hashed version of the user's password for security.

created_at: TIMESTAMP (Default NOW()). The timestamp when the user account was created.

updated_at: TIMESTAMP (Default NOW()). The timestamp of the last update to the user's profile.

2. artists table
This table will store an artist's profile information and persona data.

id: UUID (Primary Key). A unique identifier for each artist.

user_id: UUID (Foreign Key, Unique, Not Null). Links the artist to a user account in the users table.

name: VARCHAR(255) (Not Null). The artist's stage name.

genre: VARCHAR(100). The artist's music genre.

persona_data: JSONB. A flexible field to store unstructured data from surveys, interviews, and other inputs.

3. social_accounts table
This table will manage connections to various social media platforms.

id: UUID (Primary Key). A unique identifier for each social media account link.

artist_id: UUID (Foreign Key, Not Null). Links to the artists table.

platform: VARCHAR(50) (Not Null). The social media platform (e.g., 'Instagram', 'TikTok').

access_token: VARCHAR(255) (Not Null). The OAuth token needed to make API requests.

expires_at: TIMESTAMP. The expiration time of the access token.

refresh_token: VARCHAR(255). A token used to refresh the access token without requiring the user to log in again.

4. generated_content table
This table will store content created by the AI.

id: UUID (Primary Key). A unique identifier for the content.

artist_id: UUID (Foreign Key, Not Null). Links to the artists table.

content_type: VARCHAR(50) (Not Null). The type of content (e.g., 'text', 'image').

content_data: JSONB. The actual content, which could be a text string or a URL to an image/video file.

status: VARCHAR(50) (Default 'draft'). The state of the content (e.g., 'draft', 'pending_approval', 'published').

created_at: TIMESTAMP (Default NOW()). The timestamp when the content was generated.