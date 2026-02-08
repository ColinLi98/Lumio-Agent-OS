import type { SoulMatrix } from '../../types.js';

export type DigitalSoulBootstrapSource = 'questionnaire' | 'import' | 'skip' | 'passive';

export interface DigitalTwinBootstrapSnapshot {
  snapshot_id: string;
  entity_id: string;
  source: DigitalSoulBootstrapSource;
  created_at_ms: number;
  soul: SoulMatrix;
  inferred_priors: {
    risk_aversion: number;
    time_discount: number;
    execution_reliability: number;
    spending_bias: 'price_first' | 'balanced' | 'quality_first';
  };
  missing_fields: string[];
}
