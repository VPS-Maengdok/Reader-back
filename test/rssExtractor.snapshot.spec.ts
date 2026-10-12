import { readFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { RssExtractor } from 'src/integrations/rssExtractor.service';
import { Feed } from 'src/entities/feed.entity';
import { ArticleService } from 'src/services/article.service';

jest.mock('axios');

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', 'rss', name), 'utf8');

const feed: Feed = {
  id: 1,
  websiteName: 'Fixture Feed',
  websiteUrl: 'https://example.com',
  rssUrl: 'https://example.com/rss',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

// Feed is not part of the snapshot: only the parsed article fields are.
const withoutFeed = (articles: Array<Record<string, unknown>>) =>
  articles.map((article) => {
    const copy = { ...article };
    delete copy.feed;
    return copy;
  });

describe('RssExtractor parsing snapshots', () => {
  let extractor: RssExtractor;

  const parse = async (body: string) => {
    (axios.get as jest.Mock).mockResolvedValue({ data: body });
    return extractor.fetch(feed);
  };

  beforeEach(() => {
    extractor = new RssExtractor({
      add: jest.fn(),
    } as unknown as ArticleService);
  });

  afterEach(() => jest.clearAllMocks());

  it('parses an RSS 2.0 feed', async () => {
    const articles = await parse(fixture('rss2.xml'));
    expect(withoutFeed(articles as never)).toMatchSnapshot();
  });

  it('records the behaviour on an Atom feed', async () => {
    const articles = await parse(fixture('atom.xml'));
    expect(withoutFeed(articles as never)).toMatchSnapshot();
  });

  it('parses CDATA sections and HTML entities', async () => {
    const articles = await parse(fixture('cdata-entities.xml'));
    expect(withoutFeed(articles as never)).toMatchSnapshot();
  });

  it('records the behaviour on a malformed feed', async () => {
    let outcome: unknown;
    try {
      outcome = withoutFeed((await parse(fixture('malformed.xml'))) as never);
    } catch (error) {
      outcome = {
        threw: (error as Error).constructor.name,
        message: (error as Error).message,
      };
    }
    expect(outcome).toMatchSnapshot();
  });

  it('records the behaviour on an entity expansion ("billion laughs") sample', async () => {
    let outcome: unknown;
    try {
      const articles = await parse(fixture('entity-expansion.xml'));
      outcome = articles.map((a) => ({
        titleLength: a.title?.length,
        titleStart: a.title?.slice(0, 12),
        descriptionLength: a.description?.length,
        descriptionStart: a.description?.slice(0, 12),
      }));
    } catch (error) {
      outcome = {
        threw: (error as Error).constructor.name,
        message: (error as Error).message,
      };
    }
    expect(outcome).toMatchSnapshot();
  });

  it('records the behaviour on an oversized body (12 MB)', async () => {
    const huge = `<?xml version="1.0"?><rss><channel><item><title>Small</title><link>https://example.com/small</link><pubDate>Sun, 23 Feb 2025 10:00:00 GMT</pubDate><description>ok</description></item><item><title>Big</title><link>https://example.com/big</link><pubDate>Sun, 23 Feb 2025 10:00:00 GMT</pubDate><description>${'a'.repeat(12 * 1024 * 1024)}</description></item></channel></rss>`;
    let outcome: unknown;
    try {
      const articles = await parse(huge);
      outcome = articles.map((a) => ({
        title: a.title,
        descriptionLength: a.description?.length,
      }));
    } catch (error) {
      outcome = {
        threw: (error as Error).constructor.name,
        message: (error as Error).message,
      };
    }
    expect(outcome).toMatchSnapshot();
  });

  it('refuses a deeply nested document', async () => {
    const nested = `<rss><channel>${'<a>'.repeat(60)}x${'</a>'.repeat(60)}</channel></rss>`;
    await expect(parse(nested)).rejects.toThrow(/nested/i);
  });
});
