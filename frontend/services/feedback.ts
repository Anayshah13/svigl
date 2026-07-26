import emailjs from "@emailjs/browser";

export type FeedbackType = "bug" | "feedback" | "feature";

export interface FeedbackPayload {
  type: FeedbackType;
  name: string;
  email: string;
  message: string;
}

const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: "Bug report",
  feedback: "General feedback",
  feature: "Feature request",
};

function getEmailJsConfig() {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_qg6wlnj";
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!templateId || !publicKey) {
    return null;
  }

  return { serviceId, templateId, publicKey };
}

export function isFeedbackEmailConfigured(): boolean {
  return getEmailJsConfig() !== null;
}

function getEmailJsErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const maybe = error as { text?: string; message?: string; status?: number };
    if (typeof maybe.text === "string" && maybe.text.trim()) {
      return maybe.text.trim();
    }
    if (typeof maybe.message === "string" && maybe.message.trim()) {
      return maybe.message.trim();
    }
  }
  return "Could not send your message. Please try again.";
}

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const config = getEmailJsConfig();

  if (!config) {
    throw new Error(
      "Feedback email is not configured yet. Add NEXT_PUBLIC_EMAILJS_TEMPLATE_ID and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY to .env.local.",
    );
  }

  const email = payload.email.trim();
  const templateParams: Record<string, string> = {
    feedback_type: FEEDBACK_TYPE_LABELS[payload.type],
    from_name: payload.name.trim() || "Anonymous",
    from_email: email || "not provided",
    message: payload.message.trim(),
  };

  if (email) {
    templateParams.reply_to = email;
  }

  try {
    await emailjs.send(config.serviceId, config.templateId, templateParams, {
      publicKey: config.publicKey,
    });
  } catch (error) {
    throw new Error(getEmailJsErrorMessage(error));
  }
}
