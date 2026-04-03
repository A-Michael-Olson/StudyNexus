// Code written by Michael Olson
import { supabase } from "./supabase.js";
import { updateHeaderChannel } from "./dashboard.js";
import { switchToWhiteboard, switchToChat } from "./dashboard.js";

let currentSubscription = null;
let currentChannelId = null;

async function loadChannels(getGroupId) {

    const groupId = getGroupId();
    if (!groupId) return;

    const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at");

    if (error) {
        console.error("Channel load error:", error);
        return;
    }

    const container = document.getElementById("channel-list");
    container.innerHTML = "";

    data.forEach(channel => {

        const btn = document.createElement("button");
        btn.classList.add("channel-item");

        // include delete button in SAME element
        btn.innerHTML = `
            <span># ${channel.name}</span>
            <span class="channel-delete">&times;</span>
        `;

        // CLICK = open channel
        btn.addEventListener("click", () => {

            document.querySelectorAll(".channel-item").forEach(el => {
                el.classList.remove("active");
            });

            btn.classList.add("active");

            if (channel.type === "whiteboard") {
                switchToWhiteboard(channel.id);
            } else {
                switchToChat(channel.id);
            }

            updateHeaderChannel(channel.name);
        });

        // DELETE BUTTON (separate click)
        const deleteBtn = btn.querySelector(".channel-delete");

        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation(); 

            const confirmed = confirm(`Delete #${channel.name}?`);
            if (confirmed) {
                deleteChannel(channel.id, getGroupId);
            }
        });

        container.appendChild(btn);
    });

    // auto-select first channel
    if (data.length > 0) {

        const firstBtn = container.querySelector(".channel-item");
        if (firstBtn) firstBtn.classList.add("active");

        if (data[0].type === "whiteboard") {
            switchToWhiteboard(data[0].id);
        } else {
            switchToChat(data[0].id);
        }

        updateHeaderChannel(data[0].name);
    }
}

export async function initializeChat(getGroupId) {

    const sendBtn = document.getElementById("btn-send");
    const input = document.getElementById("textbox-input");

    sendBtn.addEventListener("click", () => {
        sendMessage();
    });

    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = input.scrollHeight + "px";
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    await loadChannels(getGroupId);

    const addBtn = document.getElementById("btn-add-channel");
    if (addBtn) {
        addBtn.addEventListener("click", () => createChannel(getGroupId));
    }
}

async function loadMessages(channelId) {

    if (!channelId) return;

    const { data, error } = await supabase
        .from("messages")
        .select(`
            id,
            content,
            created_at,
            user_id,
            profiles ( username )
        `)
        .eq("channel_id", channelId)
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

async function sendMessage() {

    const input = document.getElementById("textbox-input");
    const content = input.value.trim();

    if (!content || !currentChannelId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("messages")
        .insert({
            content,
            channel_id: currentChannelId,
            user_id: user.id
        });

    if (error) {
        console.error("Send error:", error);
        return;
    }

    input.value = "";
    input.style.height = "auto";
}

function subscribeToMessages(channelId) {

    if (currentSubscription) {
        supabase.removeChannel(currentSubscription);
    }

    if (!channelId) return;

    currentSubscription = supabase
        .channel("channel-chat")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "messages",
                filter: `channel_id=eq.${channelId}`
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


async function createChannel(getGroupId) {

    const name = prompt("Enter channel name");
    if (!name) return;

    const type = prompt("Type 'chat' or 'whiteboard'")?.toLowerCase();

    if (!["chat", "whiteboard"].includes(type)) {
        alert("Invalid type");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from("channels")
        .insert({
            name,
            type,
            group_id: getGroupId(),
            created_by: user.id
        });

    if (error) {
        console.error("Create channel error:", error);
        alert(error.message);
        return;
    }

    await loadChannels(getGroupId);
}


function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const time = date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    if (isToday) {
        return `Today ${time}`;
    }

    const day = date.toLocaleDateString([], {
        month: "short",
        day: "numeric"
    });

    return `${day} ${time}`;
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

    const formattedTime = formatMessageTime(message.created_at);

    article.innerHTML = `
    ${isSelf ? `<span class="message-delete">&times;</span>` : ""}
        <p class="message-username">
            ${message.profiles?.username ?? "Unknown"}
        </p>
        <p class="message-content">${message.content}</p>
        <p class="message-time">${formattedTime}</p>
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
}

window.addEventListener("openChatChannel", (e) => {
    openChannel(e.detail);
});

async function openChannel(channelId) {

    currentChannelId = channelId;

    await loadMessages(channelId);
    subscribeToMessages(channelId);
    document.body.classList.remove("mobile-open");
}

function removeMessageFromUI(id) {
    const msg = document.querySelector(`[data-id="${id}"]`);
    if (msg) msg.remove();
}

function scrollToBottom() {
    const container = document.getElementById("chat-content");
    container.scrollTop = container.scrollHeight;
}

export function stopChatSubscription() {
    if (currentSubscription) {
        supabase.removeChannel(currentSubscription);
        currentSubscription = null;
    }
}

async function deleteChannel(channelId, getGroupId) {
    const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channelId);

    if (error) {
        console.error("Delete channel error:", error);
        return;
    }

    currentChannelId = null; // reset

    await loadChannels(getGroupId);
}
