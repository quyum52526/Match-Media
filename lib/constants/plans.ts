// Billing catalog — single source of truth for plans & promo coupons.
//
// Money is stored everywhere as integer POISHA (1 BDT = 100 poisha) so we never
// touch floats. DB rows in `Plan`/`Coupon` are seeded from these definitions;
// runtime code resolves plans/coupons by these stable codes (never by id).

/** Poisha per Taka. 1200 BDT === 1200 * TAKA poisha. */
export const TAKA = 100;

/** Free-tier daily cap: profile views AND photo requests, per action, per day. */
export const FREE_DAILY_LIMIT = 3;

// --- Plan codes -------------------------------------------------------------

export const PLAN_CODES = {
  PRO_1M: "PRO_1M",
  PRO_3M: "PRO_3M",
  PRO_12M: "PRO_12M",
} as const;

export type PlanCode = (typeof PLAN_CODES)[keyof typeof PLAN_CODES];

// --- Coupon codes -----------------------------------------------------------

export const COUPON_CODES = {
  /** Auto-applied at registration: 100% off → grants 3 months Pro instantly. */
  WELCOME3MO: "WELCOME3MO",
  /** Auto-applied on the first paid renewal: "First Year Special — 90% off". */
  FIRSTYEAR90: "FIRSTYEAR90",
} as const;

export type CouponCode = (typeof COUPON_CODES)[keyof typeof COUPON_CODES];

// --- Catalog definitions (seeded into the DB) -------------------------------

export interface PlanDef {
  code: PlanCode;
  name: string;
  durationDays: number;
  /** Standard price in poisha. */
  priceAmount: number;
  sortOrder: number;
}

export const PLAN_CATALOG: readonly PlanDef[] = [
  { code: PLAN_CODES.PRO_1M, name: "1 Month Pro", durationDays: 30, priceAmount: 1200 * TAKA, sortOrder: 1 },
  { code: PLAN_CODES.PRO_3M, name: "3 Months Pro", durationDays: 90, priceAmount: 3000 * TAKA, sortOrder: 2 },
  { code: PLAN_CODES.PRO_12M, name: "12 Months Pro", durationDays: 365, priceAmount: 9000 * TAKA, sortOrder: 3 },
];

export interface CouponDef {
  code: CouponCode;
  description: string;
  discountType: "PERCENT" | "FIXED";
  /** PERCENT: 0–100. FIXED: poisha. */
  discountValue: number;
  trigger: "NONE" | "SIGNUP" | "RENEWAL";
  /** null = applies to any plan, else only this Plan.code. */
  appliesToPlan: PlanCode | null;
  /** SIGNUP coupons provision this plan with a zero-gateway order. */
  grantsPlanCode: PlanCode | null;
  /** null = unlimited per user. 1 makes a promo strictly one-time. */
  perUserLimit: number | null;
  /** null = unlimited global redemptions. */
  maxRedemptions: number | null;
}

export const COUPON_CATALOG: readonly CouponDef[] = [
  {
    code: COUPON_CODES.WELCOME3MO,
    description: "Signup gift — 3 months Pro free (100% off)",
    discountType: "PERCENT",
    discountValue: 100,
    trigger: "SIGNUP",
    appliesToPlan: PLAN_CODES.PRO_3M,
    grantsPlanCode: PLAN_CODES.PRO_3M,
    perUserLimit: 1,
    maxRedemptions: null,
  },
  {
    code: COUPON_CODES.FIRSTYEAR90,
    description: "First Year Special — 90% off any plan",
    discountType: "PERCENT",
    discountValue: 90,
    trigger: "RENEWAL",
    appliesToPlan: null,
    grantsPlanCode: null,
    perUserLimit: 1,
    maxRedemptions: null,
  },
];
