export const TAG_TAXONOMY = {
  format: [
    "chart",
    "map",
    "infographic",
    "scrollytelling",
    "interactive",
    "animation",
    "table",
    "illustration",
  ],
  topic: [
    "election",
    "climate",
    "economy",
    "health",
    "society",
    "sports",
    "technology",
    "science",
    "conflict",
    "business",
  ],
  tool: [
    "d3",
    "mapbox",
    "observable",
    "flourish",
    "datawrapper",
    "tableau",
    "deckgl",
  ],
} as const;

export const ALL_TAGS = Object.values(TAG_TAXONOMY).flat() as string[];
