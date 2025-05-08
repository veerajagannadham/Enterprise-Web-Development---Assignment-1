import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { dynamoDb } from "./dynamoClient";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const translate = new TranslateClient({});
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const movieId = event.pathParameters?.movieId;
    const reviewId = event.pathParameters?.reviewId;
    const languageCode = event.queryStringParameters?.language || "fr";

    if (!movieId || !reviewId) {
      return { statusCode: 400, body: JSON.stringify({ message: "Missing movieId or reviewId" }) };
    }

    const reviewResult = await dynamoDb.send(
      new GetCommand({
        TableName: tableName,
        Key: { MovieId: Number(movieId), ReviewId: Number(reviewId) },
      })
    );

    if (!reviewResult.Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Review not found" }) };
    }

    if (reviewResult.Item.TranslatedContent) {
      return { statusCode: 200, body: JSON.stringify({ translatedText: reviewResult.Item.TranslatedContent }) };
    }

    const translationResult = await translate.send(
      new TranslateTextCommand({
        SourceLanguageCode: "en",
        TargetLanguageCode: languageCode,
        Text: reviewResult.Item.Content,
      })
    );

    await dynamoDb.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { MovieId: Number(movieId), ReviewId: Number(reviewId) },
        UpdateExpression: "set TranslatedContent = :translatedContent",
        ExpressionAttributeValues: { ":translatedContent": translationResult.TranslatedText },
      })
    );

    return { statusCode: 200, body: JSON.stringify({ translatedText: translationResult.TranslatedText }) };
  } catch (error) {
    console.error("Error translating review:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};
