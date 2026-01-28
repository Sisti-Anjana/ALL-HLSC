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

        // Run every 30 seconds to ensure locks expire promptly after 1 hour
        this.intervalId = setInterval(() => {
            this.cleanup()
        }, 30 * 1000)
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
     * Now public to allow "Lazy Cleanup" triggering (e.g. from API calls)
     */
    public static async cleanup() {
        try {
            const now = new Date()
            const nowIso = now.toISOString()
            const currentHour = now.getHours()

            // 1. Delete by expiration timestamp (standard)
            // Locks expire exactly 1 hour after creation, so we only need to check expires_at
            const { count: timeDeleted, error: timeError } = await supabase
                .from('hour_reservations')
                .delete({ count: 'exact' })
                .lt('expires_at', nowIso)

            // 2. FORCE DELETE locks from previous hours
            // If it's currently Hour 7, any lock for Hour 6 or earlier is INVALID immediately
            // regardless of its "expires_at" time.
            const { count: hourDeleted, error: hourError } = await supabase
                .from('hour_reservations')
                .delete({ count: 'exact' })
                .lt('issue_hour', currentHour)

            if (timeError || hourError) {
                console.error('❌ Error during lock cleanup:', timeError?.message || hourError?.message)
            }

            const totalDeleted = (timeDeleted || 0) + (hourDeleted || 0)

            // Log cleanup results
            if (totalDeleted > 0) {
                console.log(`🧹 [LOCK_CLEANUP] Automatically removed ${totalDeleted} expired locks (${timeDeleted || 0} expired, ${hourDeleted || 0} past hour) at ${now.toLocaleTimeString()}`)
            } else if (Math.random() > 0.98) {
                console.log(`⏱️ [LOCK_CLEANUP] Service active. Checking for expired locks every 30 seconds. Current Hour: ${currentHour}:00`)
            }
        } catch (err) {
            console.error('❌ Unexpected error in lock cleanup service:', err)
        }
    }
}
