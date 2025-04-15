/**
 * Daily Task Manager Script
 *
 * Handles date navigation, task adding, deleting, editing, completion toggling,
 * PDF task import, task notifications (via alert), and saving/loading tasks from local storage.
 */

// --- DOM Elements ---
const currentDateElement = document.getElementById("current-date");
const prevDayBtn = document.getElementById("prev-day-btn");
const nextDayBtn = document.getElementById("next-day-btn");
const addTaskForm = document.getElementById("add-task-form");
const taskInput = document.getElementById("task-input");
const taskListElement = document.getElementById("task-list");
const noTasksMessage = document.getElementById("no-tasks-message");
const goTodayBtn = document.getElementById("go-today-btn");
const taskStats = document.getElementById("task-stats");
const clearCompletedBtn = document.getElementById("clear-completed-btn");

// PDF Import Elements
const pdfTasksHeader = document.getElementById("pdf-tasks-header");
const pdfTasksPanel = document.getElementById("pdf-tasks-panel");
const pdfToggleIcon = document.getElementById("pdf-toggle-icon");
const pdfSourceSelect = document.getElementById("pdf-source-select");
const pdfSearchInput = document.getElementById("pdf-search-input");
const pdfTasksList = document.getElementById("pdf-tasks-list");

// --- State ---
let currentDate = new Date(); // Initialize with today's date
const ALL_TASKS_STORAGE_KEY = "dailyTasks"; // Key for local storage
let notificationInterval = null; // To hold the interval ID

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  displayDate();
  loadAndRenderTasks(); // This will also update stats and button visibility initially
  setupEventListeners();
  setupPdfTaskImport(); // Set up PDF import listeners
  startNotificationChecker(); // Start checking for notifications
});

// --- Functions ---

/**
 * Formats a Date object into YYYY-MM-DD string format.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object into a user-friendly string (e.g., "April 14, 2025").
 * @param {Date} date - The date to format.
 * @returns {string} The user-friendly date string.
 */
function formatDisplayDate(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString(undefined, options); // Use browser's locale
}

/**
 * Updates the date display in the header.
 */
function displayDate() {
  currentDateElement.textContent = formatDisplayDate(currentDate);
  currentDateElement.dataset.dateKey = formatDate(currentDate); // Store YYYY-MM-DD for internal use
}

/**
 * Loads tasks from local storage. Handles tasks potentially missing new notification fields.
 * @returns {object} An object containing all tasks, keyed by date (YYYY-MM-DD).
 */
function loadTasksFromLocalStorage() {
  const tasksJson = localStorage.getItem(ALL_TASKS_STORAGE_KEY);
  let allTasks = {};
  try {
    allTasks = tasksJson ? JSON.parse(tasksJson) : {};
  } catch (error) {
    console.error("Error parsing tasks from local storage:", error);
    return {}; // Return empty object on error
  }

  // Ensure tasks have the necessary notification fields (for backward compatibility)
  for (const dateKey in allTasks) {
    if (allTasks.hasOwnProperty(dateKey)) {
      allTasks[dateKey] = allTasks[dateKey].map((task) => ({
        ...task,
        notifyEnabled: task.notifyEnabled ?? false, // Default to false if missing
        notifyTime: task.notifyTime ?? null, // Default to null if missing
      }));
    }
  }
  return allTasks;
}

/**
 * Saves the entire tasks object to local storage.
 * @param {object} allTasks - The object containing all tasks.
 */
function saveTasksToLocalStorage(allTasks) {
  try {
    localStorage.setItem(ALL_TASKS_STORAGE_KEY, JSON.stringify(allTasks));
  } catch (error) {
    console.error("Error saving tasks to local storage:", error);
    // Optionally: alert the user or implement a fallback
  }
}

/**
 * Renders the tasks for the currently selected date.
 */
function renderTasks() {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  const tasksForDate = allTasks[dateKey] || []; // Get tasks for the current date, or empty array

  taskListElement.innerHTML = ""; // Clear existing tasks

  if (tasksForDate.length === 0) {
    noTasksMessage.classList.remove("hidden"); // Show the 'no tasks' message
  } else {
    noTasksMessage.classList.add("hidden"); // Hide the 'no tasks' message
    tasksForDate.forEach((task) => {
      const taskItem = createTaskElement(task);
      taskListElement.appendChild(taskItem);
    });
  }
  // Update stats and button visibility after rendering
  updateTaskStats();
  updateClearButtonVisibility();
}

/**
 * Creates an HTML list item element for a given task object.
 * Includes view and edit modes, plus notification controls.
 * @param {object} task - The task object (e.g., { id: number, text: string, completed: boolean, notifyEnabled: boolean, notifyTime: string|null }).
 * @returns {HTMLLIElement} The created list item element.
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  const hasNotification = task.notifyEnabled && task.notifyTime;
  li.className = `task-item flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border-l-4 border-transparent hover:bg-slate-50 transition duration-150 ease-in-out ${
    task.completed ? "completed" : ""
  } ${hasNotification ? "has-notification" : ""}`; // Apply completed and notification classes
  li.dataset.taskId = task.id; // Store task ID

  // === View Mode Container ===
  const viewModeDiv = document.createElement("div");
  viewModeDiv.className =
    "task-view-mode flex items-center justify-between w-full";

  // Task Text Span (inside viewModeDiv)
  const textSpan = document.createElement("span");
  textSpan.textContent = task.text;
  textSpan.className = "task-text flex-grow mr-3 break-words";

  // Action Buttons Container (inside viewModeDiv)
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "task-actions flex-shrink-0 flex items-center gap-1"; // Adjusted gap

  // Notification Button & Time Input
  const notifyContainer = document.createElement("div");
  notifyContainer.className = "flex items-center";

  const notifyButton = document.createElement("button");
  notifyButton.className = `notify-button p-1.5 rounded-full text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 ${
    hasNotification
      ? "bg-amber-100 hover:bg-amber-200 text-amber-600 focus:ring-amber-400" // Style for active notification
      : "bg-slate-100 hover:bg-slate-200 text-slate-600 focus:ring-slate-400" // Style for inactive
  }`;
  notifyButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">${
    hasNotification ? "notifications_active" : "notifications" // Change icon based on state
  }</span>`;
  notifyButton.setAttribute(
    "aria-label",
    hasNotification ? "Disable Notification" : "Enable Notification"
  );
  notifyButton.onclick = () => toggleNotification(task.id);

  const timeInput = document.createElement("input");
  timeInput.type = "time";
  timeInput.className = "notify-time-input ml-1.5"; // Add Tailwind margin if needed
  timeInput.value = task.notifyTime || ""; // Set value, default to empty string if null
  timeInput.disabled = !task.notifyEnabled; // Disable if notification is not enabled
  timeInput.onchange = (event) => handleTimeChange(event, task.id);
  // Prevent time input click from propagating (e.g., to task item hover)
  timeInput.onclick = (event) => event.stopPropagation();

  notifyContainer.appendChild(notifyButton);
  notifyContainer.appendChild(timeInput);

  // Complete/Toggle Button
  const completeButton = document.createElement("button");
  completeButton.className = `p-1.5 rounded-full text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 ${
    task.completed
      ? "bg-slate-200 hover:bg-slate-300 text-slate-600 focus:ring-slate-400"
      : "bg-green-100 hover:bg-green-200 text-green-700 focus:ring-green-400"
  }`;
  completeButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">${
    task.completed ? "undo" : "check_circle"
  }</span>`;
  completeButton.setAttribute(
    "aria-label",
    task.completed ? "Mark as Incomplete" : "Mark as Complete"
  );
  completeButton.onclick = () => toggleTaskCompletion(task.id);

  // Edit Button
  const editButton = document.createElement("button");
  editButton.className =
    "p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1";
  editButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">edit</span>`;
  editButton.setAttribute("aria-label", "Edit Task");
  editButton.onclick = (event) => toggleEditMode(event, task.id);

  // Delete Button
  const deleteButton = document.createElement("button");
  deleteButton.className =
    "p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-red-400 focus:ring-offset-1";
  deleteButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">delete</span>`;
  deleteButton.setAttribute("aria-label", "Delete Task");
  deleteButton.onclick = () => deleteTask(task.id);

  // Append buttons to buttonsDiv
  buttonsDiv.appendChild(notifyContainer); // Add notification container
  buttonsDiv.appendChild(completeButton);
  buttonsDiv.appendChild(editButton);
  buttonsDiv.appendChild(deleteButton);

  // Append text and buttons to viewModeDiv
  viewModeDiv.appendChild(textSpan);
  viewModeDiv.appendChild(buttonsDiv);

  // === Edit Mode Container ===
  const editModeDiv = document.createElement("div");
  editModeDiv.className = "task-edit-mode items-center w-full hidden"; // Add 'hidden' utility class

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = task.text;
  editInput.className =
    "flex-grow px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm shadow-sm mr-2"; // Added margin-right
  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveTaskEdit(event, task.id);
    } else if (event.key === "Escape") {
      toggleEditMode(event, task.id, task.text); // Pass original text
    }
  });

  const editButtonsContainer = document.createElement("div"); // Container for save/cancel
  editButtonsContainer.className = "flex items-center gap-1.5 flex-shrink-0";

  const saveButton = document.createElement("button");
  saveButton.className =
    "bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-md text-xs shadow hover:shadow-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors duration-150";
  saveButton.innerHTML = `<span class="material-symbols-outlined !text-sm align-middle">save</span> Save`;
  saveButton.onclick = (event) => saveTaskEdit(event, task.id);

  const cancelButton = document.createElement("button");
  cancelButton.className =
    "bg-slate-400 hover:bg-slate-500 text-white font-semibold px-3 py-1.5 rounded-md text-xs shadow hover:shadow-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 transition-colors duration-150";
  cancelButton.innerHTML = `<span class="material-symbols-outlined !text-sm align-middle">cancel</span> Cancel`;
  cancelButton.onclick = (event) => toggleEditMode(event, task.id, task.text); // Pass original text

  // Append buttons to their container
  editButtonsContainer.appendChild(saveButton);
  editButtonsContainer.appendChild(cancelButton);

  // Append input and button container to editModeDiv
  editModeDiv.appendChild(editInput);
  editModeDiv.appendChild(editButtonsContainer);

  // Append View and Edit modes to the main list item
  li.appendChild(viewModeDiv);
  li.appendChild(editModeDiv);

  return li;
}

/**
 * Loads tasks from storage and renders them for the current date.
 */
function loadAndRenderTasks() {
  renderTasks();
}

/**
 * Handles the submission of the add task form.
 * @param {Event} event - The form submission event.
 */
function handleAddTask(event) {
  event.preventDefault(); // Prevent page reload
  const taskText = taskInput.value.trim();

  if (taskText) {
    const allTasks = loadTasksFromLocalStorage();
    const dateKey = formatDate(currentDate);

    // Initialize array for the date if it doesn't exist
    if (!allTasks[dateKey]) {
      allTasks[dateKey] = [];
    }

    // Create new task object with notification defaults
    const newTask = {
      id: Date.now(), // Simple unique ID using timestamp
      text: taskText,
      completed: false,
      notifyEnabled: false, // Default notification state
      notifyTime: null, // Default notification time
    };

    // Add task and save
    allTasks[dateKey].push(newTask);
    saveTasksToLocalStorage(allTasks);

    // Clear input and re-render
    taskInput.value = "";
    renderTasks();
    taskInput.focus(); // Keep focus on input for adding more tasks
  }
}

/**
 * Toggles the completion status of a task.
 * @param {number} taskId - The ID of the task to toggle.
 */
function toggleTaskCompletion(taskId) {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  if (allTasks[dateKey]) {
    let taskChanged = false;
    // Find the task and update its 'completed' status
    allTasks[dateKey] = allTasks[dateKey].map((task) => {
      if (task.id === taskId) {
        taskChanged = true;
        return { ...task, completed: !task.completed };
      }
      return task;
    });

    if (taskChanged) {
      saveTasksToLocalStorage(allTasks);
      renderTasks(); // Re-render to reflect the change (updates class and button)
    }
  }
}

/**
 * Deletes a task.
 * @param {number} taskId - The ID of the task to delete.
 */
function deleteTask(taskId) {
  // Optional: Add a confirmation dialog
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  if (allTasks[dateKey]) {
    // Filter out the task with the matching ID
    allTasks[dateKey] = allTasks[dateKey].filter((task) => task.id !== taskId);

    // If the array becomes empty, remove the date key to keep storage clean
    if (allTasks[dateKey].length === 0) {
      delete allTasks[dateKey];
    }

    saveTasksToLocalStorage(allTasks);
    renderTasks(); // Re-render the list
  }
}

/**
 * Toggles the edit mode for a specific task item.
 * @param {Event} event - The click event.
 * @param {number} taskId - The ID of the task to edit.
 * @param {string} originalText - The original text of the task (used for cancel).
 */
function toggleEditMode(event, taskId, originalText) {
  const taskItem = event.target.closest(".task-item");
  if (taskItem) {
    const isEditing = taskItem.classList.contains("editing");
    const viewMode = taskItem.querySelector(".task-view-mode");
    const editMode = taskItem.querySelector(".task-edit-mode");
    const input = editMode.querySelector('input[type="text"]');

    if (isEditing) {
      // Switching from editing to view
      taskItem.classList.remove("editing");
      viewMode.style.display = "flex"; // Or remove display style if needed
      editMode.style.display = "none";
      input.value = originalText; // Reset input value on cancel
    } else {
      // Switching from view to editing
      taskItem.classList.add("editing");
      viewMode.style.display = "none";
      editMode.style.display = "flex";
      input.focus();
      input.select(); // Select current text
    }
  }
}

/**
 * Helper function to get a task object by its ID for the current date.
 * @param {number} taskId - The ID of the task.
 * @returns {object|null} The task object or null if not found.
 */
function getTaskById(taskId) {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  if (allTasks[dateKey]) {
    return allTasks[dateKey].find((t) => t.id === taskId) || null;
  }
  return null;
}

/**
 * Saves the edited task text.
 * @param {Event} event - The click or keydown event.
 * @param {number} taskId - The ID of the task being saved.
 */
function saveTaskEdit(event, taskId) {
  const taskItem = event.target.closest(".task-item");
  const editInput = taskItem.querySelector(
    '.task-edit-mode input[type="text"]'
  );
  const newText = editInput.value.trim();

  if (!newText) {
    // Provide non-blocking feedback instead of alert
    editInput.classList.add("border-red-500", "ring-red-500"); // Highlight error
    editInput.focus();
    // Maybe add a small temporary message near the input
    setTimeout(() => {
      editInput.classList.remove("border-red-500", "ring-red-500");
    }, 2000);
    return;
  }

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  if (allTasks[dateKey]) {
    let taskUpdated = false;
    // Find the task and update its text
    allTasks[dateKey] = allTasks[dateKey].map((task) => {
      if (task.id === taskId) {
        if (task.text !== newText) {
          // Only update if text actually changed
          taskUpdated = true;
          return { ...task, text: newText };
        }
      }
      return task;
    });

    if (taskUpdated) {
      saveTasksToLocalStorage(allTasks);
    }
    // Always re-render after saving or attempting to save
    renderTasks();
  }
}

/**
 * Toggles the notification enabled state for a task.
 * If enabling, prompts for time if not already set.
 * @param {number} taskId - The ID of the task.
 */
function toggleNotification(taskId) {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  let taskUpdated = false;

  if (allTasks[dateKey]) {
    allTasks[dateKey] = allTasks[dateKey].map((task) => {
      if (task.id === taskId) {
        taskUpdated = true;
        const newState = !task.notifyEnabled;
        let newTime = task.notifyTime;

        // If enabling and no time is set, prompt or set a default
        if (newState && !newTime) {
          // Example: Prompting - replace with a better UI element if possible
          newTime = prompt("Enter notification time (HH:MM):", "09:00");
          // Basic validation
          if (newTime && !/^\d{2}:\d{2}$/.test(newTime)) {
            alert("Invalid time format. Please use HH:MM.");
            taskUpdated = false; // Prevent update if time is invalid
            return task; // Return original task
          }
          if (!newTime) {
            // User cancelled prompt
            taskUpdated = false;
            return task;
          }
        }

        return { ...task, notifyEnabled: newState, notifyTime: newTime };
      }
      return task;
    });

    if (taskUpdated) {
      saveTasksToLocalStorage(allTasks);
      renderTasks(); // Re-render to update button/input state
    }
  }
}

/**
 * Handles changes to the notification time input.
 * @param {Event} event - The change event.
 * @param {number} taskId - The ID of the task.
 */
function handleTimeChange(event, taskId) {
  const newTime = event.target.value;
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  let taskUpdated = false;

  // Basic validation for HH:MM format
  if (newTime && !/^\d{2}:\d{2}$/.test(newTime)) {
    alert("Invalid time format. Please use HH:MM.");
    // Revert the input value to the previous valid time if available
    const currentTask = getTaskById(taskId);
    event.target.value = currentTask?.notifyTime || "";
    return; // Stop processing
  }

  if (allTasks[dateKey]) {
    allTasks[dateKey] = allTasks[dateKey].map((task) => {
      if (task.id === taskId) {
        if (task.notifyTime !== newTime) {
          taskUpdated = true;
          return { ...task, notifyTime: newTime || null }; // Store null if empty
        }
      }
      return task;
    });

    if (taskUpdated) {
      saveTasksToLocalStorage(allTasks);
      // Optionally re-render if visual state needs update beyond input value
      // renderTasks();
    }
  }
}

/**
 * Checks for pending notifications for the current time and triggers alerts.
 */
function checkNotifications() {
  const now = new Date();
  const currentHour = String(now.getHours()).padStart(2, "0");
  const currentMinute = String(now.getMinutes()).padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;
  const todayKey = formatDate(now); // Check notifications only for today

  const allTasks = loadTasksFromLocalStorage();

  if (allTasks[todayKey]) {
    allTasks[todayKey].forEach((task) => {
      // Check if notification is enabled, not completed, time matches, and hasn't been triggered recently
      if (
        task.notifyEnabled &&
        task.notifyTime === currentTime &&
        !task.completed &&
        !task.notified
      ) {
        alert(`Task Reminder: ${task.text}`); // Simple alert notification

        // Mark task as notified to prevent repeated alerts in the same minute
        // This requires adding a temporary 'notified' flag or managing differently
        // For simplicity here, we don't persist this flag. Re-opening might re-alert.
        // A more robust solution needed for persistent "already notified" state.

        // --- Potential way to temporarily mark as notified (cleared on next save/load cycle) ---
        // task.notified = true;
        // This requires modifying save/load to handle/ignore this temporary flag or
        // clearing it after a short timeout.

        // --- Simpler: Modify the task to disable notification after firing (user must re-enable) ---
        // Find the task and disable notification
        markNotificationAsFired(task.id);
      }
    });
  }
}

/**
 * Marks a notification as fired by disabling it in storage.
 * @param {number} taskId - The ID of the task whose notification fired.
 */
function markNotificationAsFired(taskId) {
  const allTasks = loadTasksFromLocalStorage();
  const todayKey = formatDate(new Date()); // Ensure we're modifying today's task
  let taskUpdated = false;

  if (allTasks[todayKey]) {
    allTasks[todayKey] = allTasks[todayKey].map((task) => {
      if (task.id === taskId) {
        taskUpdated = true;
        // Disable notification after it fires
        return { ...task, notifyEnabled: false };
      }
      return task;
    });

    if (taskUpdated) {
      saveTasksToLocalStorage(allTasks);
      renderTasks(); // Update UI to show notification is now off
    }
  }
}

/**
 * Starts the interval timer to check for notifications.
 */
function startNotificationChecker() {
  // Clear existing interval if any
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }
  // Check every minute
  notificationInterval = setInterval(checkNotifications, 60000);
  // Also check immediately on load
  checkNotifications();
}

/**
 * Navigates to the previous day.
 */
function goToPrevDay() {
  currentDate.setDate(currentDate.getDate() - 1);
  displayDate();
  loadAndRenderTasks();
}

/**
 * Navigates to the next day.
 */
function goToNextDay() {
  currentDate.setDate(currentDate.getDate() + 1);
  displayDate();
  loadAndRenderTasks();
}

/**
 * Navigates to the current day.
 */
function goToToday() {
  currentDate = new Date(); // Reset to today
  displayDate();
  loadAndRenderTasks();
}

/**
 * Updates the task statistics display (e.g., "3/5 completed").
 */
function updateTaskStats() {
  if (!taskStats) return; // Guard clause if element doesn't exist

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  const tasksForDate = allTasks[dateKey] || [];

  const totalTasks = tasksForDate.length;
  const completedTasks = tasksForDate.filter((task) => task.completed).length;

  if (totalTasks === 0) {
    taskStats.textContent = "No tasks";
  } else {
    taskStats.textContent = `${completedTasks} / ${totalTasks} completed`;
  }
}

/**
 * Updates the visibility of the "Clear Completed" button.
 */
function updateClearButtonVisibility() {
  if (!clearCompletedBtn) return; // Guard clause

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  const tasksForDate = allTasks[dateKey] || [];

  const hasCompletedTasks = tasksForDate.some((task) => task.completed);

  if (hasCompletedTasks) {
    clearCompletedBtn.classList.remove("hidden");
  } else {
    clearCompletedBtn.classList.add("hidden");
  }
}

/**
 * Clears all completed tasks for the current date.
 */
function clearCompletedTasks() {
  // Optional: Confirmation
  if (
    !confirm("Are you sure you want to clear all completed tasks for this day?")
  ) {
    return;
  }

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  if (allTasks[dateKey]) {
    const originalLength = allTasks[dateKey].length;
    // Keep only incomplete tasks
    allTasks[dateKey] = allTasks[dateKey].filter((task) => !task.completed);
    const newLength = allTasks[dateKey].length;

    if (newLength < originalLength) {
      // Only save if something changed
      // If the array becomes empty, remove the date key
      if (allTasks[dateKey].length === 0) {
        delete allTasks[dateKey];
      }
      saveTasksToLocalStorage(allTasks);
      renderTasks(); // Re-render the list
    }
  }
}

// --- PDF Tasks Data (Keep as is or load dynamically if needed) ---
const pdfTasksData = {
  productivity: [
    "Study College: Java, PHP, Maths",
    "Complete research paper draft",
    "Complete Week 2 of Classical Mechanics",
    "Prepare quantum computing presentation",
    "Advanced AI/ML course module",
    "Upload content for social media (SciSimplified)",
    "Review research literature",
  ],
  streamline: [
    "Python For Data Science And AI (IBM skillbuild)",
    "Physics classical mechanics (OCW)",
    "Quantum computing (freecodecamp, Microsoft)",
    "Flutter app development (Simplilearn)",
    "Create blog for NextGenEarning and SkillBridge",
    "Create content for SciSimplified",
    "Study Java from Apna College",
    "Do Elements of AI course",
    "Optimize freelancing profiles",
    "Work on Research Paper",
    "Read 10 pages of Zero to One book",
  ],
};

/**
 * Sets up PDF task import functionality: toggle panel, filter, import action.
 */
function setupPdfTaskImport() {
  if (!pdfTasksHeader || !pdfTasksPanel) return; // Elements might not exist

  // Toggle PDF tasks panel visibility
  pdfTasksHeader.addEventListener("click", () => {
    const isVisible = pdfTasksPanel.classList.contains("visible");
    pdfTasksPanel.classList.toggle("visible", !isVisible); // Toggle the class
    pdfToggleIcon.textContent = isVisible ? "expand_more" : "expand_less"; // Update icon
    if (!isVisible) {
      renderPdfTasks(); // Load tasks when panel is opened
    }
  });

  // Handle source dropdown change
  if (pdfSourceSelect) {
    pdfSourceSelect.addEventListener("change", renderPdfTasks);
  }

  // Handle search/filter input
  if (pdfSearchInput) {
    pdfSearchInput.addEventListener("input", renderPdfTasks);
  }
}

/**
 * Renders tasks in the PDF import panel based on selected source and filter text.
 */
function renderPdfTasks() {
  if (!pdfTasksList || !pdfSourceSelect || !pdfSearchInput) return; // Ensure elements exist

  const source = pdfSourceSelect.value;
  const filterText = pdfSearchInput.value.toLowerCase().trim();
  const tasks = pdfTasksData[source] || [];

  // Filter tasks based on search text
  const filteredTasks = filterText
    ? tasks.filter((task) => task.toLowerCase().includes(filterText))
    : tasks;

  // Clear current tasks list
  pdfTasksList.innerHTML = "";

  if (filteredTasks.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "text-center text-slate-500 italic py-4";
    emptyMessage.textContent = filterText
      ? "No matching tasks found"
      : "No tasks available in selected source";
    pdfTasksList.appendChild(emptyMessage);
  } else {
    // Create list items for each task
    filteredTasks.forEach((taskText) => {
      const li = document.createElement("li");
      li.className =
        "flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-md";

      const textSpan = document.createElement("span");
      textSpan.className = "flex-grow mr-3 text-sm text-slate-700";
      textSpan.textContent = taskText;

      const importBtn = document.createElement("button");
      importBtn.className =
        "p-1.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:ring-offset-1 transition-colors duration-150";
      importBtn.innerHTML =
        '<span class="material-symbols-outlined !text-sm align-middle">add_task</span>';
      importBtn.setAttribute("aria-label", "Import Task");
      importBtn.onclick = () => importPdfTask(taskText);

      li.appendChild(textSpan);
      li.appendChild(importBtn);
      pdfTasksList.appendChild(li);
    });
  }
}

/**
 * Imports a task from the PDF panel to the main task list for the current date.
 * @param {string} taskText - The text of the task to import.
 */
function importPdfTask(taskText) {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  // Initialize array for the date if it doesn't exist
  if (!allTasks[dateKey]) {
    allTasks[dateKey] = [];
  }

  // Check if task already exists for the day (optional)
  const taskExists = allTasks[dateKey].some((task) => task.text === taskText);
  if (taskExists) {
    showTemporaryFeedback("Task already exists!", "bg-yellow-500");
    return;
  }

  // Create new task object (including default notification fields)
  const newTask = {
    id: Date.now(),
    text: taskText,
    completed: false,
    notifyEnabled: false, // Ensure imported tasks start with notifications off
    notifyTime: null,
  };

  // Add task and save
  allTasks[dateKey].push(newTask);
  saveTasksToLocalStorage(allTasks);

  // Re-render the main task list
  renderTasks();

  // Show success feedback
  showTemporaryFeedback("Task imported successfully!", "bg-green-500");
}

/**
 * Shows a temporary feedback message at the top right of the screen.
 * @param {string} message - The message to display.
 * @param {string} bgColorClass - Tailwind background color class (e.g., 'bg-green-500').
 */
function showTemporaryFeedback(message, bgColorClass = "bg-green-500") {
  const feedbackMsg = document.createElement("div");
  feedbackMsg.className = `fixed top-5 right-5 ${bgColorClass} text-white py-2 px-4 rounded-lg shadow-lg z-50 text-sm font-medium animate-fade-in-out`;
  feedbackMsg.textContent = message;
  document.body.appendChild(feedbackMsg);

  // Add CSS for animation if not already present
  const styleId = "feedback-animation-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.innerHTML = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fade-in-out {
          animation: fadeInOut 2.5s ease-in-out forwards;
        }
        `;
    document.head.appendChild(style);
  }

  // Remove feedback message after animation duration (2.5 seconds)
  setTimeout(() => {
    if (document.body.contains(feedbackMsg)) {
      document.body.removeChild(feedbackMsg);
    }
  }, 2500);
}

/**
 * Sets up all necessary event listeners.
 */
function setupEventListeners() {
  if (prevDayBtn) prevDayBtn.addEventListener("click", goToPrevDay);
  if (nextDayBtn) nextDayBtn.addEventListener("click", goToNextDay);
  if (addTaskForm) addTaskForm.addEventListener("submit", handleAddTask);
  if (goTodayBtn) goTodayBtn.addEventListener("click", goToToday);
  if (clearCompletedBtn)
    clearCompletedBtn.addEventListener("click", clearCompletedTasks);

  // Note: Listeners for task-specific buttons (complete, edit, delete, save, cancel, notify, time)
  // are added dynamically within the createTaskElement function.
}
