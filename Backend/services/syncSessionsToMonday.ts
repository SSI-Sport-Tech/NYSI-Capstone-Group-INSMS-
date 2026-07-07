import { getSessionsFromPostgres } from "../config/session.js";
import { createNOMSMondayItem } from "../utils/monday.js";

export async function syncSessionsToMonday() {
    const sessions = await getSessionsFromPostgres();

    console.log(`Found ${sessions.length} sessions`);

    for (const session of sessions) {
        try {
            await createNOMSMondayItem(session);
            console.log(`Inserted session id=${session.id}`);
        } catch (err) {
            console.error(`Failed session id=${session.id}`, err);
        }
    }
}