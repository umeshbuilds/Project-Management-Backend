import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { UserRolesEnum } from "../utils/constants.js";

export const verifyProjectMember = asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
        throw new ApiError(400, "Invalid Project ID format");
    }

    const project = await Project.findById(projectId);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    const currentUserId = req.user?._id?.toString();

    // Find member record
    const memberRecord = project.members.find(
        (m) => m.user?.toString() === currentUserId
    );

    const isCreator = project.createdBy?.toString() === currentUserId;

    if (!memberRecord && !isCreator) {
        throw new ApiError(403, "Access denied: You are not a member of this project");
    }

    const userRole = memberRecord ? memberRecord.role : (isCreator ? UserRolesEnum.ADMIN : null);

    req.project = project;
    req.userProjectRole = userRole;

    next();
});

export const verifyProjectRole = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.project || !req.userProjectRole) {
            throw new ApiError(500, "Project context not initialized before role verification");
        }

        const isCreator = req.project.createdBy?.toString() === req.user?._id?.toString();
        if (isCreator) {
            return next(); // Project creator always retains full administrative access
        }

        if (!allowedRoles.includes(req.userProjectRole)) {
            throw new ApiError(
                403,
                `Forbidden: Requires one of [${allowedRoles.join(", ")}] permissions, but you have [${req.userProjectRole}]`
            );
        }

        next();
    };
};
