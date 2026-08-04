export type HappyHourSource = {
  name: string;
  coverage: string;
  url: string;
  note: string;
};

export const HAPPY_HOUR_SOURCES: HappyHourSource[] = [
  {
    name: 'Time Out',
    coverage: 'London, Paris, Cape Town, Johannesburg and many more',
    url: 'https://www.timeout.com',
    note: 'City editions with current food-and-drink guides.',
  },
  {
    name: 'Secret Media Network',
    coverage: '200+ cities worldwide',
    url: 'https://secretmedianetwork.com',
    note: 'Local editorial guides and bar round-ups by city.',
  },
  {
    name: 'DesignMyNight',
    coverage: 'London and the UK',
    url: 'https://www.designmynight.com',
    note: 'Drinks deals, venue listings and bookable nightlife.',
  },
];
