CREATE INDEX "shift_assignments_organization_user_shift_idx" ON "shift_assignments" USING btree ("organization_id","user_id","shift_id");--> statement-breakpoint
CREATE INDEX "shift_assignments_organization_shift_idx" ON "shift_assignments" USING btree ("organization_id","shift_id");--> statement-breakpoint
CREATE INDEX "shifts_organization_status_start_time_idx" ON "shifts" USING btree ("organization_id","status","start_time");--> statement-breakpoint
CREATE INDEX "shifts_organization_status_end_time_idx" ON "shifts" USING btree ("organization_id","status","end_time");