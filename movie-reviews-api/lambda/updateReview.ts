import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ReturnValue } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME!;

// Common CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // Replace with specific origin in production
  "Access-Control-Allow-Credentials": true,
  "Content-Type": "application/json",
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "PUT, OPTIONS",
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

    const { content } = JSON.parse(event.body);
    const movieId = event.pathParameters?.movieId;
    const reviewId = event.pathParameters?.reviewId;

    if (!movieId || !reviewId || !content) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: "Missing required fields" })
      };
    }

    console.log("Updating review:", { movieId, reviewId, content });

    const updateParams = {
      TableName: tableName,
      Key: {
        MovieId: Number(movieId),
        ReviewId: Number(reviewId),
      },
      UpdateExpression: "SET Content = :content",
      ExpressionAttributeValues: {
        ":content": content,
      },
      ReturnValues: ReturnValue.ALL_NEW,
    };

    const result = await dynamoDb.send(new UpdateCommand(updateParams));

    console.log("Update result:", JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: "Review updated successfully", 
        updatedReview: result.Attributes 
      })
    };
  } catch (error) {
    console.error("Error updating review:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Internal Server Error" })
    };
  }
};