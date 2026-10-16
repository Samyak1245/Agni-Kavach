import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        incidentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Incident",
            required: true,
            index: true,
        },

        recipient: {
            type: String,
            required: true,
            trim: true,
        },

        method: {
            type: String,
            enum: ["email", "sms", "webhook"],
            required: true,
        },

        subject: {
            type: String,
            default: "",
        },

        message: {
            type: String,
            required: true,
        },

        status: {
            type: String,
            enum: [
                "drafted",
                "queued",
                "submitted",
                "sent",
                "delivered",
                "failed",
                "acknowledged",
            ],
            default: "drafted",
        },

        providerMessageId: {
            type: String,
            default: null,
        },

        errorMessage: {
            type: String,
            default: null,
        },

        sentAt: {
            type: Date,
            default: null,
        },

        deliveredAt: {
            type: Date,
            default: null,
        },

        acknowledgedAt: {
            type: Date,
            default: null,
        },

        acknowledgedBy: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ status: 1, createdAt: -1 });

const Notification = mongoose.model(
    "Notification",
    notificationSchema
);

export default Notification;