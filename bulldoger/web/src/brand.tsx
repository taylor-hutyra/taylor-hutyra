import type { DebtType, PublicCard, StoryCategory } from "@bulldoger/shared";
import {
  Baby,
  Car,
  CreditCard,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  LifeBuoy,
  Medal,
  Stethoscope,
  Sunrise,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Path to a file in /public, respecting the deploy base path. */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

export type MascotPose = "wave" | "dozer" | "paid" | "celebrate" | "dozer-debt" | "thumbs";

const MASCOT_SIZE: Record<MascotPose, [number, number]> = {
  wave: [389, 474],
  dozer: [544, 483],
  paid: [383, 478],
  celebrate: [420, 487],
  "dozer-debt": [591, 478],
  thumbs: [391, 485],
};

/** The Bulldoger corgi. Decorative by default. */
export function Mascot({ pose, height, className = "", alt = "" }: { pose: MascotPose; height: number; className?: string; alt?: string }) {
  const [w, h] = MASCOT_SIZE[pose];
  return (
    <img
      className={`mascot ${className}`}
      src={asset(`brand/mascot-${pose}.webp`)}
      width={Math.round((w / h) * height)}
      height={height}
      alt={alt}
      draggable={false}
      decoding="async"
    />
  );
}

/** App icon: the corgi in its bulldozer. */
export function BrandIcon({ size = 40 }: { size?: number }) {
  return <img className="brand-icon" src={asset("brand/icon.webp")} width={size} height={size} alt="" draggable={false} />;
}

/** "Bull" + "doger", set to match the logo artwork. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`} aria-label="Bulldoger">
      <span aria-hidden>Bull</span>
      <span className="wordmark-doge" aria-hidden>
        doger
      </span>
    </span>
  );
}

export const DEBT_ICONS: Record<DebtType, LucideIcon> = {
  medical: Stethoscope,
  student_loan: GraduationCap,
  rent_arrears: Home,
  utility: Zap,
  childcare: Baby,
  car_loan: Car,
  credit_card: CreditCard,
  personal_loan: Landmark,
  gambling: Landmark,
  payday_loan_rollover: Landmark,
  crypto_margin: Landmark,
  court_restitution: Landmark,
};

export const CATEGORY_ICONS: Record<StoryCategory, LucideIcon> = {
  student: GraduationCap,
  single_parent: HandHeart,
  housing_recovery: Sunrise,
  medical: HeartPulse,
  veteran: Medal,
  caregiver: HandHeart,
  disaster_recovery: LifeBuoy,
  other: User,
};

/** Monogram stand-in until recipients upload an approved photo. */
export function Portrait({ card, size = 56 }: { card: Pick<PublicCard, "firstName" | "category" | "photoUrl">; size?: number }) {
  if (card.photoUrl) {
    return <img className="portrait" src={card.photoUrl} width={size} height={size} alt={`Photo of ${card.firstName}`} />;
  }
  return (
    <span className={`portrait tone-${card.category}`} style={{ width: size, height: size, fontSize: size * 0.46 }} aria-hidden>
      {card.firstName[0]}
    </span>
  );
}
