// lambda/deleteReview.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import AWS from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const { movieId, reviewId } = event.pathParameters || {};

  if (!movieId || !reviewId) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Missing movieId or reviewId" }),
    };
  }

  try {
    await ddb
      .delete({
        TableName: TABLE_NAME,
        Key: {
          MovieId: Number(movieId),
          ReviewId: Number(reviewId),
        },
      })
      .promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Review deleted successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        detail: (error as any).message,
      }),
    };
  }
};
