/**
 * MallMatrix Profile Service
 * Centralized data store and state management for user personal details,
 * work information, preferences, security sessions, and audit history.
 */

const STORAGE_KEY = 'mallmatrix_user_profile';
const AVATAR_KEY = 'mallmatrix_user_avatar';

export const DEFAULT_PROFILE = {
  // Personal Info
  firstName: 'Alex',
  lastName: 'Rivera',
  displayName: 'Alex Rivera',
  email: 'admin@mallmatrix.com',
  phone: '+1 (555) 234-5678',
  altPhone: '+1 (555) 345-6789',
  dob: '1992-05-14',
  gender: 'Male',
  address: '742 Evergreen Terrace, Suite 400',
  city: 'Metro City',
  state: 'California',
  pinCode: '90210',
  country: 'United States',
  bio: 'Head of mall retail operations, stock telemetry mesh, automated supplier replenishments, and multi-tenant compliance orchestration.',

  // Work Details (Enterprise Role & Org)
  employeeId: 'EMP-8042',
  role: 'Mall Operations Lead',
  department: 'Retail Operations & Logistics',
  reportingManager: 'Eleanor Vance (VP of Asset Management)',
  assignedZones: ['Ground Floor Atrium', 'Level 1 West Wing', 'Level 2 Food Court', 'Logistics Bay B'],
  shiftTiming: 'Morning Shift (08:00 AM – 05:00 PM PST)',
  joiningDate: '2023-03-15',
  employmentType: 'Full-Time Permanent',
  accessLevel: 'Admin',
  permissions: [
    { id: 'inv', name: 'Inventory', desc: 'SKU creation, stock audit, buffer threshold adjustments', granted: true },
    { id: 'reorder', name: 'Reordering', desc: 'PO approval, vendor dispatch, batch reorder pipelines', granted: true },
    { id: 'sales', name: 'Sales', desc: 'Turnover reports, revenue analytics, POS telemetry streams', granted: true },
    { id: 'staff', name: 'Staff', desc: 'Shift scheduling, compliance tracking, auditor duty rosters', granted: true },
    { id: 'tenants', name: 'Tenants', desc: 'Store directory, onboarding leases, POS telemetry check', granted: true },
    { id: 'export', name: 'Export', desc: 'Full data snapshots, Excel/PDF multi-format downloads', granted: true }
  ],

  // Contact & Emergency
  workEmail: 'alex.rivera@mallmatrix.com',
  personalEmail: 'alex.rivera.personal@gmail.com',
  workPhone: '+1 (555) 234-5678',
  emergencyContactName: 'Maria Rivera',
  emergencyContactRelation: 'Spouse',
  emergencyContactPhone: '+1 (555) 876-5432',
  preferredContactMethod: 'Work Email & Phone',

  // Summary Quick Facts & Status
  status: 'Active',
  location: 'Grand Horizon Mall, Central Atrium',
  memberSince: 'March 2023',
  lastLogin: '11 Nov 2026, 17:08',
  stats: {
    ordersHandled: 1420,
    posApproved: 89,
    reportsExported: 34
  },

  // Security Configuration
  twoFactorEnabled: false,
  activeSessions: [
    { id: 's1', device: 'MacBook Pro 16"', browser: 'Chrome 122.0', location: 'San Francisco, CA', lastActive: 'Active now (Current session)', isCurrent: true, icon: 'laptop' },
    { id: 's2', device: 'iPhone 15 Pro', browser: 'Mobile Safari 17.2', location: 'San Francisco, CA', lastActive: '2 hours ago', isCurrent: false, icon: 'phone' },
    { id: 's3', device: 'Dell XPS 15', browser: 'Edge 121.0', location: 'San Jose, CA', lastActive: 'Yesterday at 4:15 PM', isCurrent: false, icon: 'laptop' }
  ],
  loginHistory: [
    { date: '11 Nov 2026, 17:08', ip: '10.242.24.134', device: 'Chrome / macOS', result: 'Success' },
    { date: '11 Nov 2026, 14:15', ip: '10.242.24.134', device: 'Chrome / macOS', result: 'Success' },
    { date: '10 Nov 2026, 23:48', ip: '192.168.1.8', device: 'Chrome / macOS', result: 'Success' },
    { date: '10 Nov 2026, 18:22', ip: '192.168.1.8', device: 'Safari / iOS', result: 'Success' },
    { date: '09 Nov 2026, 09:14', ip: '192.168.1.8', device: 'Chrome / Windows', result: 'Success' },
    { date: '08 Nov 2026, 16:30', ip: '192.168.1.8', device: 'Chrome / macOS', result: 'Success' },
    { date: '07 Nov 2026, 11:05', ip: '192.168.1.8', device: 'Chrome / macOS', result: 'Success' },
    { date: '06 Nov 2026, 08:45', ip: '192.168.1.8', device: 'Chrome / macOS', result: 'Success' },
    { date: '05 Nov 2026, 19:12', ip: '192.168.1.8', device: 'Safari / iOS', result: 'Success' },
    { date: '05 Nov 2026, 08:30', ip: '192.168.1.8', device: 'Chrome / macOS', result: 'Success' }
  ],

  // User Preferences
  preferences: {
    language: 'English (US)',
    timezone: 'Pacific Time (US & Canada) (UTC-8)',
    dateFormat: 'DD-MMM-YYYY',
    currency: 'USD',
    theme: 'Dark',
    defaultLanding: 'Dashboard',
    notifications: {
      lowStockAlerts: { email: true, inApp: true, sms: false },
      poApprovals: { email: true, inApp: true, sms: true },
      overdueRents: { email: true, inApp: true, sms: false },
      dailySummary: { email: false, inApp: true, sms: false }
    }
  },

  // Activity Timeline
  activities: [
    { id: 1, type: 'po', title: 'Approved PO-8942', detail: 'Bulk restock for Nike Store (Valuation: $14,250)', time: '10 mins ago', date: 'Today, 17:35', tag: 'Procurement' },
    { id: 2, type: 'export', title: 'Exported Inventory Report', detail: 'Downloaded full SKU catalog as Excel XLSX', time: '1 hour ago', date: 'Today, 16:42', tag: 'Export' },
    { id: 3, type: 'sku', title: 'Added SKU-AUD-109', detail: 'Created new Wireless Noise Cancelling Headset', time: '3 hours ago', date: 'Today, 14:10', tag: 'Inventory' },
    { id: 4, type: 'tenant', title: 'Updated Lease Terms', detail: 'Extended Apple Store floor agreement to 2028', time: 'Yesterday', date: '10 Nov 2026, 16:15', tag: 'Compliance' },
    { id: 5, type: 'security', title: 'Security Audit Verified', detail: 'Passed autonomous agent synchronicity mesh checks', time: '2 days ago', date: '09 Nov 2026, 11:00', tag: 'Security' },
    { id: 6, type: 'po', title: 'Triggered automated PO-8941', detail: 'Safety buffer breached for Zara Flagship', time: '3 days ago', date: '08 Nov 2026, 09:30', tag: 'Procurement' },
    { id: 7, type: 'staff', title: 'Updated Shift Duty Roster', detail: 'Assigned 8 floor specialists to weekend duty', time: '4 days ago', date: '07 Nov 2026, 14:00', tag: 'Operations' },
    { id: 8, type: 'export', title: 'Exported Tenant Summary PDF', detail: 'Sent 48 stores directory audit to mall leadership', time: '5 days ago', date: '06 Nov 2026, 17:45', tag: 'Export' },
    { id: 9, type: 'tenant', title: 'Onboarded L’Oréal Cosmetics', detail: 'Configured Floor 1 unit #108 initial setup', time: '6 days ago', date: '05 Nov 2026, 11:20', tag: 'Directory' },
    { id: 10, type: 'security', title: 'Password Successfully Changed', detail: 'Updated credentials via security settings', time: '1 week ago', date: '04 Nov 2026, 09:00', tag: 'Security' }
  ]
};

/**
 * Retrieve current user profile from localStorage or defaults
 * @returns {object}
 */
export function getProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PROFILE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse profile from storage, using defaults', e);
  }
  return { ...DEFAULT_PROFILE };
}

/**
 * Save user profile updates to localStorage
 * @param {object} updates 
 * @returns {object} updated profile
 */
export function saveProfile(updates) {
  const current = getProfile();
  const merged = { ...current, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error('Failed to save profile to localStorage', e);
  }
  return merged;
}

/**
 * Retrieve saved avatar image data URL, or null if none
 * @returns {string|null}
 */
export function getSavedAvatar() {
  try {
    return localStorage.getItem(AVATAR_KEY) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Save avatar data URL to localStorage
 * @param {string} dataUrl 
 */
export function saveAvatar(dataUrl) {
  try {
    if (dataUrl) {
      localStorage.setItem(AVATAR_KEY, dataUrl);
    } else {
      localStorage.removeItem(AVATAR_KEY);
    }
  } catch (e) {
    console.error('Failed to save avatar', e);
  }
}

/**
 * Delete saved custom avatar
 */
export function removeAvatar() {
  try {
    localStorage.removeItem(AVATAR_KEY);
  } catch (e) {
    console.error('Failed to remove avatar', e);
  }
}

/**
 * Terminate a single active session by ID
 * @param {string} sessionId 
 * @returns {object}
 */
export function terminateSessionById(sessionId) {
  const profile = getProfile();
  profile.activeSessions = (profile.activeSessions || []).filter(s => s.id !== sessionId || s.isCurrent);
  saveProfile({ activeSessions: profile.activeSessions });
  return profile;
}

/**
 * Terminate all other sessions except current
 * @returns {object}
 */
export function terminateOtherSessions() {
  const profile = getProfile();
  profile.activeSessions = (profile.activeSessions || []).filter(s => s.isCurrent);
  saveProfile({ activeSessions: profile.activeSessions });
  return profile;
}

