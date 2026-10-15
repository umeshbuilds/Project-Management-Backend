import { Router } from "express";
import {
    addProjectMember,
    createProject,
    deleteProject,
    getProjectById,
    getProjectMembers,
    getUserProjects,
    removeProjectMember,
    updateMemberRole,
    updateProject
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    verifyProjectMember,
    verifyProjectRole
} from "../middlewares/project.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();

// Apply auth middleware to all project routes
router.use(verifyJWT);

// Project core lifecycle
router.route("/").get(getUserProjects).post(createProject);

router
    .route("/:projectId")
    .get(verifyProjectMember, getProjectById)
    .put(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), updateProject)
    .delete(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), deleteProject);

// Member management
router
    .route("/:projectId/members")
    .get(verifyProjectMember, getProjectMembers)
    .post(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), addProjectMember);

router
    .route("/:projectId/members/:userId")
    .put(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), updateMemberRole)
    .delete(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), removeProjectMember);

export default router;
