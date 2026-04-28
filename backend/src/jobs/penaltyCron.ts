import cron from 'node-cron';
import prisma from '../config/database';

export const startCronJobs = () => {
  // Run every day at 12:05 AM
  cron.schedule('5 0 * * *', async () => {
    console.log('[Cron] Starting daily penalty calculation...');
    try {
      const today = new Date();
      // Find all EMIs that are past due and not fully paid
      const overdueEMIs = await prisma.emiSchedule.findMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
        }
      });

      let updatedCount = 0;
      for (const emi of overdueEMIs) {
        // Calculate penalty (e.g. 2% of the pending amount per month)
        // Since this runs daily, we could apply a flat late fee or a daily interest.
        // For this system, we'll apply a flat 50 INR late fee if not already applied,
        // or a simpler logic: just mark them as OVERDUE if they aren't already.

        // If it's already OVERDUE, we might increase the penalty incrementally.
        // For now, let's set status to OVERDUE and apply a flat 50 Rs penalty if penalty is currently 0.
        const currentPenalty = Number(emi.penalty || 0);
        
        let newPenalty = currentPenalty;
        let newStatus = emi.status;

        if (emi.status !== 'OVERDUE') {
          newStatus = 'OVERDUE';
          newPenalty = currentPenalty + 50; // Apply late fee once when it becomes overdue
        }

        if (newStatus !== emi.status || newPenalty !== currentPenalty) {
          await prisma.emiSchedule.update({
            where: { id: emi.id },
            data: {
              status: newStatus as 'OVERDUE',
              penalty: newPenalty
            }
          });
          updatedCount++;
        }
      }

      console.log(`[Cron] Penalty calculation complete. Updated ${updatedCount} EMIs.`);
    } catch (error) {
      console.error('[Cron] Error during penalty calculation:', error);
    }
  });

  console.log('[Cron] Daily penalty calculation job scheduled (00:05 AM).');
};
