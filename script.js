/**
 * Daily Task Manager Script
 *
 * Handles date navigation, task adding, deleting, editing, completion toggling,
 * PDF task import, and saving/loading tasks from local storage.
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

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  displayDate();
  loadAndRenderTasks(); // This will also update stats and button visibility initially
  setupEventListeners();
  setupPdfTaskImport(); // Set up PDF import listeners
});

// --- Functions ---

/**
 * Formats a Date object into yyyy-MM-dd string format.
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
  currentDateElement.dataset.dateKey = formatDate(currentDate); // Store yyyy-MM-dd for internal use
}

/**
 * Loads tasks from local storage.
 * @returns {object} An object containing all tasks, keyed by date (YYYY-MM-DD).
 */
function loadTasksFromLocalStorage() {
  const tasksJson = localStorage.getItem(ALL_TASKS_STORAGE_KEY);
  try {
    // Attempt to parse JSON, return empty object if null or invalid
    return tasksJson ? JSON.parse(tasksJson) : {};
  } catch (error) {
    console.error("Error parsing tasks from local storage:", error);
    return {}; // Return empty object on error
  }
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
 * Includes view and edit modes.
 * @param {object} task - The task object (e.g., { id: number, text: string, completed: boolean }).
 * @returns {HTMLLIElement} The created list item element.
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  // Added 'task-item' class for easier selection and styling consistency
  li.className = `task-item flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border-l-4 border-transparent hover:bg-slate-50 transition duration-150 ease-in-out ${
    task.completed ? "completed" : "" // Apply completed class for styling
  }`;
  li.dataset.taskId = task.id; // Store task ID

  // === View Mode Container ===
  const viewModeDiv = document.createElement("div");
  // Added 'task-view-mode' class
  viewModeDiv.className =
    "task-view-mode flex items-center justify-between w-full";

  // Task Text Span (inside viewModeDiv)
  const textSpan = document.createElement("span");
  textSpan.textContent = task.text;
  // Added 'task-text' class for strikethrough styling
  textSpan.className = "task-text flex-grow mr-3 break-words";

  // Action Buttons Container (inside viewModeDiv)
  const buttonsDiv = document.createElement("div");
  // Added 'task-actions' class
  buttonsDiv.className = "task-actions flex-shrink-0 flex items-center gap-1.5"; // Adjusted gap

  // Complete/Toggle Button
  const completeButton = document.createElement("button");
  // Adjusted padding, size, added transition and focus styles
  completeButton.className = `p-1.5 rounded-full text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 ${
    task.completed
      ? "bg-slate-200 hover:bg-slate-300 text-slate-600 focus:ring-slate-400"
      : "bg-green-100 hover:bg-green-200 text-green-700 focus:ring-green-400"
  }`;
  // Using Material Symbols Outlined icons
  completeButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">${
    task.completed ? "undo" : "check_circle" // Using check_circle for completion
  }</span>`;
  completeButton.setAttribute(
    "aria-label",
    task.completed ? "Mark as Incomplete" : "Mark as Complete"
  );
  completeButton.onclick = () => toggleTaskCompletion(task.id);

  // Edit Button (New)
  const editButton = document.createElement("button");
  editButton.className =
    "p-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1";
  editButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">edit</span>`;
  editButton.setAttribute("aria-label", "Edit Task");
  editButton.onclick = (event) => toggleEditMode(event, task.id); // Pass event and ID

  // Delete Button
  const deleteButton = document.createElement("button");
  deleteButton.className =
    "p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-red-400 focus:ring-offset-1";
  deleteButton.innerHTML = `<span class="material-symbols-outlined !text-base align-middle">delete</span>`;
  deleteButton.setAttribute("aria-label", "Delete Task");
  deleteButton.onclick = () => deleteTask(task.id);

  // Append buttons to buttonsDiv
  buttonsDiv.appendChild(completeButton);
  buttonsDiv.appendChild(editButton); // Add Edit button
  buttonsDiv.appendChild(deleteButton);

  // Append text and buttons to viewModeDiv
  viewModeDiv.appendChild(textSpan);
  viewModeDiv.appendChild(buttonsDiv);

  // === Edit Mode Container (New) ===
  const editModeDiv = document.createElement("div");
  // Added 'task-edit-mode' class
  editModeDiv.className = "task-edit-mode items-center w-full"; // Hidden by default via CSS

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = task.text;
  editInput.className =
    "flex-grow px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm shadow-sm";
  // Handle Enter key press in edit input
  editInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      saveTaskEdit(event, task.id);
    } else if (event.key === "Escape") {
      toggleEditMode(event, task.id); // Allow Esc to cancel
    }
  });

  const saveButton = document.createElement("button");
  saveButton.className =
    "bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-md text-xs shadow hover:shadow-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 transition-colors duration-150";
  saveButton.innerHTML = `<span class="material-symbols-outlined !text-sm align-middle">save</span> Save`;
  saveButton.onclick = (event) => saveTaskEdit(event, task.id);

  const cancelButton = document.createElement("button");
  cancelButton.className =
    "bg-slate-400 hover:bg-slate-500 text-white font-semibold px-3 py-1.5 rounded-md text-xs shadow hover:shadow-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 transition-colors duration-150";
  cancelButton.innerHTML = `<span class="material-symbols-outlined !text-sm align-middle">cancel</span> Cancel`;
  cancelButton.onclick = (event) => toggleEditMode(event, task.id); // Cancel toggles back

  // Append input and buttons to editModeDiv
  editModeDiv.appendChild(editInput);
  editModeDiv.appendChild(saveButton);
  editModeDiv.appendChild(cancelButton);

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

    // Create new task object
    const newTask = {
      id: Date.now(), // Simple unique ID using timestamp
      text: taskText,
      completed: false,
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
 */
function toggleEditMode(event, taskId) {
  const taskItem = event.target.closest(".task-item"); // Find the parent li using the class
  if (taskItem) {
    taskItem.classList.toggle("editing"); // Add/remove the 'editing' class

    // Optional: Focus the input when entering edit mode
    if (taskItem.classList.contains("editing")) {
      const input = taskItem.querySelector(
        '.task-edit-mode input[type="text"]'
      );
      if (input) {
        input.focus();
        input.select(); // Select current text for easy replacement
      }
    } else {
      // If toggling *off* edit mode (e.g., via Cancel), reset input value
      const originalTaskText = getTaskTextById(taskId); // Need a helper function for this
      const input = taskItem.querySelector(
        '.task-edit-mode input[type="text"]'
      );
      if (input && originalTaskText !== null) {
        input.value = originalTaskText;
      }
    }
  }
}

/**
 * Helper function to get the original text of a task by its ID.
 * @param {number} taskId - The ID of the task.
 * @returns {string|null} The task text or null if not found.
 */
function getTaskTextById(taskId) {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  if (allTasks[dateKey]) {
    const task = allTasks[dateKey].find((t) => t.id === taskId);
    return task ? task.text : null;
  }
  return null;
}

/**
 * Saves the edited task text.
 * @param {Event} event - The click event.
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

    // Always exit edit mode and re-render OR update UI directly
    renderTasks(); // Simplest approach: re-render the whole list
    // If using direct update:
    // const textSpan = taskItem.querySelector('.task-view-mode .task-text');
    // if (textSpan) {
    //     textSpan.textContent = newText;
    // }
    // taskItem.classList.remove('editing'); // Exit edit mode
    // updateTaskStats(); // Update stats if needed
  }
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
    const isVisible = pdfTasksPanel.classList.contains("visible"); // Use 'visible' class
    if (isVisible) {
      pdfTasksPanel.classList.remove("visible");
      pdfToggleIcon.textContent = "expand_more";
    } else {
      pdfTasksPanel.classList.add("visible");
      pdfToggleIcon.textContent = "expand_less";
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
        "flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-md"; // Adjusted styling

      const textSpan = document.createElement("span");
      textSpan.className = "flex-grow mr-3 text-sm text-slate-700"; // Adjusted styling
      textSpan.textContent = taskText;

      const importBtn = document.createElement("button");
      importBtn.className =
        "p-1.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 text-xs flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:ring-offset-1 transition-colors duration-150"; // Adjusted styling
      importBtn.innerHTML =
        '<span class="material-symbols-outlined !text-sm align-middle">add_task</span>'; // Using add_task icon
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
    // Optionally provide feedback that task already exists
    console.log("Task already exists for this date.");
    showTemporaryFeedback("Task already exists!", "bg-yellow-500");
    return;
  }

  // Create new task object
  const newTask = {
    id: Date.now(), // Simple unique ID using timestamp
    text: taskText,
    completed: false,
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
  // Improved styling for feedback message
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

  // Note: Listeners for task-specific buttons (complete, edit, delete, save, cancel)
  // are added dynamically within the createTaskElement function when tasks are rendered.
  // Event delegation could be used as an alternative, but direct assignment is simpler here.
}
