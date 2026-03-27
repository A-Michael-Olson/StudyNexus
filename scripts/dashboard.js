import { supabase } from "./supabase.js";
import { loadTasks, initializeTaskUI } from "./tasks.js";
import { initializeChat } from "./messages.js";
import { initWhiteboard } from "./whiteboard.js";
import { stopChatSubscription } from "./messages.js";


export function updateHeaderChannel(channelName) {
    const navName = document.getElementById("nav-group-name");

    if (!navName) return;

    const groupName = navName.dataset.groupName;

    navName.textContent = `${groupName} - #${channelName}`;
}

// ================= MOBILE SIDEBAR SETUP =================
function setupMobileSidebar() {
    if (window.innerWidth > 768) return;
    if (document.getElementById("mobile-channels").children.length > 0) return;

    const channels = document.querySelector(".channel-sidebar");
    const tasks = document.querySelector("#tasks-section");
    const userList = document.querySelector("#user-list");
    const leaveBtn = document.querySelector("#leave-group-container");

    if (channels) {
        document.getElementById("mobile-channels").appendChild(channels);
    }

    if (tasks) {
        document.getElementById("mobile-tasks").appendChild(tasks);
    }

    if (userList && leaveBtn) {
        const membersContainer = document.getElementById("mobile-members");
        membersContainer.appendChild(userList);
        membersContainer.appendChild(leaveBtn);
    }

    // Tab switching
    const buttons = document.querySelectorAll(".mobile-tabs button");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {

            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const tab = btn.dataset.tab;

            document.querySelectorAll(".mobile-section").forEach(sec => {
                sec.style.display = "none";
            });

            const activeSection = document.getElementById("mobile-" + tab);
            if (activeSection) activeSection.style.display = "block";
        });
    });
    // Set default visible tab (Channels)
    const defaultTab = "channels";

    document.querySelectorAll(".mobile-section").forEach(sec => {
        sec.style.display = "none";
    });

    const defaultSection = document.getElementById("mobile-" + defaultTab);
    if (defaultSection) {
        defaultSection.style.display = "block";
    }
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

    const groupId = new URLSearchParams(window.location.search).get("group");

    if (!groupId) {
        redirectToProfile();
        return;
    }

    function redirectToProfile() {
        window.location.href = "../login/profilepage.html";
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

    let activeGroup = null;

    // 1. If URL has group, use it
    if (groupId) {
        const match = memberships.find(m => m.group_id === groupId);
        if (match) {
            activeGroup = match.groups;
        } else {
            redirectToProfile(); // not in this group
            return;
        }
    }

    // 2. Otherwise fallback
    if (!activeGroup) {
        const savedGroup = localStorage.getItem("selectedGroup");
        activeGroup =
            memberships.find(m => m.group_id === savedGroup)?.groups ||
            memberships[0].groups;
    }
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
        let username = member.profiles?.username ?? "Unknown"

        const avatar =
            member.profiles?.profile_picture_url ||
            "../../images/default-avatar.jpg";

        userEl.innerHTML = `
            <div class="username-container">
                <img class="user-avatar" src="${avatar}">
                <h3>${member.profiles?.username ?? "Unknown"}</h3>
                <p class="tooltip-text">${username}</p>
            </div>
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

document.addEventListener("DOMContentLoaded", async () => {

    const navName = document.getElementById("nav-group-name");

    navName.addEventListener("click", async () => {
        const groupId = navName.dataset.groupId;
        if (!groupId) return;

        const inviteLink = `${window.location.origin}/StudyNexus/pages/dashboard/dashboard.html?group=${groupId}`;

        await navigator.clipboard.writeText(inviteLink);

        const originalText = navName.textContent;
        navName.textContent = "Invite Link Copied!";

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


    const toggleBtn = document.getElementById("btn-toggle-sidebar");

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("mobile-open");
        });
    }

    const params = new URLSearchParams(window.location.search);
    const groupFromLink = params.get("group");

    if (groupFromLink) {
        await autoJoinGroup(groupFromLink);

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    await loadDashboard();
    setupMobileSidebar();
});


async function autoJoinGroup(groupId) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Check if already a member
    const { data: existing } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .single();

    if (existing) return; // already in group

    // Join group
    const { error } = await supabase
        .from("group_members")
        .insert({
            group_id: groupId,
            user_id: user.id
        });

    if (error) {
        console.error("Auto join failed:", error);
        alert("Invalid or expired invite link");
    }
}


export function switchToWhiteboard(channelId) {
    const chat = document.getElementById("chat-view");
    const board = document.getElementById("whiteboard-container");

    chat.classList.add("hidden");
    board.classList.remove("hidden");

    stopChatSubscription();
    initWhiteboard(channelId);
}

export function switchToChat(channelId) {
    const chat = document.getElementById("chat-view");
    const board = document.getElementById("whiteboard-container");

    chat.classList.remove("hidden");
    board.classList.add("hidden");

    if (channelId) {
        const event = new CustomEvent("openChatChannel", { detail: channelId });
        window.dispatchEvent(event);
    }
}