import { supabase } from "./supabase.js";
import { loadTasks, initializeTaskUI } from "./tasks.js";
import { initializeChat } from "./messages.js";

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

    const activeGroup = memberships[0].groups;

    const navName = document.getElementById("nav-group-name");
    navName.textContent = activeGroup.name;
    navName.dataset.groupId = activeGroup.id;

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


// --- Dark Theme Toggle
var dark_mode = false;
var first_click = true;
var root = document.querySelector(':root');
// light theme init
var light_bg_main      = "";
var light_bg_card      = "";
var light_bg_secondary = "";
var light_text_primary = "";
var light_shadow_soft  = ""; 
function toggle_theme() {
    // fetch light theme (current)
    if (first_click) {
        console.log("first click")
        let style = window.getComputedStyle(document.body); 
        // get light theme through default current colors
        light_bg_main      = style.getPropertyValue("--bg-main");
        light_bg_card      = style.getPropertyValue("--bg-card");
        light_bg_secondary = style.getPropertyValue("--bg-secondary");
        light_text_primary = style.getPropertyValue("--text-primary");
        light_shadow_soft  = style.getPropertyValue("--shadow-soft");
        first_click = false;
        console.log("set light vars");
    }

    if (dark_mode) {
        console.log("Setting light theme")
        // light mode
        
        root.style.setProperty("--bg-main",      light_bg_main);
        root.style.setProperty("--bg-card",      light_bg_card);
        root.style.setProperty("--bg-secondary", light_bg_secondary);
        root.style.setProperty("--text-primary", light_text_primary); 
        root.style.setProperty("--shadow-soft",  light_shadow_soft);
        dark_mode = false;
    } else {
        console.log("setting dark theme")
        // dark mode
        root.style.setProperty("--bg-main", "#151518");
        root.style.setProperty("--bg-card", "#151c2c");
        root.style.setProperty("--bg-secondary", "#000000");
        root.style.setProperty("--text-primary","#cecece"); 
        root.style.setProperty("--shadow-soft", "0 4px 10px rgba(56, 16, 158, 1)");

        dark_mode = true;
    }
}
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    toggle_theme();

}
document.getElementById("theme-toggle").onclick = toggle_theme; // attach function to button