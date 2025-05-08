import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";

export class MovieReviewsApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ✅ Create DynamoDB Table for storing reviews
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "ReviewId", type: dynamodb.AttributeType.NUMBER },
      tableName: "MovieReviews",
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Auto-delete when stack is removed
    });

    // ✅ Lambda function for fetching all movies & single movie
    const getMoviesLambda = new lambda.Function(this, "GetMoviesHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getMovies.handler",
      code: lambda.Code.fromAsset("lambda"),
    });

    // ✅ Lambda function for adding a movie review (POST /movies/reviews)
    const postReviewLambda = new lambda.Function(this, "PostReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "postReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    // ✅ Lambda function for updating a review (PUT /movies/{movieId}/reviews/{reviewId})
    const updateReviewLambda = new lambda.Function(this, "UpdateReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "updateReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    // ✅ Lambda function for translating a review (GET /reviews/{reviewId}/{movieId}/translation)
    const getTranslatedReviewLambda = new lambda.Function(this, "GetTranslatedReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getTranslatedReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    // ✅ Grant Lambda functions permission to read/write from DynamoDB
    movieReviewsTable.grantReadWriteData(postReviewLambda);
    movieReviewsTable.grantReadWriteData(updateReviewLambda);
    movieReviewsTable.grantReadWriteData(getTranslatedReviewLambda);

    // ✅ Grant AWS Translate permissions for translation Lambda
    getTranslatedReviewLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"], // Can be restricted further if needed
      })
    );

    // ✅ Create API Gateway
    const api = new apigateway.RestApi(this, "MovieReviewsApi");

    // ✅ Route for fetching all movies
    const moviesResource = api.root.addResource("movies");
    moviesResource.addMethod("GET", new apigateway.LambdaIntegration(getMoviesLambda));

    // ✅ Route for fetching a single movie by ID (/movies/{movieId})
    const movieResource = moviesResource.addResource("{movieId}");
    movieResource.addMethod("GET", new apigateway.LambdaIntegration(getMoviesLambda));

    // ✅ Route for adding a review (POST /movies/reviews)
    const reviewsResource = moviesResource.addResource("reviews");
    reviewsResource.addMethod("POST", new apigateway.LambdaIntegration(postReviewLambda));

    // ✅ Route for updating a review (PUT /movies/{movieId}/reviews/{reviewId})
    const reviewResource = movieResource.addResource("reviews").addResource("{reviewId}");
    reviewResource.addMethod("PUT", new apigateway.LambdaIntegration(updateReviewLambda));

    // ✅ Route for getting translated review (GET /reviews/{reviewId}/{movieId}/translation?language=code)
    const translationsResource = api.root
      .addResource("reviews")
      .addResource("{reviewId}")
      .addResource("{movieId}")
      .addResource("translation");
    translationsResource.addMethod("GET", new apigateway.LambdaIntegration(getTranslatedReviewLambda));
  }
}