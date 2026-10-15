import mongoose from "mongoose";
import { Note } from "../models/note.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const getProjectNotes = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const notes = await Note.find({ project: projectId })
        .populate("createdBy", "username email fullName avatar")
        .sort({ updatedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, { notes }, "Project notes retrieved successfully")
    );
});

const createNote = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { title, content } = req.body;

    if (!title || !title.trim()) {
        throw new ApiError(400, "Note title is required");
    }
    if (!content || !content.trim()) {
        throw new ApiError(400, "Note content is required");
    }

    const note = await Note.create({
        title: title.trim(),
        content: content.trim(),
        project: projectId,
        createdBy: req.user?._id
    });

    const populatedNote = await Note.findById(note._id).populate(
        "createdBy",
        "username email fullName avatar"
    );

    return res.status(201).json(
        new ApiResponse(201, { note: populatedNote }, "Note created successfully")
    );
});

const getNoteById = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(noteId)) {
        throw new ApiError(400, "Invalid Note ID format");
    }

    const note = await Note.findOne({ _id: noteId, project: projectId }).populate(
        "createdBy",
        "username email fullName avatar"
    );

    if (!note) {
        throw new ApiError(404, "Note not found in this project");
    }

    return res.status(200).json(
        new ApiResponse(200, { note }, "Note retrieved successfully")
    );
});

const updateNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;
    const { title, content } = req.body;

    const updateData = {};
    if (title !== undefined) {
        if (!title.trim()) throw new ApiError(400, "Note title cannot be empty");
        updateData.title = title.trim();
    }
    if (content !== undefined) {
        if (!content.trim()) throw new ApiError(400, "Note content cannot be empty");
        updateData.content = content.trim();
    }

    const updatedNote = await Note.findOneAndUpdate(
        { _id: noteId, project: projectId },
        { $set: updateData },
        { new: true }
    ).populate("createdBy", "username email fullName avatar");

    if (!updatedNote) {
        throw new ApiError(404, "Note not found in this project");
    }

    return res.status(200).json(
        new ApiResponse(200, { note: updatedNote }, "Note updated successfully")
    );
});

const deleteNote = asyncHandler(async (req, res) => {
    const { projectId, noteId } = req.params;

    const note = await Note.findOneAndDelete({ _id: noteId, project: projectId });
    if (!note) {
        throw new ApiError(404, "Note not found in this project");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Note deleted successfully")
    );
});

export {
    getProjectNotes,
    createNote,
    getNoteById,
    updateNote,
    deleteNote
};
