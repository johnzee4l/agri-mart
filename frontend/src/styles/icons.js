/* Domain and status icon map (designtokens.md 10.2).
   Named imports only, so tree-shaking works. Verify names against the installed
   @phosphor-icons/react version before adding new ones (decision D7). */
import {
  Archive,
  ArrowCounterClockwise,
  Bell,
  BowlFood,
  Bug,
  ChartBar,
  ChatCircleDots,
  CheckCircle,
  CircleNotch,
  ClipboardText,
  Clock,
  Cube,
  Drop,
  FirstAid,
  Flask,
  Grains,
  MagnifyingGlass,
  MapPin,
  Megaphone,
  Package,
  Plant,
  ShoppingCartSimple,
  Storefront,
  Truck,
  Users,
  Warning,
  WifiSlash,
  Wrench,
  XCircle,
} from "@phosphor-icons/react";

export const domainIcons = {
  seeds: Grains,
  fertilizers: Flask,
  pesticides: Bug,
  feed: BowlFood,
  veterinary: FirstAid,
  tools: Wrench,
  irrigation: Drop,
  plants: Plant,
};

export const uiIcons = {
  cart: ShoppingCartSimple,
  store: Storefront,
  delivery: Truck,
  pickup: Package,
  orders: ClipboardText,
  chat: ChatCircleDots,
  announcements: Megaphone,
  notifications: Bell,
  reports: ChartBar,
  users: Users,
  inventory: Cube,
  mapPin: MapPin,
  search: MagnifyingGlass,
  offline: WifiSlash,
  warning: Warning,
  success: CheckCircle,
  error: XCircle,
  archive: Archive,
  restore: ArrowCounterClockwise,
  loading: CircleNotch,
  clock: Clock,
};

// Order status to icon (designtokens.md 11.1). Colour and label always accompany it.
export const statusIcons = {
  pending: Clock,
  paid: CheckCircle,
  preparing: Cube,
  out_for_delivery: Truck,
  completed: CheckCircle,
  cancelled: XCircle,
};
