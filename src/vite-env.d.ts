/// <reference types="vite/client" />

declare module 'lucide-react' {
  import type { FC, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }

  export type LucideIcon = FC<LucideProps>;

  export const LayoutDashboard: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const Users: LucideIcon;
  export const UserCheck: LucideIcon;
  export const Calendar: LucideIcon;
  export const FileText: LucideIcon;
  export const Award: LucideIcon;
  export const Settings: LucideIcon;
}
