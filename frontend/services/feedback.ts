import emailjs from "@emailjs/browser";

export type FeedbackType = "bug" | "feedback" | "feature";

export interface FeedbackPayload {
  type: FeedbackType;
  name: string;
  email: string;
  subject: string;
  message: string;
}

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feedback: "General feedback",
  feature: "Feature request",
};

function getEmailJsConfig() {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    return null;
  }

  return { serviceId, templateId, publicKey };
}

export function isFeedbackEmailConfigured(): boolean {
  return getEmailJsConfig() !== null;
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const config = getEmailJsConfig();

  if (!config) {
    throw new Error(
      "Feedback email is not configured yet. Add NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY to .env.local.",
    );
  }

  await emailjs.send(
    config.serviceId,
    config.templateId,
    {
      feedback_type: FEEDBACK_TYPE_LABELS[payload.type],
      from_name: payload.name.trim() || "Anonymous",
      from_email: payload.email.trim() || "not provided",
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      reply_to: payload.email.trim() || undefined,
    },
    { publicKey: config.publicKey },
  );
}
