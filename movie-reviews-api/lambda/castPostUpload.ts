import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const ddbClient = new DynamoDBClient({});
const s3Client = new S3Client({});
const TABLE_NAME = process.env.MOVIES_TABLE_NAME!;
const BUCKET_NAME = process.env.POSTERS_BUCKET_NAME!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json'
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Received body:', body);

    const { movieId, cast, posterFile } = body;

    if (!movieId || !Array.isArray(cast) || !posterFile || !posterFile.data || !posterFile.name || !posterFile.contentType) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'Missing required fields: movieId, cast array, posterFile (with data, name, contentType)'
        })
      };
    }

    // Upload poster to S3
    const posterKey = `posters/${movieId}/${posterFile.name}`;
    const buffer = Buffer.from(posterFile.data, 'base64');

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: posterKey,
        Body: buffer,
        ContentType: posterFile.contentType,
        ACL: 'public-read'
      })
    );

    const posterUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${posterKey}`;

    // Update movie in DynamoDB
    await ddbClient.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          movieId: { S: movieId }
        },
        UpdateExpression: 'SET #cast = :cast, posterUrl = :posterUrl',
        ExpressionAttributeNames: {
          '#cast': 'cast'
        },
        ExpressionAttributeValues: {
          ':cast': { L: cast.map((member: any) => ({
            M: {
              name: { S: member.name },
              role: { S: member.role },
              description: { S: member.description }
            }
          })) },
          ':posterUrl': { S: posterUrl }
        }
      })
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Movie updated successfully',
        posterUrl
      })
    };
  } catch (err) {
    console.error('Movie update error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : 'Unknown error',
        debug: {
          tableName: TABLE_NAME,
          bucketName: BUCKET_NAME,
          input: event.body
        }
      })
    };
  }
};
