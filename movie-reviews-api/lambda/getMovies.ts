import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { movies } from "./movies";
import { reviews } from "./reviews";

// Define CORS headers in one place for consistency
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // For production, replace with specific origin
  "Access-Control-Allow-Credentials": false, // Set to true if using credentials
  "Content-Type": "application/json",
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "GET,OPTIONS", // Add other methods if needed
        "Access-Control-Allow-Headers": "Content-Type", // Add other headers if needed
      },
      body: '',
    };
  }

  try {
    const movieId = event.pathParameters?.movieId;

    if (!movieId) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(movies),
      };
    }

    const movie = movies.find((m) => m.id === Number(movieId));

    if (!movie) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Movie not found" }),
      };
    }

    const movieReviews = reviews.filter((r) => r.movieId === Number(movieId));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ movie, reviews: movieReviews }),
    };
  } catch (error) {
    console.error("Error fetching movie:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};