import { supabase } from "./supabase.js";

const form = document.getElementById("signup-form");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                username: username
            },
            emailRedirectTo: 'https://a-michael-olson.github.io/StudyNexus/pages/login/login.html'
        }
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Success! Please check your email inbox to confirm your account before logging in.");
    
    form.reset();
});