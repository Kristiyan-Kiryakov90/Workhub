CREATE TABLE "csrf_tokens" (
	"nonce" varchar(64) PRIMARY KEY NOT NULL,
	"action" varchar(120) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "csrf_tokens_action_idx" ON "csrf_tokens" USING btree ("action");--> statement-breakpoint
CREATE INDEX "csrf_tokens_expires_at_idx" ON "csrf_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "csrf_tokens_used_at_idx" ON "csrf_tokens" USING btree ("used_at");