CREATE TABLE IF NOT EXISTS public_expenses (
  id SERIAL PRIMARY KEY,
  reference_date DATE NOT NULL,
  agency VARCHAR(150) NOT NULL,
  company_name VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  district VARCHAR(120) NOT NULL,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  contract_value NUMERIC(14,2) NOT NULL,
  bidding_count INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_expenses_reference_date ON public_expenses(reference_date);
CREATE INDEX IF NOT EXISTS idx_public_expenses_agency ON public_expenses(agency);
CREATE INDEX IF NOT EXISTS idx_public_expenses_category ON public_expenses(category);
