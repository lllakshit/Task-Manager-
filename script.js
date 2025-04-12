/**
 * Daily Task Manager Script
 *
 * Handles date navigation, task adding, deleting, completion toggling,
 * and saving/loading tasks from local storage.
 */

// --- DOM Elements ---
const currentDateElement = document.getElementById("current-date");
const prevDayBtn = document.getElementById("prev-day-btn");
const nextDayBtn = document.getElementById("next-day-btn");
const addTaskForm = document.getElementById("add-task-form");
const taskInput = document.getElementById("task-input");
const taskListElement = document.getElementById("task-list");
const noTasksMessage = document.getElementById("no-tasks-message");

// --- State ---
let currentDate = new Date(); // Initialize with today's date
const ALL_TASKS_STORAGE_KEY = "dailyTasks"; // Key for local storage

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  displayDate();
  loadAndRenderTasks();
  setupEventListeners();
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
 * Formats a Date object into a user-friendly string (e.g., "April 12, 2025").
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
}

/**
 * Creates an HTML list item element for a given task object.
 * @param {object} task - The task object (e.g., { id: number, text: string, completed: boolean }).
 * @returns {HTMLLIElement} The created list item element.
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm hover:bg-gray-100 transition duration-150 ${
    task.completed ? "completed" : ""
  }`;
  li.dataset.taskId = task.id; // Store task ID

  // Task Text Span
  const textSpan = document.createElement("span");
  textSpan.textContent = task.text;
  textSpan.className = "flex-grow mr-3 break-words"; // Allow text wrapping

  // Buttons Container
  const buttonsDiv = document.createElement("div");
  buttonsDiv.className = "flex-shrink-0 flex items-center gap-2";

  // Complete/Toggle Button
  const completeButton = document.createElement("button");
  completeButton.className = `p-2 rounded-full text-sm ${
    task.completed
      ? "bg-yellow-400 hover:bg-yellow-500 text-white"
      : "bg-green-500 hover:bg-green-600 text-white"
  }`;
  completeButton.innerHTML = `<i class="fas ${
    task.completed ? "fa-undo" : "fa-check"
  } fa-fw"></i>`;
  completeButton.ariaLabel = task.completed
    ? "Mark as Incomplete"
    : "Mark as Complete";
  completeButton.onclick = () => toggleTaskCompletion(task.id);

  // Delete Button
  const deleteButton = document.createElement("button");
  deleteButton.className =
    "p-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm";
  deleteButton.innerHTML = '<i class="fas fa-trash fa-fw"></i>';
  deleteButton.ariaLabel = "Delete Task";
  deleteButton.onclick = () => deleteTask(task.id);

  // Append elements
  buttonsDiv.appendChild(completeButton);
  buttonsDiv.appendChild(deleteButton);
  li.appendChild(textSpan);
  li.appendChild(buttonsDiv);

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
    // Find the task and update its 'completed' status
    allTasks[dateKey] = allTasks[dateKey].map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    saveTasksToLocalStorage(allTasks);
    renderTasks(); // Re-render to reflect the change
  }
}

/**
 * Deletes a task.
 * @param {number} taskId - The ID of the task to delete.
 */
function deleteTask(taskId) {
  // Optional: Add a confirmation dialog
  // if (!confirm("Are you sure you want to delete this task?")) {
  //     return;
  // }

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  if (allTasks[dateKey]) {
    // Filter out the task with the matching ID
    allTasks[dateKey] = allTasks[dateKey].filter((task) => task.id !== taskId);

    // If the array becomes empty, optionally remove the date key
    if (allTasks[dateKey].length === 0) {
      delete allTasks[dateKey];
    }

    saveTasksToLocalStorage(allTasks);
    renderTasks(); // Re-render the list
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
 * Sets up all necessary event listeners.
 */
function setupEventListeners() {
  prevDayBtn.addEventListener("click", goToPrevDay);
  nextDayBtn.addEventListener("click", goToNextDay);
  addTaskForm.addEventListener("submit", handleAddTask);

  // Add listener for dynamically created elements (using event delegation on the list)
  // Note: Specific button clicks are handled directly in createTaskElement for simplicity here,
  // but event delegation is another valid approach.
}
// --- PDF Tasks Data ---
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
 * Sets up PDF task import functionality
 */
function setupPdfTaskImport() {
  const pdfTasksHeader = document.getElementById("pdf-tasks-header");
  const pdfTasksPanel = document.getElementById("pdf-tasks-panel");
  const pdfToggleIcon = document.getElementById("pdf-toggle-icon");
  const pdfSourceSelect = document.getElementById("pdf-source-select");
  const pdfSearchInput = document.getElementById("pdf-search-input");
  const pdfTasksList = document.getElementById("pdf-tasks-list");

  // Toggle PDF tasks panel
  pdfTasksHeader.addEventListener("click", () => {
    const isHidden = pdfTasksPanel.classList.contains("hidden");
    if (isHidden) {
      pdfTasksPanel.classList.remove("hidden");
      pdfToggleIcon.textContent = "expand_less";
      renderPdfTasks(); // Load tasks when panel is opened
    } else {
      pdfTasksPanel.classList.add("hidden");
      pdfToggleIcon.textContent = "expand_more";
    }
  });

  // Handle source change
  pdfSourceSelect.addEventListener("change", renderPdfTasks);

  // Handle search/filter
  pdfSearchInput.addEventListener("input", renderPdfTasks);

  /**
   * Renders PDF tasks based on selected source and filter text
   */
  function renderPdfTasks() {
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
        : "No tasks available";
      pdfTasksList.appendChild(emptyMessage);
    } else {
      // Create list items for each task
      filteredTasks.forEach((taskText) => {
        const li = document.createElement("li");
        li.className =
          "flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-lg";

        const textSpan = document.createElement("span");
        textSpan.className = "flex-grow mr-3";
        textSpan.textContent = taskText;

        const importBtn = document.createElement("button");
        importBtn.className =
          "p-2 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 text-sm flex-shrink-0";
        importBtn.innerHTML =
          '<span class="material-symbols-outlined" style="font-size: 18px;">add</span>';
        importBtn.ariaLabel = "Import Task";
        importBtn.onclick = () => importPdfTask(taskText);

        li.appendChild(textSpan);
        li.appendChild(importBtn);
        pdfTasksList.appendChild(li);
      });
    }
  }

  /**
   * Imports a task from PDF to the task list
   * @param {string} taskText - The text of the task to import
   */
  function importPdfTask(taskText) {
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

    // Re-render and show success feedback
    renderTasks();

    // Optional: Show a temporary success message
    const successMsg = document.createElement("div");
    successMsg.className =
      "fixed top-4 right-4 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50";
    successMsg.textContent = "Task imported successfully!";
    document.body.appendChild(successMsg);

    // Remove success message after 2 seconds
    setTimeout(() => {
      document.body.removeChild(successMsg);
    }, 2000);
  }
}

// Add to the existing setupEventListeners function
function setupEventListeners() {
  prevDayBtn.addEventListener("click", goToPrevDay);
  nextDayBtn.addEventListener("click", goToNextDay);
  addTaskForm.addEventListener("submit", handleAddTask);

  // Add Go to Today functionality
  const goTodayBtn = document.getElementById("go-today-btn");
  if (goTodayBtn) {
    goTodayBtn.addEventListener("click", () => {
      currentDate = new Date(); // Reset to today
      displayDate();
      loadAndRenderTasks();
    });
  }

  // Set up the PDF task import feature
  setupPdfTaskImport();

  // Add Stats display functionality
  const taskStats = document.getElementById("task-stats");
  if (taskStats) {
    // Update stats when tasks change
    const observer = new MutationObserver(updateTaskStats);
    observer.observe(taskListElement, { childList: true, subtree: true });

    // Initial stats update
    updateTaskStats();
  }

  // Add clear completed tasks functionality
  const clearCompletedBtn = document.getElementById("clear-completed-btn");
  if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener("click", clearCompletedTasks);
    // Initial button visibility check
    updateClearButtonVisibility();
  }
}

/**
 * Updates the task statistics display
 */
function updateTaskStats() {
  const taskStats = document.getElementById("task-stats");
  if (!taskStats) return;

  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);
  const tasksForDate = allTasks[dateKey] || [];

  const totalTasks = tasksForDate.length;
  const completedTasks = tasksForDate.filter((task) => task.completed).length;

  if (totalTasks === 0) {
    taskStats.textContent = "No tasks";
  } else {
    taskStats.textContent = `${completedTasks}/${totalTasks} completed`;
  }

  // Update clear button visibility
  updateClearButtonVisibility();
}

/**
 * Updates the visibility of the clear completed button
 */
function updateClearButtonVisibility() {
  const clearCompletedBtn = document.getElementById("clear-completed-btn");
  if (!clearCompletedBtn) return;

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
 * Clears all completed tasks for the current date
 */
function clearCompletedTasks() {
  const allTasks = loadTasksFromLocalStorage();
  const dateKey = formatDate(currentDate);

  if (allTasks[dateKey]) {
    // Keep only incomplete tasks
    allTasks[dateKey] = allTasks[dateKey].filter((task) => !task.completed);

    // If the array becomes empty, optionally remove the date key
    if (allTasks[dateKey].length === 0) {
      delete allTasks[dateKey];
    }

    saveTasksToLocalStorage(allTasks);
    renderTasks(); // Re-render the list
  }
}
