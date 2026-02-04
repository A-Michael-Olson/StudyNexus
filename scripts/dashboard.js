import { supabase } from "./supabase.js";

async function loadDashboard() {
    // 1. Get logged-in user
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        window.location.href = "../login/login.html";
        return;
    }

    // 2. Get groups this user belongs to
    const { data: memberships, error: memberError } = await supabase
        .from("group_members")
        .select(`
            group_id,
            groups (
                id,
                name
            )
        `)
        .eq("user_id", user.id);

    if (memberError || !memberships || memberships.length === 0) {
        document.getElementById("group-name").textContent = "No groups";
        return;
    }

    const activeGroup = memberships[0].groups;
    const groupId = activeGroup.id;

    document.getElementById("group-name").textContent = activeGroup.name;

    // 3. Load tasks & members
    await loadTasks(groupId);
    await loadGroupMembers(groupId, user.id);
}

/* ===================== TASKS ===================== */

async function loadTasks(groupId) {
    const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, description")
        .eq("group_id", groupId);

    if (error) {
        console.error("Error loading tasks:", error);
        return;
    }

    const taskContainer = document.getElementById("task-items");
    taskContainer.innerHTML = "";

    tasks.forEach(task => {
        const taskEl = document.createElement("article");
        taskEl.classList.add("task");

        taskEl.innerHTML = `
            <h2 class="task-name">${task.title}</h2>
            <p class="task-content">${task.description ?? ""}</p>
        `;

        taskContainer.appendChild(taskEl);
    });
}

/* ===================== MEMBERS ===================== */

async function loadGroupMembers(groupId, currentUserId) {
    const { data: members, error } = await supabase
        .from("group_members")
        .select(`
            user_id,
            role,
            profiles (
                username,
                first_name,
                last_name
            )
        `)
        .eq("group_id", groupId);

    if (error) {
        console.error("Error loading members:", error);
        return;
    }

    const userList = document.getElementById("user-list");
    userList.innerHTML = "";

    members.forEach(({ user_id, role, profiles }) => {
        const userEl = document.createElement("div");
        userEl.classList.add("group-user");

        const displayName =
            profiles?.username ??
            `${profiles?.first_name ?? ""} ${profiles?.last_name ?? ""}`.trim() ||
            "Unknown User";

        userEl.textContent = displayName;

        // Highlight current user
        if (user_id === currentUserId) {
            userEl.classList.add("current-user");
            userEl.textContent += " (you)";
        }

        userList.appendChild(userEl);
    });
}

loadDashboard();