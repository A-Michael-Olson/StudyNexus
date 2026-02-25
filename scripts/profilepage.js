import { supabase } from "./supabase.js";

async function userProfile()
{
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
        window.location.href = "../login/login.html";
        return;
    }

    window.currentUser = user; // store globally

    const profileDiv = document.getElementById("profileUserName");
    const displayName = user.user_metadata?.full_name || user.email;

    profileDiv.innerHTML = `<h2>${displayName}</h2>`
}

async function userGroups()
{
    const user = window.currentUser;
    if (!user) return;
    
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
    
    const groupDiv = document.getElementById("user-groups");
    groupDiv.innerHTML="";

    if (memberError || !memberships || memberships.length === 0) {
        groupDiv.innerHTML = "<p>No groups</p>"
        return;
    }

    memberships.forEach((membership) => {
        const group = membership.groups;
        const article = document.createElement("article");
        article.className = "groups";
        article.innerHTML = 
        `
        <div class="group-content">
            <p>Group Name: ${group.name}</p>
            <p>Group ID: ${group.id}</p>
        </div>
        `;

        groupDiv.appendChild(article);
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

    await userGroups();
}

async function changeUsername() {
    const newUsername = prompt("Enter new username:");
    if (!newUsername) return;

    const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', window.currentUser.id);

    if (error) {
        alert("Error: " + error.message);
        return;
    }

    alert("Username updated!");
}

document.addEventListener("DOMContentLoaded", () => {
    // Join group button
    const joinBtn = document.getElementById("btn-add-group");
    if (joinBtn) {
        joinBtn.addEventListener("click", joinGroup);
    }

    // Change username button
    const changeBtn = document.getElementById("btn-change-group");
    if (changeBtn) changeBtn.addEventListener("click", changeUsername);
});

userProfile().then(()=> {
    userGroups();
});