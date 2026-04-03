// Code written by Michael Olson
import { supabase } from "./supabase.js";

let editingTaskId = null;

export async function loadTasks(groupId) {
    const { data: tasks, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("group_id", groupId)
        .order("due_date", { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const activeContainer = document.getElementById("active-tasks");
    const completedContainer = document.getElementById("completed-tasks");

    if (!activeContainer || !completedContainer) {
        console.warn("Task containers missing.");
        return;
    }

    activeContainer.innerHTML = "";
    completedContainer.innerHTML = "";

    tasks.forEach(task => {
        const taskEl = document.createElement("article");
        taskEl.classList.add("task");

        taskEl.innerHTML = `
            <h3>${task.title}</h3>
            <p>${task.description ?? ""}</p>
            <small>Due: ${task.due_date ?? "No date"}</small>
        `;

        taskEl.addEventListener("click", () => openTaskModal(task));

        if (task.is_completed) {
            completedContainer.appendChild(taskEl);
        } else {
            activeContainer.appendChild(taskEl);
        }
    });
    updateTaskCounts();
}

export function initializeTaskUI(getCurrentGroupId) {
    document.getElementById("btn-add-task")
        .addEventListener("click", () => openTaskModal());

    document.getElementById("btn-close-task")
        .addEventListener("click", closeTaskModal);

    document.getElementById("btn-save-task")
        .addEventListener("click", () => saveTask(getCurrentGroupId()));

    document.getElementById("btn-delete-task")
        .addEventListener("click", () => deleteTask(getCurrentGroupId()));

    // NEW: Close when clicking outside modal
    const overlay = document.getElementById("task-modal-overlay");

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeTaskModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeTaskModal();
        }
    });

    // Collapsible task groups
    document.querySelectorAll(".task-toggle").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const list = toggle.nextElementSibling;
            const countSpan = toggle.querySelector(".task-count");

            const isCollapsed = list.style.display === "none";

            if (isCollapsed) {
                list.style.display = "flex";
                countSpan.textContent = "";
            } else {
                list.style.display = "none";
                updateTaskCounts(); // recalc before showing
            }
        });
    });
}

function updateTaskCounts() {
    const activeTasks = document.querySelectorAll("#active-tasks .task").length;
    const completedTasks = document.querySelectorAll("#completed-tasks .task").length;

    document.querySelector('[data-status="active"] .task-count')
        .textContent = activeTasks > 0 ? `(${activeTasks})` : "";

    document.querySelector('[data-status="completed"] .task-count')
        .textContent = completedTasks > 0 ? `(${completedTasks})` : "";
}

function openTaskModal(task = null) {
    const overlay = document.getElementById("task-modal-overlay");
    const deleteBtn = document.getElementById("btn-delete-task");

    overlay.classList.add("active");

    if (task) {
        editingTaskId = task.id;
        document.getElementById("modal-title").textContent = "Edit Task";
        document.getElementById("task-title-input").value = task.title;
        document.getElementById("task-desc-input").value = task.description ?? "";
        document.getElementById("task-date-input").value = task.due_date ?? "";
        document.getElementById("task-complete-input").checked = task.is_completed;

        deleteBtn.style.display = "inline-block";
    } else {
        editingTaskId = null;
        document.getElementById("modal-title").textContent = "New Task";
        document.getElementById("task-title-input").value = "";
        document.getElementById("task-desc-input").value = "";
        document.getElementById("task-date-input").value = "";
        document.getElementById("task-complete-input").checked = false;

        deleteBtn.style.display = "none";
    }
}

function closeTaskModal() {
    document.getElementById("task-modal-overlay").classList.remove("active");
}

async function saveTask(groupId) {
    const title = document.getElementById("task-title-input").value.trim();
    const description = document.getElementById("task-desc-input").value.trim();
    const due_date = document.getElementById("task-date-input").value;
    const is_completed = document.getElementById("task-complete-input").checked;

    if (!title) return alert("Task needs a title");

    if (editingTaskId) {
        await supabase
            .from("tasks")
            .update({ title, description, due_date, is_completed })
            .eq("id", editingTaskId);
    } else {
        await supabase
            .from("tasks")
            .insert({
                title,
                description,
                due_date,
                is_completed,
                group_id: groupId
            });
    }

    closeTaskModal();
    await loadTasks(groupId);
}


async function deleteTask(groupId) {
    if (!editingTaskId) return;

    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    await supabase
        .from("tasks")
        .delete()
        .eq("id", editingTaskId);

    closeTaskModal();
    await loadTasks(groupId);
}
