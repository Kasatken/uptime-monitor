CREATE TYPE "public"."check_status" AS ENUM('up', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."monitor_status" AS ENUM('pending', 'up', 'degraded', 'down', 'paused');--> statement-breakpoint
CREATE TYPE "public"."monitor_type" AS ENUM('http', 'tcp', 'heartbeat');--> statement-breakpoint
CREATE TABLE "checks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "checks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"monitor_id" uuid NOT NULL,
	"status" "check_status" NOT NULL,
	"response_ms" integer,
	"status_code" integer,
	"message" text,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monitor_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"cause" text
);
--> statement-breakpoint
CREATE TABLE "monitor_daily_stats" (
	"monitor_id" uuid NOT NULL,
	"day" date NOT NULL,
	"total_checks" integer DEFAULT 0 NOT NULL,
	"down_checks" integer DEFAULT 0 NOT NULL,
	"response_ms_sum" bigint DEFAULT 0 NOT NULL,
	"response_samples" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "monitor_daily_stats_monitor_id_day_pk" PRIMARY KEY("monitor_id","day")
);
--> statement-breakpoint
CREATE TABLE "monitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "monitor_type" NOT NULL,
	"config" jsonb NOT NULL,
	"interval_seconds" integer NOT NULL,
	"failure_threshold" integer DEFAULT 2 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"public_name" text,
	"status" "monitor_status" DEFAULT 'pending' NOT NULL,
	"fail_streak" integer DEFAULT 0 NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_response_ms" integer,
	"last_message" text,
	"ssl_expires_at" timestamp with time zone,
	"heartbeat_token" text,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitors_heartbeatToken_unique" UNIQUE("heartbeat_token")
);
--> statement-breakpoint
ALTER TABLE "checks" ADD CONSTRAINT "checks_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitor_daily_stats" ADD CONSTRAINT "monitor_daily_stats_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checks_monitor_time_idx" ON "checks" USING btree ("monitor_id","checked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "incidents_monitor_started_idx" ON "incidents" USING btree ("monitor_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_one_open_per_monitor" ON "incidents" USING btree ("monitor_id") WHERE "incidents"."resolved_at" is null;