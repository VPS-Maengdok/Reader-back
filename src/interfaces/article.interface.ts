import { Feed } from 'src/entities/feed.entity';

export interface Article {
  id?: number;
  feed?: Feed;
  title: string;
  description?: string;
  content?: string;
  url: string;
  author?: string;
  publishedAt: Date;
  isSaved?: boolean;
  hasBeenRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
