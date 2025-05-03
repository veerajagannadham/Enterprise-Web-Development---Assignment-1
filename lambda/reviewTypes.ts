export interface Review {
    movieId: number;  // Foreign key (links to movies.ts)
    reviewId: number; // Unique review ID
    reviewerId: string; // Email of the reviewer
    reviewDate: string; // Date in YYYY-MM-DD format
    content: string; // Review text
  }
  