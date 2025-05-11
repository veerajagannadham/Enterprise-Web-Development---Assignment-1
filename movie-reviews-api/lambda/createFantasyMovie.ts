import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

// Define CORS headers - these will be added to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
  'Content-Type': 'application/json'
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  // Handle OPTIONS preflight request (though API Gateway should handle this with the default CORS config)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing request body' })
      };
    }

    const body = JSON.parse(event.body);
    console.log('Request body:', body);
    
    const {
      title,
      overview,
      genres,
      releaseDate,
      productionCompanies,
      runtime,
    } = body;

    // Validate required fields
    if (!title || !overview || !Array.isArray(genres) || !releaseDate) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: 'Missing or invalid required fields',
          required: {
            title: !!title,
            overview: !!overview,
            genres: Array.isArray(genres),
            releaseDate: !!releaseDate
          }
        })
      };
    }

    // Create a numeric ID for MovieId
    const movieId = Math.floor(Math.random() * 10000000);
    const reviewId = 0; // Default ReviewId as per schema
    
    // Create item using the correct types based on DynamoDB schema
    const item = {
      MovieId: { N: movieId.toString() },
      ReviewId: { N: reviewId.toString() },
      Title: { S: title },
      Overview: { S: overview },
      ReleaseDate: { S: releaseDate },
      Genres: { SS: genres },
      ...(productionCompanies && productionCompanies.length > 0 && { 
        ProductionCompanies: { SS: productionCompanies } 
      }),
      ...(runtime !== undefined && { Runtime: { N: runtime.toString() } }),
    };

    console.log('Saving item to DynamoDB:', JSON.stringify(item, null, 2));

    // Save to DynamoDB
    await ddbClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Fantasy movie created successfully', 
        movieId: movieId,
        reviewId: reviewId
      })
    };
  } catch (err) {
    console.error('Error creating fantasy movie:', err);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: (err instanceof Error) ? err.message : 'Unknown error' 
      })
    };
  }
};