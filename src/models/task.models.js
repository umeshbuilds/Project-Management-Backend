import mongoose, { Schema } from "mongoose";
import {
    AvailableTaskPriority,
    AvailableTaskStatus,
    TaskPriorityEnum,
    TaskStatusEnum
} from "../utils/constants.js";

const subTaskSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Subtask title is required"],
            trim: true
        },
        isCompleted: {
            type: Boolean,
            default: false
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

const taskSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Task title is required"],
            trim: true,
            index: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        project: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        status: {
            type: String,
            enum: AvailableTaskStatus,
            default: TaskStatusEnum.TODO,
            index: true
        },
        priority: {
            type: String,
            enum: AvailableTaskPriority,
            default: TaskPriorityEnum.MEDIUM
        },
        dueDate: {
            type: Date,
            default: null
        },
        attachments: [
            {
                url: String,
                name: String,
                mimetype: String,
                size: Number
            }
        ],
        subtasks: [subTaskSchema],
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

export const Task = mongoose.model("Task", taskSchema);
