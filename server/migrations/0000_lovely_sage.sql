CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"notes" text NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "attendance_contact_id_event_id_unique" UNIQUE("contact_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"area" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"nation" text DEFAULT 'India' NOT NULL,
	"priority" text NOT NULL,
	"category" text NOT NULL,
	"email" text,
	"occupation" text DEFAULT 'Other' NOT NULL,
	"sex" text,
	"marital_status" text,
	"pincode" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"assignedTo" text[],
	"team" text,
	CONSTRAINT "contacts_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"location" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"notes" text NOT NULL,
	"status" text NOT NULL,
	"due_date" timestamp,
	"completed_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"contact_id" integer,
	"assigned_to" text NOT NULL,
	"is_completed" boolean DEFAULT false,
	"feedback" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp NOT NULL,
	"tags" text[],
	"is_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"assigned_to" text NOT NULL,
	"created_by" text NOT NULL,
	"campaign_name" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text,
	"mobile" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_username_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_users_username_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("username") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_feedback" ADD CONSTRAINT "task_feedback_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;