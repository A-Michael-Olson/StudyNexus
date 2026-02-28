import { supabase } from "./supabase.js";

let currentSubscription = null;

export async function initializeChat(getGroupId) {
    const sendBtn = document.getElementById("btn-send");
    const input = document.getElementById("textbox-input");

    sendBtn.addEventListener("click", () => {
        sendMessage(getGroupId());
    });

    // Auto-grow textarea
    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
    });

    // Enter to send, Shift+Enter for newline
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(getGroupId());
        }
    });

    await loadMessages(getGroupId());
    subscribeToMessages(getGroupId);
}

async function loadMessages(groupId) {
    if (!groupId) return;

    const { data, error } = await supabase
        .from("messages")
        .select(`
            id,
            content,
            created_at,
            user_id,
            profiles ( username )
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Load messages error:", error);
        return;
    }

    const container = document.getElementById("chat-content");
    container.innerHTML = "";

    data.forEach(addMessageToUI);
    scrollToBottom();
}

async function sendMessage(groupId) {
    const input = document.getElementById("textbox-input");
    const content = input.value.trim();
    if (!content || !groupId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("messages").insert({
        content,
        group_id: groupId,
        user_id: user.id
    });

    if (error) {
        console.error("Send error:", error);
        return;
    }

    input.value = "";
    input.style.height = "auto"; // reset height after send
}

function subscribeToMessages(getGroupId) {
    if (currentSubscription) {
        supabase.removeChannel(currentSubscription);
    }

    const groupId = getGroupId();
    if (!groupId) return;

    currentSubscription = supabase
        .channel("group-chat")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "messages",
                filter: `group_id=eq.${groupId}`
            },
            async (payload) => {

                if (payload.eventType === "INSERT") {
                    const message = payload.new;

                    const { data } = await supabase
                        .from("profiles")
                        .select("username")
                        .eq("id", message.user_id)
                        .single();

                    message.profiles = data;
                    addMessageToUI(message);
                    scrollToBottom();
                }

                if (payload.eventType === "DELETE") {
                    removeMessageFromUI(payload.old.id);
                }
            }
        )
        .subscribe();
}

function addMessageToUI(message) {
    const container = document.getElementById("chat-content");

    const article = document.createElement("article");
    article.classList.add("message");
    article.dataset.id = message.id;

    const isSelf =
        window.currentUser &&
        message.user_id === window.currentUser.id;

    if (isSelf) {
        article.classList.add("self");
    }

    article.innerHTML = `
        ${isSelf ? `<span class="message-delete">&times;</span>` : ""}
        <p class="message-username">
            ${message.profiles?.username ?? "Unknown"}
        </p>
        <p class="message-content">${message.content}</p>
    `;

    container.appendChild(article);

    if (isSelf) {
        const deleteBtn = article.querySelector(".message-delete");
        deleteBtn.addEventListener("click", () => {
            deleteMessage(message.id);
        });
    }
}

async function deleteMessage(id) {
    const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Delete error:", error);
    }
    // Do NOT remove from UI here — realtime handles it
}

function removeMessageFromUI(id) {
    const msg = document.querySelector(`[data-id="${id}"]`);
    if (msg) msg.remove();
}

function scrollToBottom() {
    const container = document.getElementById("chat-content");
    container.scrollTop = container.scrollHeight;
}