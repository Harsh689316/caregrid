CREATE TABLE "alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"source" text DEFAULT 'SYSTEM_RULE_ENGINE' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"assigned_to" integer,
	"acknowledged_at" timestamp,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"date" text NOT NULL,
	"check_in" text,
	"check_out" text,
	"status" text DEFAULT 'PRESENT' NOT NULL,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"previous_value" text,
	"new_value" text,
	"ip_address" text,
	"user_agent" text,
	"request_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"original_staff_id" integer NOT NULL,
	"backup_staff_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"assignment_date" text NOT NULL,
	"shift_start" text NOT NULL,
	"shift_end" text NOT NULL,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"reason" text NOT NULL,
	"recommendation_explanation" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demand_predictions" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"prediction_date" text NOT NULL,
	"predicted_demand" integer NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"model_version" text DEFAULT 'v1.2-wma' NOT NULL,
	"method" text DEFAULT 'Weighted Moving Average + Day-of-Week Trend' NOT NULL,
	"input_window" text DEFAULT '30 days operational workload history' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_code" text NOT NULL,
	"name" text NOT NULL,
	"facility_type" text NOT NULL,
	"district" text NOT NULL,
	"state" text DEFAULT 'Maharashtra' NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"contact_phone" text NOT NULL,
	"status" text DEFAULT 'OPERATIONAL' NOT NULL,
	"operating_hours" text DEFAULT '24/7' NOT NULL,
	"total_beds" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_facility_code_unique" UNIQUE("facility_code")
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"leave_type" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nearby_facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"nearby_facility_id" integer NOT NULL,
	"distance_km" numeric(6, 2) NOT NULL,
	"travel_time_minutes" integer NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"facility_id" integer,
	"type" text NOT NULL,
	"channel" text DEFAULT 'IN_APP' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'DELIVERED' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_key" text NOT NULL,
	"rule_name" text NOT NULL,
	"threshold_value" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"description" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operational_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
CREATE TABLE "service_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"reason" text,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"expected_restore_at" timestamp,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_id" integer NOT NULL,
	"required_staff" integer DEFAULT 2 NOT NULL,
	"minimum_staff" integer DEFAULT 1 NOT NULL,
	"maximum_capacity" integer DEFAULT 100 NOT NULL,
	"required_specialization" text NOT NULL,
	"priority" text DEFAULT 'HIGH' NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'AVAILABLE' NOT NULL,
	"capacity" integer DEFAULT 50 NOT NULL,
	"current_load" integer DEFAULT 0 NOT NULL,
	"operating_hours" text DEFAULT '08:00 - 20:00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"shift_date" text NOT NULL,
	"shift_start" text NOT NULL,
	"shift_end" text NOT NULL,
	"shift_type" text NOT NULL,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_system" text NOT NULL,
	"event_type" text NOT NULL,
	"external_id" text NOT NULL,
	"payload_hash" text NOT NULL,
	"payload" text,
	"status" text DEFAULT 'RECEIVED' NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"error_message" text,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'STAFF' NOT NULL,
	"facility_id" integer,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"specialization" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_employee_id_unique" UNIQUE("employee_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workload_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"facility_id" integer NOT NULL,
	"service_id" integer,
	"record_date" text NOT NULL,
	"patient_volume" integer DEFAULT 0 NOT NULL,
	"service_load" integer DEFAULT 0 NOT NULL,
	"staffing_level" integer DEFAULT 0 NOT NULL,
	"utilization_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"waiting_time_minutes" integer DEFAULT 0 NOT NULL,
	"workload_score" numeric(5, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "alerts_facility_id_idx" ON "alerts" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_severity_idx" ON "alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "attendance_staff_date_idx" ON "attendance" USING btree ("staff_id","date");--> statement-breakpoint
CREATE INDEX "attendance_facility_date_idx" ON "attendance" USING btree ("facility_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_staff_date_unique" ON "attendance" USING btree ("staff_id","date");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "backup_assignments_facility_date_idx" ON "backup_assignments" USING btree ("facility_id","assignment_date");--> statement-breakpoint
CREATE INDEX "demand_predictions_facility_date_idx" ON "demand_predictions" USING btree ("facility_id","prediction_date");--> statement-breakpoint
CREATE INDEX "facilities_district_idx" ON "facilities" USING btree ("district");--> statement-breakpoint
CREATE INDEX "facilities_status_idx" ON "facilities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leave_requests_staff_id_idx" ON "leave_requests" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "leave_requests_facility_id_idx" ON "leave_requests" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "leave_requests_status_idx" ON "leave_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nearby_facilities_facility_idx" ON "nearby_facilities" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_availability_facility_service_idx" ON "service_availability" USING btree ("facility_id","service_id");--> statement-breakpoint
CREATE INDEX "service_requirements_service_id_idx" ON "service_requirements" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "services_facility_id_idx" ON "services" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "services_status_idx" ON "services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staff_schedules_staff_date_idx" ON "staff_schedules" USING btree ("staff_id","shift_date");--> statement-breakpoint
CREATE INDEX "staff_schedules_facility_date_idx" ON "staff_schedules" USING btree ("facility_id","shift_date");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_events_hash_unique" ON "sync_events" USING btree ("payload_hash");--> statement-breakpoint
CREATE INDEX "sync_events_source_idx" ON "sync_events" USING btree ("source_system");--> statement-breakpoint
CREATE INDEX "sync_events_status_idx" ON "sync_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_facility_id_idx" ON "users" USING btree ("facility_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workload_facility_date_idx" ON "workload_history" USING btree ("facility_id","record_date");