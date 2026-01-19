import { supabase } from '../config/database.config'

export class LockCleanupService {
    private static intervalId: NodeJS.Timeout | null = null

    /**
     * Starts the background cleanup process
     * Runs every minute to ensure expired locks are removed promptly
     */
    static start() {
        if (this.intervalId) {
            console.log('🔄 Lock cleanup service already running.')
            return
        }

        console.log('🚀 Starting background lock cleanup service...')

        // Run once immediately on start
        this.cleanup()

        // Then run every 60 seconds (1 minute)
        this.intervalId = setInterval(() => {
            this.cleanup()
        }, 60 * 1000)
    }

    /**
     * Stops the background cleanup process
     */
    static stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId)
            this.intervalId = null
            console.log('🛑 Lock cleanup service stopped.')
        }
    }

    /**
     * Performs the actual database cleanup
     * Deletes all reservations where expires_at is in the past
     */
    /**
     * Performs the actual database cleanup
     * Deletes all reservations where expires_at is in the past
     * Now public to allow "Lazy Cleanup" triggering (e.g. from API calls)
     */
    public static async cleanup() {
        try {
            const now = new Date()
            const nowIso = now.toISOString()
            const currentHour = now.getHours()

            // 1. Delete by expiration timestamp (standard)
            const { count: timeCount, error: timeError } = await supabase
                .from('hour_reservations')
                .delete({ count: 'exact' })
                .lt('expires_at', nowIso)

            if (timeError) {
                console.error('❌ Error during time-based lock cleanup:', timeError.message)
            }

            // 2. Aggressively delete locks from PREVIOUS hours (Clock-hour enforcement)
            // e.g., if it's 6:00 AM, all Hour 5 locks MUST go.
            // We handle midnight wraparound: if it's Hour 0, Hour 23 is the previous hour.
            const prevHour = currentHour === 0 ? 23 : currentHour - 1

            // We delete anything where issue_hour is NOT current and NOT next (to allow some buffer)
            // Actually, user wants "for every one hour... automatically removed"
            // So we delete anything that isn't the current wall-clock hour.
            const { count: hourCount, error: hourError } = await supabase
                .from('hour_reservations')
                .delete({ count: 'exact' })
                .neq('issue_hour', currentHour)
                // Buffer: Don't delete if it was JUST created in the last 2 minutes 
                // (This handles the case where someone locks the "Next Hour" at 5:59 AM)
                .lt('reserved_at', new Date(now.getTime() - 2 * 60 * 1000).toISOString())

            if (hourError) {
                console.error('❌ Error during hour-based lock cleanup:', hourError.message)
            }

            const totalDeleted = (timeCount || 0) + (hourCount || 0)
            if (totalDeleted > 0) {
                console.log(`🧹 [LOCK_CLEANUP] Automatically removed ${totalDeleted} stale locks. (Time-based: ${timeCount || 0}, Hour-based: ${hourCount || 0}) at ${now.toLocaleTimeString()}`)
            } else if (Math.random() > 0.98) {
                console.log(`⏱️ [LOCK_CLEANUP] Service active. Current Hour: ${currentHour}:00`)
            }
        } catch (err) {
            console.error('❌ Unexpected error in lock cleanup service:', err)
        }
    }
}
