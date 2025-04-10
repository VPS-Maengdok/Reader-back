import { Feed } from 'src/entities/feed.entity';

export interface Group {
  id: number;
  name: string;
  feeds?: Feed[];
  isActivate?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  unreadCount?: number;
}
