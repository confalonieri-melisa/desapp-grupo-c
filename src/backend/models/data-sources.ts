export const DATA_SOURCES = {
  WHOSCORED: "WHOSCORED",
  FOOTBALL_DATA: "FOOTBALL_DATA",
} as const;

export type DataSource = (typeof DATA_SOURCES)[keyof typeof DATA_SOURCES];
