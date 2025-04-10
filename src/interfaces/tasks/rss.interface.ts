export interface RssItem {
  [key: string]: string | Date | undefined;
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
  item?: RssItem[];
  'rdf:RDF'?: {
    item?: RssItem[];
  };
}
