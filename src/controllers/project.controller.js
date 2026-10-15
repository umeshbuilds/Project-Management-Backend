import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { Task } from "../models/task.models.js";
import { Note } from "../models/note.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";

const createProject = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name || name.trim() === "") {
        throw new ApiError(400, "Project name is required");
    }

    const project = await Project.create({
        name: name.trim(),
        description: description?.trim() || "",
        createdBy: req.user?._id,
        members: [
            {
                user: req.user?._id,
                role: UserRolesEnum.ADMIN
            }
        ]
    });

    const populatedProject = await Project.findById(project._id)
        .populate("createdBy", "username email fullName avatar")
        .populate("members.user", "username email fullName avatar");

    return res.status(201).json(
        new ApiResponse(201, { project: populatedProject }, "Project created successfully")
    );
});

const getUserProjects = asyncHandler(async (req, res) => {
    const currentUserId = req.user?._id;

    const projects = await Project.find({
        $or: [{ "members.user": currentUserId }, { createdBy: currentUserId }]
    })
        .populate("createdBy", "username email fullName avatar")
        .populate("members.user", "username email fullName avatar")
        .sort({ updatedAt: -1 });

    const projectsWithMetadata = await Promise.all(
        projects.map(async (proj) => {
            const memberCount = proj.members.length;
            const taskCount = await Task.countDocuments({ project: proj._id });
            const completedTaskCount = await Task.countDocuments({
                project: proj._id,
                status: "done"
            });
            const noteCount = await Note.countDocuments({ project: proj._id });

            const myMembership = proj.members.find(
                (m) => m.user?._id?.toString() === currentUserId.toString()
            );

            const isCreator = proj.createdBy?._id?.toString() === currentUserId.toString();
            const myRole = myMembership ? myMembership.role : (isCreator ? UserRolesEnum.ADMIN : UserRolesEnum.MEMBER);

            return {
                ...proj.toObject(),
                memberCount,
                taskCount,
                completedTaskCount,
                noteCount,
                myRole
            };
        })
    );

    return res.status(200).json(
        new ApiResponse(200, { projects: projectsWithMetadata }, "Projects retrieved successfully")
    );
});

const getProjectById = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
        .populate("createdBy", "username email fullName avatar")
        .populate("members.user", "username email fullName avatar");

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const currentUserId = req.user?._id?.toString();
    const myMembership = project.members.find(
        (m) => m.user?._id?.toString() === currentUserId
    );
    const isCreator = project.createdBy?._id?.toString() === currentUserId;
    const myRole = myMembership ? myMembership.role : (isCreator ? UserRolesEnum.ADMIN : null);

    const taskCount = await Task.countDocuments({ project: project._id });
    const noteCount = await Note.countDocuments({ project: project._id });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                project: {
                    ...project.toObject(),
                    myRole,
                    taskCount,
                    noteCount
                }
            },
            "Project details retrieved successfully"
        )
    );
});

const updateProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name, description } = req.body;

    const updateData = {};
    if (name !== undefined) {
        if (!name.trim()) throw new ApiError(400, "Project name cannot be empty");
        updateData.name = name.trim();
    }
    if (description !== undefined) {
        updateData.description = description.trim();
    }

    const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        { $set: updateData },
        { new: true }
    )
        .populate("createdBy", "username email fullName avatar")
        .populate("members.user", "username email fullName avatar");

    return res.status(200).json(
        new ApiResponse(200, { project: updatedProject }, "Project updated successfully")
    );
});

const deleteProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    await Project.findByIdAndDelete(projectId);
    // Cascade delete project tasks and notes
    await Task.deleteMany({ project: projectId });
    await Note.deleteMany({ project: projectId });

    return res.status(200).json(
        new ApiResponse(200, {}, "Project and associated items deleted successfully")
    );
});

// Member management
const getProjectMembers = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).populate(
        "members.user",
        "username email fullName avatar"
    );

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    return res.status(200).json(
        new ApiResponse(200, { members: project.members }, "Members retrieved successfully")
    );
});

const addProjectMember = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { email, username, role } = req.body;

    if (!email && !username) {
        throw new ApiError(400, "User email or username is required to add member");
    }

    const targetUser = await User.findOne({
        $or: [{ email: email || "" }, { username: username || "" }]
    });

    if (!targetUser) {
        throw new ApiError(404, "User not found with provided username or email");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const alreadyMember = project.members.some(
        (m) => m.user?.toString() === targetUser._id.toString()
    );

    if (alreadyMember) {
        throw new ApiError(409, "User is already a member of this project");
    }

    const memberRole = AvailableUserRole.includes(role) ? role : UserRolesEnum.MEMBER;

    project.members.push({
        user: targetUser._id,
        role: memberRole
    });

    await project.save();

    const updatedProject = await Project.findById(projectId).populate(
        "members.user",
        "username email fullName avatar"
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            { members: updatedProject.members },
            "Member added to project successfully"
        )
    );
});

const updateMemberRole = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;
    const { role } = req.body;

    if (!AvailableUserRole.includes(role)) {
        throw new ApiError(400, `Invalid role. Allowed roles: ${AvailableUserRole.join(", ")}`);
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const memberIndex = project.members.findIndex(
        (m) => m.user?.toString() === userId.toString()
    );

    if (memberIndex === -1) {
        throw new ApiError(404, "User is not a member of this project");
    }

    // Prevent demoting creator from admin
    if (project.createdBy?.toString() === userId.toString() && role !== UserRolesEnum.ADMIN) {
        throw new ApiError(400, "Project creator must remain an Admin");
    }

    project.members[memberIndex].role = role;
    await project.save();

    const updatedProject = await Project.findById(projectId).populate(
        "members.user",
        "username email fullName avatar"
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            { members: updatedProject.members },
            "Member role updated successfully"
        )
    );
});

const removeProjectMember = asyncHandler(async (req, res) => {
    const { projectId, userId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    if (project.createdBy?.toString() === userId.toString()) {
        throw new ApiError(400, "Cannot remove the project creator from the project");
    }

    const initialLength = project.members.length;
    project.members = project.members.filter(
        (m) => m.user?.toString() !== userId.toString()
    );

    if (project.members.length === initialLength) {
        throw new ApiError(404, "User is not a member of this project");
    }

    await project.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Member removed from project successfully")
    );
});

export {
    createProject,
    getUserProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectMembers,
    addProjectMember,
    updateMemberRole,
    removeProjectMember
};
