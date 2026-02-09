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
            emailRedirectTo: 'https://a-michael-olson.github.io/StudyNexus/pages/login/landingpage.html'
        }
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Success! Please check your email inbox to confirm your account before logging in.");
    
    form.reset();
});