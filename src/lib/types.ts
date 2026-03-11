export interface QuoteItem {
  id?: string;
  quote_id?: string;
  service_name: string;
  unit_price: number;
  quantity: number;
  total: number;
}

export interface Quote {
  id?: string;
  user_id?: string;
  client_name: string;
  client_address: string;
  status: 'brouillon' | 'envoyé' | 'accepté' | 'refusé';
  notes: string;
  total_ht: number;
  total_ttc: number;
  created_at?: string;
  updated_at?: string;
  quote_items?: QuoteItem[];
}
