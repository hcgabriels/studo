CREATE TABLE "public"."stripe_webhook_events" (
  "id"           text                     NOT NULL,
  "type"         text                     NOT NULL,
  "processed_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."stripe_webhook_events"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."stripe_webhook_events" FROM "anon", "authenticated";

GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";
