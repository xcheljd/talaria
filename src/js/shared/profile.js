/**
 * Profile Data Access Layer
 * Centralized access to user profile data stored in localStorage
 * Shared between main template generator and promotion email app
 */

/**
 * Get the complete user profile from localStorage
 * @returns {Object|null} User profile object or null if not set
 */
export function getUserProfile() {
  const stored = localStorage.getItem('userProfile');
  return stored ? JSON.parse(stored) : null;
}

/**
 * Save user profile to localStorage
 * @param {Object} profile - User profile object
 */
export function saveUserProfile(profile) {
  localStorage.setItem('userProfile', JSON.stringify(profile));
}

/**
 * Get store phone number with fallback default
 * @returns {string} Store phone number
 */
export function getStorePhone() {
  const profile = getUserProfile();
  return profile?.storePhone || '702-357-8990';
}

/**
 * Get store name with fallback default
 * @returns {string} Store name
 */
export function getStoreName() {
  const profile = getUserProfile();
  return profile?.storeName || 'Citizen Company Store';
}

/**
 * Get store location with fallback default
 * @returns {string} Store location
 */
export function getStoreLocation() {
  const profile = getUserProfile();
  return profile?.storeLocation || 'the South Premium Outlets';
}

/**
 * Get full store location (with "Citizen Company Store at" prefix)
 * @returns {string} Full store location
 */
export function getFullStoreLocation() {
  return `Citizen Company Store at ${getStoreLocation()}`;
}

/**
 * Get store address with fallback default
 * @returns {string} Store address
 */
export function getStoreAddress() {
  const profile = getUserProfile();
  return (
    profile?.storeAddress || '7400 Las Vegas Blvd S #46, Las Vegas, NV 89123'
  );
}

/**
 * Get store email with fallback default
 * @returns {string} Store email
 */
export function getStoreEmail() {
  const profile = getUserProfile();
  if (profile?.storeEmail) {
    return profile.storeEmail;
  } else if (profile?.storeName) {
    const emailPrefix = profile.storeName.toLowerCase().replace(/\s+/g, '');
    return `${emailPrefix}@citizenwatchgroup.com`;
  } else {
    return 'store@citizenwatchgroup.com';
  }
}

/**
 * Get company email with fallback default
 * @returns {string} Company email
 */
export function getCompanyEmail() {
  const profile = getUserProfile();
  return profile?.companyEmail || '';
}

/**
 * Get store hours with fallback default
 * @returns {string} Store hours
 */
export function getStoreHours() {
  const profile = getUserProfile();
  return profile?.storeHours || 'Mon-Sat: 10AM-8PM, Sun: 11AM-7PM';
}

/**
 * Get store Plus Code with fallback default
 * @returns {string} Store Plus Code
 */
export function getStorePlusCode() {
  const profile = getUserProfile();
  return profile?.storePlusCode || '8CQQ9C3P+85';
}

/**
 * Get directions to store
 * @returns {string} Directions
 */
export function getDirections() {
  const profile = getUserProfile();
  return profile?.directions || '';
}

/**
 * Get custom location override
 * @returns {string} Custom location
 */
export function getCustomLocation() {
  const profile = getUserProfile();
  return profile?.customLocation || '';
}

/**
 * Get employee name with fallback default
 * @returns {string} Employee name
 */
export function getEmployeeName() {
  const profile = getUserProfile();
  return profile?.employeeName || 'Your Name';
}

/**
 * Get employee job title with fallback default
 * @returns {string} Job title
 */
export function getJobTitle() {
  const profile = getUserProfile();
  return profile?.jobTitle || 'Sales Associate';
}

/**
 * Check if profile has been set up
 * @returns {boolean} True if profile exists
 */
export function hasProfile() {
  return getUserProfile() !== null;
}
