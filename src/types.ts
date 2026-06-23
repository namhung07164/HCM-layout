/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ActualClassInfo {
  update?: string;
  classCode: string;
  name: string;
  hcmSize: string;
  hcmSalesEffi: string;
  hcmProfitEffi: string;
  [key: string]: any;
}

export interface ClassInfo {
  update?: string;
  classCode: string;
  name: string;
  vendorCode: string;
  brandCode: string;
  brandName: string;
  salesEffi?: number;
  profitEffi?: number;
  [key: string]: any;
}

export interface SalesInfo {
  update?: string;
  vendorCode?: string;
  brandCode?: string;
  brandName?: string;
  sales: number;
  salesByCp: number;
  [key: string]: any;
}

export interface ProfitInfo {
  update?: string;
  brandCode: string;
  profit: number;
  profitByCp: number;
  [key: string]: any;
}

export interface UnitInfo {
  update?: string;
  floor: string;
  classCode?: string;
  unit: string;
  size: string;
  startMonth: string;
  vendorCode?: string;
  brandCode: string;
  brandName: string;
  status?: string;
  [key: string]: any;
}

export interface MDStatusInfo {
  update: string;
  unit: string;
  unitLink?: string;
  brandCode: string;
  brandName: string;
  status: string;
  mdNotes?: string;
  [key: string]: any;
}

export interface BasePlanInfo {
  update?: string;
  floor: string;
  marginLow: number;
  marginHigh: number;
  managementFee: number;
  fitOutManagementFee: number;
  mgp: number;
  stockroomFee: number;
  cageFee: number;
  apSupporting: number;
  tieUp: number;
  vshcm?: number;
  [key: string]: any;
}

export interface SubFeeInfo {
  update: string;
  brandCode: string;
  brandName: string;
  managementFee: number;
  mgp: number;
  fitOutManagementFee: number;
  apSupporting: number;
  tieUp: number;
  stockroomFee: number;
  cageFee: number;
  [key: string]: any;
}

export interface ProjectStatusInfo {
  update: string;
  projectName: string;
  unit: string;
  unitLink?: string;
  status: string;
  actStatus?: string;
  startDate: string;
  endDate: string;
  task: string;
  delegationStatus?: string;
  party?: string;
  flowStatus?: string;
  [key: string]: any;
}

export interface UnitDataInfo {
  update?: string;
  unit: string;
  size: number;
  floor: string;
  active?: string; // 'Active' | 'Unactive'
  [key: string]: any;
}

export interface ProjectLinkInfo {
  update: string;
  projectName: string;
  unit: string;
  unitLink?: string;
  status: string;
  actStatus?: string;
  startDate: string;
  endDate: string;
  task: string;
  delegationStatus?: string;
  party?: string;
  flowStatus?: string;
  [key: string]: any;
}

export type TabType =
  | "input"
  | "dashboard"
  | "settings"
  | "mapping"
  | "picture";
export type InputSubTabType =
  | "base-plan"
  | "units"
  | "class-info"
  | "actual-class-info"
  | "sales"
  | "profit"
  | "sub-fee";
export type MappingSubTabType =
  | "summary"
  | "unit-info"
  | "md-status"
  | "project-status"
  | "project-link";

export type StoreRegion = 'HCM' | 'HN';
