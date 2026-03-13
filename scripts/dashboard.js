import { supabase } from "./supabase.js";
import { loadTasks, initializeTaskUI } from "./tasks.js";
import { initializeChat } from "./messages.js";


export function updateHeaderChannel(channelName) {
    const navName = document.getElementById("nav-group-name");

    if (!navName) return;

    const groupName = navName.dataset.groupName;

    navName.textContent = `${groupName} - #${channelName}`;
}

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
        document.getElementById("nav-group-name").textContent = "No Active Group";
        return;
    }

    const savedGroup = localStorage.getItem("selectedGroup");
    const activeGroup = memberships.find(m => m.group_id === savedGroup)?.groups || memberships[0].groups;
    window.currentGroupId = activeGroup.id;

    const navName = document.getElementById("nav-group-name");
    navName.dataset.groupId = activeGroup.id;
    navName.dataset.groupName = activeGroup.name;

    navName.textContent = activeGroup.name;

    // Store globally so other modules can access
    window.currentGroupId = activeGroup.id;

    // 3. Load tasks (from tasks.js)
    await loadTasks(window.currentGroupId);

    // 4. Load group members
    await loadGroupMembers(window.currentGroupId);

    // 5. Initialize chat (from messages.js)
    await initializeChat(() => window.currentGroupId);
}

async function loadGroupMembers(groupId) {
    const { data: members, error } = await supabase
        .from("group_members")
        .select(`
            user_id,
            profiles (
                username,
                profile_picture_url
            )
        `)
        .eq("group_id", groupId);

    if (error) {
        console.error("Error loading members:", error);
        return;
    }

    const userList = document.getElementById("user-list");
    userList.innerHTML = "";

    members.sort((a, b) => {
        if (a.user_id === window.currentUser.id) return -1;
        if (b.user_id === window.currentUser.id) return 1;
        return 0;
    });

    members.forEach(member => {

        const isCurrentUser = member.user_id === window.currentUser.id;

        const userEl = document.createElement(isCurrentUser ? "a" : "article");
        userEl.classList.add("user-item");

        if (isCurrentUser) {
            userEl.href = "../login/profilepage.html";
            userEl.classList.add("self");
        }

        const avatar =
            member.profiles?.profile_picture_url ||
            "../../images/default-avatar.png";

        userEl.innerHTML = `
            <img class="user-avatar" src="${avatar}">
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

async function leaveGroup() {
    const confirmed = confirm("Are you sure you want to leave this group?");
    if (!confirmed) return;

    const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", window.currentGroupId)
        .eq("user_id", window.currentUser.id);

    if (error) {
        console.error("Leave group error:", error);
        alert("Could not leave group");
        return;
    }

    alert("Left group successfully");
    window.location.reload();
}

document.addEventListener("DOMContentLoaded", () => {

    const navName = document.getElementById("nav-group-name");

    navName.addEventListener("click", async () => {
        const groupId = navName.dataset.groupId;
        if (!groupId) return;

        await navigator.clipboard.writeText(groupId);

        const originalText = navName.textContent;
        navName.textContent = "Copied Group ID!";

        setTimeout(() => {
            navName.textContent = originalText;
        }, 1500);
    });

    initializeTaskUI(() => window.currentGroupId);

    const joinBtn = document.getElementById("btn-add-group");
    if (joinBtn) {
        joinBtn.addEventListener("click", joinGroup);
    }

    const leaveBtn = document.getElementById("btn-leave-group");

    if (leaveBtn) {
        leaveBtn.addEventListener("click", leaveGroup);
    }

    loadDashboard();
});


