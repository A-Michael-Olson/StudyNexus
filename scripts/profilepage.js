import { supabase } from "./supabase.js";

async function userProfile()
{
    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser();

    window.currentUser = user; // store globally

    if (userError || !user) {
        window.location.href = "../login/login.html";
        return;
    }

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

    
    const groupDiv = document.getElementById("userGroups");
    groupDiv.innerHTML="";

    if (memberError || !memberships || memberships.length === 0) {
        document.getElementById("group-name").textContent = "No groups";
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

userProfile().then(()=> {
    userGroups();
});