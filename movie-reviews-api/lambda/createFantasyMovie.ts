import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      title,
      overview,
      genres,
      releaseDate,
      productionCompanies,
      runtime,
    } = body;

    if (!title || !overview || !Array.isArray(genres) || !releaseDate) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing or invalid fields' }),
      };
    }

    const movieId = uuidv4();
    const item = {
      MovieId: { S: movieId },
      Title: { S: title },
      Overview: { S: overview },
      ReleaseDate: { S: releaseDate },
      Genres: { SS: genres },
      ProductionCompanies: { SS: productionCompanies || [] },
      ...(runtime !== undefined && { Runtime: { N: String(runtime) } }),
    };

    await ddbClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Fantasy movie created', movieId }),
    };
  } catch (err) {
    console.error('Error creating movie:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
