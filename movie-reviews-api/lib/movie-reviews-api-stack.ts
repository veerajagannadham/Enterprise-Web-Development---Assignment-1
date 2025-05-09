import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";

export class MovieReviewsApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB Table
    const movieReviewsTable = new dynamodb.Table(this, "MovieReviewsTable", {
      partitionKey: { name: "MovieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "ReviewId", type: dynamodb.AttributeType.NUMBER },
      tableName: "MovieReviews",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda functions
    const getMoviesLambda = new lambda.Function(this, "GetMoviesHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getMovies.handler",
      code: lambda.Code.fromAsset("lambda"),
    });

    const postReviewLambda = new lambda.Function(this, "PostReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "postReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    const updateReviewLambda = new lambda.Function(this, "UpdateReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "updateReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    const deleteReviewLambda = new lambda.Function(this, "DeleteReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "deleteReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    const getTranslatedReviewLambda = new lambda.Function(this, "GetTranslatedReviewHandler", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getTranslatedReview.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    const fantasyMoviesLambda = new lambda.Function(this, "FantasyMovieCreator", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "createFantasyMovie.handler",
      code: lambda.Code.fromAsset("lambda"),
      environment: { TABLE_NAME: movieReviewsTable.tableName },
    });

    // Grant DynamoDB permissions
    movieReviewsTable.grantReadWriteData(postReviewLambda);
    movieReviewsTable.grantReadWriteData(updateReviewLambda);
    movieReviewsTable.grantReadWriteData(deleteReviewLambda);
    movieReviewsTable.grantReadWriteData(getTranslatedReviewLambda);
    movieReviewsTable.grantReadWriteData(fantasyMoviesLambda);

    // AWS Translate permission
    getTranslatedReviewLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["translate:TranslateText"],
        resources: ["*"],
      })
    );

    // Create API Gateway with CORS enabled by default
    const api = new apigateway.RestApi(this, "MovieReviewsApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token'
        ],
      },
    });

    // Movies routes
    const moviesResource = api.root.addResource("movies");
    moviesResource.addMethod("GET", new apigateway.LambdaIntegration(getMoviesLambda));

    const movieResource = moviesResource.addResource("{movieId}");
    movieResource.addMethod("GET", new apigateway.LambdaIntegration(getMoviesLambda));

    const reviewsResource = moviesResource.addResource("reviews");
    reviewsResource.addMethod("POST", new apigateway.LambdaIntegration(postReviewLambda));

    const reviewResource = movieResource.addResource("reviews").addResource("{reviewId}");
    reviewResource.addMethod("PUT", new apigateway.LambdaIntegration(updateReviewLambda));
    reviewResource.addMethod("DELETE", new apigateway.LambdaIntegration(deleteReviewLambda));

    // Translation route
    const translationsResource = api.root
      .addResource("reviews")
      .addResource("{reviewId}")
      .addResource("{movieId}")
      .addResource("translation");
    translationsResource.addMethod("GET", new apigateway.LambdaIntegration(getTranslatedReviewLambda));

    // Fantasy movies route
    const fantasyMoviesResource = api.root.addResource("fantasy").addResource("movies");
    fantasyMoviesResource.addMethod("POST", new apigateway.LambdaIntegration(fantasyMoviesLambda));
  }
}