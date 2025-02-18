import { Feed } from 'src/entities/feed.entity';

export interface Group {
  id: number;
  name: string;
  feeds?: Feed[];
  createdAt?: Date;
  updatedAt?: Date;
}
