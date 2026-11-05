import { REQUIRED_CHECKS } from "./engine.ts";
import type { Case, CheckStatus, Debt, Donor } from "./types.ts";

/**
 * FICTIONAL sample data for local development and the demo. These are not
 * real people. Never seed production with invented stories.
 */

const T0 = "2026-11-01T15:00:00.000Z";

function checks(overrides: Partial<Record<(typeof REQUIRED_CHECKS)[number], CheckStatus>> = {}) {
  return REQUIRED_CHECKS.map((kind) => ({
    kind,
    status: overrides[kind] ?? ("passed" as CheckStatus),
    provider: kind === "story_review" ? "caseworker" : "mock",
    updatedAt: T0,
  }));
}

let debtSeq = 0;
function debt(type: Debt["type"], creditorName: string, dollars: number, last4: string): Debt {
  debtSeq += 1;
  return {
    id: `debt_seed_${debtSeq}`,
    type,
    creditorName,
    accountMask: `•••• ${last4}`,
    amountCents: Math.round(dollars * 100),
    creditorConfirmed: true,
    payoffQuoteExpiresAt: "2026-12-31T00:00:00.000Z",
  };
}

export const SEED_DONORS: Donor[] = [
  { id: "donor_demo", displayName: "Demo Donor", kycVerified: true, anonymous: false },
  { id: "donor_unverified", displayName: "New Donor", kycVerified: false, anonymous: true },
];

export const SEED_CASES: Case[] = [
  {
    id: "case_maya",
    firstName: "Maya",
    age: 20,
    city: "Dayton",
    state: "OH",
    category: "student",
    headline: "One balance away from re-enrolling for spring",
    story:
      "I'm a nursing student and the first in my family to go to college. My dad's hours got cut last year and I picked up a second job, but I still ended up with a past-due balance. The school put a hold on my account, so I can't register for spring until it's paid.",
    unlocks: "Registration hold lifted so I can finish my nursing degree on time.",
    debts: [debt("student_loan", "Riverside State University, Bursar", 2140, "0193")],
    status: "listed",
    checks: checks(),
    createdAt: T0,
    listedAt: "2026-11-01T16:00:00.000Z",
  },
  {
    id: "case_denise",
    firstName: "Denise",
    age: 34,
    city: "Tucson",
    state: "AZ",
    category: "single_parent",
    headline: "Two kids, one car, and a transmission that quit",
    story:
      "I'm raising two boys on my own and work as a dental assistant. When my transmission went out I missed two weeks of work and fell behind on rent and daycare. We're caught up on everything going forward; it's the backlog that's burying us.",
    unlocks: "Keeps our apartment and the boys in the same daycare.",
    debts: [
      debt("rent_arrears", "Saguaro Flats Apartments", 1850, "2207"),
      debt("childcare", "Little Sprouts Learning Center", 960, "5512"),
    ],
    status: "listed",
    checks: checks(),
    createdAt: T0,
    listedAt: "2026-11-01T16:05:00.000Z",
  },
  {
    id: "case_marcus",
    firstName: "Marcus",
    age: 47,
    city: "Spokane",
    state: "WA",
    category: "housing_recovery",
    headline: "Eight months housed. Old utility debt blocks the next lease.",
    story:
      "I spent most of last year in a shelter after a layoff. I've had steady work at a warehouse for eight months and just got approved for my own place, but an old utility balance in my name means they won't turn the power on at the new address.",
    unlocks: "Lights on at my first apartment in two years.",
    debts: [debt("utility", "Inland Power & Light", 735, "8841")],
    status: "listed",
    checks: checks(),
    createdAt: T0,
    listedAt: "2026-11-01T16:10:00.000Z",
  },
  {
    id: "case_rosa",
    firstName: "Rosa",
    age: 58,
    city: "El Paso",
    state: "TX",
    category: "caregiver",
    headline: "Took care of Mom. The ER bill came anyway.",
    story:
      "I left my job to care for my mother after her stroke. During that time I had my own ER visit for chest pain (it turned out OK, thank God) and the bill went to collections. I'm back at work part-time now and trying to rebuild my credit.",
    unlocks: "Collections account closed and my credit can start to recover.",
    debts: [debt("medical", "Desert Valley Medical Center", 3420, "6630")],
    status: "listed",
    checks: checks(),
    createdAt: T0,
    listedAt: "2026-11-01T16:15:00.000Z",
  },
  {
    id: "case_james",
    firstName: "James",
    age: 29,
    city: "Fayetteville",
    state: "NC",
    category: "veteran",
    headline: "Out of the Army, into a gap between paychecks",
    story:
      "I separated from the Army in the spring and the gap before my new job started took longer than planned. I put groceries and a security deposit on a credit card and the interest is eating me alive. I'm working now and want a clean start.",
    unlocks: "A clean slate going into my first civilian year.",
    debts: [debt("credit_card", "First Patriot Card Services", 2675, "3318")],
    status: "listed",
    checks: checks(),
    createdAt: T0,
    listedAt: "2026-11-01T16:20:00.000Z",
  },
  {
    id: "case_tanya",
    firstName: "Tanya",
    age: 41,
    city: "Baton Rouge",
    state: "LA",
    category: "disaster_recovery",
    headline: "Flood took the car. The loan didn't go with it.",
    story:
      "Our street flooded in August. Insurance covered part of the car, but I still owe the gap on the loan and I'm paying it on top of a replacement. I'm a school bus driver and I need reliable wheels to get to the depot by 5am.",
    unlocks: "One car payment instead of two.",
    debts: [debt("car_loan", "Bayou Community Credit Union", 4100, "7725")],
    status: "in_review",
    checks: checks({ story_review: "pending" }),
    createdAt: "2026-11-04T12:00:00.000Z",
  },
];
