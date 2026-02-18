import { supabase } from "./supabase.js";
import { loadTasks, initializeTaskUI } from "./tasks.js";

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

    window.currentUser = user;

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
        document.getElementById("group-id-display").textContent = "";
        return;
    }

    const activeGroup = memberships[0].groups;

    document.getElementById("group-name").textContent = activeGroup.name;
    document.getElementById("group-id-display").textContent =
        `Group ID: ${activeGroup.id}`;

    // Store globally so other modules can access
    window.currentGroupId = activeGroup.id;

    // 3. Load tasks (from tasks.js)
    await loadTasks(window.currentGroupId);

    // 4. Load group members
    await loadGroupMembers(window.currentGroupId);
}

async function loadGroupMembers(groupId) {
    const { data: members, error } = await supabase
        .from("group_members")
        .select(`
            user_id,
            profiles (
                username
            )
        `)
        .eq("group_id", groupId);

    if (error) {
        console.error("Error loading members:", error);
        return;
    }

    const userList = document.getElementById("user-list");
    userList.innerHTML = "";

    members.forEach(member => {
        const userEl = document.createElement("article");
        userEl.classList.add("user-item");

        userEl.innerHTML = `
            <img src="/images/studyNexus.png">
            <h3>${member.profiles?.username ?? "Unknown"}</h3>
        `;

        userList.appendChild(userEl);
    });
}

async function joinGroup() {
    const groupIdInput = document.getElementById("group-input");
    const groupId = groupIdInput.value.trim();

    if (!groupId) {
        alert("Enter a group ID");
        return;
    }

    const { error } = await supabase
        .from("group_members")
        .insert({
            group_id: groupId,
            user_id: window.currentUser.id
        });

    if (error) {
        console.error("Join error:", error);
        alert(error.message);
        return;
    }

    alert("Joined group successfully");

    groupIdInput.value = "";

    await loadDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
    // Initialize task UI once
    initializeTaskUI(() => window.currentGroupId);

    // Join group button
    const joinBtn = document.getElementById("btn-add-group");
    if (joinBtn) {
        joinBtn.addEventListener("click", joinGroup);
    }

    // Load everything
    loadDashboard();
});