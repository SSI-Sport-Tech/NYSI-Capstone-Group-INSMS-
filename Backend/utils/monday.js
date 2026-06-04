const MONDAY_API_URL = process.env.MONDAY_API_URL || "https://api.monday.com/v2";
const MONDAY_API_KEY = process.env.MONDAY_API_KEY || "";
const MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID || "";
const MONDAY_GROUP_ID = process.env.MONDAY_GROUP_ID || "";

export const MONDAY_COLUMNS = {
    nutritionist_name: "text_mm3qwvc2",
    // nutritionist_id: "text_mm3qkyqy",
    team: "text_mm3t3z0e",
    athlete_name: "text_mm2fk0bw",
    sport: "text_mm3t4kt0",
    // athlete_id: "text_mm2fr3zw",
    // type_of_consult_id: "text_mm3qfk36",
    type_of_consult: "text_mm3q7bsn",
    date_of_consult: "date_mm3sxda1",
    ssp: "text_mm3ta3rt",
    session: "numeric_mm3tqh5j",
    consultation_objective_name: "text_mm3qyjda",
    // consultation_objective_id: "text_mm3qj790",
    status: "text_mm3qwnq0",
    // updated_by_name: "text_mm3qpdcf",
    // created_by_name: "text_mm3q3t39",
    updated_at: "text_mm3qjk69",
    // created_at: "text_mm3q6k2w",
    is_scheduled_booking: "text_mm3qff34",
    time_of_next_follow_up: "text_mm3qv1bq",
    time_of_consult: "text_mm3q1568",
    venue: "text_mm3qx4cr",
    title_description: "text_mm3qmhfe",
    date_of_next_follow_up: "date_mm3swt16",
};

function buildCreateItemQuery() {
    return `
    mutation CreateItem(
      $boardId: ID!,
      $groupId: String,
      $itemName: String!,
      $columnValues: JSON!
    ) {
      create_item(
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
      }
    }
  `;
}

export async function createMondayItem(itemName, columnValues) {
    if (!MONDAY_API_KEY || !MONDAY_BOARD_ID) {
        throw new Error("Monday API configuration is missing");
    }

    const query = buildCreateItemQuery();

    const variables = {
        boardId: MONDAY_BOARD_ID,
        groupId: MONDAY_GROUP_ID || null,
        itemName,
        columnValues: JSON.stringify(columnValues),
    };

    console.log("=== MONDAY DEBUG ===");
    console.log("Column values object:", JSON.stringify(columnValues, null, 2));
    console.log("Column values stringified:", variables.columnValues);
    console.log("Playground mutation — paste this directly:");
    console.log(`
    mutation CreateItem {
    create_item(
        board_id: ${variables.boardId}
        group_id: "${variables.groupId}"
        item_name: "${variables.itemName}"
        column_values: ${JSON.stringify(variables.columnValues)}
    ) {
        id
    }
    }
  `);
    console.log("===================");

    const response = await fetch(MONDAY_API_URL, {
        method: "POST",
        headers: {
            Authorization: MONDAY_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
        console.error("Error creating Monday item:", data);
        throw new Error(data.errors?.[0]?.message || "Failed to create Monday item");
    }

    // return Monday item ID
    return data?.data?.create_item?.id;
}

export function buildNOMSMondayColumnValues(record) {
    return {
        [MONDAY_COLUMNS.nutritionist_name]: String(record.nutritionist_name || "").trim(),
        // [MONDAY_COLUMNS.nutritionist_id]: String(record.nutritionist_id || "").trim(),
        [MONDAY_COLUMNS.team]: String(record.team || "").trim(),
        [MONDAY_COLUMNS.athlete_name]: String(record.athlete_name || "").trim(),
        [MONDAY_COLUMNS.sport]: String(record.sport || "").trim(),
        // [MONDAY_COLUMNS.athlete_id]: String(record.athlete_id || "").trim(),
        // [MONDAY_COLUMNS.type_of_consult_id]: String(record.type_of_consult_id || "").trim(),
        [MONDAY_COLUMNS.type_of_consult]: String(record.type_of_consult || "").trim(),
        [MONDAY_COLUMNS.date_of_consult]: record.date_of_consult
            ? { date: record.date_of_consult }
            : null,
        [MONDAY_COLUMNS.ssp]: record.ssp === true ? "Yes" : "No",
        [MONDAY_COLUMNS.session]: String(record.session || "").trim(),
        [MONDAY_COLUMNS.consultation_objective_name]: String(record.consultation_objective_name || "").trim(),
        // [MONDAY_COLUMNS.consultation_objective_id]: String(record.consultation_objective_id || "").trim(),
        [MONDAY_COLUMNS.status]: String(record.status || "").trim(),
        // [MONDAY_COLUMNS.updated_by_name]: String(record.updated_by_name || "").trim(),
        // [MONDAY_COLUMNS.created_by_name]: String(record.created_by_name || "").trim(),
        [MONDAY_COLUMNS.updated_at]: String(record.updated_at || "").trim(),
        // [MONDAY_COLUMNS.created_at]: String(record.created_at || "").trim(),
        [MONDAY_COLUMNS.is_scheduled_booking]: record.is_scheduled_booking === true ? "Yes" : "No",
        [MONDAY_COLUMNS.time_of_next_follow_up]: String(record.time_of_next_follow_up || "").trim(),
        [MONDAY_COLUMNS.time_of_consult]: String(record.time_of_consult || "").trim(),
        [MONDAY_COLUMNS.venue]: String(record.venue || "").trim(),
        [MONDAY_COLUMNS.title_description]: String(record.title_description || "").trim(),
        [MONDAY_COLUMNS.date_of_next_follow_up]: record.date_of_next_follow_up
            ? { date: record.date_of_next_follow_up }
            : null,
    };
}

function buildNOMSMondayItemName(record) {
    return `${record.athlete_name || "Unknown Athlete"} · ${record.title_description || "Session"} · ${record.date_of_consult || ""}`;
}

export async function createNOMSMondayItem(record) {
    const itemName = buildNOMSMondayItemName(record);
    const columnValues = buildNOMSMondayColumnValues(record);
    const mondayItemId = await createMondayItem(itemName, columnValues);

    // return createMondayItem(itemName, columnValues);
    return {monday_item_id: mondayItemId,};
}

export async function updateMondayItem(itemId, columnValues) {
    console.log("=== MONDAY UPDATE REQUEST ===");
    console.log("Item ID:", itemId);
    console.log("Board ID:", MONDAY_BOARD_ID);
    console.log("Column Values:", JSON.stringify(columnValues, null, 2));

    const query = `
        mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
            change_multiple_column_values(
                board_id: $boardId,
                item_id: $itemId,
                column_values: $columnValues
            ) {
                id
            }
        }
    `;

    const response = await fetch(MONDAY_API_URL, {
        method: "POST",
        headers: {
            Authorization: MONDAY_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            query,
            variables: {
                boardId: MONDAY_BOARD_ID,
                itemId,
                columnValues: JSON.stringify(columnValues),
            },
        }),
    });

    const data = await response.json();

    console.log("=== MONDAY RESPONSE ===");
    console.log(JSON.stringify(data, null, 2));

    if (!response.ok || data.errors) {
        console.error("Error updating Monday item:", data);
        throw new Error(data.errors?.[0]?.message || "Failed to update Monday item");
    }

    // return data;
    return data?.data?.change_multiple_column_values?.id;
}

export async function deleteMondayItem(itemId) {
    if (!MONDAY_API_KEY || !MONDAY_BOARD_ID) {
        throw new Error("Monday API configuration is missing");
    }

    const query = `
        mutation {
            delete_item(
                item_id: ${itemId}
                ) {
                id
            }
        }
    `;

    const response = await fetch(MONDAY_API_URL, {
        method: "POST",
        headers: {
            Authorization: MONDAY_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
        console.error("Error deleting Monday item:", data);
        throw new Error(data.errors?.[0]?.message || "Failed to delete Monday item");
    }

    return data;
}