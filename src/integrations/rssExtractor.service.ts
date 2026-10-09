import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { X2jOptions, XMLParser } from 'fast-xml-parser';
import { Feed } from 'src/entities/feed.entity';
import { Article } from 'src/interfaces/article.interface';
import { RssItem, RssResponse } from 'src/interfaces/tasks/rss.interface';
import { ArticleService } from 'src/services/article.service';

// Limits applied to every feed: feed URLs point to third-party servers, so both
// the HTTP response and the XML parser must be bounded.
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FEED_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;

interface RssMapping {
  titleKey: string;
  linkKey: string;
  dateKey: string;
  contentKey: string;
  creatorKey: string;
}

@Injectable()
export class RssExtractor {
  private parserInstance: XMLParser;
  private readonly logger = new Logger(RssExtractor.name);

  constructor(private readonly articleService: ArticleService) {
    const options: X2jOptions = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      // Bound entity handling (DOCTYPE entities are never expanded by v5 and
      // the standard entities such as &amp; are decoded within these limits).
      processEntities: {
        enabled: true,
        maxEntitySize: 1_000,
        maxExpansionDepth: 5,
        maxTotalExpansions: 1_000,
        maxExpandedLength: 1_000_000,
        maxEntityCount: 20,
      },
      // Real feeds nest fewer than 10 levels; refuse deeply nested documents.
      maxNestedTags: 20,
    };
    this.parserInstance = new XMLParser(options);
  }

  async fetch(feed: Feed): Promise<Article[]> {
    try {
      const response = await axios.get<string>(feed.rssUrl, {
        timeout: FETCH_TIMEOUT_MS,
        maxContentLength: MAX_FEED_BYTES,
        maxBodyLength: MAX_FEED_BYTES,
        maxRedirects: MAX_REDIRECTS,
        responseType: 'text',
        // Keep the raw text: no automatic JSON parsing of the body.
        transformResponse: [(data: unknown) => data],
      });
      const body: unknown = response.data;
      if (typeof body !== 'string') {
        throw new Error('Unexpected response body type');
      }
      if (Buffer.byteLength(body, 'utf8') > MAX_FEED_BYTES) {
        throw new Error(`Feed body exceeds ${MAX_FEED_BYTES} bytes`);
      }
      const parsedData = this.parserInstance.parse(body) as RssResponse;
      const items = this.extractItems(parsedData);

      if (!items.length) {
        this.logger.warn(`No items found for feed ${feed.websiteName}`);
        return [];
      }

      const mapping: RssMapping = this.inferMapping(items);
      this.logger.debug(
        `Mapping inferred for ${feed.websiteName}: ${JSON.stringify(mapping)}`,
      );

      return items.map((item: RssItem): Article => {
        const rawTitle: unknown = item[mapping.titleKey];
        const rawUrl: unknown = item[mapping.linkKey];
        const rawDate: unknown = item[mapping.dateKey];
        const rawDescription: unknown = item['description'];
        const rawContent: unknown = item[mapping.contentKey];
        const rawAuthor: unknown = item[mapping.creatorKey];
        const title: string =
          typeof rawTitle === 'string' ? rawTitle.trim() : '';
        const url: string = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        const publishedAt: Date =
          typeof rawDate === 'string' ? new Date(rawDate) : new Date();
        const description: string =
          typeof rawDescription === 'string' ? rawDescription.trim() : '';
        const content: string =
          typeof rawContent === 'string' ? rawContent.trim() : '';
        const author: string =
          typeof rawAuthor === 'string' ? rawAuthor.trim() : '';

        return {
          title,
          url,
          publishedAt,
          description,
          content,
          author,
          feed,
        };
      });
    } catch (error: unknown) {
      let errorMessage: string;
      if (error instanceof Error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else {
        errorMessage = 'An unknown error occurred';
      }
      throw new InternalServerErrorException(
        `Failed to fetch RSS feed for ${feed.websiteName}: ${errorMessage}`,
      );
    }
  }

  async createArticlesFromFeed(
    items: Article[],
  ): Promise<{ message: string; count: number }> {
    let createdCount = 0;
    await Promise.all(
      items.map(async (item: Article) => {
        const article = await this.articleService.add(item, true);
        if (article.created !== undefined && article.created === false) {
          createdCount += 1;
        }
      }),
    );
    createdCount = items.length - createdCount;
    return { message: 'Articles created from Feed.', count: createdCount };
  }

  /**
   * Infers a mapping from parsed RSS item keys to our standard fields.
   */
  private inferMapping(items: RssItem[]): RssMapping {
    const sample: RssItem = items[0];

    const titleKey = this.pickKey(sample, ['title', 'heading'], 'title');
    const linkKey = this.pickKey(sample, ['link', 'rdf:about'], 'link');
    const dateKey = this.pickKey(
      sample,
      ['pubDate', 'dc:date', 'updated'],
      'pubDate',
    );
    const contentKey = this.pickKey(
      sample,
      ['content', 'content:encoded'],
      'content',
    );
    const creatorKey = this.pickKey(
      sample,
      ['creator', 'dc:creator', 'author'],
      'creator',
    );

    return { titleKey, linkKey, dateKey, contentKey, creatorKey };
  }

  /**
   * Helper function that searches for the first key present in the sample.
   * @param sample The sample RSS item.
   * @param keys An array of candidate keys in order of preference.
   * @param defaultKey The fallback key if none are found.
   */
  private pickKey(sample: RssItem, keys: string[], defaultKey: string): string {
    for (const key of keys) {
      if (sample[key] !== undefined && sample[key] !== null) {
        return key;
      }
    }
    return defaultKey;
  }

  /**
   * Extracts items from the parsed feed using multiple potential paths.
   */
  private extractItems(parsedData: RssResponse): RssItem[] {
    const possiblePaths: (RssItem[] | undefined)[] = [
      parsedData.rss?.channel?.item, // Standard RSS 2.0
      parsedData.channel?.item, // Feeds that omit the "rss" tag
      parsedData.item, // Atom feeds or feeds with root items
      parsedData['rdf:RDF']?.item, // RDF-based feeds
    ];

    return possiblePaths.find((items) => Array.isArray(items)) ?? [];
  }
}
