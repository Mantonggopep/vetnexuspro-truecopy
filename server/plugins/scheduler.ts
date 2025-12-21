
import { FastifyInstance } from "fastify";
import { NotificationService } from "../modules/notifications/notification.service";

export async function schedulerPlugin(app: FastifyInstance) {
  const notifier = new NotificationService();

  // Check every 60 seconds
  setInterval(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = new Date(tomorrow.toISOString().split('T')[0] + 'T00:00:00.000Z');
    const tomorrowEnd = new Date(tomorrow.toISOString().split('T')[0] + 'T23:59:59.999Z');

    try {
        const appointments = await app.prisma.appointment.findMany({
            where: {
                date: {
                    gte: tomorrowStart,
                    lte: tomorrowEnd
                },
                status: 'Scheduled'
            }
        });

        if (appointments.length > 0) {
            console.log(`[Scheduler] Found ${appointments.length} appointments for tomorrow.`);
            
            for (const apt of appointments) {
                // Determine recipient contact info based on clientId or walk-in logic
                // For simplicity, we assume client email/phone would be fetched or stored.
                // Here we just log the intent using the service.
                
                const message = `Reminder: Appointment for ${apt.patientName} on ${new Date(apt.date).toLocaleTimeString()}`;
                
                if (apt.reminderChannels.includes('Email')) {
                    await notifier.send('Email', apt.clientName, message);
                }
                if (apt.reminderChannels.includes('SMS')) {
                    await notifier.send('SMS', apt.clientName, message);
                }
                if (apt.reminderChannels.includes('WhatsApp')) {
                    await notifier.send('WhatsApp', apt.clientName, message);
                }
            }
        }
    } catch (e) {
        console.error("[Scheduler] Error:", e);
    }
  }, 60000);
}
