export interface CardRow {
  number: string;       // e.g. "ANPR-EN063"
  setId: string;        // e.g. "ANPR" (everything before first dash)
  quantity: number;     // Total Quantity column
  productName: string;
  setName: string;
  rarity: string;
}

export interface ParsedFile {
  fileName: string;
  cards: CardRow[];
  totalCards: number;
  /** Ordered list of unique set IDs as they appear in the file */
  setIds: string[];
}

/** One contiguous slice of a physical sorted stack for a given batch */
export interface StackSlice {
  fileName: string;
  firstSetId: string;
  lastSetId: string;
  cardCount: number;
  /** 1-based physical card position where this slice starts in the stack */
  startCard: number;
  /** 1-based physical card position where this slice ends in the stack */
  endCard: number;
  sets: string[];
  /** True if this slice starts in the middle of firstSetId (the run continues a split set) */
  startsInMiddleOfSet: boolean;
  /** True if this slice ends in the middle of lastSetId (the set continues in the next run) */
  endsInMiddleOfSet: boolean;
  /** When endsInMiddleOfSet: the last card to pull and how many of it (quantityNeeded may be < quantityTotal if mid-quantity split) */
  splitEndCard?: { cardNumber: string; quantityNeeded: number; quantityTotal: number }
}

export interface Batch {
  batchNumber: number;
  /** Set IDs that fall in this batch (globally, across all files) */
  setIds: string[];
  slices: StackSlice[];
  totalCards: number;
}
