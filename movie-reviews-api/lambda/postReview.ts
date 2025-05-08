import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamoDb } from "./dynamoClient"; // ✅ Import shared DynamoDB client
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid request body" }) };
    }

    const { movieId, reviewerId, content } = JSON.parse(event.body);

    if (!movieId || !reviewerId || !content) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing required fields" }) };
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

    return { statusCode: 201, body: JSON.stringify({ message: "Review added successfully", reviewId }) };
  } catch (error) {
    console.error("Error adding review:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};
