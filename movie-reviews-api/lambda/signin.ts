import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as bcrypt from 'bcryptjs';

const ddbClient = new DynamoDBClient({});
const TABLE_NAME = process.env.USERS_TABLE_NAME!;

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
  // Handle preflight OPTIONS requests
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

  // Validate environment variables
  if (!TABLE_NAME) {
    console.error('Required environment variable USERS_TABLE is not set');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Server configuration error' })
    };
  }

  try {
    // Validate request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing request body' })
      };
    }

    const body = JSON.parse(event.body);
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Missing email or password' })
      };
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Lookup user in DynamoDB
    const result = await ddbClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: marshall({ Email: trimmedEmail }),
      })
    );

    if (!result.Item) {
      // Return same error for non-existent users and wrong passwords
      // to prevent user enumeration
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid credentials' })
      };
    }

    const user = unmarshall(result.Item);
    const { passwordHash, name, userId } = user;

    if (!passwordHash || !name || !userId) {
      console.error('User data incomplete:', JSON.stringify(user, null, 2));
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'User data is corrupted or incomplete' })
      };
    }

    // Compare passwords securely
    const passwordMatch = await bcrypt.compare(password, passwordHash);
    if (!passwordMatch) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid credentials' })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Sign-in successful',
        user: {
          userId,
          name,
          email: trimmedEmail
        }
      })
    };

  } catch (err) {
    console.error('SignIn error:', err);
    let errorMessage = 'Internal Server Error';
    let statusCode = 500;
    
    // Handle specific errors
    if (err instanceof SyntaxError) {
      statusCode = 400;
      errorMessage = 'Invalid JSON in request body';
    } else if (err instanceof Error) {
      errorMessage = err.message;
    }

    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        message: errorMessage,
        debug: {
          tableName: TABLE_NAME,
          // Don't log full input to avoid exposing passwords in logs
          hasInput: !!event.body
        }
      })
    };
  }
};