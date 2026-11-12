import { useAppStore } from "../store/useAppStore";
import { safeGetItemLocal, safeSetItemLocal } from "./storage";
import { NotificationRule, PermissionMatrix, AppUser } from "../types";

export interface ConfigVersions {
  locationsVersion?: number;
  partiesVersion?: number;
  ratesVersion?: number;
  rulesVersion?: number;
  r2Version?: number;
  permissionsVersion?: number;
  subAppUsersVersion?: number;
  appUsersVersion?: number;
  pictureMappingVersion?: number;
  globalRestoreCutoff?: number;
  dataFingerprint?: string;
  updatedAt?: string;
}

const CACHE_KEYS = {
  LOCATIONS: "taka_cache_locations_v1",
  LOCATION_VISIBILITY: "taka_cache_location_visibility_v1",
  PARTIES: "taka_cache_parties_v1",
  JPY_RATE: "taka_cache_exchange_jpy_v1",
  USD_RATE: "taka_cache_exchange_usd_v1",
  RULES: "taka_cache_rules_v1",
  VERSIONS: "taka_cache_config_versions_v1",
  R2_CONFIG: "taka_cache_r2_config_v1",
  PERMISSIONS: "taka_cache_permissions_v1",
  SUB_APP_USERS: "taka_cache_sub_app_users_v1",
  APP_USERS: "taka_cache_app_users_v2",
};

/**
 * Đọc phiên bản cache hiện tại từ localStorage
 */
export function getLocalConfigVersions(): ConfigVersions {
  try {
    const raw = safeGetItemLocal(CACHE_KEYS.VERSIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {};
}

/**
 * Lưu phiên bản cache mới vào localStorage
 */
export function setLocalConfigVersions(versions: ConfigVersions): void {
  try {
    safeSetItemLocal(CACHE_KEYS.VERSIONS, JSON.stringify(versions));
  } catch (e) {}
}

/**
 * Tải trước dữ liệu tĩnh từ LocalStorage vào Zustand Store để app mở tức thì (0ms, 0 Read)
 */
export function loadCachedStaticConfig(): {
  locations: string[];
  locationVisibility: Record<string, boolean>;
  parties: string[];
  jpyRate: number;
  usdRate: number;
  rules: NotificationRule[];
  r2Config: { accountId: string; bucketName: string; accessKeyId: string; secretAccessKey: string } | null;
  permissions: PermissionMatrix;
  subAppUsers: any[];
  appUsers: AppUser[];
} {
  let locations: string[] = [];
  let locationVisibility: Record<string, boolean> = {};
  let parties: string[] = ["Shimizu", "Landlord", "Takashimaya", "CP"];
  let jpyRate = 160;
  let usdRate = 25000;
  let rules: NotificationRule[] = [];
  let r2Config = null;
  let permissions: PermissionMatrix = {} as PermissionMatrix;
  let subAppUsers: any[] = [];
  let appUsers: AppUser[] = [];

  try {
    const rawLocs = safeGetItemLocal(CACHE_KEYS.LOCATIONS);
    if (rawLocs) locations = JSON.parse(rawLocs);

    const rawVis = safeGetItemLocal(CACHE_KEYS.LOCATION_VISIBILITY);
    if (rawVis) locationVisibility = JSON.parse(rawVis);

    const rawParties = safeGetItemLocal(CACHE_KEYS.PARTIES);
    if (rawParties) parties = JSON.parse(rawParties);

    const rawJpy = safeGetItemLocal(CACHE_KEYS.JPY_RATE);
    if (rawJpy) {
      const num = Number(rawJpy);
      if (!isNaN(num) && num > 0) jpyRate = num;
    }

    const rawUsd = safeGetItemLocal(CACHE_KEYS.USD_RATE);
    if (rawUsd) {
      const num = Number(rawUsd);
      if (!isNaN(num) && num > 0) usdRate = num;
    }

    const rawRules = safeGetItemLocal(CACHE_KEYS.RULES);
    if (rawRules) rules = JSON.parse(rawRules);

    const rawR2 = safeGetItemLocal(CACHE_KEYS.R2_CONFIG);
    if (rawR2) r2Config = JSON.parse(rawR2);

    const rawPerms = safeGetItemLocal(CACHE_KEYS.PERMISSIONS);
    if (rawPerms) permissions = JSON.parse(rawPerms);

    const rawSubUsers = safeGetItemLocal(CACHE_KEYS.SUB_APP_USERS);
    if (rawSubUsers) subAppUsers = JSON.parse(rawSubUsers);

    const rawAppUsers = safeGetItemLocal(CACHE_KEYS.APP_USERS);
    if (rawAppUsers) appUsers = JSON.parse(rawAppUsers);
  } catch (e) {
    console.warn("Failed to parse cached static config:", e);
  }

  return { locations, locationVisibility, parties, jpyRate, usdRate, rules, r2Config, permissions, subAppUsers, appUsers };
}

/**
 * Lưu R2 Config vào LocalStorage
 */
export function cacheR2Config(config: { accountId: string; bucketName: string; accessKeyId: string; secretAccessKey: string } | null): void {
  try {
    if (config) {
      safeSetItemLocal(CACHE_KEYS.R2_CONFIG, JSON.stringify(config));
      safeSetItemLocal('r2_account_id', config.accountId || '');
      safeSetItemLocal('r2_bucket_name', config.bucketName || '');
      safeSetItemLocal('r2_access_key', config.accessKeyId || '');
      safeSetItemLocal('r2_access_key_id', config.accessKeyId || '');
      safeSetItemLocal('r2_secret_key', config.secretAccessKey || '');
      safeSetItemLocal('r2_secret_access_key', config.secretAccessKey || '');
    } else {
      safeSetItemLocal(CACHE_KEYS.R2_CONFIG, "");
    }
  } catch (e) {}
}

/**
 * Lưu Locations vào LocalStorage
 */
export function cacheLocations(list: string[], visibility?: Record<string, boolean>): void {
  try {
    safeSetItemLocal(CACHE_KEYS.LOCATIONS, JSON.stringify(list));
    if (visibility) {
      safeSetItemLocal(CACHE_KEYS.LOCATION_VISIBILITY, JSON.stringify(visibility));
    }
  } catch (e) {}
}

/**
 * Lưu Parties vào LocalStorage
 */
export function cacheParties(list: string[]): void {
  try {
    safeSetItemLocal(CACHE_KEYS.PARTIES, JSON.stringify(list));
  } catch (e) {}
}

/**
 * Lưu Tỷ giá vào LocalStorage
 */
export function cacheExchangeRates(jpy: number, usd: number): void {
  try {
    safeSetItemLocal(CACHE_KEYS.JPY_RATE, String(jpy));
    safeSetItemLocal(CACHE_KEYS.USD_RATE, String(usd));
  } catch (e) {}
}

/**
 * Lưu Rules vào LocalStorage
 */
export function cacheRules(rules: NotificationRule[]): void {
  try {
    safeSetItemLocal(CACHE_KEYS.RULES, JSON.stringify(rules));
  } catch (e) {}
}

/**
 * Lưu Permissions vào LocalStorage
 */
export function cachePermissions(permissions: PermissionMatrix): void {
  try {
    safeSetItemLocal(CACHE_KEYS.PERMISSIONS, JSON.stringify(permissions));
  } catch (e) {}
}

/**
 * Lưu Sub App Users vào LocalStorage
 */
export function cacheSubAppUsers(subAppUsers: any[]): void {
  try {
    safeSetItemLocal(CACHE_KEYS.SUB_APP_USERS, JSON.stringify(subAppUsers));
  } catch (e) {}
}

/**
 * Lưu App Users vào LocalStorage
 */
export function cacheAppUsers(appUsers: AppUser[]): void {
  try {
    safeSetItemLocal(CACHE_KEYS.APP_USERS, JSON.stringify(appUsers));
  } catch (e) {}
}

/**
 * Cập nhật phiên bản danh mục cục bộ trong Local Cache
 */
export async function bumpConfigVersion(
  type: "locations" | "parties" | "rates" | "rules" | "permissions" | "sub_app_users" | "app_users"
): Promise<void> {
  const versions = getLocalConfigVersions();
  const now = Date.now();
  if (type === "locations") versions.locationsVersion = now;
  if (type === "parties") versions.partiesVersion = now;
  if (type === "rates") versions.ratesVersion = now;
  if (type === "rules") versions.rulesVersion = now;
  if (type === "permissions") versions.permissionsVersion = now;
  if (type === "sub_app_users") versions.subAppUsersVersion = now;
  if (type === "app_users") versions.appUsersVersion = now;
  versions.updatedAt = new Date().toISOString();
  setLocalConfigVersions(versions);
}

/**
 * Sync listener stub - Standalone Local Cache mode (No Firestore)
 */
export function setupStaticConfigSync(): () => void {
  return () => {};
}
