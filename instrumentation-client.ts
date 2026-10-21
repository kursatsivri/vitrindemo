import * as Sentry from "@sentry/nextjs";
import { sentryDsn, sentryOptions } from "@/lib/sentry";

if (sentryDsn) Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
