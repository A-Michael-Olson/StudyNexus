import { supabase } from "./supabase.js";

async function handleRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const access_token = urlParams.get('access_token');
    const refresh_token = urlParams.get('refresh_token');
    const type = urlParams.get('type');

    if (type === 'signup' && access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
        });

        if (error) {
            console.error('Error logging in:', error.message);
            alert('Something went wrong while verifying your email.');
            return;
        }

        console.log('User verified and logged in:', data.user);
        window.location.replace('/pages/landingpage.html');
    }
}

handleRedirect();
