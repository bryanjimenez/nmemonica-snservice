declare module 'nmemonica'{
export interface RawJapanese {
  japanese: string;
  pronounce?: string;
  form?: string;
  slang?: boolean;
  keigo?: boolean;
  adj?: string;
  /** uid of intransitive pair */
  intr?: true | string;
  /** uid of transitive pair */
  trans?: string;
  exv?: 1 | 2 | 3;
}

export type SourceVocabulary = Omit<RawVocabulary, "uid" | "tags"> & {
  tag?: string;
};

export interface RawVocabulary extends RawJapanese {
  uid: string;

  english: string;
  romaji?: string;

  grp?: string;
  subGrp?: string;

  tags: string[];
}

export type SourcePhrase = Omit<
  RawPhrase,
  "uid" | "tags" | "particles" | "inverse"
> & { tag?: string };
export interface RawPhrase {
  uid: string;

  english: string;
  lit?: string; // literal translation
  lesson?: string;
  romaji?: string;

  japanese: string;

  grp?: string;
  subGrp?: string;

  tags: string[];
  particles?: string[];
  inverse?: string;
  polite: boolean;
}

export type SourceKanji = Omit<RawKanji, "uid" | "tags" | "radical"> & {
  tag?: string;
};
export interface RawKanji {
  uid: string;

  kanji: string;
  on?: string;
  kun?: string;
  english: string;

  grp?: string;
  tags: string[];
  /** Radical shown in an example Kanji */
  radex?: string;

  /** Radical info (example Kanji) */
  radical?: { example: string[] };
}

// Partial<T> & Pick<T, "english" | "kanji">;
// export type Optional<T, K extends keyof T> = Omit<T, K> & { [P in keyof T]: T[P] | undefined; }
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
}