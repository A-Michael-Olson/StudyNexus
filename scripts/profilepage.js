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

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username", "profile_picture_url")
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error(profileError);
        return;
    }

    const profileEmailDiv = document.getElementById("profile-email");
    const displayEmail = user.user_metadata?.full_name || user.email;

    const profileUsernameDiv = document.getElementById("profile-user-name");
    const displayUserName = profile?.username || "No username set";
    
    if (profileEmailDiv){
        profileEmailDiv.textContent = displayEmail;
    }

    if(profileUsernameDiv){
        profileUsernameDiv.textContent = displayUserName;
    }    

    const profileAvatar = document.getElementById("profile-avatar");

    if (profileAvatar) {
        profileAvatar.src =
            profile?.profile_picture_url ||
            "../../images/default-avatar.jpg";
    }
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
        article.dataset.groupId = group.id;

        article.addEventListener("click", () => {
            localStorage.setItem("selectedGroup", group.id)
            window.location.href = `../dashboard/dashboard.html`
        })

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
async function uploadAvatar() {
    const fileInput = document.getElementById("avatar-input");
    const file = fileInput.files[0];

    if (!file) {
        alert("Select an image first!");
        return;
    }

    const filePath = `users/${window.currentUser.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
        .from("profile_pictures")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true   
        });

    if (uploadError) {
        console.error(uploadError);
        alert("Upload failed!");
        return;
    }

    // Get public URL of uploaded image
    const { data } = supabase.storage
        .from("profile_pictures")
        .getPublicUrl(filePath);

    const publicUrl = data.publicUrl;

    const { error: profileError } = await supabase
        .from("profiles")
        .update({ profile_picture_url: publicUrl })
        .eq("id", window.currentUser.id);

    if (profileError) {
        console.error(profileError);
        alert("Could not update profile!");
        return;
    }

    document.getElementById("profile-avatar").src = publicUrl;

    alert("Profile photo updated!");
}

document.addEventListener("DOMContentLoaded", () => {
    //Upload Avatar Picture
    const uploadBtn = document.getElementById("btn-upload-avatar");
    if (uploadBtn) uploadBtn.addEventListener("click", uploadAvatar);

    // Join group button
    const joinBtn = document.getElementById("btn-add-group");
    if (joinBtn) {
        joinBtn.addEventListener("click", joinGroup);
    }

    // Change username button
    const changeBtn = document.getElementById("btn-change-group");
    if (changeBtn) changeBtn.addEventListener("click", changeUsername);

    userProfile().then(()=> {
    userGroups();
    });
});
