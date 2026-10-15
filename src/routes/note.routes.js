import { Router } from "express";
import {
    createNote,
    deleteNote,
    getNoteById,
    getProjectNotes,
    updateNote
} from "../controllers/note.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    verifyProjectMember,
    verifyProjectRole
} from "../middlewares/project.middleware.js";
import { UserRolesEnum } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

router
    .route("/:projectId")
    .get(verifyProjectMember, getProjectNotes)
    .post(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), createNote);

router
    .route("/:projectId/n/:noteId")
    .get(verifyProjectMember, getNoteById)
    .put(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), updateNote)
    .delete(verifyProjectMember, verifyProjectRole([UserRolesEnum.ADMIN]), deleteNote);

export default router;
