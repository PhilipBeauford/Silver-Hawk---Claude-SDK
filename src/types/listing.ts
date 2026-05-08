export type TestListing = {
  title: string;
  price: number;
  shipping: number;
  estimatedSterlingGrams?: number;
  url?: string;
  notes?: string;
};


export type RawEbayListing = {
  itemId: string;
  title: string;
  itemWebUrl?: string;
  price?: {
    value: string;
    currency: string;
  };
  shippingOptions?: Array<{
    shippingCost?: {
      value: string;
      currency: string;
    };
  }>;
  condition?: string;
  image?: {
    imageUrl?: string;
  };
  itemLocation?: {
    country?: string;
    postalCode?: string;
  };
};

export type NormalizedListing = {
  source: "ebay";
  sourceId: string;
  title: string;
  url: string | null;
  price: number;
  shipping: number;
  totalCost: number;
  condition: string | null;
  imageUrl: string | null;
  notes: string[];
};

export type PlaywrightEbayListing = {
  title: string;
  url: string | null;
  priceText: string | null;
  shippingText: string | null;
  imageUrl: string | null;
};

export type NormalizedPlaywrightListing = {
  source: "ebay" | "etsy";
  sourceId: string | null;
  title: string;
  url: string | null;
  price: number | null;
  shipping: number;
  totalCost: number | null;
  imageUrl: string | null;
  notes: string[];
};