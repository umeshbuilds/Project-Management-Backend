import mongoose from "mongoose";
import { Task } from "../models/task.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
    AvailableTaskPriority,
    AvailableTaskStatus,
    TaskPriorityEnum,
    TaskStatusEnum,
    UserRolesEnum
} from "../utils/constants.js";

const getProjectTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { status, priority, assignedTo } = req.query;

    const filter = { project: projectId };
    if (status && AvailableTaskStatus.includes(status)) {
        filter.status = status;
    }
    if (priority && AvailableTaskPriority.includes(priority)) {
        filter.priority = priority;
    }
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
        filter.assignedTo = assignedTo;
    }

    const tasks = await Task.find(filter)
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar")
        .populate("subtasks.createdBy", "username email fullName avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, { tasks }, "Project tasks retrieved successfully")
    );
});

const createTask = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { title, description, priority, assignedTo, dueDate } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError(400, "Task title is required");
    }

    // Verify assignedTo belongs to project if specified
    if (assignedTo) {
        const isMember = req.project.members.some(
            (m) => m.user?.toString() === assignedTo.toString()
        ) || req.project.createdBy?.toString() === assignedTo.toString();

        if (!isMember) {
            throw new ApiError(400, "Assigned user is not a member of this project");
        }
    }

    const task = await Task.create({
        title: title.trim(),
        description: description?.trim() || "",
        project: projectId,
        priority: AvailableTaskPriority.includes(priority) ? priority : TaskPriorityEnum.MEDIUM,
        status: TaskStatusEnum.TODO,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: req.user?._id,
        subtasks: []
    });

    const populatedTask = await Task.findById(task._id)
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar");

    return res.status(201).json(
        new ApiResponse(201, { task: populatedTask }, "Task created successfully")
    );
});

const getTaskById = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
        throw new ApiError(400, "Invalid Task ID format");
    }

    const task = await Task.findOne({ _id: taskId, project: projectId })
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar")
        .populate("subtasks.createdBy", "username email fullName avatar");

    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    return res.status(200).json(
        new ApiResponse(200, { task }, "Task retrieved successfully")
    );
});

const updateTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;

    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    const userRole = req.userProjectRole;
    const isElevated = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(userRole);

    // If user is a basic Member, they can only update status
    if (!isElevated) {
        if (status !== undefined) {
            if (!AvailableTaskStatus.includes(status)) {
                throw new ApiError(400, "Invalid task status");
            }
            task.status = status;
            await task.save();
        } else {
            throw new ApiError(403, "Team members can only update task status");
        }
    } else {
        // Admin or Project Admin can update all fields
        if (title !== undefined) {
            if (!title.trim()) throw new ApiError(400, "Title cannot be empty");
            task.title = title.trim();
        }
        if (description !== undefined) {
            task.description = description.trim();
        }
        if (status !== undefined) {
            if (!AvailableTaskStatus.includes(status)) {
                throw new ApiError(400, "Invalid task status");
            }
            task.status = status;
        }
        if (priority !== undefined) {
            if (!AvailableTaskPriority.includes(priority)) {
                throw new ApiError(400, "Invalid task priority");
            }
            task.priority = priority;
        }
        if (assignedTo !== undefined) {
            task.assignedTo = assignedTo || null;
        }
        if (dueDate !== undefined) {
            task.dueDate = dueDate ? new Date(dueDate) : null;
        }
        await task.save();
    }

    const updatedTask = await Task.findById(taskId)
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar")
        .populate("subtasks.createdBy", "username email fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, { task: updatedTask }, "Task updated successfully")
    );
});

const deleteTask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;

    const task = await Task.findOneAndDelete({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Task deleted successfully")
    );
});

// Subtasks Management
const createSubtask = asyncHandler(async (req, res) => {
    const { projectId, taskId } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError(400, "Subtask title is required");
    }

    const task = await Task.findOne({ _id: taskId, project: projectId });
    if (!task) {
        throw new ApiError(404, "Task not found in this project");
    }

    const newSubtask = {
        title: title.trim(),
        isCompleted: false,
        createdBy: req.user?._id
    };

    task.subtasks.push(newSubtask);
    await task.save();

    const updatedTask = await Task.findById(taskId)
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar")
        .populate("subtasks.createdBy", "username email fullName avatar");

    return res.status(201).json(
        new ApiResponse(201, { task: updatedTask }, "Subtask added successfully")
    );
});

const updateSubtask = asyncHandler(async (req, res) => {
    const { projectId, subTaskId } = req.params;
    const { title, isCompleted } = req.body;

    const task = await Task.findOne({
        project: projectId,
        "subtasks._id": subTaskId
    });

    if (!task) {
        throw new ApiError(404, "Subtask not found in this project");
    }

    const subtask = task.subtasks.id(subTaskId);
    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    const userRole = req.userProjectRole;
    const isElevated = [UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN].includes(userRole);

    if (isCompleted !== undefined) {
        subtask.isCompleted = Boolean(isCompleted);
    }

    if (title !== undefined) {
        if (!isElevated) {
            throw new ApiError(403, "Only Admins and Project Admins can rename subtasks");
        }
        if (!title.trim()) throw new ApiError(400, "Subtask title cannot be empty");
        subtask.title = title.trim();
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar")
        .populate("subtasks.createdBy", "username email fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, { task: updatedTask }, "Subtask updated successfully")
    );
});

const deleteSubtask = asyncHandler(async (req, res) => {
    const { projectId, subTaskId } = req.params;

    const task = await Task.findOne({
        project: projectId,
        "subtasks._id": subTaskId
    });

    if (!task) {
        throw new ApiError(404, "Subtask not found in this project");
    }

    task.subtasks.pull({ _id: subTaskId });
    await task.save();

    const updatedTask = await Task.findById(task._id)
        .populate("assignedTo", "username email fullName avatar")
        .populate("createdBy", "username email fullName avatar")
        .populate("subtasks.createdBy", "username email fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, { task: updatedTask }, "Subtask removed successfully")
    );
});

export {
    getProjectTasks,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    createSubtask,
    updateSubtask,
    deleteSubtask
};
