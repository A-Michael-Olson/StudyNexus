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