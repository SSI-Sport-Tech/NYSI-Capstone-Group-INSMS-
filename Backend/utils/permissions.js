export const canManageUser = (actingRole, targetRole) => {
    if (actingRole === "IT_ADMIN") return true;

    if (actingRole === "ADMIN" && targetRole === "NUTRITIONIST") {
        return true;
    }

    return false;
};
