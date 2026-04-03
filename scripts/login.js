// Code written by Michael Olson
import { supabase } from "./supabase.js";

const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (sessionError) {
  console.error(sessionError);
}

if (session) {
  window.location.href = "../dashboard/dashboard.html";
}

const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
    } else {
        // success --> go to dashboard (or placeholder page)
        window.location.href = "../dashboard/dashboard.html";
    }
});
