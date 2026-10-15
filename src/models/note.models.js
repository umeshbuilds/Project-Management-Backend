import mongoose, { Schema } from "mongoose";

const noteSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, "Note title is required"],
            trim: true
        },
        content: {
            type: String,
            required: [true, "Note content is required"],
            trim: true
        },
        project: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);
