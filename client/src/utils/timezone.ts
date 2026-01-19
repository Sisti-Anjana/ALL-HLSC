/**
 * EST Timezone Utilities
 * All times in the application default to EST (Eastern Standard Time)
 * EST is UTC-5 (EST) or UTC-4 (EDT during daylight saving)
 */

/**
 * Get current time in EST timezone
 * Returns a Date object representing the current EST time
 */
export function getESTTime(): Date {
  const now = new Date()
  // Get EST time string
  const estTimeString = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  
  // Parse: "MM/DD/YYYY, HH:mm:ss"
  const [datePart, timePart] = estTimeString.split(', ')
  const [month, day, year] = datePart.split('/').map(Number)
  const [hours, minutes, seconds] = timePart.split(':').map(Number)
  
  // Create date in local timezone with EST values (for display purposes)
  // This creates a date that represents EST time but in local timezone
  return new Date(year, month - 1, day, hours, minutes, seconds)
}

/**
 * Get EST offset in hours (UTC-5 for EST, UTC-4 for EDT)
 */
function getESTOffset(): number {
  const now = new Date()
  // Check if daylight saving time is in effect
  const jan = new Date(now.getFullYear(), 0, 1)
  const jul = new Date(now.getFullYear(), 6, 1)
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
  const isDST = now.getTimezoneOffset() < stdOffset
  
  // EST is UTC-5, EDT is UTC-4
  return isDST ? -4 : -5
}

/**
 * Get current hour in EST (0-23)
 */
export function getESTHour(): number {
  const now = new Date()
  // Get EST hour directly
  const estHourString = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  })
  return parseInt(estHourString, 10)
}

/**
 * Get current date in EST (YYYY-MM-DD format)
 */
export function getESTDateString(): string {
  const now = new Date()
  const estDateString = now.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  
  // Format: "MM/DD/YYYY" -> "YYYY-MM-DD"
  const [month, day, year] = estDateString.split('/')
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Format a date/time string to EST timezone
 */
export function formatESTTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/**
 * Format a date to EST date only (MM/DD/YYYY)
 */
export function formatESTDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * Parse a date string (YYYY-MM-DD) and get EST date components
 */
export function parseESTDate(dateString: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateString.split('-').map(Number)
  return { year, month, day }
}

/**
 * Check if a date string (YYYY-MM-DD) is today in EST
 */
export function isESTToday(dateString: string): boolean {
  const todayEST = getESTDateString()
  return dateString === todayEST
}

/**
 * Calculate days difference between a date and today in EST
 */
export function getESTDaysDiff(dateString: string): number {
  const todayEST = getESTDateString()
  const [todayYear, todayMonth, todayDay] = todayEST.split('-').map(Number)
  const [dateYear, dateMonth, dateDay] = dateString.split('-').map(Number)
  
  const todayDate = new Date(todayYear, todayMonth - 1, todayDay)
  const checkDate = new Date(dateYear, dateMonth - 1, dateDay)
  
  return Math.floor((todayDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24))
}

