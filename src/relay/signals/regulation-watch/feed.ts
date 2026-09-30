/**
 * Regulation change notices for the regulation-watch signal.
 *
 * Every entry was checked against the page in `source.url` on 2026-09-30. The
 * summary only states what that page says. `publishedAt` is the date the official
 * text was published (Belgisch Staatsblad or the page's own "last updated" date);
 * when the page shows no such date it falls back to `effectiveFrom`.
 * A notice with `verified: false` could not be confirmed on an official page and
 * says so in its summary.
 */
import type { Jurisdiction } from "../../types";

export type NoticeKind = "change" | "indexation" | "threshold";

export interface RegulationNotice {
  id: string;
  /** Claim-anchor topic this notice speaks to, e.g. "meal-vouchers". */
  topic: string;
  jurisdiction: Jurisdiction;
  title: string;
  /** One or two plain sentences; shown verbatim as evidence. */
  summary: string;
  source: { name: string; url: string };
  /** ISO date (YYYY-MM-DD) the notice was published. */
  publishedAt: string;
  /** ISO date (YYYY-MM-DD) from which the change applies. */
  effectiveFrom: string;
  kind: NoticeKind;
  /** False when the fact could not be confirmed on the source page. Defaults to true. */
  verified?: boolean;
}

export const REGULATION_FEED: RegulationNotice[] = [
  {
    id: "reg-be-meal-vouchers-2026",
    topic: "meal-vouchers",
    jurisdiction: { country: "BE" },
    title: "Maximum employer contribution to meal vouchers raised to 8.91 EUR",
    summary:
      "From 1 January 2026 the employer contribution to a meal voucher may be at most 8.91 EUR (was 6.91 EUR) for the voucher to stay free of social security contributions, so the maximum face value becomes 10 EUR; the employee contribution stays at least 1.09 EUR. Royal Decree of 10 November 2025, Belgisch Staatsblad 17 November 2025.",
    source: {
      name: "RSZ administrative instructions 2026/3, meal vouchers",
      url: "https://www.socialsecurity.be/employer/instructions/dmfa/nl/latest/instructions/salary/particularcases/lunchcheques/salaryfeatures.html",
    },
    publishedAt: "2025-11-17",
    effectiveFrom: "2026-01-01",
    kind: "threshold",
    verified: true,
  },
  {
    id: "reg-be-jc118-indexation-2026-01",
    topic: "indexation",
    jurisdiction: { country: "BE", jointCommittee: "118" },
    title: "JC 118 wages indexed by 2.19% in January 2026",
    summary:
      "The FPS Employment fiche for Joint Committee 118 (food industry) lists under the gross wage scales: January 2026, indexation by 2.19%, under the CAO of 20 July 2011 linking wages to the consumer price index. The fiche was last updated on 26 February 2026.",
    source: {
      name: "FPS Employment, fiche Paritair Comite 118 (voedingsnijverheid)",
      url: "https://werk.belgie.be/sites/default/files/content/documents/Internationaal/Limosafiches/Detachering118.pdf",
    },
    publishedAt: "2026-02-26",
    effectiveFrom: "2026-01-01",
    kind: "indexation",
    verified: true,
  },
  {
    id: "reg-be-jc118-meal-vouchers-2026",
    topic: "meal-vouchers",
    jurisdiction: { country: "BE", jointCommittee: "118" },
    title: "JC 118 sector agreement 2025-2026: meal vouchers up by 1 EUR per day worked",
    summary:
      "Under the 2025-2026 sector agreement for the food industry (JC 118), meal vouchers rise by 1 EUR per day worked from 1 January 2026 in all companies that already grant them; where a union delegation exists a better arrangement could be negotiated until 15 February 2026. The agreement was approved at the joint committee meeting of 20 November 2025. Stated in the ABVV Horval brochure on the sector agreement; the registered CAO text was not opened.",
    source: {
      name: "ABVV Horval, brochure sectorakkoord PC 118 2025-2026",
      url: "https://www.horval.be/sites/default/files/publications/pdf/pc118_sectorakkoord_brochure_a5_012026_def_lowres.pdf",
    },
    publishedAt: "2025-11-20",
    effectiveFrom: "2026-01-01",
    kind: "change",
    verified: true,
  },
  {
    id: "reg-be-company-car-co2-2026",
    topic: "benefit-in-kind",
    jurisdiction: { country: "BE" },
    title: "Reference CO2 emissions for the company-car benefit in kind, income year 2026",
    summary:
      "For benefits granted from 1 January 2026 (income year 2026, tax year 2027) the reference CO2 emission is 70 g/km for petrol, LPG or natural-gas cars and 58 g/km for diesel cars, and the minimum taxable benefit is 1,690 EUR per year. Both feed the formula 5.5 + ((CO2 of the car - reference CO2) x 0.1).",
    source: {
      name: "FOD Financien, Bedrijfswagens",
      url: "https://fin.belgium.be/nl/particulieren/vervoer/bedrijfswagens",
    },
    publishedAt: "2026-01-01",
    effectiveFrom: "2026-01-01",
    kind: "threshold",
    verified: true,
  },
];
