import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Article } from './article.entity';
import { Group } from './group.entity';

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

  @ManyToOne(() => Article, (article) => article.id, {
    nullable: true,
    cascade: true,
  })
  @JoinColumn()
  article?: Article[];

  @ManyToMany(() => Group, (group) => group.feeds)
  groups?: Group[];

  @Column({ default: true })
  isActivate?: boolean;

  @CreateDateColumn()
  createdAt?: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;
}
