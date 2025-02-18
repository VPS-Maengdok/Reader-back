import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Feed } from './feed.entity';

@Entity()
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => Feed, (feed) => feed.id)
  @JoinColumn({ name: 'feed_id' })
  feed: Feed;

  @Column()
  url: string;

  @Column({ nullable: true })
  author: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'timestamp' })
  publishedAt: Date;

  @Column({ default: false })
  isSaved: boolean;

  @Column({ default: false })
  hasBeenRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
