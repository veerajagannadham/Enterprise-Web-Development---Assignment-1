import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { movies } from "./movies";
import { reviews } from "./reviews";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const movieId = event.pathParameters?.movieId;

    if (!movieId) {
      return {
        statusCode: 200,
        body: JSON.stringify(movies),
      };
    }

    const movie = movies.find((m) => m.id === Number(movieId));

    if (!movie) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Movie not found" }),
      };
    }

    // Fetch reviews for this movie
    const movieReviews = reviews.filter((r) => r.movieId === Number(movieId));

    return {
      statusCode: 200,
      body: JSON.stringify({ movie, reviews: movieReviews }),
    };
  } catch (error) {
    console.error("Error fetching movie:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};
