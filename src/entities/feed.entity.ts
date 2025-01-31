import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from './article.entity';

@Entity()
export class Feed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  websiteName: string;

  @Column()
  websiteUrl: string;

  @Column({ unique: true })
  rssUrl: string;

  @ManyToOne(() => Article, (article) => article.id, { nullable: true })
  @JoinColumn()
  article: Article[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;
}
