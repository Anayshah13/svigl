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

/**
 * EmailJS IDs are inlined into the client bundle, so they are not secret — but they
 * are account-scoped and abusable, so they stay in build-time env vars rather than
 * in source. Restrict allowed origins in the EmailJS dashboard as well.
 */
function getEmailJsConfig() {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim();
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim();

  if (!serviceId || !templateId || !publicKey) {
    return null;
  }
  return { serviceId, templateId, publicKey };
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
    throw new Error("Feedback is not configured. Please try again later.");
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

const LIMIT_ALERT_MESSAGE = "LIMIT REACHED / POTENTIAL LIMIT BREAKER SPOTTED";
const LIMIT_ALERT_TO = "anayshah10@gmail.com";
const LIMIT_ALERT_COOLDOWN_MS = 30 * 60 * 1000;

let lastLimitAlertAt = 0;

/** Same EmailJS template as /feedback. Silent if unset or recently sent. */
export async function sendLimitAlert(_reason?: string): Promise<void> {
  const config = getEmailJsConfig();
  if (!config) return;

  const now = Date.now();
  if (now - lastLimitAlertAt < LIMIT_ALERT_COOLDOWN_MS) return;
  lastLimitAlertAt = now;

  try {
    await emailjs.send(
      config.serviceId,
      config.templateId,
      {
        feedback_type: "Bug report",
        from_name: "Svigl AI Guesser",
        from_email: LIMIT_ALERT_TO,
        reply_to: LIMIT_ALERT_TO,
        message: LIMIT_ALERT_MESSAGE,
      },
      { publicKey: config.publicKey },
    );
  } catch {
    lastLimitAlertAt = 0;
  }
}
