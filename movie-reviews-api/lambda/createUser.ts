import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
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
  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }
  
  try {
    // Parse and validate input
    const body = JSON.parse(event.body || '{}');
    console.log('Received body:', body);
    
    // Handle field names case-insensitively
    const name = body.name;
    const email = body.email || body.Email; // Accept either lowercase or uppercase
    const password = body.password;
    
    console.log('Extracted fields:', { 
      name: name || 'MISSING', 
      email: email || 'MISSING', 
      password: password ? 'PROVIDED' : 'MISSING'
    });
    
    // Validate required fields
    if (!name || !email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: 'Missing required fields: name, email, password',
          details: {
            name: name ? 'present' : 'missing',
            email: email ? 'present' : 'missing',
            password: password ? 'present' : 'missing'
          }
        })
      };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Invalid email format' })
      };
    }
    
    // Check if user exists
    const existingUser = await ddbClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          Email: { S: email.trim() }
        }
      })
    );
    
    if (existingUser.Item) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'User already exists' })
      };
    }
    
    // Create new user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    
    await ddbClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          Email: { S: email.trim() },
          userId: { S: userId },
          name: { S: name.trim() },
          passwordHash: { S: passwordHash },
          createdAt: { S: new Date().toISOString() }
        }
      })
    );
    
    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'User created successfully',
        user: {
          userId,
          name: name.trim(),
          email: email.trim()
        }
      })
    };
  } catch (err) {
    console.error('SignUp error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : 'Unknown error',
        debug: {
          tableName: TABLE_NAME,
          input: event.body
        }
      })
    };
  }
};