import {
  Activity,
  Briefcase,
  ChartColumn,
  Code,
  Coffee,
  Drama,
  Dumbbell,
  GraduationCap,
  Headphones,
  HeartHandshake,
  Microscope,
  Package,
  Paintbrush,
  PartyPopper,
  PawPrint,
  PenTool,
  Plane,
  Puzzle,
  Radio,
  ShoppingBag,
  Stethoscope,
  Sun,
  TreePine,
  TrendingUp,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
  type LucideProps,
} from 'lucide-react';

/**
 * Icônes des fiches (lucide-react). La DA interdit les emojis système :
 * chaque fiche référence une clé de ce catalogue (vérifié par test).
 */
export const VIDEO_ICONS = {
  headphones: Headphones,
  drama: Drama,
  dumbbell: Dumbbell,
  sun: Sun,
  radio: Radio,
  paintbrush: Paintbrush,
  wheat: Wheat,
  'tree-pine': TreePine,
  'paw-print': PawPrint,
  activity: Activity,
  coffee: Coffee,
  'shopping-bag': ShoppingBag,
  plane: Plane,
  'party-popper': PartyPopper,
  'trending-up': TrendingUp,
  'pen-tool': PenTool,
  code: Code,
  'graduation-cap': GraduationCap,
  microscope: Microscope,
  'chart-column': ChartColumn,
  stethoscope: Stethoscope,
  'heart-handshake': HeartHandshake,
  puzzle: Puzzle,
  package: Package,
  briefcase: Briefcase,
  utensils: UtensilsCrossed,
} as const satisfies Record<string, LucideIcon>;

export type VideoIconName = keyof typeof VIDEO_ICONS;

export function isVideoIcon(name: string): name is VideoIconName {
  return Object.prototype.hasOwnProperty.call(VIDEO_ICONS, name);
}

export function VideoIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = isVideoIcon(name) ? VIDEO_ICONS[name] : Briefcase;
  return <Icon aria-hidden="true" {...props} />;
}
