import { Article } from 'src/entities/article.entity';
import { Group } from './group.interface';

export interface Feed {
  id: number;
  websiteName: string;
  websiteUrl: string;
  rssUrl: string;
  article?: Article[];
  groups?: Group[];
  isActivate?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  unreadCount?: number;
}
