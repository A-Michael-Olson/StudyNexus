import { supabase } from "./supabase.js";

const form = document.getElementById("signup-form");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username
            },
        }
    });

    if (error) {
        alert(error.message);
        return;
    }    

    if (data.user) {
        alert("Your account has been successfully created!");
        form.reset();
    }
});