/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { X2jOptions, XMLParser } from 'fast-xml-parser';
import { Feed } from 'src/entities/feed.entity';
import { Article } from 'src/interfaces/article.interface';
import { RssItem, RssResponse } from 'src/interfaces/tasks/rss.interface';
import { ArticleService } from 'src/services/article.service';

@Injectable()
export class RssExtractor {
  private parserInstance: XMLParser;

  constructor(private readonly articleService: ArticleService) {
    const options: X2jOptions = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    };
    this.parserInstance = new XMLParser(options);
  }

  async fetch(feed: Feed): Promise<Article[]> {
    try {
      const response = await axios.get(feed.rssUrl);
      const parsedData: RssResponse = this.parserInstance.parse(
        response.data as string,
      );
      const items = this.extractItems(parsedData);

      return items.map((item) => ({
        title: item.title ? item.title : '',
        url: this.extractLink(item),
        publishedAt: this.extractDate(item),
        description: item.description ? item.description : '',
        content: this.extractContent(item),
        author: this.extractCreator(item),
        feed: feed,
      }));
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch RSS feed: ${error}`,
      );
    }
  }

  async createArticlesFromFeed(
    items: Article[],
  ): Promise<{ message: string; count: number }> {
    let n: number = 0;
    await Promise.all(
      items.map(async (item) => {
        const article = await this.articleService.add(item, true);

        if (article.created !== undefined && article.created === false) {
          n += 1;
        }
      }),
    );

    n = items.length - n;

    return { message: 'Articles created from Feed.', count: n };
  }

  private extractDate(item: RssItem): Date {
    if (item.pubDate !== undefined && item.pubDate !== null) {
      return new Date(item.pubDate);
    }

    if (item['dc:date'] !== undefined && item['dc:date'] !== null) {
      return new Date(item['dc:date']);
    }

    return new Date();
  }

  private extractCreator(item: RssItem): string {
    if (item.creator !== undefined && item.creator !== null) {
      return item.creator;
    }

    if (item['dc:creator'] !== undefined && item['dc:creator'] !== null) {
      return item['dc:creator'].trim();
    }

    return '';
  }

  private extractContent(item: RssItem): string {
    if (item.content !== undefined && item.content !== null) {
      return item.content;
    }

    if (
      item['content:encoded'] !== undefined &&
      item['content:encoded'] !== null
    ) {
      return item['content:encoded'].trim();
    }

    return '';
  }

  private extractLink(item: RssItem): string {
    if (item.link !== undefined && item.link !== null) {
      return item.link;
    }

    if (item['rdf:about'] !== undefined && item['rdf:about'] !== null) {
      return item['rdf:about'].trim();
    }

    return '';
  }

  private extractItems(parsedData: RssResponse): RssItem[] {
    const possiblePaths = [
      parsedData.rss?.channel?.item, // Standard RSS format
      parsedData.channel?.item, // When feeds omit rss tag
      parsedData.item, // Atom feeds
      parsedData['rdf:RDF']?.item, // RDF-based feeds such as PHP.net
    ];

    return possiblePaths.find((items) => Array.isArray(items)) ?? [];
  }
}
