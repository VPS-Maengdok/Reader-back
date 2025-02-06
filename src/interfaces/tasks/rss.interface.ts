import { Feed } from 'src/entities/feed.entity';

export interface RssItem {
  title: string;
  link: string;
  ['rdf:about']?: string;
  description?: string;
  content?: string;
  'content:encoded'?: string;
  creator?: string;
  'dc:creator'?: string;
  pubDate?: Date;
  'dc:date'?: Date;
  feed?: Feed;
}

export interface RssResponse {
  rss?: {
    channel?: {
      item?: RssItem[];
    };
  };
  channel?: {
    item?: RssItem[];
  };
  ['rdf:RDF']?: {
    item?: RssItem[];
  };
  item?: RssItem[];
}
