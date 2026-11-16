/**
 * Pure Picks - Unified Pricing & Weight Calculation Engine
 * 
 * Supports:
 * - Configured weights: 200g (0.2), 250g (0.25), 500g (0.5), 750g (0.75), 1kg (1.0), 2kg (2.0), 5kg (5.0)
 * - Liquid volume options: 200ml (0.2), 250ml (0.25), 500ml (0.5), 750ml (0.75), 1 litre (1.0), 2 litres (2.0), 5 litres (5.0)
 * - Bunches & count options: 1 bunch (1.0), 2 bunches (2.0), etc.
 * - Multi-pack options: 1 pack (1.0), 2 packs (2.0), etc.
 * - Fixed-price single products: pack/unit/piece without 1kg tier -> returns 1.0 (maintains basePrice)
 * - Consistent rounding: 2 decimal places (Math.round(val * 100) / 100)
 * - Validation: quantity (positive finite integer <= 100), weight option against optionsJson, cutting option against cuttingOptionsJson
 */

/**
 * Requirement 2 & 3 & 4 & 5 & 6:
 * Dynamically computes weight, volume or unit multiplier for pricing and inventory calculations.
 */
export function calculateWeightMultiplier(
  weightStr?: string | null,
  productUnit?: string | null,
  optionsJson?: string | null
): number {
  if (!weightStr) return 1.0;
  const w = weightStr.toLowerCase().trim();

  // 1. Check if fixed-price pack/unit without 1kg reference
  const unitLower = (productUnit || '').toLowerCase().trim();
  const isFixedUnit = ['pack', 'unit', 'piece', 'box', 'item'].includes(unitLower);

  if (isFixedUnit && optionsJson) {
    try {
      const allowed = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
      if (Array.isArray(allowed)) {
        // If the product options don't contain a 1kg / 1L tier, and it's a fixed pack, it's a fixed pack price
        const hasKgTier = allowed.some((opt: string) => {
          const o = String(opt).toLowerCase();
          return (
            o.includes('1kg') ||
            o.includes('1 kg') ||
            o.includes('1 litre') ||
            o.includes('1l') ||
            o.includes('1000g')
          );
        });
        if (!hasKgTier && allowed.length === 1) {
          return 1.0;
        }
      }
    } catch {}
  }

  // 2. Bunches (e.g. "1 Bunch", "2 Bunches")
  const bunchMatch = w.match(/^(\d+(?:\.\d+)?)\s*bunch(?:es)?\b/i);
  if (bunchMatch) {
    return parseFloat(bunchMatch[1]);
  }

  // 3. Multi-pack count (e.g. "2 packs", "3 units")
  const multiPackMatch = w.match(/^(\d+(?:\.\d+)?)\s*(?:packs?|units?|pieces?)\b/i);
  if (multiPackMatch) {
    return parseFloat(multiPackMatch[1]);
  }

  // 4. Millilitres (e.g. 200ml, 250ml, 500ml, 750ml) -> converted to Litre fraction
  const mlMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:ml|millilitres?|milliliters?)\b/i);
  if (mlMatch) {
    return Math.round((parseFloat(mlMatch[1]) / 1000) * 10000) / 10000;
  }

  // 5. Litres (e.g. 1 Litre, 1.5L, 2 Litres, 5 Litres)
  const lMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:litres?|liters?|l)\b/i);
  if (lMatch) {
    return parseFloat(lMatch[1]);
  }

  // 6. Kilograms (e.g. 1 kg, 1kg, 2 kg, 5 kg) - Must check BEFORE grams because "kg" contains "g"
  const kgMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilos?|kilograms?)\b/i);
  if (kgMatch) {
    return parseFloat(kgMatch[1]);
  }

  // 7. Grams (e.g. 200g, 250g, 500g, 750g) -> converted to kg fraction
  const gMatch = w.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams?)\b/i);
  if (gMatch) {
    return Math.round((parseFloat(gMatch[1]) / 1000) * 10000) / 10000;
  }

  return 1.0;
}

// Backward-compatible alias
export const getWeightMultiplier = calculateWeightMultiplier;

/**
 * Requirement 8 & 11: Calculates item unit price with consistent rounding to two decimal places.
 */
export function calculateItemUnitPrice(
  basePrice: number,
  weightStr?: string | null,
  productUnit?: string | null,
  optionsJson?: string | null
): number {
  const mult = calculateWeightMultiplier(weightStr, productUnit, optionsJson);
  return Math.round(basePrice * mult * 100) / 100;
}

/**
 * Requirement 7: Validates requested weight option against the product's configured optionsJson.
 */
export function validateWeightOption(
  selectedWeight: string | null | undefined,
  optionsJson: string | null | undefined,
  productName = 'Product'
): boolean {
  if (!optionsJson) return true;

  try {
    const allowed = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (!selectedWeight) {
        throw new Error(`Weight/volume option is required for "${productName}". Allowed: ${allowed.join(', ')}`);
      }

      const normSelected = selectedWeight.toLowerCase().replace(/\s+/g, '');
      const match = allowed.find((opt: string) => {
        const normOpt = String(opt).toLowerCase().replace(/\s+/g, '');
        return normSelected === normOpt || normOpt.startsWith(normSelected) || normSelected.startsWith(normOpt);
      });

      if (!match) {
        throw new Error(
          `Invalid weight/volume option "${selectedWeight}" for "${productName}". Allowed options are: ${allowed.join(', ')}`
        );
      }
    }
  } catch (e: any) {
    if (e.message?.startsWith('Invalid weight') || e.message?.startsWith('Weight/volume option is required')) {
      throw e;
    }
  }

  return true;
}

/**
 * Requirement 13: Validates cutting option against product's configured cuttingOptionsJson.
 */
export function validateCuttingOption(
  selectedCut: string | null | undefined,
  cuttingOptionsJson: string | null | undefined,
  productName = 'Product'
): boolean {
  if (!cuttingOptionsJson) return true;

  try {
    const allowed = typeof cuttingOptionsJson === 'string' ? JSON.parse(cuttingOptionsJson) : cuttingOptionsJson;
    if (Array.isArray(allowed) && allowed.length > 0) {
      if (!selectedCut) {
        return true;
      }

      const normSelected = selectedCut.toLowerCase().replace(/\s+/g, '');
      const match = allowed.find((opt: string) => {
        const normOpt = String(opt).toLowerCase().replace(/\s+/g, '');
        return normSelected === normOpt || normOpt.startsWith(normSelected) || normSelected.startsWith(normOpt);
      });

      if (!match) {
        throw new Error(
          `Invalid cutting option "${selectedCut}" for "${productName}". Allowed options are: ${allowed.join(', ')}`
        );
      }
    }
  } catch (e: any) {
    if (e.message?.startsWith('Invalid cutting option')) {
      throw e;
    }
  }

  return true;
}

/**
 * Requirement 12: Validates requested quantity as a finite positive integer <= 100.
 */
export function validateQuantity(qty: any, productName = 'item'): number {
  if (qty === undefined || qty === null) {
    throw new Error(`Quantity is required for ${productName}.`);
  }

  const num = Number(qty);

  if (!Number.isFinite(num)) {
    throw new Error(`Invalid quantity provided for ${productName}: must be a finite number.`);
  }

  if (num <= 0) {
    throw new Error(`Quantity for ${productName} must be greater than zero.`);
  }

  if (!Number.isInteger(num)) {
    throw new Error(`Quantity for ${productName} must be a whole unit (fractional quantities are not permitted).`);
  }

  if (num > 100) {
    throw new Error(`Quantity for ${productName} exceeds maximum allowed limit of 100 units per order.`);
  }

  return num;
}
