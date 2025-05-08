import { Review } from "../lambda/reviewTypes";

export const reviews: Review[] = [
  {
    movieId: 848326, 
    reviewId: 1,
    reviewerId: "user1@example.com",
    reviewDate: "2024-03-10",
    content: "Amazing sci-fi movie with great visuals!",
  },
  {
    movieId: 572802, 
    reviewId: 2,
    reviewerId: "user2@example.com",
    reviewDate: "2024-03-11",
    content: "Good action scenes but predictable story.",
  }
];
