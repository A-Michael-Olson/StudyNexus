import { supabase } from "./supabase.js";

async function loadDashboard() {
    // 1. Get logged-in user
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        // Not logged in --> back to login
        window.location.href = "../login/login.html";
        return;
    }

    // 2. Fetch groups owned by this user
    const { data: groups, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("owner_id", user.id);

    if (error) {
        console.error("Error loading groups:", error);
        return;
    }

    // 3. For now, just show the first group
    if (groups.length === 0) {
        document.getElementById("group-name").textContent =
            "No groups yet";
        return;
    }

    const activeGroup = groups[0];

    // 4. Plug group name into the UI
    document.getElementById("group-name").textContent =
        activeGroup.name;

    // (Optional later)
    // store activeGroup.id for tasks/messages
    window.activeGroupId = activeGroup.id;
}

loadDashboard();
