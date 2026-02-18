import { supabase } from "./supabase.js";

async function loadDashboard() {
    // 1. Get logged-in user
const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    window.currentUser = user; // store globally

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
    document.getElementById("group-name").textContent = activeGroup.name;
    //Display group ID for debugging
    document.getElementById("group-id-display").textContent =
        `Group ID: ${activeGroup.id}`;

    // Store for later use
    const groupId = activeGroup.id;

    // 3. Load tasks
    await loadTasks(groupId);

    // 4. Load group members
    await loadGroupMembers(groupId);
}

async function loadTasks(groupId) {
    const { data: tasks, error } = await supabase
        .from("tasks")
        .select("id, title, description")
        .eq("group_id", groupId);

    if (error) {
        console.error("Error loading tasks:", error);
        return;
    }

    const taskContainer = document.querySelector(".task-list");
    taskContainer.innerHTML = "";

    tasks.forEach(task => {
        const taskEl = document.createElement("article");
        taskEl.classList.add("task");

        taskEl.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description ?? ""}</p>
        `;

        taskContainer.appendChild(taskEl);
    });
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

    console.log("Members:", members, "Error:", error);

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
    const joinBtn = document.getElementById("btn-add-group");
    if (joinBtn) {
        joinBtn.addEventListener("click", joinGroup);
    }
});


loadDashboard();
