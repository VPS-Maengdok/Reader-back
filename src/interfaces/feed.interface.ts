import { Article } from 'src/entities/article.entity';

export interface Feed {
  id: number;
  websiteName: string;
  websiteUrl: string;
  rssUrl: string;
  article?: Article[];
  createdAt?: Date;
  updatedAt?: Date;
}
