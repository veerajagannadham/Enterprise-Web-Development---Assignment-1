import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);
const tableName = process.env.MOVIE_REVIEWS_TABLE;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
  "Content-Type": "application/json",
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: "",
    };
  }

  if (!tableName) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Server configuration error: Table name missing" })
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Request body is required" })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Invalid JSON format" })
    };
  }

  const { movieId, reviewerId, content } = requestBody;

  const missingFields = [];
  if (movieId === undefined || isNaN(movieId)) missingFields.push("movieId");
  if (!reviewerId) missingFields.push("reviewerId");
  if (!content) missingFields.push("content");

  if (missingFields.length > 0) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Missing or invalid required fields",
        missingFields
      })
    };
  }

  try {
    const reviewId = Date.now();
    const reviewDate = new Date().toISOString().split("T")[0];

    const reviewItem = {
      MovieId: Number(movieId),
      ReviewId: reviewId,
      ReviewerId: reviewerId,
      ReviewDate: reviewDate,
      Content: content
    };

    await dynamoDb.send(new PutCommand({
      TableName: tableName,
      Item: reviewItem
    }));

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Review posted successfully",
        reviewId,
        review: reviewItem
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Failed to post review",
        error: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};
