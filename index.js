require('dotenv').config();
const axios = require('axios');

// Asana API base URL and authorization
const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
const ASANA_TOKEN = process.env.ASANA_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;
const TO_DO_SECTION_ID = process.env.TO_DO_SECTION_ID;
const IN_PROGRESS_SECTION_ID = process.env.IN_PROGRESS_SECTION_ID;

// Axios instance with authorization header
const asanaClient = axios.create({
    baseURL: ASANA_API_BASE,
    headers: {
        Authorization: `Bearer ${ASANA_TOKEN}`,
    },
});

// Function to retrieve tasks in a section
async function getTasksInSection(sectionId) {
    try {
        const response = await asanaClient.get(`/sections/${sectionId}/tasks`);
        return response.data.data;
    } catch (error) {
        console.error('Error retrieving tasks:', error.response?.data?.errors || error.message);
        return [];
    }
}

// Function to get task details
async function getTaskDetails(taskId) {
    try {
        const response = await asanaClient.get(`/tasks/${taskId}`);
        return response.data.data;
    } catch (error) {
        console.error(`Error retrieving task details for ${taskId}:`, error.response?.data?.errors || error.message);
    }
}

// Function to update task due date
async function updateTaskDueDate(taskId, dueDate) {
    try {
        await asanaClient.put(`/tasks/${taskId}`, {
            data: { due_on: dueDate },
        });
        console.log(`Task ${taskId} due date updated to ${dueDate}.`);
    } catch (error) {
        console.error(`Error updating due date for task ${taskId}:`, error.response?.data?.errors || error.message);
    }
}

// Function to add days to a given date
function addDaysToDate(date, days) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate.toISOString().split('T')[0];  // Return the date in YYYY-MM-DD format
}

// Function to check if a task is newly moved to "In Progress" section
async function checkAndUpdateDueDates() {
    try {
        const toDoTasks = await getTasksInSection(TO_DO_SECTION_ID);
        const inProgressTasks = await getTasksInSection(IN_PROGRESS_SECTION_ID);

        // Track tasks in "In Progress" that were previously in "To Do"
        const inProgressTaskIds = inProgressTasks.map(task => task.gid);
        const toDoTaskIds = new Set(toDoTasks.map(task => task.gid));

        for (const task of inProgressTasks) {
            // If the task is no longer in "To Do" and is now in "In Progress"
            if (!toDoTaskIds.has(task.gid) && !inProgressTaskIds.includes(task.gid)) {
                // Fetch the task details
                const taskDetails = await getTaskDetails(task.gid);

                // Check if the task has a due date
                const existingDueDate = taskDetails.due_on;
                if (existingDueDate) {
                    const updatedDueDate = addDaysToDate(existingDueDate, 2);
                    await updateTaskDueDate(task.gid, updatedDueDate);
                } else {
                    console.log(`Task ${task.gid} does not have a due date.`);
                }
            }
        }
    } catch (error) {
        console.error('Error in automation:', error.response?.data?.errors || error.message);
    }
}

// Run the automation
checkAndUpdateDueDates();
