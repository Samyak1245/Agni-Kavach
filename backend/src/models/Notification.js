import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
      index: true,
    },
    publicIncidentId: { type: String, required: true, index: true },
    notificationId: { type: String, required: true, unique: true, index: true },
    recipient: { type: String, required: true, trim: true },
    officialName: { type: String, default: "Forest Official" },
    officialRole: { type: String, default: "" },
    method: { type: String, enum: ["email", "sms", "webhook"], default: "webhook" },
    channel: { type: String, enum: ["email", "webhook", "client_relay"], default: "email" },
    subject: { type: String, default: "AgniKavach forest alert" },
    message: { type: String, required: true },
    coordinates: { type: mongoose.Schema.Types.Mixed, default: null },
    locationContext: { type: String, default: "" },
    confidence: { type: mongoose.Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["drafted", "queued", "submitted", "sent", "delivered", "failed", "acknowledged"],
      default: "drafted",
    },
    providerMessageId: { type: String, default: null },
    deliveryMethod: { type: String, default: "" },
    details: { type: String, default: "" },
    errorMessage: { type: String, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: String, default: null },
    acknowledgmentChannel: { type: String, default: null },
    acknowledgmentNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

notificationSchema.index({ status: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
