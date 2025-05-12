Here's the comprehensive API documentation with properly formatted endpoints and curl examples:

# Movie API Documentation

## Base URL
`https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod`

## Authentication Endpoints

### User Signup
**Endpoint**: `POST /auth/signup`  
**Description**: Register a new user account  
**Request**:
```bash
curl -X POST \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```
**Response (201 Created)**:
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "a1b2c3d4-5678-90ef-ghij-klmnopqrstuv",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### User Signin
**Endpoint**: `POST /auth/signin`  
**Description**: Authenticate and receive access token  
**Request**:
```bash
curl -X POST \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```
**Response (200 OK)**:
```json
{
  "message": "Sign-in successful",
  "user": {
    "userId": "a1b2c3d4-5678-90ef-ghij-klmnopqrstuv",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Movie Endpoints

### Get All Movies
**Endpoint**: `GET /movies`  
**Description**: Retrieve list of all movies  
**Request**:
```bash
curl -X GET \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/movies \
  -H "Content-Type: application/json"
```
**Response (200 OK)**:
```json
[
  {
    "movieId": "123",
    "title": "Inception",
    "year": 2010,
    "genre": ["Action", "Sci-Fi"]
  }
]
```

### Get Movie Details
**Endpoint**: `GET /movies/{movieId}`  
**Description**: Get details for specific movie  
**Request**:
```bash
curl -X GET \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/movies/123 \
  -H "Content-Type: application/json"
```
**Response (200 OK)**:
```json
{
  "movieId": "123",
  "title": "Inception",
  "year": 2010,
  "plot": "A thief who steals corporate secrets...",
  "rating": 8.8,
  "director": "Christopher Nolan"
}
```

### Create Movie Review
**Endpoint**: `POST /movies/reviews`  
**Description**: Add a new review for a movie  
**Request**:
```bash
curl -X POST \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/movies/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "movieId": "123",
    "content": "Amazing movie!",
    "rating": 5
  }'
```
**Response (201 Created)**:
```json
{
  "message": "Review created successfully",
  "reviewId": "rev123"
}
```

### Get Movie Reviews
**Endpoint**: `GET /movies/{movieId}/reviews`  
**Description**: Get all reviews for a specific movie  
**Request**:
```bash
curl -X GET \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/movies/123/reviews \
  -H "Content-Type: application/json"
```
**Response (200 OK)**:
```json
[
  {
    "reviewId": "rev123",
    "userId": "user456",
    "content": "Amazing movie!",
    "rating": 5,
    "createdAt": "2023-05-15T10:30:00Z"
  }
]
```

### Update Review
**Endpoint**: `PUT /movies/{movieId}/reviews/{reviewId}`  
**Description**: Update an existing review  
**Request**:
```bash
curl -X PUT \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/movies/123/reviews/rev123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "content": "Updated review text",
    "rating": 4
  }'
```
**Response (200 OK)**:
```json
{
  "message": "Review updated successfully"
}
```

### Get Single Review
**Endpoint**: `GET /movies/{movieId}/reviews/{reviewId}`  
**Description**: Get specific review details  
**Request**:
```bash
curl -X GET \
  https://y99h6zhtd2.execute-api.us-east-1.amazonaws.com/prod/movies/123/reviews/rev123 \
  -H "Content-Type: application/json"
```
**Response (200 OK)**:
```json
{
  "reviewId": "rev123",
  "userId": "user456",
  "movieId": "123",
  "content": "Updated review text",
  "rating": 4,
  "createdAt": "2023-05-15T10:30:00Z",
  "updatedAt": "2023-05-16T09:15:00Z"
}
```

## Error Responses
All endpoints may return these common error responses:

- **400 Bad Request** - Invalid request parameters
- **401 Unauthorized** - Missing or invalid authentication
- **404 Not Found** - Resource not found
- **500 Internal Server Error** - Server error

Example error response:
```json
{
  "error": "Not Found",
  "message": "The requested movie was not found",
  "statusCode": 404
}
```
