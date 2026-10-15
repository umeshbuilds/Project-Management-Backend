import { Router } from "express";
import {
    createSubtask,
    createTask,
    deleteSubtask,
    deleteTask,
    getProjectTasks,
    getTaskById,
    updateSubtask,
    updateTask
} from "../controllers/task.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    verifyProjectMember,
    verifyProjectRole
} from "../middlewares/project.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

// Tasks
router
    .route("/:projectId")
    .get(verifyProjectMember, getProjectTasks)
    .post(
        verifyProjectMember,
        verifyProjectRole([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        createTask
    );

router
    .route("/:projectId/t/:taskId")
    .get(verifyProjectMember, getTaskById)
    .put(verifyProjectMember, updateTask)
    .delete(
        verifyProjectMember,
        verifyProjectRole([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        deleteTask
    );

// Subtasks
router
    .route("/:projectId/t/:taskId/subtasks")
    .post(
        verifyProjectMember,
        verifyProjectRole([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        createSubtask
    );

router
    .route("/:projectId/st/:subTaskId")
    .put(verifyProjectMember, updateSubtask)
    .delete(
        verifyProjectMember,
        verifyProjectRole([UserRolesEnum.ADMIN, UserRolesEnum.PROJECT_ADMIN]),
        deleteSubtask
    );

export default router;
