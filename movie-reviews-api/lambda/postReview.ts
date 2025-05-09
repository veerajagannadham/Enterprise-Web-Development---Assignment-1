import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamoDb } from "./dynamoClient";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const tableName = process.env.TABLE_NAME!;

// Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Or specify your frontend URL
  "Access-Control-Allow-Credentials": true,
  "Content-Type": "application/json",
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Invalid request body" })
      };
    }

    const { movieId, reviewerId, content } = JSON.parse(event.body);

    if (!movieId || !reviewerId || !content) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing required fields" })
      };
    }

    const reviewId = Date.now();
    const reviewDate = new Date().toISOString().split("T")[0];

    const newReview = {
      MovieId: movieId,
      ReviewId: reviewId,
      ReviewerId: reviewerId,
      ReviewDate: reviewDate,
      Content: content,
    };

    await dynamoDb.send(new PutCommand({ TableName: tableName, Item: newReview }));

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Review added successfully", reviewId })
    };
  } catch (error) {
    console.error("Error adding review:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};