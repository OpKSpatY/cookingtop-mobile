/** GET /recipes/:id/pantry-comparison */

export type PantryComparisonMeasureUnit = {
  id: string;
  name: string;
  abbreviation: string;
};

export type PantryComparisonItem = {
  recipe_ingredient_id: string;
  ingredient_id: string;
  ingredient_name: string;
  measure_units_id: string;
  measure_unit: PantryComparisonMeasureUnit;
  ingredient_unit_id: string;
  required_amount: string;
  user_quantity_raw: string | null;
  user_quantity_parsed: number | null;
  quantity_parse_error: boolean;
  has_in_pantry: boolean;
  is_sufficient: boolean;
  shortage_amount: string;
};

export type PantryComparisonSummary = {
  total_lines: number;
  lines_with_stock: number;
  lines_sufficient: number;
  all_sufficient: boolean;
};

export type RecipePantryComparison = {
  recipe_id: string;
  title: string;
  items: PantryComparisonItem[];
  summary: PantryComparisonSummary;
};
