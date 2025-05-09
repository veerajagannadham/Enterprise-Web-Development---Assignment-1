import { APIGatewayProxyHandler } from "aws-lambda";
import AWS from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

// Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with specific origin in production
  "Access-Control-Allow-Credentials": true,
  "Access-Control-Allow-Methods": "DELETE,OPTIONS", // Explicitly allowed methods
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Content-Type": "application/json",
};

export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  const { movieId, reviewId } = event.pathParameters || {};

  if (!movieId || !reviewId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Missing movieId or reviewId" }),
    };
  }

  // Validate IDs are numbers
  const numericMovieId = Number(movieId);
  const numericReviewId = Number(reviewId);
  
  if (isNaN(numericMovieId) || isNaN(numericReviewId)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "movieId and reviewId must be numbers" }),
    };
  }

  try {
    await ddb
      .delete({
        TableName: TABLE_NAME,
        Key: {
          MovieId: numericMovieId,
          ReviewId: numericReviewId,
        },
      })
      .promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Review deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting review:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal Server Error",
        detail: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};