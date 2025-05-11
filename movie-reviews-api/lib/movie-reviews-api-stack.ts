import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

export class MovieReviewsApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "ReviewId", type: dynamodb.AttributeType.NUMBER },
      tableName: "MovieReviews",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiryTime", // Optional for TTL
    });

    // Add Global Secondary Index for querying reviews by reviewer
    movieReviewsTable.addGlobalSecondaryIndex({
      indexName: "ReviewerIndex",
      partitionKey: { name: "ReviewerId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "ReviewDate", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const usersTable = new dynamodb.Table(this, "UsersTable", {
      partitionKey: { name: "Email", type: dynamodb.AttributeType.STRING },
      tableName: "Users",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const movieDetailsTable = new dynamodb.Table(this, "MovieDetailsTable", {
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.STRING },
      tableName: "MovieDetails",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 Bucket for poster uploads
    const postersBucket = new s3.Bucket(this, "MoviePostersBucket", {
      bucketName: `movie-posters-${cdk.Stack.of(this).account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    // Common Lambda configuration
    const lambdaConfig = {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        MOVIE_REVIEWS_TABLE: movieReviewsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
        MOVIE_DETAILS_TABLE: movieDetailsTable.tableName,
        POSTERS_BUCKET: postersBucket.bucketName,
      },
    };

    // Lambda: SignUp
    const signUpLambda = new lambda.Function(this, "SignUpHandler", {
      ...lambdaConfig,
      handler: "createUser.handler",
    });
    usersTable.grantReadWriteData(signUpLambda);

    // Lambda: SignIn
    const signInLambda = new lambda.Function(this, "SignInHandler", {
      ...lambdaConfig,
      handler: "signin.handler",
    });
    usersTable.grantReadData(signInLambda);

    // Lambda: Movie Operations
    const getMoviesLambda = new lambda.Function(this, "GetMoviesHandler", {
      ...lambdaConfig,
      handler: "getMovies.handler",
    });

    // Updated Post Review Lambda with proper permissions
    const postReviewLambda = new lambda.Function(this, "PostReviewHandler", {
      ...lambdaConfig,
      handler: "postReview.handler",
    });
    movieReviewsTable.grantReadWriteData(postReviewLambda);

    const updateReviewLambda = new lambda.Function(this, "UpdateReviewHandler", {
      ...lambdaConfig,
      handler: "updateReview.handler",
    });
    movieReviewsTable.grantReadWriteData(updateReviewLambda);

    const deleteReviewLambda = new lambda.Function(this, "DeleteReviewHandler", {
      ...lambdaConfig,
      handler: "deleteReview.handler",
    });
    movieReviewsTable.grantReadWriteData(deleteReviewLambda);

    const getTranslatedReviewLambda = new lambda.Function(this, "GetTranslatedReviewHandler", {
      ...lambdaConfig,
      handler: "getTranslatedReview.handler",
    });
    getTranslatedReviewLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"],
      })
    );

    const fantasyMoviesLambda = new lambda.Function(this, "FantasyMovieCreator", {
      ...lambdaConfig,
      handler: "createFantasyMovie.handler",
    });
    movieReviewsTable.grantReadWriteData(fantasyMoviesLambda);

    // Lambda: Upload Cast
    const uploadCastLambda = new lambda.Function(this, "UploadCastHandler", {
      ...lambdaConfig,
      handler: "uploadCast.handler",
    });
    movieDetailsTable.grantReadWriteData(uploadCastLambda);

    // Lambda: Upload Poster
    const uploadPosterLambda = new lambda.Function(this, "UploadPosterHandler", {
      ...lambdaConfig,
      handler: "uploadPoster.handler",
    });
    postersBucket.grantPut(uploadPosterLambda);
    movieDetailsTable.grantReadWriteData(uploadPosterLambda);

    // API Gateway with enhanced CORS and logging
    const api = new apigateway.RestApi(this, "MovieReviewsApi", {
      restApiName: "Movie Reviews Service",
      description: "API for managing movie reviews",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Requested-With',
        ],
      },
      deployOptions: {
        stageName: "prod",
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
    });

    // /movies endpoints
    const moviesResource = api.root.addResource("movies");
    moviesResource.addMethod("GET", new apigateway.LambdaIntegration(getMoviesLambda));

    // Add the missing /movies/reviews endpoint
    const globalReviewsResource = moviesResource.addResource("reviews");
    globalReviewsResource.addMethod("POST", new apigateway.LambdaIntegration(postReviewLambda), {
      requestValidator: api.addRequestValidator("GlobalReviewBodyValidator", {
        validateRequestBody: true,
        validateRequestParameters: true,
      }),
      requestModels: {
        "application/json": new apigateway.Model(this, "GlobalReviewModel", {
          restApi: api,
          contentType: "application/json",
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ["movieId", "reviewerId", "content"],
            properties: {
              movieId: { type: apigateway.JsonSchemaType.NUMBER },
              reviewerId: { type: apigateway.JsonSchemaType.STRING },
              content: { 
                type: apigateway.JsonSchemaType.STRING,
                maxLength: 1000 
              },
              rating: {
                type: apigateway.JsonSchemaType.NUMBER,
                minimum: 1,
                maximum: 5,
              },
            },
          },
        }),
      },
    });

    // /movies/{movieId} endpoints
    const movieResource = moviesResource.addResource("{movieId}");
    movieResource.addMethod("GET", new apigateway.LambdaIntegration(getMoviesLambda));

    // Movie-specific reviews endpoint structure
    const movieReviewsResource = movieResource.addResource("reviews");
    movieReviewsResource.addMethod("POST", new apigateway.LambdaIntegration(postReviewLambda), {
      requestValidator: api.addRequestValidator("ReviewBodyValidator", {
        validateRequestBody: true,
        validateRequestParameters: true,
      }),
      requestModels: {
        "application/json": new apigateway.Model(this, "ReviewModel", {
          restApi: api,
          contentType: "application/json",
          schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            required: ["reviewerId", "content"],
            properties: {
              reviewerId: { type: apigateway.JsonSchemaType.STRING },
              content: { 
                type: apigateway.JsonSchemaType.STRING,
                maxLength: 1000 
              },
              rating: {
                type: apigateway.JsonSchemaType.NUMBER,
                minimum: 1,
                maximum: 5,
              },
            },
          },
        }),
      },
    });

    // /movies/{movieId}/reviews/{reviewId} endpoints
    const reviewResource = movieReviewsResource.addResource("{reviewId}");
    reviewResource.addMethod("PUT", new apigateway.LambdaIntegration(updateReviewLambda));
    reviewResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteReviewLambda));

    // /reviews/{reviewId}/translation endpoint
    const translationResource = api.root
      .addResource("reviews")
      .addResource("{reviewId}")
      .addResource("translation");
    translationResource.addMethod("GET", new apigateway.LambdaIntegration(getTranslatedReviewLambda));

    // /fantasy/movies endpoint
    const fantasyMoviesResource = api.root.addResource("fantasy").addResource("movies");
    fantasyMoviesResource.addMethod("POST", new apigateway.LambdaIntegration(fantasyMoviesLambda));

    // /auth endpoints
    const authResource = api.root.addResource("auth");
    authResource.addResource("signup").addMethod("POST", new apigateway.LambdaIntegration(signUpLambda));
    authResource.addResource("signin").addMethod("POST", new apigateway.LambdaIntegration(signInLambda));

    // /upload endpoints
    const uploadResource = api.root.addResource("upload");
    uploadResource.addResource("cast").addMethod("POST", new apigateway.LambdaIntegration(uploadCastLambda));
    uploadResource.addResource("poster").addMethod("POST", new apigateway.LambdaIntegration(uploadPosterLambda));

    // Outputs
    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: api.url,
      description: "API Gateway endpoint URL",
    });

    new cdk.CfnOutput(this, "MovieReviewsTableName", {
      value: movieReviewsTable.tableName,
      description: "Movie Reviews DynamoDB Table Name",
    });

    new cdk.CfnOutput(this, "PostersBucketName", {
      value: postersBucket.bucketName,
      description: "Movie Posters S3 Bucket Name",
    });
  }
}