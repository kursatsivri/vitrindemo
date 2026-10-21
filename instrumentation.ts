import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sentryOptions } from "@/lib/sentry";

export function register() {
  if (sentryDsn) Sentry.init(sentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
